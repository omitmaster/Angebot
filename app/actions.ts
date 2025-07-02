"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { proposalSchema } from "./schema"
import { createGaebFile } from "@/lib/gaeb-generator"
import { createPdfFile } from "@/lib/pdf-generator"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const OPENAI_KEY = process.env.OPENAI_API_KEY

export async function generateStructuredProposal(formData: FormData) {
  const requestDetails = formData.get("requestDetails") as string

  if (!OPENAI_KEY) {
    return { error: "OpenAI API-Key fehlt. Bitte setzen Sie die Umgebungsvariable OPENAI_API_KEY im Projekt." }
  }

  if (!requestDetails) {
    return { error: "Bitte geben Sie die Details der Anfrage an." }
  }

  try {
    const ragContext = `
      KONTEXT AUS ÄHNLICHEN ALTEN ANGEBOTEN:
      - Projekt "Büroumbau Meier": 10x Netzwerkdose installieren, 150m Kabel verlegen. Preis pro Dose: 85€. Preis pro Meter Kabel: 3.50€.
      - Projekt "Neubau Schmidt": Komplette Elektroinstallation für 120qm. Pauschalpreis: 12.000€.
      - Materialkosten: Cat-7-Kabel: 1.20€/m, Netzwerkdose: 25€/Stück.
      - Stundensatz Techniker: 75€/h.
    `

    const FALLBACK_KEY = process.env.OPENAI_FALLBACK_KEY

    async function callLLM(apiKey: string, modelId: string) {
      return generateObject({
        model: openai(modelId, { apiKey }),
        schema: proposalSchema,
        prompt: `
          Analysiere die folgende Kundenanfrage. Nutze den bereitgestellten Kontext aus alten Angeboten,
          um realistische Leistungspositionen, Mengen und Preise zu kalkulieren.
          Erstelle einen vollständigen, professionellen Angebotstext und eine strukturierte Liste aller Positionen.

          KUNDENANFRAGE:
          ---
          ${requestDetails}
          ---
          ${ragContext}
        `,
      })
    }

    let proposalResult

    /* ---------- 1. Versuch: primärer Key + gpt-4o ---------- */
    try {
      proposalResult = await callLLM(OPENAI_KEY, "gpt-4o")
    } catch (err: any) {
      if (err?.message?.includes("quota")) {
        console.warn("Quota für primären Key erschöpft – versuche Fallback-Key …")
        /* ---------- 2. Versuch: Fallback-Key (falls vorhanden) ---------- */
        if (FALLBACK_KEY) {
          try {
            proposalResult = await callLLM(FALLBACK_KEY, "gpt-3.5-turbo")
          } catch (err2: any) {
            if (err2?.message?.includes("quota")) {
              throw new Error("both-keys-exhausted")
            }
            throw err2
          }
        } else {
          throw new Error("primary-key-exhausted")
        }
      } else {
        throw err
      }
    }

    const { object: proposal } = proposalResult

    const [pdfUrl, gaebUrl] = await Promise.all([createPdfFile(proposal), createGaebFile(proposal.lineItems)])

    if (!pdfUrl || !gaebUrl) {
      console.warn(
        "Dateien wurden nicht hochgeladen, da kein BLOB_READ_WRITE_TOKEN gesetzt ist. Setzen Sie diesen Env-Var, um Downloads zu aktivieren.",
      )
    }

    return { proposal, pdfUrl, gaebUrl }
  } catch (error: any) {
    console.error(error)

    if (error.message === "primary-key-exhausted") {
      return {
        error:
          "Ihr OpenAI-Kontingent ist erschöpft. Legen Sie optional einen zweiten Key als Environment Variable OPENAI_FALLBACK_KEY an oder laden Sie Guthaben auf.",
      }
    }
    if (error.message === "both-keys-exhausted") {
      return {
        error:
          "Sowohl der primäre als auch der Fallback-Key haben kein Kontingent mehr. Bitte prüfen Sie Ihr OpenAI-Dashboard.",
      }
    }
    if (error?.message?.includes("quota")) {
      return {
        error:
          "Ihr OpenAI-Kontingent ist erschöpft. Bitte prüfen Sie Ihr OpenAI-Dashboard oder verwenden Sie einen anderen API-Key.",
      }
    }
    return {
      error:
        "Ein unbekannter Fehler bei der KI-Kalkulation ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.",
    }
  }
}

export async function saveProposal(proposalData: {
  id?: string
  customer_name: string
  proposal_text: string
  line_items: any[]
}) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { id, customer_name, proposal_text, line_items } = proposalData

  const total_value = line_items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  const dataToUpsert = {
    customer_name,
    proposal_text,
    line_items,
    total_value,
    ...(id && { id }), // nur ID hinzufügen, wenn sie existiert (für Updates)
  }

  const { data, error } = await supabase.from("proposals").upsert(dataToUpsert).select().single()

  if (error) {
    console.error("Supabase error:", error)
    return { error: "Fehler beim Speichern des Angebots." }
  }

  // Revalidiert die Pipeline-Seite, damit sie die neuen Daten anzeigt
  revalidatePath("/pipeline")

  return { success: true, proposalId: data.id }
}

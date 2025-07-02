import { z } from "zod"

export const lineItemSchema = z.object({
  description: z.string().describe("Detaillierte Beschreibung der Leistung oder des Materials."),
  quantity: z.number().describe("Die Menge der Position."),
  unit: z.string().describe("Die Einheit der Menge (z.B. 'Stück', 'm', 'h', 'pauschal')."),
  unitPrice: z.number().describe("Der Preis pro Einheit in Euro."),
  totalPrice: z.number().describe("Der Gesamtpreis für diese Position (Menge * Einzelpreis)."),
})

export const proposalSchema = z.object({
  proposalText: z
    .string()
    .describe(
      "Der vollständige, formatierte Angebotstext in deutscher Sprache, inklusive Anrede, Einleitung, Beschreibung der Leistungen und Schlussformel.",
    ),
  lineItems: z.array(lineItemSchema).describe("Eine Liste aller kalkulierten Angebotspositionen."),
})

export type LineItem = z.infer<typeof lineItemSchema>
export type Proposal = z.infer<typeof proposalSchema>

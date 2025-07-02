"use server"
import { put } from "@vercel/blob"
import type { Proposal } from "@/app/schema"

// In a real app, you would use a library like `react-pdf` or `puppeteer`
// to generate a proper PDF here. This is a placeholder for demonstration.
export async function createPdfFile(proposal: Proposal): Promise<string | null> {
  let textContent = `Angebot\n\n`
  textContent += `${proposal.proposalText}\n\n`
  textContent += `Positionen:\n`
  proposal.lineItems.forEach((item, i) => {
    textContent += `${i + 1}. ${item.description} | ${item.quantity} ${item.unit} | ${item.totalPrice.toFixed(2)} €\n`
  })

  const fileName = `angebot-${Date.now()}.txt` // We save as .txt for this demo

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.warn("BLOB_READ_WRITE_TOKEN fehlt – PDF wird nicht hochgeladen")
    return null
  }

  const { url } = await put(fileName, textContent, {
    access: "public",
    contentType: "text/plain",
    token, // <-- Token explizit übergeben
  })
  return url
}

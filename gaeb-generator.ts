"use server"
import { put } from "@vercel/blob"
import type { LineItem } from "@/app/schema"

/**
 * Erstellt eine stark vereinfachte GAEB-DA XML 3.2 (D83) Datei aus den Positionen
 * und lädt sie via Vercel Blob hoch. Gibt die öffentliche URL zurück.
 */
export async function createGaebFile(lineItems: LineItem[]): Promise<string | null> {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.2">
  <BoQ>
    <BoQBody>
      <BoQCtgy R_Cat_ID="1">
        <ItemList>`
  const footer = `
        </ItemList>
      </BoQCtgy>
    </BoQBody>
  </BoQ>
</GAEB>`

  const itemsXml = lineItems
    .map((item, idx) => {
      const outlineNum = `01.${(idx + 1).toString().padStart(3, "0")}`
      return `
          <Item>
            <OutlineNum>${outlineNum}</OutlineNum>
            <Description>
              <OutlineText>
                <TextOut>${escapeXml(item.description)}</TextOut>
              </OutlineText>
            </Description>
            <Qty>${item.quantity}</Qty>
            <QU>${item.unit}</QU>
            <UP>${item.unitPrice.toFixed(2)}</UP>
          </Item>`
    })
    .join("")

  const xmlString = `${header}${itemsXml}${footer}`

  const fileName = `angebot-${Date.now()}.x83`

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.warn("BLOB_READ_WRITE_TOKEN fehlt – GAEB wird nicht hochgeladen")
    return null
  }

  const { url } = await put(fileName, xmlString, {
    access: "public",
    contentType: "application/xml",
    token,
  })
  return url
}

/** Kleine XML-Escape-Hilfe */
function escapeXml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

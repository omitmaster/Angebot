"use client"

import type React from "react"
import { useState } from "react"
import { generateStructuredProposal, saveProposal } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, Trash2, PlusCircle, Save } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LineItem } from "./schema"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function ProposalAssistantPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Proposal State
  const [proposalId, setProposalId] = useState<string | undefined>(undefined)
  const [customerName, setCustomerName] = useState("")
  const [proposalText, setProposalText] = useState<string>("")
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  const { toast } = useToast()

  // ... (bestehende Logik für handleSubmit, handleItemChange, addItem, removeItem bleibt gleich)
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setProposalText("")
    setLineItems([])
    setProposalId(undefined)

    const formData = new FormData(event.currentTarget)
    const result = await generateStructuredProposal(formData)

    if (result.error) {
      setError(result.error)
    } else if (result.proposal) {
      setProposalText(result.proposal.proposalText)
      setLineItems(result.proposal.lineItems)
    }
    setLoading(false)
  }

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems]
    const item = updatedItems[index]
    ;(item[field] as any) = value
    if (field === "quantity" || field === "unitPrice") {
      item.totalPrice = item.quantity * item.unitPrice
    }
    setLineItems(updatedItems)
  }

  const addItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit: "Stück", unitPrice: 0, totalPrice: 0 }])
  }

  const removeItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!customerName) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Kundennamen an.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    const result = await saveProposal({
      id: proposalId,
      customer_name: customerName,
      proposal_text: proposalText,
      line_items: lineItems,
    })
    setSaving(false)

    if (result.error) {
      toast({ title: "Fehler beim Speichern", description: result.error, variant: "destructive" })
    } else {
      setProposalId(result.proposalId)
      toast({
        title: "Gespeichert!",
        description: "Das Angebot wurde erfolgreich in der Datenbank gespeichert.",
        action: (
          <Link href="/pipeline">
            <Button variant="outline">Pipeline anzeigen</Button>
          </Link>
        ),
      })
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen w-full flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-4xl flex justify-end">
        <Link href="/pipeline">
          <Button variant="outline">Zur Angebots-Pipeline</Button>
        </Link>
      </div>
      <Card className="w-full max-w-4xl">
        {/* ... (Generator Form bleibt gleich) ... */}
        <CardHeader>
          <CardTitle>Intelligenter Angebots-Assistent</CardTitle>
          <CardDescription>
            Geben Sie die Anfrage ein. Die KI kalkuliert Positionen und erstellt einen Entwurf, den Sie bearbeiten und
            speichern können.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="request-details">Details der Kundenanfrage</Label>
              <Textarea
                id="request-details"
                name="requestDetails"
                placeholder="Kopieren Sie hier die E-Mail oder die Eckpunkte der Kundenanfrage hinein..."
                rows={8}
                disabled={loading}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full text-lg py-6">
              {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Angebot & Kalkulation erstellen"}
            </Button>
          </CardFooter>
        </form>

        {lineItems.length > 0 && (
          <CardContent className="space-y-6 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Kundenname</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Max Mustermann GmbH"
              />
            </div>
            {/* ... (Editor für Text und Positionen bleibt gleich) ... */}
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">1. Angebotstext bearbeiten</h3>
              <Textarea
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                rows={10}
                className="p-4 border rounded-md bg-white whitespace-pre-wrap text-sm"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">2. Positionen bearbeiten</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Pos.</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-[100px] text-right">Menge</TableHead>
                    <TableHead className="w-[100px]">Einheit</TableHead>
                    <TableHead className="w-[120px] text-right">Einzelpreis (€)</TableHead>
                    <TableHead className="w-[120px] text-right">Gesamtpreis (€)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" onClick={addItem} className="mt-2 bg-transparent">
                <PlusCircle className="mr-2 h-4 w-4" /> Position hinzufügen
              </Button>
            </div>

            <div className="flex gap-4 pt-6 border-t">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {proposalId ? "Änderungen speichern" : "Angebot speichern"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

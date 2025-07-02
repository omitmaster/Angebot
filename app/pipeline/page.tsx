import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const STATUS_ORDER = ["Entwurf", "Versendet", "Nachverfolgung", "Angenommen", "Abgelehnt"]

export default async function PipelinePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return <div className="p-4 text-red-500">Fehler beim Laden der Angebote: {error.message}</div>
  }

  const groupedProposals = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = proposals.filter((p) => p.status === status)
      return acc
    },
    {} as Record<string, typeof proposals>,
  )

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Angebots-Pipeline</h1>
        <Link href="/">
          <Button>+ Neues Angebot</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="bg-gray-100 rounded-lg p-2">
            <h2 className="font-semibold p-2">{status}</h2>
            <div className="space-y-2">
              {groupedProposals[status].map((proposal) => (
                <Card key={proposal.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{proposal.customer_name}</CardTitle>
                    <CardDescription>{new Date(proposal.created_at).toLocaleDateString("de-DE")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
                      {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
                        proposal.total_value,
                      )}
                    </Badge>
                  </CardContent>
                  <CardFooter>
                    {/* In a future step, this would link to /?id=${proposal.id} to edit */}
                    <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                      <Link href={`/?id=${proposal.id}`}>Bearbeiten</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {groupedProposals[status].length === 0 && (
                <div className="text-center text-sm text-gray-500 p-4">Keine Angebote</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


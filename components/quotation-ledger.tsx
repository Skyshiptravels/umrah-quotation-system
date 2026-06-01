"use client"

import { useMemo, useState } from "react"
import type { QuotationStatus, SavedQuotation, User } from "@/app/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Search } from "lucide-react"

interface QuotationLedgerProps {
  quotations: SavedQuotation[]
  currentUser: User | null
}

function getQuotationStatus(quotation: SavedQuotation): QuotationStatus {
  return quotation.status ?? "draft"
}

function formatLedgerDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function QuotationLedger({ quotations, currentUser }: QuotationLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const visibleQuotations = useMemo(() => {
    return quotations.filter((quotation) => {
      if (currentUser?.role === "admin") return true
      return quotation.agentId === currentUser?.id
    })
  }, [quotations, currentUser])

  const filteredQuotations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return visibleQuotations

    return visibleQuotations.filter((quotation) => {
      const quotationId = quotation.quotationNo.toLowerCase()
      const internalId = quotation.id.toLowerCase()
      const clientName = quotation.clientName.toLowerCase()
      return (
        quotationId.includes(query) ||
        internalId.includes(query) ||
        clientName.includes(query)
      )
    })
  }, [visibleQuotations, searchTerm])

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Quotation Ledger
          </CardTitle>
          <CardDescription>
            {currentUser?.role === "admin"
              ? "All saved quotations across the organization"
              : "Your saved quotations"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name or quotation ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>

          {filteredQuotations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">No quotations found</p>
              <p className="text-sm mt-1">
                {visibleQuotations.length === 0
                  ? "Save a quotation from the staff dashboard to see it here."
                  : "Try a different client name or quotation ID."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-secondary/50">
                    <TableHead className="text-muted-foreground">Quotation ID</TableHead>
                    <TableHead className="text-muted-foreground">Client Name</TableHead>
                    <TableHead className="text-muted-foreground text-right">Total Amount</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => {
                    const status = getQuotationStatus(quotation)
                    return (
                      <TableRow key={quotation.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-mono text-sm font-semibold text-primary">
                          {quotation.quotationNo}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {quotation.clientName?.trim() || "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {quotation.totalPricePkr.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-muted-foreground">PKR</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              status === "confirmed"
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-secondary/40 text-muted-foreground"
                            }
                          >
                            {status === "confirmed" ? "Confirmed" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatLedgerDate(quotation.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

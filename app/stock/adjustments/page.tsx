"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface StockVariant { color: string; quantity: number; unit: string }
interface Stock { _id: string; stockType: string; status: string; variants: StockVariant[]; stockDetails: any }
interface Adjustment { _id: string; stockId: string; product: string; stockType: string; color: string; prevQuantity: number; newQuantity: number; reason: string; createdAt: string }
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AdjustmentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<Adjustment[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  })

  const [open, setOpen] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [prevQty, setPrevQty] = useState(0)
  const [newQty, setNewQty] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchAdjustments = async (page: number = 1, limit: number = 10) => {
    try {
      const logsRes = await fetch(`${API_BASE_URL}/adjustments?page=${page}&limit=${limit}`)
      if (!logsRes.ok) throw new Error("Failed to fetch adjustments")
      const logsJson = await logsRes.json()
      setLogs(logsJson.adjustments || [])
      setPagination(logsJson.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: limit,
        hasNextPage: false,
        hasPrevPage: false
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch adjustments")
    }
  }

  const fetchStocks = async () => {
    try {
      const stockRes = await fetch(`${API_BASE_URL}/stock`)
      if (!stockRes.ok) throw new Error("Failed to fetch stocks")
      const stockJson = await stockRes.json()
      setStocks(stockJson.stocks || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch stocks")
    }
  }

  const fetchProducts = async () => {
    try {
      setProductsLoading(true)
      const response = await fetch(`${API_BASE_URL}/products`)
      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error("Failed to fetch products:", err)
    } finally {
      setProductsLoading(false)
    }
  }

  // Helper function to check if a string is likely an ObjectId
  const isLikelyObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value)

  // Resolve product either by ID or by name (to handle legacy data)
  const findProductByIdOrName = (identifier: string) => {
    if (!identifier) return undefined
    const byId = isLikelyObjectId(identifier)
      ? products.find((p) => p._id === identifier)
      : undefined
    if (byId) return byId
    const byName = products.find((p) => (p.productName || "") === identifier)
    return byName
  }

  // Helper function to get product name from product ref (id or name)
  const getProductName = (productRef: string) => {
    const product = findProductByIdOrName(productRef)
    return product ? product.productName : productRef
  }

  // Helper to get product category (product name) by id or name
  const getProductCategory = (productRef: string) => {
    const product = findProductByIdOrName(productRef)
    return product ? (product.category || "") : ""
  }

  // Get formatted product display name
  const getProductDisplayName = (productRef: string) => {
    const designNumber = getProductName(productRef)
    const productCategory = getProductCategory(productRef)
    return productCategory
      ? `${productCategory} (${designNumber})`
      : designNumber
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        await Promise.all([
          fetchAdjustments(),
          fetchStocks(),
          fetchProducts()
        ])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const colorsForSelected = useMemo(() => {
    const s = stocks.find(x => x._id === selectedStockId)
    return s ? s.variants.map(v => v.color) : []
  }, [stocks, selectedStockId])

  useEffect(() => {
    // when stock or color changes, compute prev quantity
    const s = stocks.find(x => x._id === selectedStockId)
    if (!s) { setPrevQty(0); return }
    const v = s.variants.find(v => v.color === selectedColor)
    setPrevQty(v ? v.quantity : 0)
  }, [stocks, selectedStockId, selectedColor])

  const handlePageChange = (newPage: number) => {
    fetchAdjustments(newPage, pagination.itemsPerPage)
  }

  const handleItemsPerPageChange = (newLimit: number) => {
    fetchAdjustments(1, newLimit)
  }

  const handleCreate = async () => {
    try {
      setSaving(true)
      setError(null)
      if (!selectedStockId) throw new Error("Please select a product in stock")
      if (!selectedColor) throw new Error("Please select a color")
      const newQtyNum = parseFloat(newQty) || 0
      if (!(newQtyNum > prevQty)) throw new Error("New quantity must be greater than previous quantity")
      if (!reason.trim()) throw new Error("Please enter a reason")

      const res = await fetch(`${API_BASE_URL}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId: selectedStockId, color: selectedColor, newQuantity: newQtyNum, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to add adjustment")

      // refresh logs and stocks
      await Promise.all([
        fetchAdjustments(pagination.currentPage, pagination.itemsPerPage),
        fetchStocks()
      ])

      // close dialog and reset minimal
      setOpen(false)
      setSelectedStockId("")
      setSelectedColor("")
      setNewQty("")
      setReason("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add adjustment")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Adjustments</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Adjustments</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="sm:hidden text-sm font-medium text-muted-foreground">
          Stock Adjustments
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold">Adjustment Logs</h2>
            <p className="text-muted-foreground text-sm sm:text-base">View and create stock adjustments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle>Add Adjustment</DialogTitle>
                <DialogDescription>Increase stock quantity for a color</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm">Product in Stock</label>
                  <Select value={selectedStockId} onValueChange={(v)=>{ setSelectedStockId(v); setSelectedColor("") }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks.map(s => (
                        <SelectItem key={s._id} value={s._id}>{getProductDisplayName(s.stockDetails?.product || s._id)} ({s.stockType})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Color</label>
                  <Select value={selectedColor} onValueChange={setSelectedColor} disabled={!selectedStockId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colorsForSelected.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Prev. Quantity: {prevQty.toLocaleString()} m</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">New Quantity</label>
                  <Input type="number" value={newQty} onChange={(e)=>setNewQty(e.target.value)} min={prevQty ? String(prevQty + 1) : undefined} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Reason</label>
                  <Input value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Enter reason" />
                </div>
                <div className="pt-2">
                  <Button className="w-full" onClick={handleCreate} disabled={saving}>
                    {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : "Save Adjustment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div>
                <CardTitle>Logs</CardTitle>
                <CardDescription>Recent stock adjustments</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={String(pagination.itemsPerPage)} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Product</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">Stock Type</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Color</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden md:table-cell">Prev. Qnt</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">New Qnt</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden lg:table-cell">Reason</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} className="border-b">
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{getProductDisplayName(log.product)}</span>
                          <span className="text-muted-foreground text-xs sm:hidden">{log.stockType}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">{log.stockType}</td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">{log.color}</td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden md:table-cell">{log.prevQuantity.toLocaleString()} m</td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{log.newQuantity.toLocaleString()} m</span>
                          <span className="text-muted-foreground text-xs sm:hidden">Prev: {log.prevQuantity.toLocaleString()} m</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden lg:table-cell">{log.reason}</td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={7}>No adjustments yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} entries
                </div>
                <div className="flex items-center gap-2 justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNextPage}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
} 
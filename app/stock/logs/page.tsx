"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface StockLog {
  _id: string;
  product: string;
  stockType: string;
  status: string;
  totalQuantity: number;
  colors: string;
  variants: Array<{
    color: string;
    quantity: number;
    unit: string;
  }>;
  additionalDetails: any;
  batchNumber: string;
  qualityGrade: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  action: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function StockLogsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [stockTypeFilter, setStockTypeFilter] = useState<string>("all");
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  const fetchLogs = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/stock-logs?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error("Failed to fetch stock logs");
      
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        });
      } else {
        throw new Error(data.message || "Failed to fetch stock logs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Fetch products data
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        if (data.success) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage, pagination.itemsPerPage);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    fetchLogs(1, newLimit);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Helper function to check if a string is likely an ObjectId
  const isLikelyObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

  // Resolve product either by ID or by name (to handle legacy data)
  const findProductByIdOrName = (identifier: string) => {
    if (!identifier) return undefined;
    const byId = isLikelyObjectId(identifier)
      ? products.find((p) => p._id === identifier)
      : undefined;
    if (byId) return byId;
    const byName = products.find((p) => (p.productName || "") === identifier);
    return byName;
  };

  // Helper function to get product name from product ref (id or name)
  const getProductName = (productRef: string) => {
    const product = findProductByIdOrName(productRef);
    return product ? product.productName : productRef;
  };

  // Helper to get product category (product name) by id or name
  const getProductCategory = (productRef: string) => {
    const product = findProductByIdOrName(productRef);
    return product ? (product.category || "") : "";
  };

  // Get formatted product display name
  const getProductDisplayName = (productRef: string) => {
    const designNumber = getProductName(productRef);
    const productCategory = getProductCategory(productRef);
    return productCategory
      ? `${productCategory} (${designNumber})`
      : designNumber;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default">Available</Badge>;
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>;
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "processing":
        return <Badge variant="outline">Processing</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockTypeBadge = (stockType: string) => {
    switch (stockType) {
      case "Gray Stock":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Gray Stock</Badge>;
      case "Factory Stock":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Factory Stock</Badge>;
      case "Design Stock":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Design Stock</Badge>;
      default:
        return <Badge variant="outline">{stockType}</Badge>;
    }
  };

  const filteredLogs = stockTypeFilter === "all"
    ? logs
    : logs.filter((l) => l.stockType === stockTypeFilter);

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
                <BreadcrumbPage>Logs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading stock logs...
          </div>
        </div>
      </SidebarInset>
    );
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
              <BreadcrumbPage>Logs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="sm:hidden text-sm font-medium text-muted-foreground">
          Stock Logs
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
            <h2 className="text-xl sm:text-2xl font-bold">Stock Logs</h2>
            <p className="text-muted-foreground text-sm sm:text-base">View newly added stock details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div>
                <CardTitle>Stock Logs</CardTitle>
                <CardDescription>Recent stock additions</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Stock type:</span>
                <Select value={stockTypeFilter} onValueChange={setStockTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Gray Stock">Gray Stock</SelectItem>
                    <SelectItem value="Factory Stock">Factory Stock</SelectItem>
                    <SelectItem value="Design Stock">Design Stock</SelectItem>
                  </SelectContent>
                </Select>
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
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Status</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Quantity</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden md:table-cell">Colors</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">action</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden lg:table-cell">Details</th>
                    <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="border-b hover:bg-muted/50">
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{getProductDisplayName(log.product)}</span>
                          <span className="text-muted-foreground text-xs sm:hidden">{log.stockType}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">
                        {getStockTypeBadge(log.stockType)}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{log.totalQuantity.toLocaleString()} m</span>
                          <span className="text-muted-foreground text-xs sm:hidden">{log.colors}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {log.variants.map((variant, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {variant.color}: {variant.quantity}m
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                        {log.action}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden lg:table-cell">
                        <div className="space-y-1">
                          {log.batchNumber && (
                            <div className="text-xs text-muted-foreground">Batch: {log.batchNumber}</div>
                          )}
                          {log.qualityGrade && (
                            <div className="text-xs text-muted-foreground">Grade: {log.qualityGrade}</div>
                          )}
                          {log.notes && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={log.notes}>
                              {log.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="font-medium">{formatDateTime(log.createdAt).split(',')[0]}</span>
                          <span className="text-muted-foreground text-xs">{formatDateTime(log.createdAt).split(',')[1]}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={7}>
                        No stock logs found
                      </td>
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
  );
}

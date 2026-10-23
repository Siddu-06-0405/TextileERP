"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface StockLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockLogsDialog({ open, onOpenChange }: StockLogsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
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
    if (open) {
      fetchLogs();
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Stock Logs</DialogTitle>
          <DialogDescription>View newly added stock details</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-hidden flex flex-col h-full">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="flex items-center justify-between">
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

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading stock logs...
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-left border-b">
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Product</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">Stock Type</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Status</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm">Quantity</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden md:table-cell">Colors</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden lg:table-cell">Details</th>
                      <th className="font-medium py-2 pr-2 sm:pr-4 text-xs sm:text-sm hidden sm:table-cell">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b hover:bg-muted/50">
                        <td className="py-2 pr-2 sm:pr-4 text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.product}</span>
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
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pt-4 border-t">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface StockLog {
  _id: string;
  product: string;
  stockType: string;
  status: string;
  totalQuantity: number;
  colors: string;
  variants: Array<{ color: string; quantity: number; unit: string }>;
  batchNumber: string;
  qualityGrade: string;
  notes: string;
  createdAt: string;
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

export default function StockLogsCard({
  productName,
}: {
  productName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<StockLog[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [stockTypeFilter, setStockTypeFilter] = useState<string>("all");

  const fetchLogs = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Filter by product on API side (if supported)
      const response = await fetch(`${API_BASE_URL}/stock-logs`);

      if (!response.ok) throw new Error("Failed to fetch stock logs");

      const data = await response.json();
      // console.log("Fetched stock logs:", data.logs);

      if (data.success) {
        const prodLogs: StockLog[] = (data.logs || []).filter((log: StockLog) => log.product === productName);
        setLogs(prodLogs);
        setFilteredLogs(prodLogs);
        setPagination(
          data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
          }
        );
      } else {
        throw new Error(data.message || "Failed to fetch stock logs");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch stock logs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [productName]);

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

  useEffect(() => {
    if (stockTypeFilter === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter((l) => (l.stockType || "").toLowerCase() === stockTypeFilter.toLowerCase()));
    }
  }, [stockTypeFilter, logs]);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />{" "}
          Loading stock logs...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Logs for {productName}</CardTitle>
        <CardDescription>Recent updates</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted-foreground">Filter by stock type:</span>
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 text-xs sm:text-sm">Stock Type</th>
                <th className="py-2 text-xs sm:text-sm">Status</th>
                <th className="py-2 text-xs sm:text-sm">Quantity</th>
                <th className="py-2 text-xs sm:text-sm">Colors</th>
                <th className="py-2 text-xs sm:text-sm">Action</th>
                <th className="py-2 text-xs sm:text-sm">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log._id} className="border-b hover:bg-muted/50">
                  <td className="py-2">{log.stockType}</td>
                  <td className="py-2">{log.status}</td>
                  <td className="py-2">{log.totalQuantity}</td>
                  <td className="py-2">
                    {log.variants.map((v, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {v.color}: {v.quantity} {v.unit}
                      </Badge>
                    ))}
                  </td>
                  <td className="py-2">{log.action}</td>
                  <td className="py-2">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No logs found for this product
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  Factory,
  Palette,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Edit,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  FileText,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { NotoSansRegular } from "../fonts/NotoSans-Regular";

// Stock interfaces based on backend schema
interface StockVariant {
  color: string;
  quantity: number;
  unit: string;
}

interface AdditionalInfo {
  batchNumber: string;
  qualityGrade: string;
  notes?: string;
}

interface GrayStockDetails {
  product: string;
  factory: string;
  agent: string;
  orderNumber: string;
}

interface FactoryStockDetails {
  product: string;
  processingFactory: string;
  processingStage: string;
  expectedCompletion: string;
}

interface DesignStockDetails {
  product: string;
  design: string;
  warehouse: string;
}

interface Stock {
  _id: string;
  stockType: "Gray Stock" | "Factory Stock" | "Design Stock";
  status: string;
  variants: StockVariant[];
  stockDetails: GrayStockDetails | FactoryStockDetails | DesignStockDetails;
  addtionalInfo: AdditionalInfo;
  createdAt: string;
  updatedAt: string;
  productExists?: boolean;
  productDetails?: {
    _id: string;
    sku: string;
    category: string;
    images: string;
  };
}

interface StockResponse {
  success: boolean;
  stock: Stock;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Frontend display interfaces
interface DisplayStock {
  id: string;
  productRef?: string;
  product: string;
  quantity: number;
  factory?: string;
  agent?: string;
  orderNumber?: string;
  stage?: string;
  expectedCompletion?: string;
  design?: string;
  colors?: string[];
  warehouse?: string;
  status: string;
  stockType: string;
  createdAt: string;
  productIsActive?: boolean;
  productIsDeleted?: boolean;
  variants?: StockVariant[];
  designNumber?: string;
  images?: string;
}

export default function StockPage() {
  const { toast } = useToast();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"gray" | "factory" | "design">(
    "gray"
  );
  const [sortBy, setSortBy] = useState("-createdAt");

  // Backend data states
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{
    [key: string]: boolean;
  }>({});
  const [deletingStock, setDeletingStock] = useState<{
    [key: string]: boolean;
  }>({});

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Map tab names to stock types
  const getStockTypeFromTab = (tab: string): string | undefined => {
    const mapping = {
      gray: "Gray Stock",
      factory: "Factory Stock",
      design: "Design Stock",
    };
    return mapping[tab as keyof typeof mapping];
  };

  // Fetch stocks from backend with pagination and filtering
  const fetchStocks = async (
    page: number = 1,
    limit: number = 20,
    stockType?: string,
    search?: string,
    status?: string,
    sort?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (stockType && stockType !== "all") {
        params.append("stockType", stockType);
      }

      if (search) {
        params.append("search", search);
      }

      if (status && status !== "all") {
        params.append("status", status);
      }

      if (sort) {
        params.append("sort", sort);
      }

      const response = await fetch(
        `${API_BASE_URL}/stock?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch stocks: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setStocks(data.stocks || []);

        // Update pagination info from API response
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          // Fallback if pagination not provided
          const totalItems = data.stocks?.length || 0;
          const totalPages = Math.ceil(totalItems / limit);
          setPagination({
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          });
        }
      } else {
        throw new Error(data.message || "Failed to fetch stocks");
      }
    } catch (err) {
      console.error("Error fetching stocks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stocks");

      toast({
        title: "Error Loading Stocks",
        description:
          err instanceof Error ? err.message : "Failed to fetch stocks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stocks when filters change
  useEffect(() => {
    const stockType = getStockTypeFromTab(activeTab);
    fetchStocks(
      1,
      pagination.itemsPerPage,
      stockType,
      debouncedSearchTerm,
      selectedFilter,
      sortBy
    );
  }, [activeTab, debouncedSearchTerm, selectedFilter, sortBy]);

  // State for products data
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [deletedProductIds, setDeletedProductIds] = useState<Set<string>>(
    new Set()
  );

  const isLikelyObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

  // Fetch products for product name lookup
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        let response = await fetch(`${API_BASE_URL}/products`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        let data;
        if (response.ok) {
          data = await response.json();
          if (data.success) {
            setProducts(data.products || []);
            return;
          }
        }

        response = await fetch(`${API_BASE_URL}/products/products`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          console.error("Failed to fetch products from both endpoints");
          return;
        }

        data = await response.json();
        if (data.success) {
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Resolve product by ID or name
  const findProductByIdOrName = (identifier: string) => {
    if (!identifier) return undefined;
    const byId = isLikelyObjectId(identifier)
      ? products.find((p) => p._id === identifier)
      : undefined;
    if (byId) return byId;
    const byName = products.find((p) => (p.productName || "") === identifier);
    return byName;
  };

  const getProductName = (productRef: string) => {
    const product = findProductByIdOrName(productRef);
    return product ? product.productName : productRef;
  };

  const getProductCategory = (productRef: string) => {
    const stock = stocks.find(
      (s) => s.productDetails?.productName === productRef
    );

    return stock?.productDetails?.category || "";
  };

  // Handle status change
  const handleStatusChange = async (stockId: string, newStatus: string) => {
    try {
      setUpdatingStatus((prev) => ({ ...prev, [stockId]: true }));

      const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to update status: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setStocks((prevStocks) =>
          prevStocks.map((stock) =>
            stock._id === stockId ? { ...stock, status: newStatus } : stock
          )
        );

        toast({
          title: "Status Updated",
          description: `Stock status has been updated to ${newStatus}`,
          variant: "default",
        });
      } else {
        throw new Error(data.message || "Failed to update stock status");
      }
    } catch (err) {
      console.error("Error updating stock status:", err);
      toast({
        title: "Update Failed",
        description:
          err instanceof Error ? err.message : "Failed to update stock status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [stockId]: false }));
    }
  };

  // Handle delete stock
  const handleDeleteStock = async (stockId: string) => {
    try {
      setDeletingStock((prev) => ({ ...prev, [stockId]: true }));

      const response = await fetch(`${API_BASE_URL}/stock/${stockId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to delete stock: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setStocks((prev) => prev.filter((s) => s._id !== stockId));

        toast({
          title: "Stock Deleted",
          description: "Stock has been removed successfully.",
          variant: "default",
        });

        // Refresh the current page
        const stockType = getStockTypeFromTab(activeTab);
        fetchStocks(
          pagination.currentPage,
          pagination.itemsPerPage,
          stockType,
          debouncedSearchTerm,
          selectedFilter,
          sortBy
        );
      } else {
        throw new Error(data.message || "Failed to delete stock");
      }
    } catch (err) {
      console.error("Error deleting stock:", err);
      toast({
        title: "Delete Failed",
        description:
          err instanceof Error ? err.message : "Failed to delete stock",
        variant: "destructive",
      });
    } finally {
      setDeletingStock((prev) => ({ ...prev, [stockId]: false }));
    }
  };

  // Download utility functions (for individual stocks)
  const downloadStockAsPDF = (stockData: any, productDisplay?: string) => {
    const doc = new jsPDF();
    doc.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans");

    doc.setFontSize(18);
    doc.text("STOCK DETAILS", 20, 20);

    doc.setFontSize(12);
    doc.text(`Stock ID: ${stockData._id}`, 20, 35);
    doc.text(`Stock Type: ${stockData.stockType}`, 20, 45);
    doc.text(`Status: ${stockData.status}`, 20, 55);

    if (stockData.addtionalInfo) {
      const { batchNumber, qualityGrade, notes } = stockData.addtionalInfo;
      doc.text(`Batch No: ${batchNumber || "-"}`, 20, 70);
      doc.text(`Quality Grade: ${qualityGrade || "-"}`, 20, 80);
      if (notes) doc.text(`Notes: ${notes}`, 20, 90);
    }

    let y = 110;
    doc.setFontSize(14);
    doc.text("Stock Details", 20, y);
    y += 8;
    if (productDisplay) {
      doc.setFontSize(12);
      doc.text(productDisplay, 20, y);
      y += 10;
    } else {
      doc.setFontSize(12);
    }

    if (stockData.stockType === "Gray Stock") {
      const { factory, agent, orderNumber } = stockData.stockDetails;
      doc.text(`Factory: ${factory}`, 20, y);
      y += 10;
      doc.text(`Agent: ${agent}`, 20, y);
      y += 10;
      doc.text(`Order No: ${orderNumber}`, 20, y);
    } else if (stockData.stockType === "Factory Stock") {
      const { processingFactory, processingStage, expectedCompletion } =
        stockData.stockDetails;
      doc.text(`Factory: ${processingFactory}`, 20, y);
      y += 10;
      doc.text(`Stage: ${processingStage}`, 20, y);
      y += 10;
      doc.text(
        `Expected Completion: ${new Date(
          expectedCompletion
        ).toLocaleDateString()}`,
        20,
        y
      );
    }

    y += 20;
    doc.setFontSize(14);
    doc.text("Variants", 20, y);
    y += 10;

    doc.setFontSize(12);
    stockData.variants.forEach((variant: any, index: number) => {
      doc.text(
        `${index + 1}. Color: ${variant.color}, Qty: ${variant.quantity} ${
          variant.unit
        }`,
        20,
        y
      );
      y += 10;
    });

    doc.save(`Stock_${stockData._id}.pdf`);
  };

  const downloadStockAsExcel = (stockData: any, productDisplay?: string) => {
    const wb = XLSX.utils.book_new();

    const basicInfo = [
      ["Stock ID", stockData._id],
      ["Stock Type", stockData.stockType],
      ["Status", stockData.status],
      ["Created At", new Date(stockData.createdAt).toLocaleString()],
      ["Updated At", new Date(stockData.updatedAt).toLocaleString()],
    ];

    if (stockData.addtionalInfo) {
      basicInfo.push(
        ["Batch No", stockData.addtionalInfo.batchNumber || "-"],
        ["Quality Grade", stockData.addtionalInfo.qualityGrade || "-"],
        ["Notes", stockData.addtionalInfo.notes || "-"]
      );
    }

    const wsBasic = XLSX.utils.aoa_to_sheet(basicInfo);
    XLSX.utils.book_append_sheet(wb, wsBasic, "Basic Info");

    let detailsData: any[][] = [["Field", "Value"]];
    if (productDisplay) {
      detailsData.push(["Product", productDisplay]);
    }
    if (stockData.stockType === "Gray Stock") {
      const { factory, agent, orderNumber } = stockData.stockDetails;
      detailsData.push(
        ["Factory", factory],
        ["Agent", agent],
        ["Order No", orderNumber]
      );
    } else if (stockData.stockType === "Factory Stock") {
      const { processingFactory, processingStage, expectedCompletion } =
        stockData.stockDetails;
      detailsData.push(
        ["Processing Factory", processingFactory],
        ["Stage", processingStage],
        [
          "Expected Completion",
          expectedCompletion
            ? new Date(expectedCompletion).toLocaleDateString()
            : "-",
        ]
      );
    }
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Stock Details");

    const variantsData: any[][] = [["#", "Color", "Quantity", "Unit"]];
    stockData.variants.forEach((v: any, i: number) => {
      variantsData.push([i + 1, v.color, v.quantity, v.unit]);
    });
    const wsVariants = XLSX.utils.aoa_to_sheet(variantsData);
    XLSX.utils.book_append_sheet(wb, wsVariants, "Variants");

    XLSX.writeFile(wb, `Stock_${stockData._id}.xlsx`);
  };

  // Transform backend data to frontend display format
  const transformStocks = (stocks: Stock[]): DisplayStock[] => {
    return stocks.map((stock) => {
      const totalQuantity = stock.variants.reduce((sum, v) => {
        if (v.unit === "METERS") {
          return sum + v.quantity;
        }
        if (v.unit === "SETS") {
          const setSize = stock.variants.length || 3;
          return sum + v.quantity * (setSize === 3 ? 180 : 120);
        }
        return sum;
      }, 0);

      const colors = stock.variants.map((v) => v.color);
      const status = stock.status || "available";

      // Get product reference from stock details
      const prodField: any = (stock.stockDetails as any).product;
      const productRef =
        typeof prodField === "string"
          ? isLikelyObjectId(prodField)
            ? prodField
            : prodField || ""
          : prodField && prodField._id
          ? String(prodField._id)
          : "";

      const designNumber = getProductName(productRef);
      const productCategory = getProductCategory(productRef);
      const productDisplay = productCategory
        ? `${productCategory} (${designNumber})`
        : designNumber;

      // ✅ Merge images from stockDetails or productDetails
      const images = stock.productDetails?.images[0] || "";

      const baseStock: DisplayStock = {
        id: stock._id,
        productRef,
        product: productDisplay,
        quantity: totalQuantity,
        status,
        stockType: stock.stockType,
        createdAt: stock.createdAt,
        productIsActive: true,
        productIsDeleted: !stock.productExists,
        variants: stock.variants,
        designNumber,
        colors,
        images,
      };

      if (stock.stockType === "Gray Stock") {
        const details = stock.stockDetails as GrayStockDetails;
        return {
          ...baseStock,
          factory: details.factory,
          agent: details.agent,
          orderNumber: details.orderNumber,
        };
      } else if (stock.stockType === "Factory Stock") {
        const details = stock.stockDetails as FactoryStockDetails;
        return {
          ...baseStock,
          factory: details.processingFactory,
          stage: details.processingStage,
          expectedCompletion: new Date(
            details.expectedCompletion
          ).toLocaleDateString(),
        };
      } else if (stock.stockType === "Design Stock") {
        const details = stock.stockDetails as DesignStockDetails;
        return {
          ...baseStock,
          design: details.design,
          warehouse: details.warehouse,
        };
      }

      return baseStock;
    });
  };

  // Transform stocks (server-side filtering already applied)
  const displayStocks = useMemo(() => {
    return transformStocks(stocks);
  }, [stocks]);

  useEffect(() => {
    const fetchStockStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stock/stats`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch stock stats");

        const data = await response.json();

        if (data.success) {
          const statsMap: Record<string, number> = {};
          data.stocksByType.forEach((item: any) => {
            statsMap[item.type] = parseFloat(item.quantity);
          });

          setStockStats({
            totalStocks: data.totalStocks,
            grayTotal: statsMap["Gray Stock"] || 0,
            factoryTotal: statsMap["Factory Stock"] || 0,
            designTotal: statsMap["Design Stock"] || 0,
            lowStockItems: displayStocks.filter((s) => s.status === "low")
              .length,
            outOfStockItems: displayStocks.filter((s) => s.status === "out")
              .length,
            processingItems: displayStocks.filter(
              (s) => s.status === "processing"
            ).length,
          });
        }
      } catch (err) {
        console.error("Error fetching stock stats:", err);
      }
    };

    fetchStockStats();
  }, [displayStocks]);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const stockType = getStockTypeFromTab(activeTab);
    fetchStocks(
      newPage,
      pagination.itemsPerPage,
      stockType,
      debouncedSearchTerm,
      selectedFilter,
      sortBy
    );
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    const stockType = getStockTypeFromTab(activeTab);
    fetchStocks(
      1,
      newLimit,
      stockType,
      debouncedSearchTerm,
      selectedFilter,
      sortBy
    );
  };

  // Pagination component
  const PaginationControls = () => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing page {pagination.currentPage} of {pagination.totalPages} (
            {pagination.totalItems} total items)
          </div>
          <Select
            value={pagination.itemsPerPage.toString()}
            onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
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
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (
                  pagination.currentPage >=
                  pagination.totalPages - 2
                ) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={
                      pagination.currentPage === pageNum ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8"
                  >
                    {pageNum}
                  </Button>
                );
              }
            )}
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
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "low":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
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
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const createVariantTooltip = (item: DisplayStock) => {
    if (!item.variants || item.variants.length === 0) {
      return "No variant details available";
    }

    return (
      <div className="space-y-1">
        <div className="font-medium text-sm">Variant Details:</div>
        {item.variants.map((variant, index) => (
          <div key={index} className="text-xs">
            <span className="font-medium">{variant.color}:</span>{" "}
            {variant.quantity} {variant.unit}
          </div>
        ))}
        <div className="border-t pt-1 mt-1">
          <span className="font-medium text-xs">
            Total: {(Number(item.quantity) / 60).toFixed(2)} sets
          </span>
        </div>
      </div>
    );
  };

  // Download functions for individual stocks
  const handleDownloadPDF = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock/${id}`);
      if (!response.ok) throw new Error("Failed to fetch stock data");

      const data: StockResponse = await response.json();
      if (data.success && data.stock) {
        let productDisplay: string | undefined = undefined;
        try {
          const productRef: any = (data.stock.stockDetails as any)?.product;
          if (productRef && typeof productRef === "object") {
            const name = productRef.productName || "";
            const category = productRef.category || "";
            productDisplay = category ? `${category} (${name})` : name;
          } else if (typeof productRef === "string") {
            const idRegex = /^[a-fA-F0-9]{24}$/;
            if (idRegex.test(productRef)) {
              const pRes = await fetch(
                `${API_BASE_URL}/products/${productRef}`
              );
              if (pRes.ok) {
                const pData = await pRes.json();
                const p = pData?.product || pData?.formattedProduct;
                if (p) {
                  const name = p.productName || String(productRef);
                  const category = p.category || "";
                  productDisplay = category ? `${category} (${name})` : name;
                }
              }
            } else {
              productDisplay = String(productRef);
            }
          }
        } catch {}
        downloadStockAsPDF(data.stock, productDisplay);
      }
    } catch (error) {
      console.error("Error downloading stock PDF:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExcel = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/stock/${id}`);
      if (!response.ok) throw new Error("Failed to fetch stock data");

      const data = await response.json();
      if (data.success && data.stock) {
        let productDisplay: string | undefined = undefined;
        try {
          const productRef: any = (data.stock.stockDetails as any)?.product;
          if (productRef && typeof productRef === "object") {
            const name = productRef.productName || "";
            const category = productRef.category || "";
            productDisplay = category ? `${category} (${name})` : name;
          } else if (typeof productRef === "string") {
            const idRegex = /^[a-fA-F0-9]{24}$/;
            if (idRegex.test(productRef)) {
              const pRes = await fetch(
                `${API_BASE_URL}/products/${productRef}`
              );
              if (pRes.ok) {
                const pData = await pRes.json();
                const p = pData?.product || pData?.formattedProduct;
                if (p) {
                  const name = p.productName || String(productRef);
                  const category = p.category || "";
                  productDisplay = category ? `${category} (${name})` : name;
                }
              }
            } else {
              productDisplay = String(productRef);
            }
          }
        } catch {}
        downloadStockAsExcel(data.stock, productDisplay);
      }
    } catch (error) {
      console.error("Error downloading stock Excel:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download Excel",
        variant: "destructive",
      });
    }
  };

  const [stockStats, setStockStats] = useState({
    totalStocks: 0,
    grayTotal: 0,
    factoryTotal: 0,
    designTotal: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    processingItems: 0,
  });

  // Loading state
  if (loading && stocks.length === 0) {
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
                <BreadcrumbPage>Stock Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading stock data...</span>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Error state
  if (error && stocks.length === 0) {
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
                <BreadcrumbPage>Stock Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load stock data
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <TooltipProvider>
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
                <BreadcrumbPage>Stock Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Stock Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track gray, factory, and design stock
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/stock/adjustments">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Adjustments
                </Button>
              </Link>
              <Link href="/stock/logs">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Package className="h-4 w-4 mr-2" />
                  Logs
                </Button>
              </Link>
              <Link href="/stock/add">
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </Link>
            </div>
          </div>

          {/* Stock Overview Cards */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Stocks
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stockStats.totalStocks}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  All stock items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gray Stock
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(stockStats.grayTotal).toFixed(2)} sets
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  Unfinished fabric
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Factory Stock
                </CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(stockStats.factoryTotal).toFixed(2)} sets
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  In processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Design Stock
                </CardTitle>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number(stockStats.designTotal).toFixed(2)} sets
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Ready for sale
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Status Cards */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
            <Card
              className="cursor-pointer transition-colors bg-muted/40 sm:bg-card border border-muted-foreground/10 sm:border-border"
              onClick={() => {
                setSelectedFilter("low");
                toast({
                  title: "Filter Applied",
                  description: "Showing only low stock items",
                });
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {stockStats.lowStockItems}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need attention
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-colors bg-muted/40 sm:bg-card border border-muted-foreground/10 sm:border-border"
              onClick={() => {
                setSelectedFilter("out");
                toast({
                  title: "Filter Applied",
                  description: "Showing only out of stock items",
                });
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Out of Stock
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {stockStats.outOfStockItems}
                </div>
                <p className="text-xs text-muted-foreground">
                  Urgent restocking
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40 sm:bg-card border border-muted-foreground/10 sm:border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Processing
                </CardTitle>
                <Factory className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {stockStats.processingItems}
                </div>
                <p className="text-xs text-muted-foreground">In production</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stocks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Select
                  value={selectedFilter}
                  onValueChange={setSelectedFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSortBy("-createdAt")}
                      className="cursor-pointer"
                    >
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("createdAt")}
                      className="cursor-pointer"
                    >
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("-updatedAt")}
                      className="cursor-pointer"
                    >
                      Recently Updated
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("updatedAt")}
                      className="cursor-pointer"
                    >
                      Least Recently Updated
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Stock Types */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gray">
                <Package className="h-4 w-4 mr-2" />
                Gray Stock
              </TabsTrigger>
              <TabsTrigger value="factory">
                <Factory className="h-4 w-4 mr-2" />
                Factory Stock
              </TabsTrigger>
              <TabsTrigger value="design">
                <Palette className="h-4 w-4 mr-2" />
                Design Stock
              </TabsTrigger>
            </TabsList>

            {/* Stock Table for All Tabs */}
            {["gray", "factory", "design"].map((tabValue) => (
              <TabsContent
                key={tabValue}
                value={tabValue}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {tabValue === "gray" && "Gray Stock"}
                      {tabValue === "factory" && "Factory Processing Stock"}
                      {tabValue === "design" && "Design Stock"}
                    </CardTitle>
                    <CardDescription>
                      {tabValue === "gray" &&
                        "Raw materials and unprocessed stock"}
                      {tabValue === "factory" &&
                        "Stock currently being processed at factories"}
                      {tabValue === "design" &&
                        "Finished stock with designs ready for sale"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                              Product
                            </th>
                            <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                              Quantity
                            </th>
                            {tabValue === "gray" && (
                              <>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">
                                  Factory
                                </th>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">
                                  Agent
                                </th>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden lg:table-cell">
                                  Order #
                                </th>
                              </>
                            )}
                            {tabValue === "factory" && (
                              <>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">
                                  Factory
                                </th>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">
                                  Stage
                                </th>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden lg:table-cell">
                                  Expected
                                </th>
                              </>
                            )}
                            {tabValue === "design" && (
                              <>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">
                                  Design
                                </th>
                                <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">
                                  Warehouse
                                </th>
                              </>
                            )}
                            <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                              Status
                            </th>
                            <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : displayStocks.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="p-8 text-center text-muted-foreground"
                              >
                                No stocks found
                              </td>
                            </tr>
                          ) : (
                            displayStocks.map((item) => (
                              <tr
                                key={item.id}
                                className={`border-b hover:bg-muted/50 ${
                                  item.productIsDeleted
                                    ? "bg-red-50"
                                    : item.productIsActive === false
                                    ? "bg-muted/60"
                                    : ""
                                }`}
                              >
                                <td className="p-2 sm:p-4 font-medium text-xs sm:text-sm">
                                  <div className="flex items-start gap-3">
                                    {item.images &&
                                      item.images.trim() !== "" && (
                                        <img
                                          src={item.images}
                                          alt={String(item.product)}
                                          className="flex-none w-12 h-12 object-cover rounded border bg-gray-100"
                                        />
                                      )}

                                    <div className="min-w-0 flex-1 flex flex-col">
                                      <span className="text-sm font-medium leading-tight flex items-center gap-2">
                                        {item.product}
                                        {item.productIsDeleted ? (
                                          <Badge
                                            variant="destructive"
                                            className="text-[10px]"
                                          >
                                            Deleted
                                          </Badge>
                                        ) : item.productIsActive === false ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                          >
                                            Inactive
                                          </Badge>
                                        ) : null}
                                      </span>

                                      {item.colors &&
                                        item.colors.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {item.colors.map((color, i) => (
                                              <span
                                                key={i}
                                                className="px-2 py-0.5 text-[10px] rounded bg-black text-white"
                                              >
                                                {color}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </td>

                                <td className="p-2 sm:p-4 text-xs sm:text-sm">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help">
                                        {(Number(item.quantity) / 60).toFixed(
                                          2
                                        )}{" "}
                                        sets
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {createVariantTooltip(item)}
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                {tabValue === "gray" && (
                                  <>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">
                                      {item.factory}
                                    </td>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden md:table-cell">
                                      {item.agent}
                                    </td>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden lg:table-cell">
                                      {item.orderNumber}
                                    </td>
                                  </>
                                )}
                                {tabValue === "factory" && (
                                  <>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">
                                      {item.factory}
                                    </td>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden md:table-cell">
                                      {item.stage}
                                    </td>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden lg:table-cell">
                                      {item.expectedCompletion}
                                    </td>
                                  </>
                                )}
                                {tabValue === "design" && (
                                  <>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">
                                      {item.design}
                                    </td>
                                    <td className="p-2 sm:p-4 text-xs sm:text-sm hidden md:table-cell">
                                      {item.warehouse}
                                    </td>
                                  </>
                                )}
                                <td className="p-2 sm:p-4">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(item.status)}
                                      <Select
                                        value={item.status}
                                        onValueChange={(value) =>
                                          handleStatusChange(item.id, value)
                                        }
                                        disabled={
                                          updatingStatus[item.id] ||
                                          item.productIsActive === false ||
                                          item.productIsDeleted
                                        }
                                      >
                                        <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="available">
                                            Available
                                          </SelectItem>
                                          <SelectItem value="low">
                                            Low Stock
                                          </SelectItem>
                                          <SelectItem value="out">
                                            Out of Stock
                                          </SelectItem>
                                          <SelectItem value="processing">
                                            Processing
                                          </SelectItem>
                                          <SelectItem value="quality_check">
                                            Quality Check
                                          </SelectItem>
                                          {item.stockType ===
                                            "Factory Stock" && (
                                            <SelectItem value="completed">
                                              Completed
                                            </SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {updatingStatus[item.id] && (
                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                  <div className="flex gap-1 sm:gap-2">
                                    {item.productIsDeleted ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0"
                                        onClick={() =>
                                          handleDeleteStock(item.id)
                                        }
                                        disabled={deletingStock[item.id]}
                                        title="Remove stock"
                                      >
                                        {deletingStock[item.id] ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                                        )}
                                      </Button>
                                    ) : (
                                      <>
                                        <Link href={`/stock/${item.id}`}>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            disabled={
                                              item.productIsActive === false ||
                                              item.productIsDeleted
                                            }
                                          >
                                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                          </Button>
                                        </Link>
                                        <Link href={`/stock/${item.id}/edit`}>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            disabled={
                                              item.productIsActive === false ||
                                              item.productIsDeleted
                                            }
                                          >
                                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                          </Button>
                                        </Link>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 w-8 p-0"
                                              title="Download stock details"
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleDownloadPDF(item.id)
                                              }
                                              className="cursor-pointer"
                                            >
                                              <FileText className="h-4 w-4 mr-2" />
                                              PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleDownloadExcel(item.id)
                                              }
                                              className="cursor-pointer"
                                            >
                                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                                              EXCEL
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SidebarInset>
    </TooltipProvider>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Package,
  Edit,
  Factory,
  Calendar,
  TrendingUp,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Loader2,
  Settings,
  Warehouse,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import StockLogsCard from "@/components/StockLogsCard";

interface StockVariant {
  color: string;
  quantity: number;
  unit: string;
}

interface StockDetails {
  product: string;
  factory: string;
  agent: string;
  orderNumber: string;
  processingFactory?: string;
  processingStage?: string;
  expectedCompletion?: string;
  warehouse?: string;
  design?: string;
}

interface AdditionalInfo {
  batchNumber: string;
  qualityGrade: string;
  notes: string;
}

interface Stock {
  _id: string;
  stockType: string;
  status: string;
  variants: StockVariant[];
  stockDetails: StockDetails;
  addtionalInfo: AdditionalInfo;
  createdAt: string;
  updatedAt: string;
}

interface StockResponse {
  success: boolean;
  stock: Stock;
}

export default function StockViewPage() {
  const { id: stockId } = useParams();
  const { toast } = useToast();
  const [stockData, setStockData] = useState<StockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/stock/${stockId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch stock data");
        }
        const data: StockResponse = await response.json();
        setStockData(data);
        console.log(data);
      } catch (err) {
        toast({
          title: "Fetch Failed",
          description:
            err instanceof Error ? err.message : "Failed to load stock data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (stockId) {
      fetchStockData();
    }
  }, [stockId, toast]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "low":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTotalQuantity = (variants: StockVariant[]) => {
    return variants.reduce((total, variant) => total + variant.quantity, 0);
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

  if (isLoading) {
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
                <BreadcrumbPage>Loading...</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </SidebarInset>
    );
  }

  if (!stockData?.success) {
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
                <BreadcrumbPage>Error</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <p className="text-muted-foreground">Failed to load stock data</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  const stock = stockData.stock;
  const totalQuantity = getTotalQuantity(stock.variants);

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
              <BreadcrumbPage>{stock.stockType}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="sm:hidden text-sm font-medium text-muted-foreground">
          {stock.stockType}
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/stock">
              <Button variant="outline" size="sm" className="w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">
                {stock.stockType}
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/stock/${stockId}/edit`}>
              <Button className="w-full sm:w-auto">
                <Edit className="h-4 w-4 mr-2" />
                Edit Stock
              </Button>
            </Link>
          </div>
        </div>

        {/* Stock Overview Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Product
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getProductDisplayName(stock.stockDetails.product)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Stock
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  // compute total meters
                  const totalMeters = stock.variants.reduce((sum, v) => {
                    if (v.unit === "METERS") {
                      return sum + v.quantity;
                    }
                    if (v.unit === "SETS") {
                      const setSize = stock.variants.length || 3; // assume 3 colors unless specified
                      return sum + v.quantity * (setSize === 3 ? 180 : 120);
                    }
                    return sum;
                  }, 0);

                  return `${totalMeters} meters`;
                })()}
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {getStatusIcon(stock.status)}
                {stock.status}
              </p>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Order Number</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stock.stockDetails.orderNumber}</div>
              <p className="text-xs text-muted-foreground">Purchase order</p>
            </CardContent>
          </Card> */}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Batch Number
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stock.addtionalInfo.batchNumber}
              </div>
              <p className="text-xs text-muted-foreground">Batch reference</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Quality Grade
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stock.addtionalInfo.qualityGrade}
              </div>
              <p className="text-xs text-muted-foreground">Quality rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Details and Variants */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Basic stock details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getStatusBadge(stock.status)}
              </div>

              <div className="space-y-2">
                {/* Dynamic fields based on stock type */}
                {stock.stockType === "Gray Stock" && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span>Factory: {stock.stockDetails.factory}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Agent: {stock.stockDetails.agent}</span>
                    </div>
                  </>
                )}

                {stock.stockType === "Factory Stock" && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Processing Factory:{" "}
                        {stock.stockDetails.processingFactory}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Processing Stage: {stock.stockDetails.processingStage}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Created: {new Date(stock.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock Type</span>
                  <span className="font-medium">{stock.stockType}</span>
                </div>

                {/* Show order number only for Gray Stock */}
                {stock.stockType === "Gray Stock" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Number</span>
                    <span className="font-medium">
                      {stock.stockDetails.orderNumber}
                    </span>
                  </div>
                )}

                {/* Show expected completion for Factory Stock */}
                {stock.stockType === "Factory Stock" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Expected Completion
                    </span>
                    <span className="font-medium">
                      {stock.stockDetails.expectedCompletion
                        ? new Date(
                            stock.stockDetails.expectedCompletion
                          ).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Batch Number</span>
                  <span className="font-medium">
                    {stock.addtionalInfo.batchNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality Grade</span>
                  <span className="font-medium">
                    {stock.addtionalInfo.qualityGrade}
                  </span>
                </div>
              </div>

              {stock.addtionalInfo.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Notes</span>
                    <p className="text-sm text-muted-foreground">
                      {stock.addtionalInfo.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stock Variants */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Stock Variants</CardTitle>
                <CardDescription>
                  Available colors and quantities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                          Color
                        </th>
                        <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                          Quantity
                        </th>
                        <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">
                          Unit
                        </th>
                        <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.variants.map((variant, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span className="capitalize text-xs sm:text-sm">
                                {variant.color}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4 font-medium text-xs sm:text-sm">
                            <div className="flex flex-col">
                              <span>{variant.quantity}</span>
                              <span className="text-muted-foreground text-xs sm:hidden">
                                {variant.unit}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4 text-xs sm:text-sm hidden sm:table-cell">
                            {variant.unit}
                          </td>
                          <td className="p-2 sm:p-4">
                            {variant.quantity > 10 ? (
                              <Badge variant="default" className="text-xs">
                                In Stock
                              </Badge>
                            ) : variant.quantity > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <StockLogsCard productName={stock.stockDetails.product} />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

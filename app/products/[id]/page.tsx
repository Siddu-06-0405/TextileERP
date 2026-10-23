"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  User,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_BASE_URL, getRecentOrdersByProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Define Product type based on backend schema
interface ProductVariant {
  color: string;
  pricePerMeters: number;
  stockInMeters: number;
}

interface Product {
  _id: string;
  productName: string;
  category: string;
  tags: string[];
  variants: ProductVariant[];
  images?: string[];
  status?: string;
  isActive?: boolean;
  stockInfo?: {
    minimumStock: number;
    reorderPoint: number;
    storageLocation: string;
  };
  unit?: string;
  description?: string;
  setSize?: number;
  createdAt?: string;
  updatedAt?: string;
  sku?: string;
  [key: string]: any;
}

export default function ProductViewPage() {
  const { toast } = useToast()
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/products/${productId}`
        );
        if (!response.ok) throw new Error("Failed to fetch product");
        const data = await response.json();
        setProduct(data.formattedProduct);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // Fetch recent orders for this product
  useEffect(() => {
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        // console.log("🔍 Frontend: Fetching orders for productId:", productId);
        const data = await getRecentOrdersByProduct(productId, 5);
        // console.log("📋 Frontend: API response:", data);
        if (data.success) {
          setRecentOrders(data.recentOrders);
          // console.log("✅ Frontend: Set recent orders:", data.recentOrders);
        } else {
          // console.log("❌ Frontend: API returned success: false");
          setOrdersError("Failed to load recent orders");
        }
      } catch (err) {
        // console.log("❌ Frontend: Error fetching orders:", err);
        setOrdersError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setOrdersLoading(false);
      }
    };
    if (productId) fetchOrders();
  }, [productId]);
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found.</div>;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "low":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "out":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>;
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800">Shipped</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateIST = (dateString: string | undefined) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    // Convert to IST (UTC+5:30)
    const istOffset = 330 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istDate = new Date(date.getTime() + istOffset);

    // Format date as DD/MM/YYYY
    const day = String(istDate.getUTCDate()).padStart(2, "0");
    const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
    const year = istDate.getUTCFullYear();

    // Format time as HH:MM AM/PM
    let hours = istDate.getUTCHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm} IST`;
  };

  const totalStock = product.variants?.reduce(
    (sum, v) => sum + (v.stockInMeters || 0),
    0
  ) || 0;

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
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.productName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-start justify-between">
          <div className="flex items-start gap-4">
            {getStatusIcon(product.status || "unknown")}
            <div>
              <h1 className="text-3xl font-bold">
                {product.category}

                <span className="ml-2 text-base font-medium text-muted-foreground">
                ({product.productName})
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{product.variants?.length || 0} variants</Badge>
                <Badge variant={product.isActive !== false ? "default" : "secondary"}>
                  {product.isActive !== false ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/products/${productId}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
            </Link>
            
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Product Images */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={product.images?.[selectedImage] || "/placeholder.svg"}
                    alt={product.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {product.images && product.images.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 ${
                          selectedImage === index
                            ? "border-primary"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`${product.productName} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <div className="md:col-span-2">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                {/* <TabsTrigger value="stock">Stock History</TabsTrigger> */}
                <TabsTrigger value="orders">Recent Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="w-full gap-4 md:grid-cols-2">
                  {/* <Card>
                    <CardHeader>
                      <CardTitle>Stock Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Unit</span>
                        <span>{product.unit || "METERS"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Stock</span>
                        <span className="font-medium">{totalStock}m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Minimum Stock</span>
                        <span>{product.stockInfo?.minimumStock ?? "N/A"}m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Variants Available</span>
                        <span className="font-medium">{product.variants?.length || 0}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Price Range</span>
                          <span className="text-lg font-bold">
                            ₹{Math.min(...(product.variants?.map(v => v.pricePerMeters) || [0]))} - 
                            ₹{Math.max(...(product.variants?.map(v => v.pricePerMeters) || [0]))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card> */}

                  <Card>
                    <CardHeader>
                      <CardTitle>Product Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-sm font-medium">Description</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {product.description}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Tags</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.tags?.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <span className="text-sm font-medium">Created</span>
                          <p className="text-sm text-muted-foreground">
                            {formatDateIST(product.createdAt)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Updated</span>
                          <p className="text-sm text-muted-foreground">
                            {formatDateIST(product.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="variants" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      All available colors and their pricing details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {product.variants && product.variants.length > 0 ? (
                      <div className="space-y-4">
                        {product.variants.map((variant, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3">
                                {/* <div className="w-4 h-4 rounded-full bg-muted border"></div> */}
                                <div>
                                  <p className="font-medium">{variant.color}</p>
                                  
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                ₹{variant.pricePerMeters?.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">per meter</p>
                            </div>
                          </div>
                        ))}
                    
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No variants available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>
                      Orders containing this product
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Loading recent orders...
                      </p>
                    ) : ordersError ? (
                      <p className="text-sm text-red-500">{ordersError}</p>
                    ) : recentOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No recent orders found for this product.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {recentOrders.map((order) => (
                          <Link
                            key={order.originalId}
                            href={`/orders/${order.originalId}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                              <div>
                                <p className="font-medium text-sm">
                                  Order {order.orderId}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {order.customer}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {order.items
                                    ?.map(
                                      (i: any) =>
                                        `${i.color} - ${i.quantity} ${i.unit}`
                                    )
                                    .join(", ")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateIST(order.orderDate)}
                                </p>
                              </div>
                              <div>{getOrderStatusBadge(order.status)}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  RotateCcw,
  ArrowLeft,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  User,
  Calendar,
  FileText,
  Tag,
  Ruler,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";


interface Return {
  _id: string;
  id: string;
  orderId: string;
  order: string;
  customer: string;
  product: string;
  color: string;
  quantityInMeters: number;
  returnReason: string;
  isApprove: boolean;
  isRejected?: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
  refundAmount?: number;
}

interface Order {
  _id: string;
  customer: string;
  orderItems: OrderItem[];
  orderDate: string;
  deliveryDate: string;
  notes?: string;
}

interface OrderItem {
  product: string;
  color: string;
  quantity: number;
  pricePerMeters: number;
}

export default function ReturnViewPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const returnId = params.id as string;

  const [returnData, setReturnData] = useState<Return | null>(null);
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productMap, setProductMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchReturnData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch return details
        const returnResponse = await fetch(`${API_BASE_URL}/returns/${returnId}`);
        if (!returnResponse.ok) {
          throw new Error("Failed to fetch return details");
        }
        const returnResult = await returnResponse.json();
        setReturnData(returnResult.return);

        // Fetch order details if we have order ID
        if (returnResult.return.order) {
          const orderResponse = await fetch(`${API_BASE_URL}/order/${returnResult.return.order}`);
          if (orderResponse.ok) {
            const orderResult = await orderResponse.json();
            setOrderData(orderResult.order);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch return data";
        toast({
          title: "Failed to Fetch Return Data",
          description: errorMessage,
          variant: "destructive"
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (returnId) {
      fetchReturnData();
    }
  }, [returnId]);

  // Load products to resolve Product Name (Design Number)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        if (!res.ok) return;
        const data = await res.json();
        const list: any[] = data?.products || [];
        const map: Record<string, string> = {};
        for (const p of list) {
          if (p && typeof p.productName === "string") {
            map[p.productName] = p.category || "";
          }
        }
        setProductMap(map);
      } catch {}
    };
    loadProducts();
  }, []);

  const getStatusIcon = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return isApprove ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-orange-500" />
    );
  };

  const getStatusText = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return "Rejected";
    return isApprove ? "Approved" : "Pending";
  };

  const getStatusColor = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return "destructive";
    return isApprove ? "default" : "secondary";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading return details...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error || !returnData) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error loading return</h3>
            <p className="text-muted-foreground mb-4">{error || "Return not found"}</p>
            <Button onClick={() => router.push("/returns")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Returns
            </Button>
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
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/returns">Returns</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Return {returnData.id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-4 sm:space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/returns")}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Back to Returns</span>
              <span className="xs:hidden">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">Return {returnData.id}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Return request details and information
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/returns/${returnId}/edit`)}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Edit Return</span>
              <span className="xs:hidden">Edit</span>
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {getStatusIcon(returnData.isApprove, returnData.isRejected)}
          <Badge variant={getStatusColor(returnData.isApprove, returnData.isRejected)}>
            {getStatusText(returnData.isApprove, returnData.isRejected)}
          </Badge>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Return Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                Return Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Return ID</p>
                  <p className="text-sm sm:text-base font-medium break-all">{returnData.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm sm:text-base font-medium">{formatDate(returnData.date || returnData.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Product</p>
                  <p className="text-sm sm:text-base font-medium break-words">{returnData.product}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Color</p>
                  <p className="text-sm sm:text-base font-medium">{returnData.color}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Quantity</p>
                  <p className="text-sm sm:text-base font-medium">{returnData.quantityInMeters} meters</p>
                </div>
                {returnData.refundAmount && (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Refund Amount</p>
                    <p className="text-sm sm:text-base font-medium">₹{returnData.refundAmount.toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Return Reason</p>
                <p className="text-sm sm:text-base mt-1 p-3 bg-muted rounded-md break-words">{returnData.returnReason}</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Customer Name</p>
                <p className="text-sm sm:text-base font-medium break-words">{returnData.customer}</p>
              </div>
              
              {orderData && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Order ID</p>
                    <p className="text-sm sm:text-base font-medium">
                      {(() => {
                        const orderId = returnData.order || returnData.orderId;
                        if (!orderId) return "N/A";
                        const numericChars = orderId.replace(/[^0-9]/g, "");
                        const lastThreeDigits = numericChars.slice(-3).padStart(3, "0");
                        return `ORD-${lastThreeDigits}`;
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Order Date</p>
                    <p className="text-sm sm:text-base font-medium">{formatDate(orderData.orderDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Delivery Date</p>
                    <p className="text-sm sm:text-base font-medium">{formatDate(orderData.deliveryDate)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Items (if available) */}
          {orderData && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Original Order Items
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Items from the original order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full min-w-[640px]">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-medium">Product</th>
                          <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-medium">Color</th>
                          <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-medium">Quantity</th>
                          <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-medium">Price/Meter</th>
                          <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderData.orderItems.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 sm:p-4 text-xs sm:text-sm font-medium break-words max-w-[120px] sm:max-w-none">
                              {(productMap[item.product] || item.product)} ({item.product})
                            </td>
                            <td className="p-2 sm:p-4 text-xs sm:text-sm">{item.color}</td>
                            <td className="p-2 sm:p-4 text-xs sm:text-sm">{item.quantity}m</td>
                            <td className="p-2 sm:p-4 text-xs sm:text-sm">₹{item.pricePerMeters}</td>
                            <td className="p-2 sm:p-4 text-xs sm:text-sm font-medium">
                              ₹{(item.quantity * item.pricePerMeters).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Return Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-medium">Return Request Created</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(returnData.createdAt)}
                    </p>
                  </div>
                </div>
                
                {returnData.isApprove && (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium">Return Approved</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(returnData.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
                
                {returnData.isRejected && (
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium">Return Rejected</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(returnData.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
}
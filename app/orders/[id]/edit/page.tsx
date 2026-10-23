"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  X,
  Save,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, hasPermissionToChangeOrderStatus } from "@/lib/user-role";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { API_BASE_URL } from "@/lib/api";

// TypeScript interfaces
interface OrderItem {
  product: string;
  color: string;
  quantity: number;
  unit: string;
  pricePerMeters: number;
}

interface Order {
  _id: string;
  customer: string;
  status?: string;
  orderDate: string;
  deliveryDate: string;
  orderItems: OrderItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  city?: string;
}

interface Product {
  _id: string;
  productName: string;
  variants: {
    color: string;
    price: number;
    sku: string;
  }[];
}

interface FormOrderItem {
  id: number;
  product: string;
  color: string;
  quantity: number;
  price: number;
  total: number;
  stockId?: string;
}

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { toast } = useToast();
  const { role, isLoading: roleLoading } = useUserRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [stockTypeById, setStockTypeById] = useState<Record<string, string>>(
    {}
  );

  const [formData, setFormData] = useState({
    customer: "",
    status: "pending",
    orderDate: new Date(),
    dueDate: new Date(),
    notes: "",
    paidAmount: 0, // Add paidAmount field
    indentNumber: "",
  });

  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([
    {
      id: 1,
      product: "",
      color: "",
      quantity: 0,
      price: 0,
      total: 0,
      stockId: "",
    },
  ]);

  // Fetch order, customers, and products on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch order details, customers, and products in parallel
        const [
          orderResponse,
          customersResponse,
          productsResponse,
          stocksResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/order/${orderId}`),
          fetch(`${API_BASE_URL}/customer`),
          fetch(`${API_BASE_URL}/products`),
          fetch(`${API_BASE_URL}/stock`),
        ]);

        if (!orderResponse.ok) {
          throw new Error("Failed to fetch order details");
        }

        const orderData = await orderResponse.json();
        if (!orderData.success || !orderData.order) {
          throw new Error("Invalid order response");
        }

        // Transform backend order to form data
        const order = orderData.order;

        // Transform order items first
        const transformedItems = order.orderItems.map(
          (item: OrderItem, index: number) => ({
            id: index + 1,
            product: item.product,
            color: item.color,
            quantity: item.quantity,
            price: item.pricePerMeters,
            total: item.quantity * item.pricePerMeters,
            stockId: item.stockId, // Preserve stockId
          })
        );
        setOrderItems(transformedItems);

        // Calculate total and paid amount
        const orderTotal = transformedItems.reduce(
          (sum: number, item: any) => sum + item.total,
          0
        );
        // Use actual paidAmount from backend if it exists, otherwise default to 40%
        const paidAmount =
          order.paidAmount !== null && order.paidAmount !== undefined
            ? order.paidAmount
            : Math.floor(orderTotal * 0.4);

        setFormData({
          customer: order.customer,
          status: order.status || "pending", // Use actual status from backend
          orderDate: new Date(order.orderDate),
          dueDate: new Date(order.deliveryDate),
          notes: order.notes || "",
          paidAmount: paidAmount,
          indentNumber: (order as any).indentNumber ? String((order as any).indentNumber) : "",
        });

        // Handle customers response
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          if (customersData.success && customersData.customers) {
            setCustomers(customersData.customers);
          }
        }

        // Handle products response
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          if (productsData.success && productsData.products) {
            setProducts(productsData.products);
          }
        }

        // Handle stocks response to map stockId -> stockType
        if (stocksResponse.ok) {
          const stocksData = await stocksResponse.json();
          if (stocksData.success && Array.isArray(stocksData.stocks)) {
            const map: Record<string, string> = {};
            for (const s of stocksData.stocks) {
              if (s && s._id && s.stockType) map[s._id] = s.stockType;
            }
            setStockTypeById(map);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load order data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  // Consider duplicates only when the SAME stock (stockId) and color repeat
  const hasDuplicateInOrderByStock = (
    stockId: string | undefined,
    color: string,
    excludeId?: number
  ) => {
    if (!stockId) return false;
    return orderItems.some(
      (item) =>
        item.id !== excludeId &&
        item.stockId === stockId &&
        item.color === color
    );
  };

  // Get available colors from selected product, excluding duplicates only by SAME stockId
  const getAvailableColors = (productName: string, excludeId?: number) => {
    const product = products.find((p) => p.productName === productName);
    if (!product) return [];
    const currentStockId = orderItems.find(
      (i) => i.id === (excludeId as number)
    )?.stockId;

    return product.variants
      .map((v) => v.color)
      .filter(
        (color) => !hasDuplicateInOrderByStock(currentStockId, color, excludeId)
      );
  };

  // Get price for selected product and color
  const getProductPrice = (productName: string, color: string) => {
    const product = products.find((p) => p.productName === productName);
    if (!product) return 0;
    const variant = product.variants.find((v) => v.color === color);
    return variant ? variant.price : 0;
  };

  // Helpers to determine product status
  const isProductDeleted = (productName: string) => {
    if (!productName) return false;
    return !products.some((p) => (p.productName || "") === productName);
  };

  const isProductInactive = (productName: string) => {
    if (!productName) return false;
    const p: any = products.find(
      (pp) => (pp.productName || "") === productName
    );
    return p ? p.isActive === false : false;
  };

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const handleInputChange = (field: string, value: string | Date | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addOrderItem = () => {
    const newId = Math.max(...orderItems.map((item) => item.id)) + 1;
    setOrderItems([
      ...orderItems,
      {
        id: newId,
        product: "",
        color: "",
        quantity: 0,
        price: 0,
        total: 0,
        stockId: "",
      },
    ]);
  };

  const removeOrderItem = (id: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((item) => item.id !== id));
    }
  };

  const updateOrderItem = (
    id: number,
    field: string,
    value: string | number
  ) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Reset color and price when product changes
          if (field === "product") {
            updatedItem.color = "";
            updatedItem.price = 0;
          }

          // Auto-populate price when color is selected
          if (field === "color" && item.product) {
            const price = getProductPrice(item.product, value as string);
            updatedItem.price = price;
          }

          // Calculate total
          updatedItem.total = updatedItem.quantity * updatedItem.price;

          return updatedItem;
        }
        return item;
      })
    );
  };

  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  // Calculate paid amount (40% of total by default, like in view page)
  const calculatePaidAmount = () => {
    return Math.floor(getOrderTotal() * 0.4);
  };

  // Format order ID as ORD-XXX where XXX is a number
  const formatOrderId = (orderId: string) => {
    // Extract only numeric digits from the ID
    const numericChars = orderId.replace(/[^0-9]/g, "");
    // Use the last 3 digits, or pad with zeros if less than 3 digits
    const lastThreeDigits = numericChars.slice(-3).padStart(3, "0");
    return `ORD-${lastThreeDigits}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const validItems = orderItems.filter(
      (item) => item.product && item.color && item.quantity > 0
    );
    if (!formData.customer || validItems.length === 0) {
      toast({
        title: "Missing information",
        description: "Please add customer and at least one valid item.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Transform form data to backend format
      const backendOrderItems = validItems.map((item) => ({
        product: item.product,
        color: item.color,
        quantity: item.quantity,
        unit: "METERS",
        pricePerMeters: item.price,
        stockId: item.stockId, // Preserve stockId
      }));

      const orderData = {
        customer: formData.customer,
        status: formData.status,
        orderDate: formData.orderDate.toISOString(),
        deliveryDate: formData.dueDate.toISOString(),
        orderItems: backendOrderItems,
        notes: formData.notes,
        paidAmount: formData.paidAmount, // Include paidAmount in the order data
      };

      // Include indentNumber if provided, else clear
      if (formData.indentNumber !== undefined && formData.indentNumber !== null && String(formData.indentNumber).trim() !== "") {
        orderData.indentNumber = Number(formData.indentNumber);
      } else {
        orderData.indentNumber = ""; // signal clear
      }

      const response = await fetch(`${API_BASE_URL}/order/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as any).message || "Failed to update order");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update order");
      }

      // console.log("Order updated successfully:", result);
      toast({
        title: "Order updated",
        description: "Order has been saved successfully.",
      });
      setTimeout(() => router.push("/orders"), 900);
    } catch (err) {
      console.error("Error updating order:", err);
      const message =
        err instanceof Error ? err.message : "Failed to update order";
      toast({
        title: "Failed to update order",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const resp = await fetch(`${API_BASE_URL}/order/${orderId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as any).message || "Failed to delete order");
      }
      router.push("/orders");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  // Add All Colors handler
  const addAllColorsForProduct = (baseItem: FormOrderItem) => {
    if (!baseItem.product) return;

    const product = products.find((p) => p.productName === baseItem.product);
    if (!product) return;

    const allColors = product.variants.map((v) => v.color);

    const existingColors = orderItems
      .filter((item) => item.product === baseItem.product)
      .map((item) => item.color);

    const missingColors = allColors.filter(
      (color) => !existingColors.includes(color)
    );

    if (missingColors.length === 0) {
      toast({
        title: "No additional colors",
        description: "All colors already added.",
        variant: "default",
      });
      return;
    }

    const baseQuantity = baseItem.quantity;
    const basePrice = baseItem.price;

    const newItems = missingColors.map((color) => {
      const variant = product.variants.find((v) => v.color === color);
      const price = variant ? variant.price : 0;
      return {
        id: Date.now() + Math.random(),
        product: baseItem.product,
        color,
        quantity: baseQuantity,
        price: basePrice,
        total: baseQuantity * basePrice,
        stockId: baseItem.stockId,
      };
    });

    setOrderItems((prev) => [...prev, ...newItems]);
    toast({
      title: "Colors added",
      description: `Added ${missingColors.length} colors for ${product.productName}`,
      variant: "default",
    });
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="hidden sm:block">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/orders/${orderId}`}>
                  {formatOrderId(orderId)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="sm:hidden">
          <h1 className="text-lg font-semibold">Edit Order</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Edit Order</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Update order information and items
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Failed to load order</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Order Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Information</CardTitle>
                    <CardDescription>
                      Basic order details and status
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer *</Label>
                      <Select
                        value={formData.customer}
                        onValueChange={(value) =>
                          handleInputChange("customer", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem
                              key={customer._id}
                              value={customer.customerName}
                            >
                              <div className="flex flex-col">
                                <span>{customer.customerName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.city || "N/A"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Order Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleInputChange("status", value)
                        }
                        disabled={!hasPermissionToChangeOrderStatus(role)}
                      >
                        <SelectTrigger
                          title={
                            !hasPermissionToChangeOrderStatus(role)
                              ? "Only Managers and Owners can change order status"
                              : ""
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!hasPermissionToChangeOrderStatus(role) && (
                        <p className="text-sm text-muted-foreground">
                          Only Managers and Owners can change order status
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={formData.paidAmount || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "paidAmount",
                            Number.parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Order Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.orderDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.orderDate
                                ? format(formData.orderDate, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.orderDate}
                              onSelect={(date) =>
                                date && handleInputChange("orderDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.dueDate
                                ? format(formData.dueDate, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.dueDate}
                              onSelect={(date) =>
                                date && handleInputChange("dueDate", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="indentNumber">INDENT NUMBER (optional, unique)</Label>
                      <Input
                        id="indentNumber"
                        type="number"
                        placeholder="Enter indent number"
                        value={formData.indentNumber}
                        onChange={(e) => handleInputChange("indentNumber", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>Order totals and pricing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span>
                          {
                            orderItems.filter((item) => item.quantity > 0)
                              .length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Quantity:</span>
                        <span>
                          {orderItems.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}{" "}
                          meters
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span>₹{getOrderTotal().toLocaleString()}</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
                        <Input
                          id="paidAmount"
                          type="number"
                          value={formData.paidAmount}
                          onChange={(e) =>
                            handleInputChange(
                              "paidAmount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Enter paid amount"
                        />
                        <p className="text-xs text-muted-foreground">
                          Default: 40% of total (₹
                          {calculatePaidAmount().toLocaleString()})
                        </p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Balance Amount:</span>
                        <span
                          className={
                            getOrderTotal() - formData.paidAmount < 0
                              ? "text-red-500"
                              : ""
                          }
                        >
                          ₹
                          {(
                            getOrderTotal() - formData.paidAmount
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Order Items</CardTitle>
                    <CardDescription>Products in this order</CardDescription>
                  </div>
                  <Button type="button" onClick={addOrderItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderItems.map((item, index) => {
                      const productDeleted = isProductDeleted(item.product);
                      const productInactive = isProductInactive(item.product);
                      return (
                        <div
                          key={item.id}
                          className={`grid gap-4 p-4 border rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 ${
                            productDeleted
                              ? "bg-red-50"
                              : productInactive
                              ? "bg-muted/60"
                              : ""
                          }`}
                          title={
                            productDeleted
                              ? "Product is deleted, so this item is orphaned"
                              : productInactive
                              ? "Product is inactive"
                              : ""
                          }
                        >
                          <div className="space-y-2">
                            <Label>Product *</Label>
                            <Select
                              value={item.product}
                              onValueChange={(value) =>
                                updateOrderItem(item.id, "product", value)
                              }
                              disabled={productInactive || productDeleted}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem
                                    key={product._id}
                                    value={product.productName}
                                  >
                                    <div className="flex flex-col h-10">
                                      <span>{product.productName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {product.variants.length} variants
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(productDeleted || productInactive) && (
                              <div className="mt-1">
                                {productDeleted ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    Deleted
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Color *</Label>
                            <Select
                              value={item.color}
                              onValueChange={(value) =>
                                updateOrderItem(item.id, "color", value)
                              }
                              disabled={productInactive || productDeleted}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select color" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableColors(item.product, item.id).map(
                                  (color) => (
                                    <SelectItem key={color} value={color}>
                                      {color}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            {/* Add All Colors button - appears only if product is selected */}
                            {item.product && (
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => addAllColorsForProduct(item)}
                                disabled={!item.quantity || item.quantity <= 0}
                                className="mt-2"
                              >
                                Add All Colors
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Quantity (m) *</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateOrderItem(
                                  item.id,
                                  "quantity",
                                  Number.parseInt(e.target.value) || 0
                                )
                              }
                              disabled={productInactive || productDeleted}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Price/meter (₹)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.price || ""}
                              onChange={(e) =>
                                updateOrderItem(
                                  item.id,
                                  "price",
                                  Number.parseInt(e.target.value) || 0
                                )
                              }
                              disabled={productInactive || productDeleted}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Total (₹)</Label>
                            <Input
                              value={item.total.toLocaleString()}
                              disabled
                              className="bg-muted"
                            />
                          </div>

                          <div className="flex items-end">
                            {productDeleted ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeOrderItem(item.id)}
                                title="Remove deleted item"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeOrderItem(item.id)}
                                disabled={orderItems.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Validation Warning (same category and color) */}
              {(() => {
                const duplicates = [];
                const seen = new Set();

                for (const item of orderItems) {
                  if (item.product && item.color) {
                    const category = item.stockId
                      ? stockTypeById[item.stockId]
                      : undefined;
                    if (!category) continue; // can't classify; skip to avoid false positives
                    const combination = `${category}-${item.color}`;
                    if (seen.has(combination)) {
                      duplicates.push(`${category} - ${item.color}`);
                    } else {
                      seen.add(combination);
                    }
                  }
                }

                if (duplicates.length > 0) {
                  return (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Duplicate Color within Same Stock Category Detected
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>
                              The following stock category + color pairs are
                              duplicated in this order:
                            </p>
                            <ul className="list-disc list-inside mt-1">
                              {duplicates.map((dup, index) => (
                                <li key={index}>{dup}</li>
                              ))}
                            </ul>
                            <p className="mt-2 font-medium">
                              Same color is allowed across different categories
                              (e.g., Gray vs Factory).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                  <CardDescription>
                    Additional information or special instructions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Enter any special instructions or notes for this order..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <div className="w-full sm:w-auto">
                  <div className="text-sm text-muted-foreground"></div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                      >
                        Delete Order
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="mx-4 sm:mx-0">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this order?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the order and remove it from the orders list.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                          No
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Yes, delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </SidebarInset>
  );
}

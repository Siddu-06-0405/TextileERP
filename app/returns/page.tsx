"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  Search,
  Plus,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Undo2,
  Eye,
  Edit,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  formattedOrderId?: string;
  refundAmount?: number;
}

interface Order {
  _id: string;
  customer: string;
  orderItems: OrderItem[];
}

interface OrderItem {
  product: string;
  color: string;
  quantity: number;
  pricePerMeters: number;
}

interface Product {
  _id: string;
  productName: string;
  category?: string;
  variants: ProductVariant[];
  isActive?: boolean;
}

interface ProductVariant {
  color: string;
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [returns, setReturns] = useState<Return[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [undoConfirmDialog, setUndoConfirmDialog] = useState<{
    isOpen: boolean;
    returnId: string | null;
    returnDetails: any | null;
  }>({
    isOpen: false,
    returnId: null,
    returnDetails: null,
  });

  // Multi-order form state
  type NewReturnForm = {
    order: string;
    product: string;
    color: string;
    quantityInMeters: string;
  };
  const [newReturnForms, setNewReturnForms] = useState<NewReturnForm[]>([
    { order: "", product: "", color: "", quantityInMeters: "" },
  ]);
  const [commonReason, setCommonReason] = useState("");

  // Queue multiple items to process in one go (supports multi orders and colors)
  type NewReturnItem = {
    order: string;
    product: string;
    color: string;
    quantityInMeters: string; // keep as string for input; convert on submit
    returnReason: string;
  };
  const [newReturnItems, setNewReturnItems] = useState<NewReturnItem[]>([]);

  const resetCurrentSelection = () => {
    setNewReturnForms([
      { order: "", product: "", color: "", quantityInMeters: "" },
    ]);
    setCommonReason("");
  };

  // Removed add order button flow; multi-items are added via Add all colors only

  const addAllColorsForProduct = (formIndex: number) => {
    const form = newReturnForms[formIndex];
    if (!form.order || !form.product) {
      toast({
        title: "Missing fields",
        description: "Select order and product before adding all colors.",
        variant: "destructive",
      });
      return;
    }
    const variantColors = getProductColors(form.product);
    if (variantColors.length === 0) {
      toast({
        title: "No colors",
        description: "No color variants found for selected product.",
        variant: "destructive",
      });
      return;
    }
    const items: NewReturnItem[] = variantColors.map((c) => ({
      order: form.order,
      product: form.product,
      color: c,
      quantityInMeters: "",
      returnReason: commonReason || "",
    }));
    setNewReturnItems((prev) => [...prev, ...items]);
    // clear only color/qty for this selector to avoid duplicate
    setNewReturnForms((prev) =>
      prev.map((f, idx) =>
        idx === formIndex ? { ...f, color: "", quantityInMeters: "" } : f
      )
    );
  };

  const addMoreOrderForm = () => {
    setNewReturnForms((prev) => [
      ...prev,
      { order: "", product: "", color: "", quantityInMeters: "" },
    ]);
  };

  const removeQueuedItem = (index: number) => {
    setNewReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQueuedItemQty = (index: number, qty: string) => {
    setNewReturnItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantityInMeters: qty } : it))
    );
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);

      // console.log("Fetching returns...");
      const returnsRes = await fetch(`${API_BASE_URL}/returns`);
      if (!returnsRes.ok) {
        throw new Error(`Returns API error: ${returnsRes.status}`);
      }
      const returnsData = await returnsRes.json();
      // console.log("Returns data:", returnsData);

      if (returnsData.success && returnsData.returns) {
        // console.log("Raw returns data from backend:", returnsData.returns);

        // Format order IDs as ORD-XXX
        const formattedReturns = returnsData.returns.map((returnItem: any) => {
          // Format order ID
          const orderId = returnItem.order || returnItem.orderId;
          // Extract only numeric digits from the ID
          const numericChars = orderId.replace(/[^0-9]/g, "");
          // Use the last 3 digits, or pad with zeros if less than 3 digits
          const lastThreeDigits = numericChars.slice(-3).padStart(3, "0");
          const formattedOrderId = `ORD-${lastThreeDigits}`;

          // Format date if it exists, otherwise use createdAt
          const formattedDate =
            returnItem.date ||
            (returnItem.createdAt
              ? new Date(returnItem.createdAt).toISOString().split("T")[0]
              : "N/A");

          return {
            ...returnItem,
            formattedOrderId,
            date: formattedDate,
          };
        });

        // console.log("Formatted returns before setting state:", formattedReturns);

        // Set the new data
        setReturns(formattedReturns);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to Fetch Returns",
        description: errorMessage,
        variant: "destructive",
      });
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch returns
        await fetchReturns();

        // Fetch orders
        // console.log("Fetching orders...");
        const ordersRes = await fetch(`${API_BASE_URL}/order`);
        if (!ordersRes.ok) {
          throw new Error(`Orders API error: ${ordersRes.status}`);
        }
        const ordersData = await ordersRes.json();
        if (!ordersData.success) {
          throw new Error(ordersData.message || "Failed to fetch orders");
        }
        // console.log("Orders data:", ordersData);
        setOrders(ordersData.orders || []);

        // Fetch products (support both /api/v1/products and /api/v1/products/products)
        // console.log("Fetching products...");
        let productsData: any = null;
        let productsRes = await fetch(`${API_BASE_URL}/products`);
        if (productsRes.ok) {
          const data = await productsRes.json();
          if (data?.success && Array.isArray(data.products)) {
            productsData = data.products;
          }
        }
        if (!productsData) {
          // Try fallback route if backend is mounted at /api/v1/products
          productsRes = await fetch(`${API_BASE_URL}/products/products`);
          if (!productsRes.ok) {
            throw new Error(`Products API error: ${productsRes.status}`);
          }
          const data = await productsRes.json();
          if (!data.success) {
            throw new Error(data.message || "Failed to fetch products");
          }
          productsData = data.products || [];
        }
        // console.log("Products data:", productsData);
        setProducts(productsData);

        // Extract colors from products
        const colorsFromProducts = Array.from(
          new Set(
            productsData.products?.flatMap(
              (p: Product) =>
                p.variants?.map((v: ProductVariant) => v.color) || []
            ) || []
          )
        ) as string[];
        setColors(colorsFromProducts);
      } catch (err) {
        console.error("Fetch error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        toast({
          title: "Failed to Fetch Data",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debug: Monitor returns state changes
  useEffect(() => {
    // console.log("Returns state updated:", returns);
    // console.log("Approved returns:", returns.filter(r => r.isApprove));
    // console.log("Pending returns:", returns.filter(r => !r.isApprove && !r.isRejected));
    // console.log("Rejected returns:", returns.filter(r => r.isRejected));
  }, [returns]);

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
  };

  // Filter returns based on search term and status
  const filteredReturns = returns.filter((returnItem: Return) => {
    const matchesSearch =
      returnItem.order.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "approved" && returnItem.isApprove) ||
      (selectedStatus === "pending" &&
        !returnItem.isApprove &&
        !returnItem.isRejected) ||
      (selectedStatus === "rejected" && returnItem.isRejected);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (isApprove: boolean, isRejected?: boolean) => {
    if (isRejected) return "destructive";
    return isApprove ? "default" : "secondary";
  };

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

  // Bulk actions for pending returns visible in the table
  const approveAllPending = async () => {
    try {
      setBulkLoading(true);
      const targets = filteredReturns.filter(
        (r) => !r.isApprove && !r.isRejected
      );
      if (targets.length === 0) return;
      const results = await Promise.allSettled(
        targets.map((r) =>
          fetch(`${API_BASE_URL}/returns/${r._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isApprove: true }),
          })
        )
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.length - fulfilled;
      await fetchReturns();
      toast({
        title: "Approve All",
        description:
          `Approved ${fulfilled} item(s)` +
          (rejected ? `, ${rejected} failed` : ""),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Bulk approve failed";
      toast({
        title: "Approve All Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const rejectAllPending = async () => {
    try {
      setBulkLoading(true);
      const targets = filteredReturns.filter(
        (r) => !r.isApprove && !r.isRejected
      );
      if (targets.length === 0) return;
      const results = await Promise.allSettled(
        targets.map((r) =>
          fetch(`${API_BASE_URL}/returns/${r._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isApprove: false, isRejected: true }),
          })
        )
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.length - fulfilled;
      await fetchReturns();
      toast({
        title: "Reject All",
        description:
          `Rejected ${fulfilled} item(s)` +
          (rejected ? `, ${rejected} failed` : ""),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk reject failed";
      toast({
        title: "Reject All Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Get products for the selected order
  const getOrderProducts = (orderId: string) => {
    if (!orderId) return [];
    const selectedOrder = orders.find((order) => order._id === orderId);
    if (!selectedOrder) return [];

    // Extract unique products from order items
    const orderProducts = selectedOrder.orderItems.map(
      (item: OrderItem) => item.product
    );
    return products.filter((product) =>
      orderProducts.includes(product.productName)
    );
  };

  // Helpers: determine if a product is deleted or inactive by name
  const isProductDeletedByName = (name: string) => {
    if (!name) return false;
    return !products.some((p) => (p.productName || "") === name);
  };

  const isProductInactiveByName = (name: string) => {
    if (!name) return false;
    const p: any = products.find((pp) => (pp.productName || "") === name);
    return p ? p.isActive === false : false;
  };

  const isOrderInvalid = (order: Order) => {
    if (!order || !Array.isArray(order.orderItems)) return false;
    return order.orderItems.some(
      (item) =>
        isProductDeletedByName(item.product) ||
        isProductInactiveByName(item.product)
    );
  };

  // Get colors for the selected product
  const getProductColors = (productName: string) => {
    if (!productName) return [];
    const selectedProduct = products.find(
      (product) => product.productName === productName
    );
    if (!selectedProduct) return [];

    return selectedProduct.variants.map(
      (variant: ProductVariant) => variant.color
    );
  };

  // Get available quantity for the selected order, product, and color
  const getAvailableQuantity = (
    orderId: string,
    productName: string,
    color: string
  ) => {
    if (!orderId || !productName || !color) return 0;

    const selectedOrder = orders.find((order) => order._id === orderId);
    if (!selectedOrder) return 0;

    const orderItem = selectedOrder.orderItems.find(
      (item: OrderItem) => item.product === productName && item.color === color
    );

    return orderItem ? orderItem.quantity : 0;
  };

  const getProductDisplay = (productName: string) => {
    const p = products.find((prod) => (prod.productName || "") === productName);
    const productTitle = p?.category || "";
    return productTitle ? `${productTitle} (${productName})` : productName;
  };

  // Get actual return value based on order item price
  const getReturnValue = (returnItem: Return) => {
    const order = orders.find((o) => o._id === returnItem.order);
    if (order) {
      const orderItem = order.orderItems.find(
        (item) =>
          item.product === returnItem.product && item.color === returnItem.color
      );
      if (orderItem) {
        return returnItem.quantityInMeters * orderItem.pricePerMeters;
      }
    }
    // Fallback to estimated value if order not found
    return returnItem.quantityInMeters * 450;
  };

  const returnStats = {
    total: returns.length,
    pending: returns.filter((r) => !r.isApprove && !r.isRejected).length,
    approved: returns.filter((r) => r.isApprove).length,
    rejected: returns.filter((r) => r.isRejected).length,
    processed: returns.filter((r) => r.isApprove).length, // For now, processed = approved
    totalValue: returns.reduce((sum, r) => sum + getReturnValue(r), 0),
  };

  const handleCreateReturn = async () => {
    try {
      // Build batch: queued items + any completed single items from forms
      const batch: {
        order: string;
        product: string;
        color: string;
        quantityInMeters: string;
        returnReason: string;
      }[] = [...newReturnItems];
      for (const f of newReturnForms) {
        const q = parseFloat(f.quantityInMeters);
        const include = !!(
          f.order &&
          f.product &&
          f.color &&
          f.quantityInMeters &&
          !isNaN(q) &&
          q > 0
        );
        if (include) {
          batch.push({
            order: f.order,
            product: f.product,
            color: f.color,
            quantityInMeters: f.quantityInMeters,
            returnReason: commonReason || "",
          });
        }
      }

      if (batch.length === 0) {
        toast({
          title: "Nothing to process",
          description: "Add at least one item to process.",
          variant: "destructive",
        });
        return;
      }

      // Apply common reason to items missing reason
      const reason = (commonReason || "").trim();
      for (let i = 0; i < batch.length; i++) {
        if (!batch[i].returnReason && reason) {
          batch[i].returnReason = reason;
        }
      }

      // Validate all items
      for (const it of batch) {
        const errs: string[] = [];
        if (!it.order) errs.push("order");
        if (!it.product) errs.push("product");
        if (!it.color) errs.push("color");
        const q = parseFloat(it.quantityInMeters);
        if (!it.quantityInMeters || isNaN(q) || q <= 0) errs.push("quantity");
        if (!it.returnReason) errs.push("reason");
        if (errs.length) {
          toast({
            title: "Validation Error",
            description: `Fix ${errs.join(
              ", "
            )} for all items before processing.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Submit sequentially to the same existing endpoint
      for (const it of batch) {
        const response = await fetch(`${API_BASE_URL}/returns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: it.order,
            product: it.product,
            color: it.color,
            quantityInMeters: parseFloat(it.quantityInMeters),
            returnReason: it.returnReason,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Failed to create one of the returns"
          );
        }
        await response.json();
      }

      // Show success toast
      toast({
        title: "Returns Created",
        description: `Processed ${batch.length} return item(s).`,
        variant: "default",
      });

      // Instead of adding to existing array, refresh the entire data
      await fetchReturns();

      setNewReturnForms([
        { order: "", product: "", color: "", quantityInMeters: "" },
      ]);
      setCommonReason("");
      setNewReturnItems([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create return";
      toast({
        title: "Failed to Create Return",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleApproveReturn = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isApprove: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to approve return");
      }

      const updatedReturn = await response.json();

      // Refresh the data
      await fetchReturns();

      toast({
        title: "Return Approved Successfully",
        description: `Return has been approved successfully.`,
        variant: "default",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to approve return";
      toast({
        title: "Failed to Approve Return",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRejectReturn = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isApprove: false, isRejected: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reject return");
      }

      const updatedReturn = await response.json();

      // Refresh the data
      await fetchReturns();

      toast({
        title: "Return Rejected Successfully",
        description: `Return has been rejected successfully.`,
        variant: "default",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reject return";
      toast({
        title: "Failed to Reject Return",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUndoReturn = async (id: string) => {
    try {
      // console.log("Starting undo operation for return:", id);
      // console.log("Current returns state before undo:", returns);
      // console.log("Current approved returns:", returns.filter(r => r.isApprove));
      // console.log("Current pending returns:", returns.filter(r => !r.isApprove && !r.isRejected));

      const response = await fetch(`${API_BASE_URL}/returns/${id}/undo`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to undo return");
      }

      const updatedReturn = await response.json();
      // console.log("Backend response for undo:", updatedReturn);

      // Refresh the data
      await fetchReturns();

      // Debug: Log the returns after refresh
      // console.log("Returns after undo:", returns);
      // console.log("Approved returns after undo:", returns.filter(r => r.isApprove));
      // console.log("Pending returns after undo:", returns.filter(r => !r.isApprove && !r.isRejected));

      // Check for duplicates
      const returnIds = returns.map((r) => r._id);
      const duplicateIds = returnIds.filter(
        (id, index) => returnIds.indexOf(id) !== index
      );
      if (duplicateIds.length > 0) {
        console.warn("Duplicate return IDs found:", duplicateIds);
      }

      // Close confirmation dialog if it was open
      if (undoConfirmDialog.isOpen) {
        setUndoConfirmDialog({
          isOpen: false,
          returnId: null,
          returnDetails: null,
        });
      }

      // Show success message
      toast({
        title: "Return Undone Successfully",
        description: `Return has been moved back to pending requests.`,
        variant: "default",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to undo return";
      toast({
        title: "Failed to Undo Return",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openUndoConfirmation = (returnItem: Return) => {
    setUndoConfirmDialog({
      isOpen: true,
      returnId: returnItem._id,
      returnDetails: returnItem,
    });
  };

  const handleApproveAllPending = async () => {
    try {
      setBulkLoading(true);
      const pending = filteredReturns.filter(
        (r) => !r.isApprove && !r.isRejected
      );
      if (pending.length === 0) {
        toast({
          title: "No pending returns",
          description: "There are no pending requests to approve.",
          variant: "destructive",
        });
        return;
      }
      await Promise.allSettled(
        pending.map((r) =>
          fetch(`${API_BASE_URL}/returns/${r._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isApprove: true }),
          })
        )
      );
      await fetchReturns();
      toast({
        title: "Approved",
        description: `Approved ${pending.length} pending request(s).`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve all";
      toast({
        title: "Bulk Approve Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRejectAllPending = async () => {
    try {
      setBulkLoading(true);
      const pending = filteredReturns.filter(
        (r) => !r.isApprove && !r.isRejected
      );
      if (pending.length === 0) {
        toast({
          title: "No pending returns",
          description: "There are no pending requests to reject.",
          variant: "destructive",
        });
        return;
      }
      await Promise.allSettled(
        pending.map((r) =>
          fetch(`${API_BASE_URL}/returns/${r._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isApprove: false, isRejected: true }),
          })
        )
      );
      await fetchReturns();
      toast({
        title: "Rejected",
        description: `Rejected ${pending.length} pending request(s).`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject all";
      toast({
        title: "Bulk Reject Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "Rajesh Textiles",
      date: "2024-01-15",
      items: 3,
    },
    { id: "ORD-002", customer: "Fashion Hub", date: "2024-01-14", items: 2 },
    { id: "ORD-003", customer: "Style Point", date: "2024-01-13", items: 4 },
    { id: "ORD-004", customer: "Modern Fabrics", date: "2024-01-12", items: 2 },
  ];

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
              <BreadcrumbPage>Returns</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-4 p-3 md:space-y-6 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              Returns Management
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Process and track product returns
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Process Return
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[95vw] max-w-lg mx-auto sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Process New Return</DialogTitle>
                <DialogDescription>
                  Select order and items to return
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Multi-order forms */}
                {newReturnForms.map((form, formIndex) => (
                  <div
                    key={`form-${formIndex}`}
                    className="space-y-4 border rounded-md p-3"
                  >
                    {/* Select Order */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`order-${formIndex}`}>
                          Select Order
                        </Label>
                        {formIndex === newReturnForms.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={addMoreOrderForm}
                          >
                            Add More Orders
                          </Button>
                        )}
                      </div>
                      <Select
                        value={form.order}
                        onValueChange={(value) => {
                          setNewReturnForms((prev) =>
                            prev.map((f, idx) =>
                              idx === formIndex
                                ? {
                                    order: value,
                                    product: "",
                                    color: "",
                                    quantityInMeters: "",
                                  }
                                : f
                            )
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose order" />
                        </SelectTrigger>
                        <SelectContent>
                          {orders
                            .filter((order) => !isOrderInvalid(order))
                            .map((order) => {
                              const orderId = order._id;
                              const numericChars = orderId.replace(
                                /[^0-9]/g,
                                ""
                              );
                              const lastThreeDigits = numericChars
                                .slice(-3)
                                .padStart(3, "0");
                              const formattedOrderId = `ORD-${lastThreeDigits}`;
                              return (
                                <SelectItem key={order._id} value={order._id}>
                                  {formattedOrderId} - {order.customer}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Select Product */}
                    <div className="space-y-2">
                      <Label htmlFor={`product-${formIndex}`}>Product</Label>
                      <Select
                        value={form.product}
                        onValueChange={(value) => {
                          setNewReturnForms((prev) =>
                            prev.map((f, idx) =>
                              idx === formIndex
                                ? { ...f, product: value, color: "" }
                                : f
                            )
                          );
                        }}
                        disabled={!form.order}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              form.order
                                ? "Select product"
                                : "Select order first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {getOrderProducts(form.order).map((product) => (
                            <SelectItem
                              key={product._id}
                              value={product.productName}
                            >
                              {product.category || product.productName} (
                              {product.productName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Color & Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`color-${formIndex}`}>Color</Label>
                        <Select
                          value={form.color}
                          onValueChange={(value) =>
                            setNewReturnForms((prev) =>
                              prev.map((f, idx) =>
                                idx === formIndex ? { ...f, color: value } : f
                              )
                            )
                          }
                          disabled={!form.product}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                form.product
                                  ? "Select color"
                                  : "Select product first"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {getProductColors(form.product).map((color) => (
                              <SelectItem key={color} value={color}>
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addAllColorsForProduct(formIndex)}
                            disabled={!form.order || !form.product}
                          >
                            Add all colors
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`quantity-${formIndex}`}>
                          Quantity (sets)
                        </Label>
                        <Input
                          id={`quantity-${formIndex}`}
                          type="number"
                          value={
                            form.quantityInMeters
                              ? Number(form.quantityInMeters) / 60
                              : ""
                          }
                          onChange={(e) =>
                            setNewReturnForms((prev) =>
                              prev.map((f, idx) =>
                                idx === formIndex
                                  ? {
                                      ...f,
                                      quantityInMeters: String(
                                        Number(e.target.value) * 60
                                      ),
                                    }
                                  : f
                              )
                            )
                          }
                          max={
                            getAvailableQuantity(
                              form.order,
                              form.product,
                              form.color
                            ) / 60
                          }
                        />
                        {form.order && form.product && form.color && (
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Available:{" "}
                            {getAvailableQuantity(
                              form.order,
                              form.product,
                              form.color
                            ) / 60}{" "}
                            sets
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Queued items */}
                {newReturnItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Queued items</Label>
                    <div className="space-y-2 max-h-72 overflow-auto pr-1">
                      {newReturnItems.map((it, idx) => (
                        <div
                          key={`${it.order}-${it.product}-${it.color}-${idx}`}
                          className="flex items-center gap-2 border rounded p-2"
                        >
                          <div className="text-xs flex-1">
                            <div className="font-medium">
                              Order:{" "}
                              {(() => {
                                const o = orders.find(
                                  (x) => x._id === it.order
                                );
                                const id = o ? o._id : it.order;
                                const num = (id || "").replace(/[^0-9]/g, "");
                                const last = num.slice(-3).padStart(3, "0");
                                return `ORD-${last}`;
                              })()}
                            </div>
                            <div>Product: {it.product}</div>
                            <div>Color: {it.color || "-"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-8 w-28"
                              type="number"
                              placeholder="Qty (m)"
                              value={it.quantityInMeters}
                              onChange={(e) =>
                                updateQueuedItemQty(idx, e.target.value)
                              }
                            />
                            {it.order && it.product && it.color && (
                              <p className="text-[10px] text-muted-foreground">
                                Available:{" "}
                                {getAvailableQuantity(
                                  it.order,
                                  it.product,
                                  it.color
                                )}
                                m
                              </p>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQueuedItem(idx)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Return Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Return Reason (applies to all items unless overridden)
                  </Label>
                  <Textarea
                    id="reason"
                    value={commonReason}
                    onChange={(e) => setCommonReason(e.target.value)}
                    placeholder="Describe the reason for return..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleCreateReturn}
                    disabled={
                      !(
                        newReturnItems.length > 0 ||
                        newReturnForms.some(
                          (f) =>
                            f.order &&
                            f.product &&
                            f.color &&
                            f.quantityInMeters &&
                            parseFloat(f.quantityInMeters) > 0
                        )
                      )
                    }
                  >
                    Process Return
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Cancel
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Undo Confirmation Dialog */}
          <Dialog
            open={undoConfirmDialog.isOpen}
            onOpenChange={(open) => {
              if (!open) {
                setUndoConfirmDialog({
                  isOpen: false,
                  returnId: null,
                  returnDetails: null,
                });
              }
            }}
          >
            <DialogContent className="w-[95vw] max-w-md mx-auto sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Undo Return Approval</DialogTitle>
                <DialogDescription>
                  Are you sure you want to undo this return approval? This will
                  move the return back to pending requests.
                </DialogDescription>
              </DialogHeader>

              {undoConfirmDialog.returnDetails && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Return ID:</span>
                      <p>{undoConfirmDialog.returnDetails.id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Customer:</span>
                      <p>{undoConfirmDialog.returnDetails.customer}</p>
                    </div>
                    <div>
                      <span className="font-medium">Product:</span>
                      <p>{undoConfirmDialog.returnDetails.product}</p>
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span>
                      <p>{undoConfirmDialog.returnDetails.quantityInMeters}m</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-2 pt-4">
                <Button
                  onClick={() => {
                    if (undoConfirmDialog.returnId) {
                      handleUndoReturn(undoConfirmDialog.returnId);
                    }
                  }}
                  className="flex-1"
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Yes, Undo Approval
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUndoConfirmDialog({
                      isOpen: false,
                      returnId: null,
                      returnDetails: null,
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 md:gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Total Returns
              </CardTitle>
              <RotateCcw className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {returnStats.total}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Pending
              </CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-orange-500">
                {returnStats.pending}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Approved
              </CardTitle>
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-green-500">
                {returnStats.approved}
              </div>
              <p className="text-xs text-muted-foreground">Ready to process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Rejected
              </CardTitle>
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-red-500">
                {returnStats.rejected}
              </div>
              <p className="text-xs text-muted-foreground">Declined returns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Processed
              </CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold text-blue-500">
                {returnStats.processed}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">
                Return Value
              </CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                ₹{returnStats.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total value</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search returns..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Returns Table */}
        {/* Return Ledger - Approved Returns */}
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Return Ledger</CardTitle>
            <CardDescription className="text-sm">
              Approved returns that have been processed and moved to the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-6 md:p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-xs md:text-sm text-muted-foreground">
                    Loading returns...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-6 md:p-8">
                <div className="text-center">
                  <p className="text-red-500 text-sm">Error: {error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {/* Mobile Card View */}
                  <div className="md:hidden">
                    {returns
                      .filter((r) => r.isApprove)
                      .map((r) => (
                        <div key={r._id} className="border-b p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {r.id || "N/A"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {r.date || "N/A"}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUndoConfirmation(r)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 py-1"
                              title="Undo approval - move back to pending requests"
                            >
                              <Undo2 className="h-3 w-3 mr-1" />
                              Undo
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Order:
                              </span>
                              <div>{r.formattedOrderId || "N/A"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Customer:
                              </span>
                              <div>{r.customer || "Unknown Customer"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Product:
                              </span>
                              <div>{r.product}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Color:
                              </span>
                              <div>{r.color}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Qty:
                              </span>
                              <div>{r.quantityInMeters}m</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Reason:
                              </span>
                              <div className="truncate">{r.returnReason}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">
                            Return ID
                          </th>
                          <th className="text-left p-4 font-medium">Date</th>
                          <th className="text-left p-4 font-medium">
                            Order ID
                          </th>
                          <th className="text-left p-4 font-medium">
                            Customer
                          </th>
                          <th className="text-left p-4 font-medium">Product</th>
                          <th className="text-left p-4 font-medium">Color</th>
                          <th className="text-left p-4 font-medium">Qty</th>
                          <th className="text-left p-4 font-medium">Reason</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returns
                          .filter((r) => r.isApprove)
                          .map((r) => (
                            <tr
                              key={r._id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-4 font-medium">
                                {r.id || "N/A"}
                              </td>
                              <td className="p-4">{r.date || "N/A"}</td>
                              <td className="p-4">
                                {r.formattedOrderId || "N/A"}
                              </td>
                              <td className="p-4">
                                {r.customer || "Unknown Customer"}
                              </td>
                              <td className="p-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help">
                                        {r.product}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {getProductDisplay(r.product)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </td>
                              <td className="p-4">{r.color}</td>
                              <td className="p-4">{r.quantityInMeters}m</td>
                              <td className="p-4">{r.returnReason}</td>
                              <td className="p-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUndoConfirmation(r)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Undo approval - move back to pending requests"
                                >
                                  <Undo2 className="h-4 w-4 mr-1" />
                                  Undo
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg md:text-xl">
                  Return Requests
                </CardTitle>
                <CardDescription className="text-sm">
                  Pending return requests awaiting approval
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApproveAllPending}
                  disabled={bulkLoading}
                >
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectAllPending}
                  disabled={bulkLoading}
                >
                  Reject All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-6 md:p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-xs md:text-sm text-muted-foreground">
                    Loading returns...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-6 md:p-8">
                <div className="text-center">
                  <p className="text-red-500 text-sm">Error: {error}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {/* Mobile Card View */}
                  <div className="md:hidden">
                    {filteredReturns
                      .filter((returnItem) => !returnItem.isApprove)
                      .map((returnItem) => (
                        <div
                          key={returnItem.id || returnItem._id}
                          className={`border-b p-3 space-y-3 ${
                            returnItem.isRejected
                              ? "bg-gray-100 opacity-60"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {returnItem.id || "N/A"}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(
                                  returnItem.isApprove,
                                  returnItem.isRejected
                                )}
                                <Badge
                                  variant={getStatusColor(
                                    returnItem.isApprove,
                                    returnItem.isRejected
                                  )}
                                  className="text-xs"
                                >
                                  {getStatusText(
                                    returnItem.isApprove,
                                    returnItem.isRejected
                                  )}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-sm">
                                ₹{getReturnValue(returnItem).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Return Value
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">
                                Order:
                              </span>
                              <div>{returnItem.formattedOrderId || "N/A"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Customer:
                              </span>
                              <div>
                                {returnItem.customer || "Unknown Customer"}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Product:
                              </span>
                              <div>{returnItem.product}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Color:
                              </span>
                              <div>{returnItem.color}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Quantity:
                              </span>
                              <div>{returnItem.quantityInMeters}m</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Reason:
                              </span>
                              <div className="truncate">
                                {returnItem.returnReason}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {/* View Button - Only for pending and approved returns */}
                            {!returnItem.isRejected && (
                              <Link href={`/returns/${returnItem._id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}

                            {/* Edit Button - Only for pending and approved returns */}
                            {!returnItem.isRejected && (
                              <Link href={`/returns/${returnItem._id}/edit`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}

                            {/* Approve/Reject Buttons - Only for pending returns */}
                            {!returnItem.isApprove &&
                              !returnItem.isRejected && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleApproveReturn(returnItem._id)
                                    }
                                    className="text-xs px-2 py-1"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRejectReturn(returnItem._id)
                                    }
                                    className="text-xs px-2 py-1"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                            {/* Process Button - Only for approved returns */}
                            {returnItem.isApprove && (
                              <Button size="sm" className="text-xs px-2 py-1">
                                Process
                              </Button>
                            )}

                            {/* Undo Button - Only for rejected returns */}
                            {returnItem.isRejected && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUndoReturn(returnItem._id)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 py-1"
                                title="Undo rejection - move back to pending requests"
                              >
                                <Undo2 className="h-3 w-3 mr-1" />
                                Undo
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left p-4 font-medium">
                            Return ID
                          </th>
                          <th className="text-left p-4 font-medium">
                            Order ID
                          </th>
                          <th className="text-left p-4 font-medium">
                            Customer
                          </th>
                          <th className="text-left p-4 font-medium">Product</th>
                          <th className="text-left p-4 font-medium">Qty</th>
                          <th className="text-left p-4 font-medium">Reason</th>
                          <th className="text-left p-4 font-medium">Value</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReturns
                          .filter((returnItem) => !returnItem.isApprove)
                          .map((returnItem) => (
                            <tr
                              key={returnItem.id || returnItem._id}
                              className={`border-b hover:bg-muted/50 ${
                                returnItem.isRejected
                                  ? "bg-gray-100 opacity-60"
                                  : ""
                              }`}
                            >
                              <td className="p-4 font-medium">
                                {returnItem.id || "N/A"}
                              </td>
                              <td className="p-4">
                                {returnItem.formattedOrderId || "N/A"}
                              </td>
                              <td className="p-4">
                                {returnItem.customer || "Unknown Customer"}
                              </td>
                              <td className="p-4">
                                <div>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="font-medium cursor-help">
                                          {returnItem.product}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {getProductDisplay(returnItem.product)}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <p className="text-sm text-muted-foreground">
                                    {returnItem.color}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4">
                                {returnItem.quantityInMeters}m
                              </td>
                              <td className="p-4">
                                <span className="text-sm">
                                  {returnItem.returnReason}
                                </span>
                              </td>
                              <td className="p-4">
                                ₹{getReturnValue(returnItem).toLocaleString()}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(
                                    returnItem.isApprove,
                                    returnItem.isRejected
                                  )}
                                  <Badge
                                    variant={getStatusColor(
                                      returnItem.isApprove,
                                      returnItem.isRejected
                                    )}
                                  >
                                    {getStatusText(
                                      returnItem.isApprove,
                                      returnItem.isRejected
                                    )}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  {/* View Button - Only for pending and approved returns */}
                                  {!returnItem.isRejected && (
                                    <Link href={`/returns/${returnItem._id}`}>
                                      <Button size="sm" variant="outline">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  )}

                                  {/* Edit Button - Only for pending and approved returns */}
                                  {!returnItem.isRejected && (
                                    <Link
                                      href={`/returns/${returnItem._id}/edit`}
                                    >
                                      <Button size="sm" variant="outline">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  )}

                                  {/* Approve/Reject Buttons - Only for pending returns */}
                                  {!returnItem.isApprove &&
                                    !returnItem.isRejected && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleApproveReturn(returnItem._id)
                                          }
                                        >
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            handleRejectReturn(returnItem._id)
                                          }
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}

                                  {/* Process Button - Only for approved returns */}
                                  {returnItem.isApprove && (
                                    <Button size="sm">Process</Button>
                                  )}

                                  {/* Undo Button - Only for rejected returns */}
                                  {returnItem.isRejected && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleUndoReturn(returnItem._id)
                                      }
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      title="Undo rejection - move back to pending requests"
                                    >
                                      <Undo2 className="h-4 w-4 mr-1" />
                                      Undo
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!loading && !error && filteredReturns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12">
              <RotateCcw className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-medium mb-2">
                No returns found
              </h3>
              <p className="text-sm text-muted-foreground mb-3 md:mb-4 text-center">
                No return requests match your current filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  );
}

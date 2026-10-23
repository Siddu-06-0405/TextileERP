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
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDashboardStats,
  getRecentOrders,
  getStockAlerts,
  getLatestProducts,
} from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = React.useState([
    {
      title: "Total Products",
      value: "0",
      change: "0%",
      trend: "up",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Orders",
      value: "0",
      change: "0%",
      trend: "up",
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Customers",
      value: "0",
      change: "0%",
      trend: "up",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Low Stock Items",
      value: "0",
      change: "0%",
      trend: "down",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Completed Stock",
      value: "0",
      change: "0%",
      trend: "up",
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ]);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await getDashboardStats();
        if (response.success) {
          setStats([
            {
              title: "Total Products",
              value: response.data.totalProducts.toString(),
              change: response.data.productChange,
              trend: response.data.productTrend,
              icon: Package,
              color: "text-blue-600",
              bgColor: "bg-blue-50",
            },
            {
              title: "Active Orders",
              value: response.data.activeOrders.toString(),
              change: response.data.orderChange,
              trend: response.data.orderTrend,
              icon: ShoppingCart,
              color: "text-green-600",
              bgColor: "bg-green-50",
            },
            {
              title: "Total Customers",
              value: response.data.totalCustomers.toString(),
              change: response.data.customerChange,
              trend: response.data.customerTrend,
              icon: Users,
              color: "text-purple-600",
              bgColor: "bg-purple-50",
            },
            {
              title: "Low Stock Items",
              value: response.data.lowStockItems.toString(),
              change: response.data.stockChange,
              trend: response.data.stockTrend,
              icon: AlertTriangle,
              color: "text-red-600",
              bgColor: "bg-red-50",
            },
            {
              title: "Completed Stock",
              value: response.data.completedStockItems.toString(),
              change: "+12%",
              trend: "up",
              icon: CheckCircle,
              color: "text-emerald-600",
              bgColor: "bg-emerald-50",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard statistics:", error);
      }
    };

    fetchDashboardStats();
  }, []);

  // State for recent orders
  const [recentOrders, setRecentOrders] = React.useState<any[]>([
    {
      id: "loading",
      originalId: "loading",
      customer: "Loading...",
      product: "Loading...",
      quantity: "...",
      status: "processing",
      priority: "medium",
      amount: "...",
    },
  ]);

  // Fetch recent orders
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const response = await getRecentOrders();
        if (response.success) {
          setRecentOrders(response.recentOrders);
        }
      } catch (error) {
        console.error("Failed to fetch recent orders:", error);
        // Set fallback data in case of error
        setRecentOrders([
          {
            id: "error",
            originalId: "error",
            customer: "Error loading data",
            product: "Please try again later",
            quantity: "N/A",
            status: "processing",
            priority: "high",
            amount: "N/A",
          },
        ]);
      }
    };

    fetchRecentOrders();
  }, []);

  // State for stock alerts
  const [stockAlerts, setStockAlerts] = React.useState<any[]>([
    {
      id: "",
      product: "Loading...",
      current: "...",
      minimum: "...",
      severity: "warning",
      stockType: "",
      stockTypeLabel: "",
      variantsDetails: [],
    },
  ]);

  // Fetch stock alerts
  useEffect(() => {
    const fetchStockAlerts = async () => {
      try {
        const response = await getStockAlerts();
        if (response.success) {
          setStockAlerts(response.stockAlerts);
        }
      } catch (error) {
        console.error("Failed to fetch stock alerts:", error);
        // Set fallback data in case of error
        setStockAlerts([
          {
            id: "",
            product: "Error loading data",
            current: "N/A",
            minimum: "N/A",
            severity: "critical",
            stockType: "",
            stockTypeLabel: "",
            variantsDetails: [],
          },
        ]);
      }
    };

    fetchStockAlerts();
  }, []);

  // State for latest products
  const [latestProducts, setLatestProducts] = React.useState([
    {
      id: "loading",
      name: "Loading...",
      category: "Loading...",
      price: "...",
      createdAt: new Date(),
    },
  ]);

  // Fetch latest products
  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        const response = await getLatestProducts();
        if (response.success) {
          setLatestProducts(response.latestProducts);
        }
      } catch (error) {
        console.error("Failed to fetch latest products:", error);
        // Set fallback data in case of error
        setLatestProducts([
          {
            id: "error",
            name: "Error loading data",
            category: "Please try again later",
            price: "N/A",
            createdAt: new Date(),
          },
        ]);
      }
    };

    fetchLatestProducts();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterCustomer, setFilterCustomer] = React.useState("all");
  const [filterFrom, setFilterFrom] = React.useState("");
  const [filterTo, setFilterTo] = React.useState("");

  const customers = [
    "Rajesh Textiles",
    "Sharma Fabrics",
    "Modern Textiles",
    "Elite Fabrics",
  ];

  const filteredOrders = recentOrders.filter((order) => {
    const statusMatch = filterStatus === "all" || order.status === filterStatus;
    const customerMatch =
      filterCustomer === "all" || order.customer === filterCustomer;
    // For demo, date range is not implemented as mock data has no date
    return statusMatch && customerMatch;
  });

  return (
    <SidebarInset>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
      </header>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Responsive: Add extra padding on mobile, reduce on desktop */}
        {/* All grids/flex layouts already use responsive classes. */}
        {/* --- Demo: Pending/Delivered Orders, Filter Removal, Advanced Filter --- */}
        <div className="bg-cyan-50 border-l-4 border-cyan-400 p-3 rounded mb-4 flex flex-col gap-2">
          <p className="text-cyan-800 text-sm font-medium">
            Dashboard now shows the Orders, Stocks and Products.
          </p>
          <div className="flex gap-2 mt-2">
            <Link href="/orders">

                <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setFilterCustomer("all");
              }}
            >
              All Orders
            </Button>
            </Link>
          <Link href="/products">

           <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterStatus("processing")}
            >
              All Products
            </Button>
          </Link>
           <Link href="/stock">
            <Button
              variant="outline"
              size="sm"
            >
              All Stocks
            </Button>
           </Link>       
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
              <DialogContent>
                <div className="space-y-4">
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Customer
                    </label>
                    <Select
                      value={filterCustomer}
                      onValueChange={setFilterCustomer}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        From
                      </label>
                      <Input
                        type="date"
                        value={filterFrom}
                        onChange={(e) => setFilterFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        To
                      </label>
                      <Input
                        type="date"
                        value={filterTo}
                        onChange={(e) => setFilterTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setFilterOpen(false)}>Apply</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* --- End Demo --- */}

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your business.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <Link href="/products/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Link href="/orders/new">
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span
                    className={
                      stat.trend === "up" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Responsive: grid-cols-1 on mobile, more columns on desktop */}
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Latest orders from your customers
                  </CardDescription>
                </div>
                <Link href="/orders">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Responsive: Add min-w-0 to prevent overflow */}
                {filteredOrders.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground">
                    No orders match your filter criteria
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 min-w-0"
                    >
                      <Link
                        href={`/orders/${order.originalId || order.id}`}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{order.id}</p>
                          {getPriorityBadge(order.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.product} • {order.quantity}
                        </p>
                      </Link>
                      <div className="text-right">
                        <p className="font-medium text-sm">{order.amount}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stock Alerts</CardTitle>
                  <CardDescription>
                    Products running low on inventory
                  </CardDescription>
                </div>
                <Link href="/stock">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Manage Stock
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  >
                    <Link
                      href={`/stock/${alert.id}`}
                      className="flex items-start gap-3 flex-1"
                    >
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {alert.stockTypeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alert.product}
                        </p>

                        {/* ✅ List all variant quantities */}
                        <div className="mt-1 space-y-0.5">
                          {alert.variantsDetails &&
                          alert.variantsDetails.length > 0 ? (
                            alert.variantsDetails.map((variant: any, i: number) => (
                              <p
                                key={i}
                                className="text-xs text-muted-foreground flex justify-between"
                              >
                                <span>{variant.color}</span>
                                <span>
                                  {variant.quantity} {variant.unit}
                                </span>
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No variant details available
                            </p>
                          )}
                        </div>

                        {/* Min stock info */}
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum: {alert.minimum}
                        </p>
                      </div>
                    </Link>

                    <Badge className="mt-2"
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {alert.severity === "critical"
                        ? "Out of Stock"
                        : "Low Stock"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Latest Products</CardTitle>
                  <CardDescription>Recently added products</CardDescription>
                </div>
                <Link href="/products">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {latestProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  >
                    <Link href={`/products/${product.id}`} className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Category: {product.category}
                      </p>
                    </Link>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/products/add">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 w-full bg-transparent"
                >
                  <Package className="h-6 w-6" />
                  <span>Add Product</span>
                </Button>
              </Link>
              <Link href="/orders/new">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 w-full bg-transparent"
                >
                  <ShoppingCart className="h-6 w-6" />
                  <span>Create Order</span>
                </Button>
              </Link>
              <Link href="/stock/add">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 w-full bg-transparent"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>Add Stock</span>
                </Button>
              </Link>
              <Link href="/reports">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 w-full bg-transparent"
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

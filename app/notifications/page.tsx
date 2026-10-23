"use client";

import { useState, useEffect, JSX } from "react";
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
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Plus,
  Settings,
  Bell,
  Users,
  Package,
  ShoppingCart,
  AlertTriangle,
  Trash,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { set } from "date-fns";
import { API_BASE_URL } from "@/lib/api";

// Types
interface Admin {
  _id: string;
  name: string;
  number: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface NotificationSettings {
  orderUpdates: boolean;
  stockAlerts: boolean;
  lowStockWarnings: boolean;
  newCustomers: boolean;
  dailyReports: boolean;
  returnRequests: boolean;
  productUpdates: boolean;
}

type NotificationType =
  | "stock_alert"
  | "order_update"
  | "return_request"
  | "product_update";

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  timestamp: string;
  status: string;
  sentToCount: number;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [activeAdmins, setActiveAdmins] = useState<number>(0);
  const [adminNumbers, setAdminNumbers] = useState<Admin[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    role: "sales",
    number: "",
    active: true,
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      orderUpdates: false,
      stockAlerts: false,
      lowStockWarnings: false,
      newCustomers: false,
      dailyReports: false,
      returnRequests: false,
      productUpdates: false,
    });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch current settings from backend on page load
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/whatsapp-notifications`);
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data: NotificationSettings = await res.json();
        setNotificationSettings(data);
      } catch (err) {
        console.error("Error fetching notification settings:", err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchStats() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/whatsapp-messages/today-stats`
        );
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        console.log("Notification stats:", data.stats);

        setNotificationStats((prev) => ({
          ...prev,
          todayAlerts: data.stats.total,
          stockAlerts: data.stats.stock_alert,
          orderAlerts: data.stats.order_update,
        }));
      } catch (err) {
        console.error("Error fetching notification stats:", err);
        toast({
          title: "Error",
          description: "Failed to fetch notification stats",
          variant: "destructive",
        });
      }
    }
    fetchSettings();
    fetchStats();
  }, []);

  const [recentNotifications, setRecentNotifications] = useState<
    Notification[]
  >([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const limit = 4;

  const fetchNotifications = async (page: number = 1) => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/whatsapp-messages?page=${page}&limit=${limit}`
      );
      const data = await res.json();
      // console.log("Fetched notifications data:", data);
      if (data.success && Array.isArray(data.messages)) {
        setRecentNotifications(
          data.messages.map((msg: any) => ({
            id: msg._id,
            type: msg.type,
            message: msg.message,
            timestamp: new Date(msg.createdAt).toLocaleString(),
            sent: msg.status === "Delivered",
            sentToCount: msg.sentToCount,
          }))
        );
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalMessages(data.totalMessages);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/`);
        if (!res.ok) throw new Error("Failed to fetch admin numbers");
        const data = await res.json();
        setAdminNumbers(data.admins);
      } catch (err) {
        console.error("Error fetching admin settings:", err);
      }
    };

    fetchNotifications(1);
    fetchAdmins();
  }, []);

  function Spinner(): JSX.Element {
    return (
      <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    );
  }

  const getNotificationIcon = (type: NotificationType): JSX.Element => {
    switch (type) {
      case "stock_alert":
        return <Package className="h-4 w-4 text-orange-500" />;
      case "order_update":
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case "return_request":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "product_update":
        return <Bell className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const toggleNotificationSetting = (setting: keyof NotificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp-notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      // console.log("Settings saved successfully");
      toast({
        title: "Settings Saved",
        description: "Notification settings updated successfully",
        variant: "default",
      });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const [notificationStats, setNotificationStats] = useState({
    activeAdmins: adminNumbers.filter((admin) => admin.active).length,
    todayAlerts: 0,
    stockAlerts: 0,
    orderAlerts: 0,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const createAdmin = async () => {
    // // console.log("Creating admin with data:", formData);
    // return
    if (!formData.name || !formData.number || !formData.role) {
      toast({
        title: "Missing Fields",
        description: `Fill all fields to create admin`,
        variant: "destructive",
      });
      return;
    }

    const sanitizedData = {
      ...formData,
      number: formData.number.replace(/\s+/g, ""),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/admin/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedData),
      });

      if (!res.ok) {
        console.log("Failed to create admin:", formData);
        toast({
          description: "Failed to create admin number",
          variant: "destructive",
        });

        return;
      }
      window.location.reload();
    } catch (err) {
      console.error("Error creating admin:", err);
    }
  };

  const updateAdminActiveStatus = async (adminId: string, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/active/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: adminId, active }),
      });
      if (!res.ok) {
        toast({
          title: "Error",
          description: "Failed to update admin status",
          variant: "destructive",
        });
        return;
      }
      setAdminNumbers((prev) =>
        prev.map((admin) =>
          admin._id === adminId ? { ...admin, active } : admin
        )
      );
      toast({
        title: "Admin Status Updated",
        description: `Admin ${
          active ? "activated" : "deactivated"
        } successfully`,
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating admin status:", err);
    }
  };

  const deleteAdmin = async (adminId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/${adminId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast({
          title: "Error",
          description: "Failed to delete admin number",
          variant: "destructive",
        });
        return;
      }
      setAdminNumbers((prev) => prev.filter((admin) => admin._id !== adminId));
      toast({
        title: "Admin Deleted",
        description: "Admin number deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error("Error deleting admin:", err);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchNotifications(page);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm sm:text-base">
                WhatsApp Notifications
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">
              WhatsApp Notifications
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage admin numbers and notification settings
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin Number
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Admin Number</DialogTitle>
                <DialogDescription>
                  Add a new admin number for WhatsApp notifications
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Admin Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter admin name"
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">WhatsApp Number</Label>
                  <Input
                    id="number"
                    placeholder="+91 XXXXX XXXXX"
                    onChange={(e) =>
                      handleInputChange("number", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleInputChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="inventory head">
                        Inventory Head
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    defaultChecked
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({ ...prev, active: checked }));
                    }}
                  />
                  <Label htmlFor="active">Active notifications</Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="flex-1" onClick={() => createAdmin()}>
                    Add Admin
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Active Admins
              </CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {adminNumbers.filter((admin) => admin.active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Receiving notifications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Today's Alerts
              </CardTitle>
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {notificationStats.todayAlerts}
              </div>
              <p className="text-xs text-muted-foreground">
                Notifications sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Stock Alerts
              </CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-orange-500">
                {notificationStats.stockAlerts}
              </div>
              <p className="text-xs text-muted-foreground">
                Stock related movements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Order Alerts
              </CardTitle>
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-500">
                {notificationStats.orderAlerts}
              </div>
              <p className="text-xs text-muted-foreground">
                Order related notifications
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Admin Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Admin Numbers
              </CardTitle>
              <CardDescription>
                Manage WhatsApp numbers for notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {adminNumbers.map((admin) => (
                <div
                  key={admin._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {admin.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {admin.number}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {admin.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Switch
                      checked={admin.active}
                      onCheckedChange={(checked) => {
                        updateAdminActiveStatus(admin._id, checked);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteAdmin(admin._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
              <span className="ml-3 text-muted-foreground">
                Loading settings...
              </span>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure which notifications to send
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {[
                  {
                    key: "orderUpdates",
                    label: "Order Updates",
                    desc: "New orders, status changes, deliveries",
                  },
                  {
                    key: "stockAlerts",
                    label: "Stock Alerts",
                    desc: "Stock movements and updates",
                  },
                  {
                    key: "lowStockWarnings",
                    label: "Low Stock Warnings",
                    desc: "When stock falls below minimum",
                  },
                  {
                    key: "newCustomers",
                    label: "New Customers",
                    desc: "When new customers are added",
                  },
                  {
                    key: "returnRequests",
                    label: "Return Requests",
                    desc: "New return requests from customers",
                  },
                  {
                    key: "productUpdates",
                    label: "Product Updates",
                    desc: "Create, update, or delete product notifications",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">
                        {item.label}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings[
                          item.key as keyof NotificationSettings
                        ]
                      }
                      onCheckedChange={() =>
                        toggleNotificationSetting(
                          item.key as keyof NotificationSettings
                        )
                      }
                    />
                  </div>
                ))}

                {/* Save Button */}
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full sm:w-auto mt-4"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Recent Notifications
            </CardTitle>
            <CardDescription>
              Latest WhatsApp notifications sent to admins ({totalMessages}{" "}
              total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
                <span className="ml-3 text-muted-foreground">
                  Loading notifications...
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-3 sm:space-y-4">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base break-words">
                          {notification.message}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                          <span>{notification.timestamp}</span>
                          <span>Sent to {notification.sentToCount} admins</span>
                          {notification.status === "Delivered" && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Delivered
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="text-xs sm:text-sm"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      {/* Page numbers - Show fewer on mobile */}
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(3, totalPages) },
                          (_, i) => {
                            let pageNumber;
                            if (totalPages <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 2) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 1) {
                              pageNumber = totalPages - 2 + i;
                            } else {
                              pageNumber = currentPage - 1 + i;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                variant={
                                  currentPage === pageNumber
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => handlePageChange(pageNumber)}
                                className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                              >
                                {pageNumber}
                              </Button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

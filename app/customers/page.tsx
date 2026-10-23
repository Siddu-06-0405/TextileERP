"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  ShoppingCart,
  Star,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Bell,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

// Customer interface based on backend schema
interface Customer {
  _id: string;
  customerName: string;
  customerType: "Wholesale" | "Retail";
  email: string;
  phone: number;
  city: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

// Product interface
interface Product {
  _id: string;
  productName: string;
  description?: string;
  category: string;
  unit: string;
  variants?: Array<{
    color: string;
    pricePerMeters: number;
    stockInMeters: number;
  }>;
}

// Form data interface
interface CustomerFormData {
  customerName: string;
  customerType: "Wholesale" | "Retail";
  email: string;
  phone: string;
  city: string;
  address: string;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Backend data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add customer states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);

  // Notification states
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);

  // Search states for notification dialog
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Form data
  const [formData, setFormData] = useState<CustomerFormData>({
    customerName: "",
    customerType: "Wholesale",
    email: "",
    phone: "",
    city: "Mumbai",
    address: "",
  });

  // Click outside handler for city dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch customers from backend
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/customer`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch customers: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success) {
          setCustomers(data.customers || []);
        } else {
          throw new Error(data.message || "Failed to fetch customers");
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch customers"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch(`${API_BASE_URL}/products/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      if (data.success) {
        setProducts(data.products || []);
      } else {
        throw new Error(data.message || "Failed to fetch products");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      toast({
        title: "Failed to load products",
        description: err instanceof Error ? err.message : "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open notification dialog and fetch products
  const handleOpenNotificationDialog = () => {
    setIsNotificationDialogOpen(true);
    fetchProducts();
  };

  // Filter customers based on search
  const filteredCustomersForSelection = customers.filter(customer =>
    customer.customerName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Filter products based on search
  const filteredProductsForSelection = products.filter(product =>
    product.productName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Add customer to selection
  const addCustomerToSelection = (customer: Customer) => {
    if (!selectedCustomers.find(c => c._id === customer._id)) {
      setSelectedCustomers(prev => [...prev, customer]);
    }
    setCustomerSearchTerm("");
  };

  // Add product to selection
  const addProductToSelection = (product: Product) => {
    if (!selectedProducts.find(p => p._id === product._id)) {
      setSelectedProducts(prev => [...prev, product]);
    }
    setProductSearchTerm("");
  };

  // Remove customer from selection
  const removeCustomerFromSelection = (customerId: string) => {
    setSelectedCustomers(prev => prev.filter(c => c._id !== customerId));
  };

  // Remove product from selection
  const removeProductFromSelection = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== productId));
  };

  // Send notifications
  const handleSendNotifications = async () => {
    try {
      setSendingNotification(true);

      if (selectedCustomers.length === 0 || selectedProducts.length === 0) {
        toast({
          title: "Selection Required",
          description: "Please select at least one customer and one product",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/whatsapp-notifications/send-product-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerIds: selectedCustomers.map(c => c._id),
          productIds: selectedProducts.map(p => p._id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send notifications");
      }

      const data = await response.json();
      
      toast({
        title: "Notifications Sent",
        description: `Product updates sent to ${data.customers.length} customers successfully`,
        variant: "default",
      });

      // Reset and close dialog
      setSelectedCustomers([]);
      setSelectedProducts([]);
      setCustomerSearchTerm("");
      setProductSearchTerm("");
      setIsNotificationDialogOpen(false);

    } catch (err) {
      console.error("Error sending notifications:", err);
      toast({
        title: "Failed to send notifications",
        description: err instanceof Error ? err.message : "Failed to send notifications",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    if (field === "city" && value === "custom") {
      setIsCustomCity(true);
      setFormData((prev) => ({
        ...prev,
        [field]: "",
      }));
    } else {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    }
  };

  // Handle add customer submission
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustomer(true);
    setAddError(null);
    setAddSuccess(false);

    try {
      // Validate required fields
      if (
        !formData.customerName ||
        !formData.email ||
        !formData.phone ||
        !formData.city ||
        !formData.address
      ) {
        throw new Error("All fields are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate phone number (must be in the format +91xxxxxxxxxx with no spaces)
      const phone = formData.phone.trim();

      const phoneRegex = /^\+91\d{10}$/;

      if (!phoneRegex.test(phone)) {
        throw new Error(
          "Phone number must be in the format +91xxxxxxxxxx (no spaces)"
        );
      }

      const payload = {
        customerName: formData.customerName,
        customerType: formData.customerType,
        email: formData.email,
        phone: phone, // string phone format
        city: formData.city,
        address: formData.address,
      };

      const response = await fetch(`${API_BASE_URL}/customer/addCustomer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add customer");
      }

      const result = await response.json();
      // console.log("Customer added successfully:", result);

      setAddSuccess(true);

      // Reset form
      setFormData({
        customerName: "",
        customerType: "Wholesale",
        email: "",
        phone: "",
        city: "Mumbai",
        address: "",
      });
      setIsCustomCity(false);

      // Refresh customers list
      const refreshResponse = await fetch(`${API_BASE_URL}/customer`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setCustomers(refreshData.customers || []);
           // Reset city filter if the newly added city is selected
           if (selectedCity === payload.city) {
             setSelectedCity("all");
             setCitySearchTerm("");
           }
        }
      }

      // Toast + close dialog
      toast({
        title: "Customer added",
        description: `${payload.customerName} has been added successfully.`,
      });
      setIsAddDialogOpen(false);
      setAddSuccess(false);
    } catch (err) {
      console.error("Error adding customer:", err);
      const message =
        err instanceof Error ? err.message : "Failed to add customer";
      setAddError(message);
      toast({
        title: "Failed to add customer",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAddingCustomer(false);
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setFormData({
      customerName: "",
      customerType: "Wholesale",
      email: "",
      phone: "",
      city: "Mumbai",
      address: "",
    });
    setAddError(null);
    setAddSuccess(false);
    setIsCustomCity(false);
  };

  // Predefined cities
  const predefinedCities = [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Chennai",
    "Pune",
    "Kolkata",
    "Hyderabad",
    "Ahmedabad",
    "Nashik",
    "Surat",
    "Jaipur",
    "Lucknow",
    "Kanpur",
    "Nagpur",
    "Indore",
    "Thane",
    "Bhopal",
    "Visakhapatnam",
    "Pimpri-Chinchwad",
    "Patna",
  ];

  // Get all unique cities from customers data and combine with predefined cities
  const getAllCities = () => {
    const customerCities = customers.map(customer => customer.city);
    const allCities = [...new Set([...predefinedCities, ...customerCities])];
    return allCities.sort();
  };

  const allCities = getAllCities();

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toString().includes(searchTerm);
    const matchesCity =
      selectedCity === "all" || customer.city === selectedCity;
    const matchesType =
      selectedType === "all" ||
      customer.customerType.toLowerCase() === selectedType;
    return matchesSearch && matchesCity && matchesType;
  });

  // Sort latest to oldest by createdAt
  const sortedFilteredCustomers = [...filteredCustomers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Wholesale":
        return <Badge variant="outline">Wholesale</Badge>;
      case "Retail":
        return <Badge variant="secondary">Retail</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const customerStats = {
    total: customers.length,
    active: customers.length, // All customers are considered active for now
    wholesale: customers.filter((c) => c.customerType === "Wholesale").length,
    retail: customers.filter((c) => c.customerType === "Retail").length,
    totalValue: 0, // Not available in current schema
    totalOutstanding: 0, // Not available in current schema
  };

  // Loading state
  if (loading) {
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
                <BreadcrumbPage>Customers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading customers...</span>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Error state
  if (error) {
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
                <BreadcrumbPage>Customers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load customers
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
                <BreadcrumbPage>Customers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="sm:hidden">
          <h1 className="text-lg font-semibold">Customers</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Customers</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your customer relationships
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNotificationDialog}>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Product Notifications
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto mx-4 sm:mx-0">
                <DialogHeader>
                  <DialogTitle>Send Product Notifications</DialogTitle>
                  <DialogDescription>
                    Search and select products and customers to send WhatsApp notifications
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Customer Selection */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Select Customers</Label>
                    
                    {/* Customer Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers by name or email..."
                        className="pl-8"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Customer Search Results */}
                    {customerSearchTerm && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {filteredCustomersForSelection.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No customers found
                          </div>
                        ) : (
                          filteredCustomersForSelection.map((customer) => (
                            <div
                              key={customer._id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                              onClick={() => addCustomerToSelection(customer)}
                            >
                              <div className="font-medium">{customer.customerName}</div>
                              <div className="text-sm text-muted-foreground">{customer.email}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Customers */}
                    {selectedCustomers.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Selected Customers ({selectedCustomers.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedCustomers.map((customer) => (
                            <Badge key={customer._id} variant="secondary" className="flex items-center gap-1">
                              {customer.customerName}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeCustomerFromSelection(customer._id)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Select Products</Label>
                    
                    {/* Product Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products by name or category..."
                        className="pl-8"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Product Search Results */}
                    {productSearchTerm && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {loadingProducts ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading products...
                          </div>
                        ) : filteredProductsForSelection.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No products found
                          </div>
                        ) : (
                          filteredProductsForSelection.map((product) => (
                            <div
                              key={product._id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                              onClick={() => addProductToSelection(product)}
                            >
                              <div className="font-medium">{product.productName}</div>
                              <div className="text-sm text-muted-foreground">{product.category}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Selected Products */}
                    {selectedProducts.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Selected Products ({selectedProducts.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProducts.map((product) => (
                            <Badge key={product._id} variant="secondary" className="flex items-center gap-1">
                              {product.productName}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeProductFromSelection(product._id)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      onClick={handleSendNotifications}
                      disabled={sendingNotification || selectedCustomers.length === 0 || selectedProducts.length === 0}
                      className="flex-1"
                    >
                      {sendingNotification ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Bell className="h-4 w-4 mr-2" />
                          Send Notifications
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsNotificationDialogOpen(false)}
                      disabled={sendingNotification}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-lg mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer profile
                  </DialogDescription>
                </DialogHeader>

                {/* Success/Error Messages */}
                {addSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-800 font-medium">
                        Customer added successfully!
                      </span>
                    </div>
                  </div>
                )}

                {addError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-800 font-medium">
                        Error adding customer
                      </span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{addError}</p>
                  </div>
                )}

                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Customer Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter customer name"
                        value={formData.customerName}
                        onChange={(e) =>
                          handleInputChange("customerName", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Customer Type *</Label>
                      <Select
                        value={formData.customerType}
                        onValueChange={(value: "Wholesale" | "Retail") =>
                          handleInputChange("customerType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Wholesale">Wholesale</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="customer@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        placeholder="+919876543210"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      {!isCustomCity ? (
                        <div className="space-y-2">
                      <Select
                        value={formData.city}
                        onValueChange={(value) =>
                          handleInputChange("city", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                               {predefinedCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                              <SelectItem value="custom" className="text-blue-600 font-medium border-t">
                                ✏️ Add Custom City
                              </SelectItem>
                        </SelectContent>
                      </Select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            id="city"
                            placeholder="Enter city name"
                            value={formData.city}
                            onChange={(e) =>
                              handleInputChange("city", e.target.value)
                            }
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCustomCity(false);
                              handleInputChange("city", "Mumbai");
                            }}
                            className="text-xs h-7"
                          >
                            ← Back to list
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter complete address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={addingCustomer}
                    >
                      {addingCustomer ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Customer"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={handleDialogClose}
                      disabled={addingCustomer}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {customerStats.active} active customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wholesale</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customerStats.wholesale}
              </div>
              <p className="text-xs text-muted-foreground">
                Wholesale customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retail</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.retail}</div>
              <p className="text-xs text-muted-foreground">Retail customers</p>
            </CardContent>
          </Card>

        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
                     <div className="relative w-full sm:w-48" ref={cityDropdownRef}>
             <div className="relative">
               <Input
                 placeholder="Search cities..."
                 value={citySearchTerm}
                 onChange={(e) => setCitySearchTerm(e.target.value)}
                 onFocus={() => setIsCityDropdownOpen(true)}
                 className="w-full pr-8"
               />
               {citySearchTerm && (
                 <button
                   type="button"
                   onClick={() => {
                     setCitySearchTerm("");
                     setSelectedCity("all");
                   }}
                   className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                 >
                   <X className="h-4 w-4" />
                 </button>
               )}
               {isCityDropdownOpen && (
                 <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                   <div
                     className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b font-medium text-blue-600"
                     onClick={() => {
                       setSelectedCity("all");
                       setCitySearchTerm("");
                       setIsCityDropdownOpen(false);
                     }}
                   >
                     All Cities
                   </div>
                   {allCities
                     .filter(city => 
                       city.toLowerCase().includes(citySearchTerm.toLowerCase())
                     )
                     .map((city) => (
                       <div
                         key={city}
                         className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                         onClick={() => {
                           setSelectedCity(city);
                           setCitySearchTerm(city);
                           setIsCityDropdownOpen(false);
                         }}
                       >
                  {city}
                       </div>
                     ))}
                   {allCities.filter(city => 
                     city.toLowerCase().includes(citySearchTerm.toLowerCase())
                   ).length === 0 && citySearchTerm && (
                     <div className="px-3 py-2 text-gray-500 text-sm">
                       No cities found
                     </div>
                   )}
                 </div>
               )}
             </div>
             {selectedCity !== "all" && (
               <div className="mt-1 text-xs text-gray-500">
                 Selected: {selectedCity}
               </div>
             )}
           </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>All registered customers</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Customer</th>
                    <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">Contact</th>
                    <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Location</th>
                    <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">Type</th>
                    <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredCustomers.map((customer) => (
                      <tr
                        key={customer._id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-2 sm:p-4">
                          <div className="flex flex-col">
                            <p className="font-medium text-xs sm:text-sm">
                              {customer.customerName}
                            </p>
                            <div className="text-xs text-muted-foreground sm:hidden space-y-0.5 mt-1">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4 hidden sm:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs sm:text-sm font-medium">
                                {customer.city}
                              </p>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {getTypeBadge(customer.customerType)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 sm:p-4 hidden md:table-cell">
                          {getTypeBadge(customer.customerType)}
                        </td>
                        <td className="p-2 sm:p-4">
                          <div className="flex gap-1 sm:gap-2">
                            <Link href={`/customers/${customer._id}`}>
                              <Button size="sm" variant="outline" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </Link>
                            <Link href={`/customers/${customer._id}/edit`}>
                              <Button size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredCustomers.length === 0 && customers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first customer
              </p>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Customer
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  );
}
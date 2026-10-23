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
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
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

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { toast } = useToast();

  // Backend-mapped customer state
  const [customer, setCustomer] = useState({
    customerName: "",
    customerType: "Wholesale",
    city: "",
    address: "",
    phone: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cities = [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Pune",
    "Ahmedabad",
    "Surat",
  ];

  const handleInputChange = (field: string, value: string | number) => {
    setCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Fetch customer by ID
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/customer/${customerId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          throw new Error(
            `Failed to fetch customer: ${res.status} ${res.statusText}`
          );
        }
        const data = await res.json();
        if (!data.success || !data.customer) {
          throw new Error(data.message || "Customer not found");
        }
        const c = data.customer as any;
        setCustomer({
          customerName: c.customerName || "",
          customerType: c.customerType || "Wholesale",
          city: c.city || "",
          address: c.address || "",
          phone: c.phone ? String(c.phone) : "",
          email: c.email || "",
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch customer");
      } finally {
        setLoading(false);
      }
    };
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Basic validation
      if (
        !customer.customerName ||
        !customer.email ||
        !customer.phone ||
        !customer.city ||
        !customer.address
      ) {
        throw new Error("Please fill all required fields");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate phone number (basic validation)
      const phoneRegex = /^\+?[\d\s-]+$/;
      if (!phoneRegex.test(customer.phone)) {
        throw new Error("Please enter a valid phone number");
      }

      const payload = {
        customerName: customer.customerName,
        customerType: customer.customerType,
        email: customer.email,
        phone: parseInt(customer.phone.replace(/\D/g, "")), // Remove non-digits
        city: customer.city,
        address: customer.address,
      };

      const res = await fetch(`${API_BASE_URL}/customer/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update customer");
      }

      setSuccess(true);
      toast({
        title: "Customer updated",
        description: `${payload.customerName} has been updated successfully.`,
      });
      setTimeout(() => {
        router.push("/customers");
      }, 900);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update customer";
      setError(message);
      toast({
        title: "Failed to update customer",
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
      setError(null);
      const res = await fetch(`${API_BASE_URL}/customer/${customerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete customer");
      }
      router.push("/customers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer");
    } finally {
      setDeleting(false);
    }
  };

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
                <BreadcrumbLink href="/customers">Customers</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading customer...
          </div>
        </div>
      </SidebarInset>
    );
  }

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
                <BreadcrumbLink href="/customers">Customers</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Edit</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" onClick={() => location.reload()}>
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
                <BreadcrumbLink href="/customers">Customers</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/customers/${customerId}`}>
                  {customer.customerName || "Customer"}
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
          <h1 className="text-lg font-semibold">Edit Customer</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href={`/customers/${customerId}`}>
              <Button variant="outline" size="sm" className="w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Edit Customer</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Update customer information
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href={`/customers/${customerId}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" /> Customer updated successfully.
            Redirecting...
          </div>
        )}

        {/* Edit Form */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Customer's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={customer.customerName}
                  onChange={(e) =>
                    handleInputChange("customerName", e.target.value)
                  }
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Select
                  value={customer.city}
                  onValueChange={(value) => handleInputChange("city", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={customer.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerType">Customer Type *</Label>
                <Select
                  value={customer.customerType}
                  onValueChange={(value) =>
                    handleInputChange("customerType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wholesale">Wholesale</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Business Information</CardTitle>
              <CardDescription>
                Contact details and business information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={customer.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Link href={`/customers/${customerId}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          {/* Danger Zone: Delete Customer */}
          <div className="w-full sm:w-auto">
            <div className="text-sm text-muted-foreground"></div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">Delete Customer</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 sm:mx-0">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the customer and remove it from your customer list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>No</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

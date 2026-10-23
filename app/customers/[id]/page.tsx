"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, MapPin, Phone, Mail, ShoppingCart, TrendingUp, ArrowLeft, Star, Clock, Loader2, AlertTriangle, Search, Filter, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import 'jspdf-autotable'
import {NotoSansRegular} from '@/app/fonts/NotoSans-Regular'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function CustomerViewPage() {
  const params = useParams()
  const customerId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState({
    customerName: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    customerType: "",
  })

  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [productMap, setProductMap] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [filterValues, setFilterValues] = useState({
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    dateFromDay: "",
    dateFromMonth: "",
    dateFromYear: "",
    dateToDay: "",
    dateToMonth: "",
    dateToYear: "",
    amountMin: "",
    amountMax: "",
    itemCount: "",
    orderStatus: ""
  })
  const [customerStats, setCustomerStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    lastOrderDate: null as string | null,
  })

  // Fetch customer orders with pagination
  const fetchCustomerOrders = async (customerName: string, page: number = 1, limit: number = 10) => {
    try {
      const res = await fetch(`${API_BASE_URL}/order?customer=${encodeURIComponent(customerName)}&page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.orders) {
          setCustomerOrders(data.orders)
          
          // Set pagination info
          if (data.pagination) {
            setPagination(data.pagination)
          }
          
          // Calculate customer stats (this should ideally be fetched separately or calculated from all orders)
          // For now, we'll use the current page data to update stats
          const totalOrders = data.pagination?.totalItems || data.orders.length
          const totalValue = data.orders.reduce((sum: number, order: any) => {
            const orderTotal = order.orderItems.reduce((itemSum: number, item: any) => {
              return itemSum + (item.quantity * (item.pricePerMeters || 0))
            }, 0)
            return sum + orderTotal
          }, 0)
          const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0
          const lastOrderDate = data.orders.length > 0 ? data.orders[0].orderDate : null
          
          setCustomerStats({
            totalOrders,
            totalValue,
            averageOrderValue,
            lastOrderDate,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error)
    }
  }

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE_URL}/customer/${customerId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) throw new Error(`Failed to fetch customer: ${res.status} ${res.statusText}`)
        const data = await res.json()
        if (!data.success || !data.customer) throw new Error(data.message || 'Customer not found')
        const c = data.customer as any
        setCustomer({
          customerName: c.customerName || "",
          city: c.city || "",
          address: c.address || "",
          phone: c.phone ? `${c.phone}` : "",
          email: c.email || "",
          customerType: c.customerType || "",
        })
        
                 // Fetch customer orders after getting customer data
         if (c.customerName) {
           await fetchCustomerOrders(c.customerName, 1, 10)
         }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch customer')
      } finally {
        setLoading(false)
      }
    }
    if (customerId) fetchCustomer()
  }, [customerId])

  // Load products to resolve Product Name (Design Number)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`)
        if (!res.ok) return
        const data = await res.json()
        const list: any[] = data?.products || []
        const map: Record<string, string> = {}
        for (const p of list) {
          if (p && typeof p.productName === 'string') {
            map[p.productName] = p.category || ''
          }
        }
        setProductMap(map)
      } catch {}
    }
    loadProducts()
  }, [])

  // Update date objects when dropdown values change
  useEffect(() => {
    if (activeFilter === "dateRange") {
      updateDateFrom();
      updateDateTo();
    }
  }, [
    filterValues.dateFromDay, 
    filterValues.dateFromMonth, 
    filterValues.dateFromYear,
    filterValues.dateToDay, 
    filterValues.dateToMonth, 
    filterValues.dateToYear,
    activeFilter
  ]);

  // Helper function to calculate order total
  const calculateOrderTotal = (order: any) => {
    return order.orderItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * (item.pricePerMeters || 0))
    }, 0)
  }

  // Helper function to calculate paid amount (use backend value if exists, otherwise default to 40%)
  const calculatePaidAmount = (order: any) => {
    const orderTotal = calculateOrderTotal(order)
    return order.paidAmount !== null && order.paidAmount !== undefined 
      ? order.paidAmount 
      : Math.floor(orderTotal * 0.4)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (customer.customerName) {
      fetchCustomerOrders(customer.customerName, newPage, pagination.itemsPerPage)
    }
  }

  // Helper function to format order ID
  const formatOrderId = (orderId: string) => {
    // Extract only numeric digits from the ID
    const numericChars = orderId.replace(/[^0-9]/g, '');
    // Use the last 3 digits, or pad with zeros if less than 3 digits
    const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
    return `ORD-${lastThreeDigits}`;
  }

  // Reset pagination when search or filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [searchQuery, activeFilter, filterValues]);

  // Filter orders based on search query and active filter
  const filteredOrders = customerOrders.filter((order) => {
    // First apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const orderId = formatOrderId(order._id).toLowerCase();
      const orderDate = new Date(order.orderDate).toLocaleDateString().toLowerCase();
      const orderAmount = calculateOrderTotal(order).toString().toLowerCase();
      const orderStatus = (order.status || "").toLowerCase();
      
      // Check if any product name matches the search query
      const productNames = order.orderItems.map((item: any) => item.product.toLowerCase());
      const hasMatchingProduct = productNames.some((productName: string) => productName.includes(query));
      
      if (!(
        orderId.includes(query) ||
        orderDate.includes(query) ||
        orderAmount.includes(query) ||
        orderStatus.includes(query) ||
        hasMatchingProduct
      )) {
        return false;
      }
    }

    // Then apply active filter (only one can be active)
    if (!activeFilter) return true;

    switch (activeFilter) {
      case "dateRange":
        if (filterValues.dateFrom || filterValues.dateTo) {
          const orderDate = new Date(order.orderDate);
          // Set time to start of day for accurate comparison
          orderDate.setHours(0, 0, 0, 0);
          
          console.log('Date filtering:', {
            orderDate: orderDate.toISOString(),
            dateFrom: filterValues.dateFrom?.toISOString(),
            dateTo: filterValues.dateTo?.toISOString(),
            orderId: formatOrderId(order._id)
          });
          
          if (filterValues.dateFrom && orderDate < filterValues.dateFrom) {
            // console.log('Filtered out - before from date');
            return false;
          }
          if (filterValues.dateTo && orderDate > filterValues.dateTo) {
            // console.log('Filtered out - after to date');
            return false;
          }
        }
        break;

      case "amountRange":
        if (filterValues.amountMin || filterValues.amountMax) {
          const orderAmount = calculateOrderTotal(order);
          if (filterValues.amountMin && orderAmount < parseFloat(filterValues.amountMin)) return false;
          if (filterValues.amountMax && orderAmount > parseFloat(filterValues.amountMax)) return false;
        }
        break;

      case "itemCount":
        if (filterValues.itemCount) {
          const targetCount = parseInt(filterValues.itemCount);
          if (order.orderItems.length !== targetCount) return false;
        }
        break;

      case "orderStatus":
        if (filterValues.orderStatus && order.status !== filterValues.orderStatus) {
          return false;
        }
        break;
    }

    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setActiveFilter(null);
    setFilterValues({
      dateFrom: undefined,
      dateTo: undefined,
      dateFromDay: "",
      dateFromMonth: "",
      dateFromYear: "",
      dateToDay: "",
      dateToMonth: "",
      dateToYear: "",
      amountMin: "",
      amountMax: "",
      itemCount: "",
      orderStatus: ""
    });
    // Reset pagination when clearing filters
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Get filter display text
  const getFilterDisplayText = () => {
    if (!activeFilter) return "Filter";
    
    switch (activeFilter) {
      case "dateRange":
        if (filterValues.dateFromDay || filterValues.dateFromMonth || filterValues.dateFromYear || 
            filterValues.dateToDay || filterValues.dateToMonth || filterValues.dateToYear) {
          const from = filterValues.dateFromDay && filterValues.dateFromMonth && filterValues.dateFromYear 
            ? `${filterValues.dateFromDay}/${filterValues.dateFromMonth}/${filterValues.dateFromYear}` 
            : "Any";
          const to = filterValues.dateToDay && filterValues.dateToMonth && filterValues.dateToYear 
            ? `${filterValues.dateToDay}/${filterValues.dateToMonth}/${filterValues.dateToYear}` 
            : "Any";
          return `Date: ${from} - ${to}`;
        }
        break;
      case "amountRange":
        if (filterValues.amountMin || filterValues.amountMax) {
          const min = filterValues.amountMin || "Any";
          const max = filterValues.amountMax || "Any";
          return `Amount: ₹${min} - ₹${max}`;
        }
        break;
      case "itemCount":
        if (filterValues.itemCount) {
          return `Items: ${filterValues.itemCount}`;
        }
        break;
      case "orderStatus":
        if (filterValues.orderStatus) {
          return `Status: ${filterValues.orderStatus}`;
        }
        break;
    }
    return "Filter";
  };

  // Check if any filter is active and has valid values
  const isAnyFilterActive = () => {
    if (!activeFilter) return false;
    
    switch (activeFilter) {
      case "dateRange":
        return (filterValues.dateFromDay && filterValues.dateFromMonth && filterValues.dateFromYear) ||
               (filterValues.dateToDay && filterValues.dateToMonth && filterValues.dateToYear);
      case "amountRange":
        return filterValues.amountMin || filterValues.amountMax;
      case "itemCount":
        return filterValues.itemCount;
      case "orderStatus":
        return filterValues.orderStatus;
      default:
        return false;
    }
  };

  // Helper functions to update Date objects when dropdowns change
  const updateDateFrom = () => {
    if (filterValues.dateFromDay && filterValues.dateFromMonth && filterValues.dateFromYear) {
      const date = new Date(
        parseInt(filterValues.dateFromYear), 
        parseInt(filterValues.dateFromMonth) - 1, 
        parseInt(filterValues.dateFromDay)
      );
      // Set the time to start of day for accurate comparison
      date.setHours(0, 0, 0, 0);
      setFilterValues(prev => ({ ...prev, dateFrom: date }));
    } else {
      setFilterValues(prev => ({ ...prev, dateFrom: undefined }));
    }
  };

  const updateDateTo = () => {
    if (filterValues.dateToDay && filterValues.dateToMonth && filterValues.dateToYear) {
      const date = new Date(
        parseInt(filterValues.dateToYear), 
        parseInt(filterValues.dateToMonth) - 1, 
        parseInt(filterValues.dateToDay)
      );
      // Set the time to end of day for accurate comparison
      date.setHours(23, 59, 59, 999);
      setFilterValues(prev => ({ ...prev, dateTo: date }));
    } else {
      setFilterValues(prev => ({ ...prev, dateTo: undefined }));
    }
  };

  // const paymentHistory = [
  //   { id: "PAY-001", date: "2024-01-16", amount: 45000, method: "Bank Transfer", status: "completed", reference: "TXN123456789" },
  //   { id: "PAY-002", date: "2024-01-11", amount: 32000, method: "Cheque", status: "completed", reference: "CHQ987654321" },
  //   { id: "PAY-003", date: "2024-01-06", amount: 28000, method: "Cash", status: "completed", reference: "CASH001" },
  // ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "delivered":
        return <Badge variant="default">Delivered</Badge>
      case "shipped":
        return <Badge variant="outline">Shipped</Badge>
      case "completed":
        return <Badge variant="default">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Download utility functions
  const downloadAsPDF = () => {
    const doc = new jsPDF()
    
    doc.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans");

    // Set font and size
    doc.setFontSize(20)
    doc.text('CUSTOMER DETAILS', 20, 20)
    
    // Customer information
    doc.setFontSize(16)
    doc.text('CUSTOMER INFORMATION', 20, 40)
    doc.setFontSize(12)
    doc.text(`Name: ${customer.customerName}`, 20, 55)
    doc.text(`Phone: ${customer.phone}`, 20, 65)
    doc.text(`Email: ${customer.email || 'N/A'}`, 20, 75)
    doc.text(`Address: ${customer.address}`, 20, 85)
    doc.text(`City: ${customer.city}`, 20, 95)
    doc.text(`Customer Type: ${customer.customerType}`, 20, 105)
    
         // Customer stats
     doc.setFontSize(16)
     doc.text('CUSTOMER STATISTICS', 20, 155)
     doc.setFontSize(12)
     doc.text(`Total Orders: ${customerStats.totalOrders}`, 20, 170)
     doc.text(`Total Value: ₹${customerStats.totalValue.toLocaleString()}`, 20, 180)
     doc.text(`Average Order Value: ₹${customerStats.averageOrderValue.toLocaleString()}`, 20, 190)
     
     // Filter information
     const filterInfo = searchQuery.trim() || activeFilter 
       ? `Filter Applied: ${searchQuery.trim() ? `Search: "${searchQuery}"` : ''}${activeFilter ? `Filter: ${activeFilter}` : ''}`
       : 'No filters applied';
     doc.text(filterInfo, 20, 205)
     
     // Orders section
     doc.setFontSize(16)
     doc.text('ORDERS', 20, 225)
    doc.setFontSize(12)
    
         let yPosition = 240
     filteredOrders.forEach((order: any, index: number) => {
      const orderTotal = calculateOrderTotal(order)
      const paidAmount = calculatePaidAmount(order)
      
      doc.text(`${index + 1}. Order ID: ${formatOrderId(order._id)}`, 20, yPosition)
      doc.text(`   Date: ${new Date(order.orderDate).toLocaleDateString()}`, 25, yPosition + 5)
      doc.text(`   Status: ${order.status || 'pending'}`, 25, yPosition + 10)
      doc.text(`   Items: ${order.orderItems.length}`, 25, yPosition + 15)
      doc.text(`   Total Amount: ₹${orderTotal.toLocaleString()}`, 25, yPosition + 20)
      doc.text(`   Paid Amount: ₹${paidAmount.toLocaleString()}`, 25, yPosition + 25)
      doc.text(`   Balance: ₹${(orderTotal - paidAmount).toLocaleString()}`, 25, yPosition + 30)
      
             // Add product names with bullet points
       if (order.orderItems.length > 1) {
         doc.text(`   Products:`, 25, yPosition + 35)
         order.orderItems.forEach((item: any, itemIndex: number) => {
           doc.text(`   • ${item.product}`, 30, yPosition + 40 + (itemIndex * 5))
         })
         yPosition += (order.orderItems.length * 5) + 5
       } else {
         doc.text(`   Products: ${order.orderItems[0].product}`, 25, yPosition + 35)
                  yPosition += 45
       }
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
    })
    
    // Save the PDF
    doc.save(`Customer_${customer.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
  }

  const downloadAsExcel = () => {
    // Create workbook and worksheets
    const workbook = XLSX.utils.book_new()
    
    // Customer Details worksheet
    const customerDetailsData = [
      ['CUSTOMER DETAILS'],
      ['Name', customer.customerName],
      ['Phone', customer.phone],
      ['Email', customer.email || 'N/A'],
      ['Address', customer.address],
      ['City', customer.city],
      ['Customer Type', customer.customerType],
      [''],
      ['CUSTOMER STATISTICS'],
      ['Total Orders', customerStats.totalOrders],
      ['Total Value', customerStats.totalValue.toLocaleString()],
      ['Average Order Value', customerStats.averageOrderValue.toLocaleString()],
      [''],
      ['Filter Applied', searchQuery.trim() || activeFilter ? `${searchQuery.trim() ? `Search: "${searchQuery}"` : ''}${activeFilter ? `Filter: ${activeFilter}` : ''}` : 'None']
    ]
    
    const customerDetailsSheet = XLSX.utils.aoa_to_sheet(customerDetailsData)
    XLSX.utils.book_append_sheet(workbook, customerDetailsSheet, 'Customer Details')
    
    // Orders worksheet
    const ordersData = [
      ['Order ID', 'Date', 'Status', 'Items', 'Total Amount', 'Paid Amount', 'Balance', 'Products']
    ]
    
    filteredOrders.forEach((order: any) => {
      const orderTotal = calculateOrderTotal(order)
      const paidAmount = calculatePaidAmount(order)
      const productNames = order.orderItems.map((item: any) => item.product).join(', ')
      
      ordersData.push([
        formatOrderId(order._id),
        new Date(order.orderDate).toLocaleDateString(),
        order.status || 'pending',
        order.orderItems.length,
        orderTotal.toLocaleString(),
        paidAmount.toLocaleString(),
        (orderTotal - paidAmount).toLocaleString(),
        productNames
      ])
    })
    
    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData)
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Orders')
    
    // Save the Excel file
    XLSX.writeFile(workbook, `Customer_${customer.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`)
  }

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
                <BreadcrumbPage>Loading...</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading customer...</div>
        </div>
      </SidebarInset>
    )
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
                <BreadcrumbPage>Error</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Link href="/customers"><Button variant="outline">Back to Customers</Button></Link>
          </div>
        </div>
      </SidebarInset>
    )
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
                <BreadcrumbPage>{customer.customerName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="sm:hidden">
          <h1 className="text-lg font-semibold truncate">{customer.customerName}</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/customers">
              <Button variant="outline" size="sm" className="w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{customer.customerName}</h2>
              <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="h-4 w-4" />
                {customer.city}
              </p>
            </div>
          </div>
                     <div className="flex flex-col sm:flex-row gap-2">
             <Link href={`/customers/${customerId}/edit`}>
               <Button className="w-full sm:w-auto">
                 <Edit className="h-4 w-4 mr-2" />
                 Edit Customer
               </Button>
             </Link>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="w-full sm:w-auto">
                   <Download className="h-4 w-4 mr-2" />
                   Download
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                 <DropdownMenuItem 
                   onClick={downloadAsPDF}
                   className="cursor-pointer"
                 >
                   <FileText className="h-4 w-4 mr-2" />
                   Download as PDF
                 </DropdownMenuItem>
                 <DropdownMenuItem 
                   onClick={downloadAsExcel}
                   className="cursor-pointer"
                 >
                   <FileSpreadsheet className="h-4 w-4 mr-2" />
                   Download as Excel
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
        </div>

        {/* Customer Overview Cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerStats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{customerStats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime value</p>
            </CardContent>
          </Card>

        </div>


        {/* Customer Details and Tabs */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Basic customer details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.address}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer Type</span>
                  <span className="font-medium">{customer.customerType}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders and Payment History */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="orders" className="space-y-4 ">
              <TabsList className="w-full">
                <TabsTrigger className="w-full text-xs sm:text-sm" value="orders">Orders</TabsTrigger>
                {/* <TabsTrigger value="payments">Payment History</TabsTrigger> */}
              </TabsList>

              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                     <Input
                     placeholder="Search orders by ID, date, amount, status, or product name..."
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       // Reset pagination when search changes
                       setPagination(prev => ({ ...prev, currentPage: 1 }));
                     }}
                     className="pl-10 text-sm"
                   />
                </div>

                {/* Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant={isAnyFilterActive() ? "default" : "outline"} 
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">{getFilterDisplayText()}</span>
                      <span className="sm:hidden">Filter</span>
                      {isAnyFilterActive() && (
                        <Badge variant="secondary" className="ml-1">
                          {filteredOrders.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 mx-4 sm:mx-0" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filter Orders</h4>
                        {activeFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>

                      {/* Filter Type Selection */}
                      <div className="space-y-2">
                        <Label>Filter Type</Label>
                                                   <Select
                             value={activeFilter || ""}
                             onValueChange={(value) => {
                                setActiveFilter(value || null);
                                // Clear previous filter values when changing filter type
                                setFilterValues({
                                  dateFrom: undefined,
                                  dateTo: undefined,
                                  dateFromDay: "",
                                  dateFromMonth: "",
                                  dateFromYear: "",
                                  dateToDay: "",
                                  dateToMonth: "",
                                  dateToYear: "",
                                  amountMin: "",
                                  amountMax: "",
                                  itemCount: "",
                                  orderStatus: ""
                                });
                                // Reset pagination when filter type changes
                                setPagination(prev => ({ ...prev, currentPage: 1 }));
                              }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select filter type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dateRange">Date Range</SelectItem>
                            <SelectItem value="amountRange">Amount Range</SelectItem>
                            <SelectItem value="itemCount">Item Count</SelectItem>
                            <SelectItem value="orderStatus">Order Status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                                                                     {/* Date Range Filter */}
                        {activeFilter === "dateRange" && (
                          <div className="space-y-2">
                            <Label>Date Range</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">From Date</Label>
                                <div className="grid grid-cols-3 gap-1">
                                                                     <Select
                                     value={filterValues.dateFromDay}
                                     onValueChange={(value) => {
                                       setFilterValues(prev => ({ ...prev, dateFromDay: value }));
                                       updateDateFrom();
                                       // Reset pagination when filter values change
                                       setPagination(prev => ({ ...prev, currentPage: 1 }));
                                     }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={day.toString()}>
                                          {day.toString().padStart(2, '0')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={filterValues.dateFromMonth}
                                    onValueChange={(value) => {
                                      setFilterValues(prev => ({ ...prev, dateFromMonth: value }));
                                      updateDateFrom();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[
                                        { value: "1", label: "Jan" },
                                        { value: "2", label: "Feb" },
                                        { value: "3", label: "Mar" },
                                        { value: "4", label: "Apr" },
                                        { value: "5", label: "May" },
                                        { value: "6", label: "Jun" },
                                        { value: "7", label: "Jul" },
                                        { value: "8", label: "Aug" },
                                        { value: "9", label: "Sep" },
                                        { value: "10", label: "Oct" },
                                        { value: "11", label: "Nov" },
                                        { value: "12", label: "Dec" }
                                      ].map(month => (
                                        <SelectItem key={month.value} value={month.value}>
                                          {month.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={filterValues.dateFromYear}
                                    onValueChange={(value) => {
                                      setFilterValues(prev => ({ ...prev, dateFromYear: value }));
                                      updateDateFrom();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">To Date</Label>
                                <div className="grid grid-cols-3 gap-1">
                                  <Select
                                    value={filterValues.dateToDay}
                                    onValueChange={(value) => {
                                      setFilterValues(prev => ({ ...prev, dateToDay: value }));
                                      updateDateTo();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={day.toString()}>
                                          {day.toString().padStart(2, '0')}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={filterValues.dateToMonth}
                                    onValueChange={(value) => {
                                      setFilterValues(prev => ({ ...prev, dateToMonth: value }));
                                      updateDateTo();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[
                                        { value: "1", label: "Jan" },
                                        { value: "2", label: "Feb" },
                                        { value: "3", label: "Mar" },
                                        { value: "4", label: "Apr" },
                                        { value: "5", label: "May" },
                                        { value: "6", label: "Jun" },
                                        { value: "7", label: "Jul" },
                                        { value: "8", label: "Aug" },
                                        { value: "9", label: "Sep" },
                                        { value: "10", label: "Oct" },
                                        { value: "11", label: "Nov" },
                                        { value: "12", label: "Dec" }
                                      ].map(month => (
                                        <SelectItem key={month.value} value={month.value}>
                                          {month.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={filterValues.dateToYear}
                                    onValueChange={(value) => {
                                      setFilterValues(prev => ({ ...prev, dateToYear: value }));
                                      updateDateTo();
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Amount Range Filter */}
                      {activeFilter === "amountRange" && (
                        <div className="space-y-2">
                          <Label>Amount Range (₹)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Min Amount</Label>
                                                             <Input
                                 type="number"
                                 placeholder="0"
                                 value={filterValues.amountMin}
                                 onChange={(e) => {
                                   setFilterValues(prev => ({ ...prev, amountMin: e.target.value }));
                                   // Reset pagination when filter values change
                                   setPagination(prev => ({ ...prev, currentPage: 1 }));
                                 }}
                               />
                            </div>
                            <div>
                              <Label className="text-xs">Max Amount</Label>
                                                             <Input
                                 type="number"
                                 placeholder="100000"
                                 value={filterValues.amountMax}
                                 onChange={(e) => {
                                   setFilterValues(prev => ({ ...prev, amountMax: e.target.value }));
                                   // Reset pagination when filter values change
                                   setPagination(prev => ({ ...prev, currentPage: 1 }));
                                 }}
                               />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Item Count Filter */}
                      {activeFilter === "itemCount" && (
                        <div className="space-y-2">
                          <Label>Item Count</Label>
                                                     <Input
                             type="number"
                             placeholder="Enter exact item count"
                             value={filterValues.itemCount}
                             onChange={(e) => {
                               setFilterValues(prev => ({ ...prev, itemCount: e.target.value }));
                               // Reset pagination when filter values change
                               setPagination(prev => ({ ...prev, currentPage: 1 }));
                             }}
                           />
                        </div>
                      )}

                      {/* Order Status Filter */}
                      {activeFilter === "orderStatus" && (
                        <div className="space-y-2">
                          <Label>Order Status</Label>
                                                     <Select
                             value={filterValues.orderStatus}
                             onValueChange={(value) => {
                               setFilterValues(prev => ({ ...prev, orderStatus: value }));
                               // Reset pagination when filter values change
                               setPagination(prev => ({ ...prev, currentPage: 1 }));
                             }}
                           >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <TabsContent value="orders">
                <Card>
                                     <CardHeader>
                     <CardTitle>Orders</CardTitle>
                     <CardDescription>
                       {searchQuery.trim() || activeFilter
                         ? `Found ${filteredOrders.length} order(s)${searchQuery.trim() ? ` matching "${searchQuery}"` : ""}${activeFilter ? ` with ${activeFilter} filter` : ""}`
                         : `Latest orders from this customer (${filteredOrders.length} total)`
                       }
                     </CardDescription>
                   </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                                                 <thead className="border-b">
                           <tr>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Order ID</th>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden sm:table-cell">Date</th>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden md:table-cell">Paid Amount</th>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Amount</th>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm">Items</th>
                             <th className="text-left p-2 sm:p-4 font-medium text-xs sm:text-sm hidden lg:table-cell">Status</th>
                           </tr>
                         </thead>
                        <tbody>
                          {filteredOrders.length > 0 ? (
                            filteredOrders.map((order: any) => (
                                                             <tr key={order._id} className="border-b hover:bg-muted/50">
                                 <td className="p-2 sm:p-4">
                                   <div className="flex flex-col">
                                     <span className="font-medium text-xs sm:text-sm">{formatOrderId(order._id)}</span>
                                     <span className="text-xs text-muted-foreground sm:hidden">{new Date(order.orderDate).toLocaleDateString()}</span>
                                   </div>
                                 </td>
                                 <td className="p-2 sm:p-4 hidden sm:table-cell text-xs sm:text-sm">{new Date(order.orderDate).toLocaleDateString()}</td>
                                 <td className="p-2 sm:p-4 hidden md:table-cell">
                                   <div className="relative group">
                                     <span className="text-green-600 cursor-help text-xs sm:text-sm">
                                       ₹{calculatePaidAmount(order).toLocaleString()}
                                     </span>
                                                                           {/* Tooltip explaining the calculation */}
                                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
                                        <div className="font-medium mb-1">Paid Amount</div>
                                        <div className="text-gray-300">
                                          {order.paidAmount !== null && order.paidAmount !== undefined 
                                            ? "Updated from edit page" 
                                            : "Default: 40% of order total"
                                          }
                                        </div>
                                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                   </div>
                                 </td>
                                 <td className="p-2 sm:p-4">
                                   <div className="flex flex-col">
                                     <span className="font-medium text-xs sm:text-sm">₹{calculateOrderTotal(order).toLocaleString()}</span>
                                     <span className="text-xs text-muted-foreground sm:hidden">
                                       Paid: ₹{calculatePaidAmount(order).toLocaleString()}
                                     </span>
                                   </div>
                                 </td>
                                 <td className="p-2 sm:p-4">
                                  <div className="space-y-1">
                                    <div className="text-xs sm:text-sm">{order.orderItems.length} items</div>
                                    {order.orderItems.length <= 3 ? (
                                      <div className="text-xs text-gray-500 space-y-0.5">
                                        {order.orderItems.map((item: any, index: number) => (
                                          <div key={index} className="truncate">
                                            {(productMap[item.product] || item.product)} ({item.product})
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="relative group">
                                        <div className="text-xs text-gray-500">
                                          {order.orderItems.slice(0, 3).map((item: any, index: number) => (
                                            <div key={index} className="truncate">
                                              {item.product}
                                            </div>
                                          ))}
                                          <div className="text-gray-400">...</div>
                                        </div>
                                        {/* Hover popup */}
                                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
                                          <div className="font-medium mb-1">All Products:</div>
                                          <div className="space-y-1">
                                            {order.orderItems.map((item: any, index: number) => (
                                              <div key={index} className="truncate">
                                                {(productMap[item.product] || item.product)} ({item.product})
                                              </div>
                                            ))}
                                          </div>
                                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      {getStatusBadge(order.status)}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 sm:p-4 hidden lg:table-cell">{getStatusBadge(order.status)}</td>
                              </tr>
                            ))
                          ) : (
                                                         <tr>
                               <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                 {searchQuery.trim() ? `No orders found matching "${searchQuery}"` : "No orders found for this customer"}
                               </td>
                             </tr>
                          )}
                                                 </tbody>
                       </table>
                     </div>
                     
                     {/* Pagination Controls */}
                     {!loading && !error && pagination.totalPages > 1 && (
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-t gap-4">
                         <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                           Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} entries
                         </div>
                         <div className="flex items-center justify-center gap-1 sm:gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handlePageChange(1)}
                             disabled={!pagination.hasPrevPage}
                             className="h-8 w-8 p-0"
                           >
                             <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handlePageChange(pagination.currentPage - 1)}
                             disabled={!pagination.hasPrevPage}
                             className="h-8 w-8 p-0"
                           >
                             <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                           </Button>
                           
                           <div className="flex items-center gap-1">
                             {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                               let pageNum;
                               if (pagination.totalPages <= 5) {
                                 pageNum = i + 1;
                               } else if (pagination.currentPage <= 3) {
                                 pageNum = i + 1;
                               } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                 pageNum = pagination.totalPages - 4 + i;
                               } else {
                                 pageNum = pagination.currentPage - 2 + i;
                               }
                               
                               return (
                                 <Button
                                   key={pageNum}
                                   variant={pageNum === pagination.currentPage ? "default" : "outline"}
                                   size="sm"
                                   onClick={() => handlePageChange(pageNum)}
                                   className="w-6 h-6 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                                 >
                                   {pageNum}
                                 </Button>
                               );
                             })}
                           </div>
                           
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handlePageChange(pagination.currentPage + 1)}
                             disabled={!pagination.hasNextPage}
                             className="h-8 w-8 p-0"
                           >
                             <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handlePageChange(pagination.totalPages)}
                             disabled={!pagination.hasNextPage}
                             className="h-8 w-8 p-0"
                           >
                             <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                           </Button>
                         </div>
                       </div>
                     )}
                   </CardContent>
                 </Card>
              </TabsContent>

              {/* <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Recent payment transactions</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-4 font-medium">Payment ID</th>
                            <th className="text-left p-4 font-medium">Date</th>
                            <th className="text-left p-4 font-medium">Amount</th>
                            <th className="text-left p-4 font-medium">Method</th>
                            <th className="text-left p-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map((payment) => (
                            <tr key={payment.id} className="border-b hover:bg-muted/50">
                              <td className="p-4 font-medium">{payment.id}</td>
                              <td className="p-4">{payment.date}</td>
                              <td className="p-4">₹{payment.amount.toLocaleString()}</td>
                              <td className="p-4">{payment.method}</td>
                              <td className="p-4">{getStatusBadge(payment.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent> */}
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}

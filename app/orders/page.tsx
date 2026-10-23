"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Search, Plus, Eye, Download, Edit, Package, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Trash2, FileText, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { API_BASE_URL } from "@/lib/api"
import { useUserRole, hasPermissionToChangeOrderStatus } from "@/lib/user-role"
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import 'jspdf-autotable'
import {NotoSansRegular} from '@/app/fonts/NotoSans-Regular'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// TypeScript interfaces
interface OrderItem {
  product: string
  color: string
  quantity: number
  unit: string
  pricePerMeters: number
}

interface Order {
  _id: string
  customer: string
  status?: string
  orderDate: string
  deliveryDate: string
  orderItems: OrderItem[]
  notes?: string
  createdAt: string
  updatedAt: string
  customerInfo?: {
    city: string
    customerType: string
    email: string
    phone: string
    address: string
  }
}

interface DisplayOrder {
  id: string
  originalId: string // Original MongoDB ID
  customer: string
  customerCity: string
  items: number
  totalAmount: number
  status: string
  date: string
  dueDate: string
  products: string[]
  hasInactiveProduct?: boolean
  hasDeletedProduct?: boolean
  indentNumber?: number
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Helper function to format order ID as ORD-XXX
const formatOrderId = (orderId: string) => {
  if (!orderId) return 'ORD-000'
  // Extract only numeric digits from the ID
  const numericChars = orderId.replace(/[^0-9]/g, '')
  // Use the last 3 digits, or pad with zeros if less than 3 digits
  const lastThreeDigits = numericChars.slice(-3).padStart(3, '0')
  return `ORD-${lastThreeDigits}`
}

// Helper function to format date as DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

// Helper function to calculate payment status
const getPaymentStatus = (paidAmount: number, totalAmount: number) => {
  if (paidAmount >= totalAmount) return 'paid'
  if (paidAmount > 0) return 'partial'
  return 'pending'
}

// Download utility functions will be moved inside the component


export default function OrdersPage() {
  const { toast } = useToast()
  const { role, isLoading: roleLoading } = useUserRole()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCustomer, setSelectedCustomer] = useState("all")

  // Function to fetch full order data for download
  const fetchOrderForDownload = async (orderId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/order/${orderId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch order details')
      }
      const data = await response.json()
      return data.success ? data.order : null
    } catch (error) {
      console.error('Error fetching order for download:', error)
      toast({
        title: "Error",
        description: "Failed to fetch order details for download",
        variant: "destructive",
      })
      return null
    }
  }

  // Function to fetch customer data for download
  const fetchCustomerForDownload = async (customerName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/customer`)
      if (!response.ok) {
        throw new Error('Failed to fetch customer details')
      }
      const data = await response.json()
      const customer = data.customers.find((c: any) => c.customerName === customerName)
      return customer || null
    } catch (error) {
      console.error('Error fetching customer for download:', error)
      return null
    }
  }


  // Helper function to check if a string is likely an ObjectId
  const isLikelyObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value)

  // Resolve product either by ID or by name (to handle legacy data)
  const findProductByIdOrName = (identifier: string) => {
    if (!identifier) return undefined
    const byId = isLikelyObjectId(identifier)
      ? allProducts.find((p) => p._id === identifier)
      : undefined
    if (byId) return byId
    const byName = allProducts.find((p) => (p.productName || "") === identifier)
    return byName
  }

  // Helper function to get product name from product ref (id or name)
  const getProductName = (productRef: string) => {
    const product = findProductByIdOrName(productRef)
    return product ? product.productName : productRef
  }

  // Helper to get product category (product name) by id or name
  const getProductCategory = (productRef: string) => {
    const product = findProductByIdOrName(productRef)
    return product ? (product.category || "") : ""
  }

  // Get formatted product display name
  const getProductDisplayName = (productRef: string) => {
    const designNumber = getProductName(productRef)
    const productCategory = getProductCategory(productRef)
    return productCategory
      ? `${productCategory} (${designNumber})`
      : designNumber
  }

  // Helper function to truncate color names
  const truncateColor = (color: string, maxLength: number = 8) => {
    if (color.length <= maxLength) return color
    return color.substring(0, maxLength) + "..."
  }

  // Download utility functions
  const downloadAsPDF = (orderData: any, customerData: any) => {
    const doc = new jsPDF()
    
    doc.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans");

    // Set font and size
    doc.setFontSize(20)
    doc.text('ORDER DETAILS', 20, 20)
    
    // Calculate totals like view page
    const subtotal = orderData.orderItems.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerMeters), 0)
    const totalAmount = subtotal // No GST in view page
    const paidAmount = orderData.paidAmount || 0
    const balanceAmount = totalAmount - paidAmount
    const paymentStatus = getPaymentStatus(paidAmount, totalAmount)

    // Order information
    doc.setFontSize(12)
    doc.text(`Order ID: ${formatOrderId(orderData.displayId || orderData.id || orderData._id)}`, 20, 35)
    doc.text(`Customer: ${customerData.customerName || customerData.name}`, 20, 45)
    doc.text(`Order Date: ${formatDate(orderData.orderDate || orderData.date)}`, 20, 55)
    doc.text(`Due Date: ${formatDate(orderData.deliveryDate || orderData.dueDate)}`, 20, 65)
    doc.text(`Status: ${orderData.status}`, 20, 75)
    doc.text(`Payment Status: ${paymentStatus}`, 20, 85)
    
    // Add Indent Number if it exists
    if (orderData.indentNumber !== undefined && orderData.indentNumber !== null) {
      doc.text(`Indent No.: ${orderData.indentNumber}`, 20, 95)
    }
    
    // Customer information
    doc.setFontSize(16)
    doc.text('CUSTOMER INFORMATION', 20, 105)
    doc.setFontSize(12)
    doc.text(`Name: ${customerData.customerName || customerData.name}`, 20, 115)
    doc.text(`Phone: ${customerData.phone}`, 20, 125)
    doc.text(`Email: ${customerData.email}`, 20, 135)
    doc.text(`Address: ${customerData.address}`, 20, 145)
    doc.text(`City: ${customerData.city}`, 20, 155)
    
    // Order items table
    doc.setFontSize(16)
    doc.text('ORDER ITEMS', 20, 175)
    
    // Table setup
    const tableStartY = 185
    const tableLeftX = 20
    const colWidths = [80, 30, 30, 30, 30] // Product, Color, Qty, Price, Total
    const rowHeight = 12
    
    // Table header
    doc.setFontSize(12)
    doc.setFont("NotoSans", "bold")
    doc.text('PRODUCT', tableLeftX, tableStartY)
    doc.text('COLOR', tableLeftX + colWidths[0], tableStartY)
    doc.text('QTY (m)', tableLeftX + colWidths[0] + colWidths[1], tableStartY)
    doc.text('PRICE', tableLeftX + colWidths[0] + colWidths[1] + colWidths[2], tableStartY)
    doc.text('TOTAL', tableLeftX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableStartY)
    
    // Draw header line
    const totalTableWidth = colWidths.reduce((a, b) => a + b, 0)
    doc.line(tableLeftX, tableStartY + 3, tableLeftX + totalTableWidth, tableStartY + 3)
    
    // Table rows
    doc.setFont("NotoSans", "normal")
    doc.setFontSize(10)
    let currentY = tableStartY + 10
    
    orderData.orderItems.forEach((item: any, index: number) => {
      const itemTotal = item.quantity * item.pricePerMeters
      
      doc.text(getProductDisplayName(item.product), tableLeftX, currentY)
      doc.text(truncateColor(item.color, 8), tableLeftX + colWidths[0], currentY)
      doc.text(`${item.quantity}`, tableLeftX + colWidths[0] + colWidths[1], currentY)
      doc.text(`₹${item.pricePerMeters}`, tableLeftX + colWidths[0] + colWidths[1] + colWidths[2], currentY)
      doc.text(`₹${itemTotal.toLocaleString()}`, tableLeftX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY)
      
      currentY += rowHeight
    })
    
    let yPosition = currentY + 10
    
    // Order summary
    doc.setFontSize(16)
    doc.text('ORDER SUMMARY', 20, yPosition + 10)
    doc.setFontSize(12)
    doc.text(`Subtotal: ₹${subtotal.toLocaleString()}`, 20, yPosition + 25)
    doc.text(`Total Amount: ₹${totalAmount.toLocaleString()}`, 20, yPosition + 35)
    doc.text(`Paid Amount: ₹${paidAmount.toLocaleString()}`, 20, yPosition + 45)
    doc.text(`Balance: ₹${balanceAmount.toLocaleString()}`, 20, yPosition + 55)
    
    // Notes
    if (orderData.notes) {
      doc.text(`Notes: ${orderData.notes}`, 20, yPosition + 80)
    }
    
    // Add some bottom margin
    doc.text('', 20, yPosition + 100)
    
    // Save the PDF
    doc.save(`Order_${formatOrderId(orderData.displayId || orderData.id || orderData._id)}.pdf`)
  }

  const downloadAsExcel = (orderData: any, customerData: any) => {
    // Create workbook and worksheets
    const workbook = XLSX.utils.book_new()
    
    // Calculate totals like view page
    const subtotal = orderData.orderItems.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerMeters), 0)
    const totalAmount = subtotal // No GST in view page
    const paidAmount = orderData.paidAmount || 0
    const balanceAmount = totalAmount - paidAmount
    const paymentStatus = getPaymentStatus(paidAmount, totalAmount)
    
    const orderDetailsData = [
      ['ORDER DETAILS'],
      ['Order ID', formatOrderId(orderData.displayId || orderData.id || orderData._id)],
      ['Customer', customerData.customerName || customerData.name],
      ['Order Date', formatDate(orderData.orderDate || orderData.date)],
      ['Due Date', formatDate(orderData.deliveryDate || orderData.dueDate)],
      ['Status', orderData.status],
      ['Payment Status', paymentStatus],
      ...(orderData.indentNumber !== undefined && orderData.indentNumber !== null
        ? [['Indent No.', orderData.indentNumber]]
        : []),
      [''],
      ['CUSTOMER INFORMATION'],
      ['Name', customerData.customerName || customerData.name],
      ['Phone', customerData.phone],
      ['Email', customerData.email],
      ['Address', customerData.address],
      ['City', customerData.city],
      [''],
      ['ORDER SUMMARY'],
      ['Subtotal', subtotal.toLocaleString()],
      ['Total Amount', totalAmount.toLocaleString()],
      ['Paid Amount', paidAmount.toLocaleString()],
      ['Balance', balanceAmount.toLocaleString()],
      [''],
      ['Notes', orderData.notes || '']
    ]
    
    const orderDetailsSheet = XLSX.utils.aoa_to_sheet(orderDetailsData)
    XLSX.utils.book_append_sheet(workbook, orderDetailsSheet, 'Order Details')
    
    // Order Items worksheet
    const orderItemsData = [
      ['Product', 'Color', 'Quantity', 'Price', 'Total'],
      ...orderData.orderItems.map((item: any) => [
        getProductDisplayName(item.product),
        truncateColor(item.color, 12),
        `${item.quantity}m`,
        `₹${item.pricePerMeters}/m`,
        `₹${(item.quantity * item.pricePerMeters).toLocaleString()}`
      ])
    ]
    
    const orderItemsSheet = XLSX.utils.aoa_to_sheet(orderItemsData)
    XLSX.utils.book_append_sheet(workbook, orderItemsSheet, 'Order Items')
    
    // Save the Excel file
    XLSX.writeFile(workbook, `Order_${formatOrderId(orderData.displayId || orderData.id || orderData._id)}.xlsx`)
  }

  // Handle download functions
  const handleDownloadPDF = async (order: DisplayOrder) => {
    const orderData = await fetchOrderForDownload(order.originalId)
    const customerData = await fetchCustomerForDownload(order.customer)
    
    if (orderData && customerData) {
      downloadAsPDF(orderData, customerData)
    }
  }

  const handleDownloadExcel = async (order: DisplayOrder) => {
    const orderData = await fetchOrderForDownload(order.originalId)
    const customerData = await fetchCustomerForDownload(order.customer)
    
    if (orderData && customerData) {
      downloadAsExcel(orderData, customerData)
    }
  }
  const [orders, setOrders] = useState<DisplayOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState<{ productName: string; category?: string; isActive?: boolean }[]>([])
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  })

  // Fetch orders from backend with pagination
  const fetchOrders = async (page: number = 1, limit: number = 10) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/order?page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      
      const data = await response.json()
      
      if (data.success && data.orders) {
        const transformedOrders = transformOrders(data.orders)
        setOrders(transformedOrders)
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // Fetch all products once for status lookups
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.products)) {
            setAllProducts(
              data.products.map((p: any) => ({
                productName: p.productName,
                category: p.category,
                isActive: p.isActive,
              }))
            )
          }
        }
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  // Once products are loaded, refetch orders so flags compute correctly
  useEffect(() => {
    if (allProducts.length > 0) {
      fetchOrders(pagination.currentPage, pagination.itemsPerPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts.length])
  
  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Check if user has permission to change order status
    if (!hasPermissionToChangeOrderStatus(role)) {
      toast({
        title: "Access Denied",
        description: "Only Managers and Owners can change order status.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingStatus(orderId)
      
      // Make API call to update order status
      const response = await fetch(`${API_BASE_URL}/order/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update order status')
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Update local state to reflect the change
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.originalId === orderId 
              ? { ...order, status: newStatus } 
              : order
          )
        )
        
        // Show success toast notification
        toast({
          title: "Status Updated",
          description: `Order status has been updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          variant: "default",
        })
      } else {
        throw new Error(data.message || 'Failed to update order status')
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      
      // Show error toast notification
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : 'Failed to update order status',
        variant: "destructive",
      })
      
      // Refresh orders to ensure UI is in sync with backend
      fetchOrders(pagination.currentPage, pagination.itemsPerPage)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      setDeletingOrder(orderId)
      const resp = await fetch(`${API_BASE_URL}/order/${orderId}`, { method: 'DELETE' })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error((data as any).message || 'Failed to delete order')
      }
      setOrders(prev => prev.filter(o => o.originalId !== orderId))
      toast({ title: 'Order Removed', description: 'Deleted order has been removed from the list.' })
    } catch (err) {
      toast({ title: 'Delete Failed', description: err instanceof Error ? err.message : 'Failed to delete order', variant: 'destructive' })
    } finally {
      setDeletingOrder(null)
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchOrders(newPage, pagination.itemsPerPage)
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    fetchOrders(1, newLimit)
  }

  // Transform backend orders to display format
  const transformOrders = (backendOrders: Order[]): DisplayOrder[] => {
    return backendOrders.map((order) => {
      const totalAmount = order.orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.pricePerMeters)
      }, 0)
      
      const products = order.orderItems.map(item => item.product)

      // If products aren't loaded yet, don't flag to avoid false positives
      const productListReady = allProducts.length > 0
      const isDeleted = (name: string) => productListReady && !allProducts.some(p => (p.productName || "") === name)
      const isInactive = (name: string) => {
        if (!productListReady) return false
        const p = allProducts.find(pp => (pp.productName || "") === name)
        return p ? (p.isActive === false) : false
      }
      const hasDeletedProduct = productListReady ? products.some(p => isDeleted(p)) : false
      const hasInactiveProduct = productListReady && !hasDeletedProduct ? products.some(p => isInactive(p)) : false
      
      // Format order ID as ORD-XXX where XXX is a number
      // Extract numeric digits from MongoDB ID or generate random number
      const orderId = order._id;
      // Extract only numeric digits from the last part of the ID
      const numericChars = orderId.replace(/[^0-9]/g, '');
      // Use the last 3 digits, or pad with zeros if less than 3 digits
      const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
      const formattedId = `ORD-${lastThreeDigits}`;
      
      return {
        id: formattedId,
        originalId: order._id, // Keep original ID for links and references
        customer: order.customer,
        customerCity: order.customerInfo?.city || 'N/A',
        items: order.orderItems.length,
        totalAmount,
        status: order.status || 'pending', // Use backend status
        date: new Date(order.orderDate).toISOString().split('T')[0],
        dueDate: new Date(order.deliveryDate).toISOString().split('T')[0],
        products,
        hasInactiveProduct,
        hasDeletedProduct,
        indentNumber: (order as any).indentNumber
      }
    })
  }

  const customers = [...new Set(orders.map((order) => order.customer))]

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.originalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.products.some((product) => product.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
    const matchesCustomer = selectedCustomer === "all" || order.customer === selectedCustomer
    return matchesSearch && matchesStatus && matchesCustomer
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <ShoppingCart className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const orderStats = {
    total: pagination.totalItems,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    totalValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
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
                <BreadcrumbPage>Orders</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="sm:hidden">
          <h1 className="text-lg font-semibold">Orders</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Order Management</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Track and manage customer orders</p>
          </div>
          <Link href="/orders/new">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">{orderStats.total}</p>
              </div>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-orange-500">{orderStats.pending}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Confirmed</p>
                <p className="text-lg font-bold text-green-500">{orderStats.confirmed}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold">₹{orderStats.totalValue.toLocaleString()}</p>
              </div>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers, products..."
              className="pl-10 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer} value={customer}>
                  {customer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Orders</CardTitle>
                <p className="text-sm text-muted-foreground">Latest orders first</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Items per page:</span>
                <span className="text-sm text-muted-foreground sm:hidden">Per page:</span>
                <Select value={String(pagination.itemsPerPage)} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Failed to load orders</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden">
                  <div className="space-y-3 p-4">
                    {filteredOrders.map((order) => (
                      <Card key={order.id} className={`p-4 ${order.hasDeletedProduct ? 'bg-red-50 border-red-200' : order.hasInactiveProduct ? 'bg-muted/60' : ''}`}>
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-sm">{order.id}</h3>
                              <p className="text-xs text-muted-foreground">{order.customer}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">₹{order.totalAmount.toLocaleString()}</p>
                              <div className="flex items-center gap-1 mt-1">
                                {getStatusIcon(order.status)}
                                <Select 
                                  value={order.status} 
                                  onValueChange={(value) => handleStatusChange(order.originalId, value)}
                                  disabled={updatingStatus === order.originalId || order.hasInactiveProduct || order.hasDeletedProduct || !hasPermissionToChangeOrderStatus(role)}
                                >
                                  <SelectTrigger className="w-[90px] h-7 text-xs">
                                    {updatingStatus === order.originalId ? (
                                      <div className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>...</span>
                                      </div>
                                    ) : (
                                      <SelectValue>{getStatusBadge(order.status)}</SelectValue>
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Items */}
                          <div>
                            <p className="text-xs font-medium flex items-center gap-2">
                              {order.items} items
                              {order.hasDeletedProduct ? (
                                <Badge variant="destructive" className="text-[10px]">Deleted</Badge>
                              ) : order.hasInactiveProduct ? (
                                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.products.slice(0, 2).join(", ")}
                              {order.products.length > 2 && "..."}
                            </p>
                          </div>

                          {/* Dates */}
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Order: {order.date}</span>
                            <span>Due: {order.dueDate}</span>
                          </div>
                            {order.indentNumber !== undefined && order.indentNumber !== null && (
                              <div className="text-xs mt-1"><span className="font-medium">Indent:</span> {order.indentNumber}</div>
                            )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            {order.hasDeletedProduct ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-8" 
                                onClick={() => handleDeleteOrder(order.originalId)} 
                                disabled={deletingOrder === order.originalId}
                              >
                                {deletingOrder === order.originalId ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                )}
                                Remove Order
                              </Button>
                            ) : (
                              <>
                                <Link href={`/orders/${order.originalId}`} className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full h-8" disabled={order.hasInactiveProduct}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                </Link>
                                <Link href={`/orders/${order.originalId}/edit`} className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full h-8" disabled={order.hasInactiveProduct}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Button>
                                </Link>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 px-3" disabled={order.hasInactiveProduct}>
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadPDF(order)}
                                      className="cursor-pointer"
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDownloadExcel(order)}
                                      className="cursor-pointer"
                                    >
                                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                                      Excel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <TooltipProvider>
                <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                        <th className="text-left p-4 font-medium text-sm">Order ID</th>
                        <th className="text-left p-4 font-medium text-sm">Indent</th>
                        <th className="text-left p-4 font-medium text-sm">Customer</th>
                        <th className="text-left p-4 font-medium text-sm">Items</th>
                        <th className="text-left p-4 font-medium text-sm">Amount</th>
                        <th className="text-left p-4 font-medium text-sm">Status</th>
                        <th className="text-left p-4 font-medium text-sm">Order Date</th>
                        <th className="text-left p-4 font-medium text-sm">Due Date</th>
                        <th className="text-left p-4 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                        <tr key={order.id} className={`border-b hover:bg-muted/50 ${order.hasDeletedProduct ? 'bg-red-50' : order.hasInactiveProduct ? 'bg-muted/60' : ''}`}>
                          <td className="p-4">
                            <div className="font-medium text-sm">{order.id}</div>
                        </td>
                         <td className="p-4">
                           <div className="text-sm">{order.indentNumber ?? ''}</div>
                         </td>
                          <td className="p-4">
                           <div>
                             <p className="font-medium text-sm">{order.customer}</p>
                             <p className="text-xs text-muted-foreground">{order.customerCity}</p>
                           </div>
                         </td>
                          <td className="p-4">
                          <div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-sm flex items-center gap-2 cursor-help">
                                    {order.items} items
                                    {order.hasDeletedProduct ? (
                                      <Badge variant="destructive" className="text-[10px]">Deleted</Badge>
                                    ) : order.hasInactiveProduct ? (
                                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                    ) : null}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <OrderItemsHover originalId={order.originalId} />
                                </TooltipContent>
                              </Tooltip>
                              <p className="text-xs text-muted-foreground">
                                {order.products.slice(0, 2).join(", ")}
                                {order.products.length > 2 && "..."}
                              </p>
                          </div>
                        </td>
                          <td className="p-4">
                            <div className="font-medium text-sm">₹{order.totalAmount.toLocaleString()}</div>
                        </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <Select 
                              value={order.status} 
                              onValueChange={(value) => handleStatusChange(order.originalId, value)}
                              disabled={updatingStatus === order.originalId || order.hasInactiveProduct || order.hasDeletedProduct || !hasPermissionToChangeOrderStatus(role)}
                            >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                {updatingStatus === order.originalId ? (
                                  <div className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Updating...</span>
                                  </div>
                                ) : (
                                  <SelectValue>{getStatusBadge(order.status)}</SelectValue>
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                          <td className="p-4">
                            <div className="text-sm">{order.date}</div>
                        </td>
                          <td className="p-4">
                            <div className="text-sm">{order.dueDate}</div>
                        </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                            {order.hasDeletedProduct ? (
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handleDeleteOrder(order.originalId)} disabled={deletingOrder === order.originalId} title="Remove order">
                                {deletingOrder === order.originalId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            ) : (
                              <>
                                <Link href={`/orders/${order.originalId}`}>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={order.hasInactiveProduct} title="View order">
                                      <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/orders/${order.originalId}/edit`}>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={order.hasInactiveProduct} title="Edit order">
                                      <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={order.hasInactiveProduct} title="Download order">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleDownloadPDF(order)}
                                        className="cursor-pointer"
                                        title="Download as PDF"
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDownloadExcel(order)}
                                        className="cursor-pointer"
                                        title="Download as Excel"
                                      >
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        EXCEL
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </TooltipProvider>
              </>
            )}

            {/* Pagination Controls */}
            {!loading && !error && pagination.totalPages > 1 && (
              <div className="flex flex-col gap-3 p-4 border-t">
                <div className="text-xs text-muted-foreground text-center">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} orders
                </div>
                
                {/* Mobile Pagination */}
                <div className="flex items-center justify-center gap-2 lg:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[80px] text-center">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden lg:flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPrevPage}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
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
                          className="w-8 h-8 p-0 text-sm"
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
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNextPage}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && !error && filteredOrders.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Link href="/orders/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Order
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  )
}

function OrderItemsHover({ originalId }: { originalId: string }) {
  const [items, setItems] = useState<OrderItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [productMap, setProductMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE_URL}/order/${originalId}`)
        if (!res.ok) return
        const data = await res.json()
        const order = data?.order
        if (!cancelled && order && Array.isArray(order.orderItems)) {
          setItems(order.orderItems)
        }
        // Fetch products to resolve Product Name (Category) for each design number
        try {
          const pRes = await fetch(`${API_BASE_URL}/products`)
          if (pRes.ok) {
            const pData = await pRes.json()
            const list: any[] = pData?.products || []
            const map: Record<string, string> = {}
            for (const p of list) {
              // p.productName is design number, p.category is product name
              if (p && typeof p.productName === 'string') {
                map[p.productName] = p.category || ''
              }
            }
            if (!cancelled) setProductMap(map)
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [originalId])

  return (
    <div className="text-xs">
      {loading && <div>Loading...</div>}
      {!loading && (!items || items.length === 0) && <div>No items</div>}
      {!loading && items && items.length > 0 && (
        <div className="space-y-1">
          {items.map((it, idx) => (
            <div key={idx}>
              {(productMap[it.product] || it.product)} ({it.product}) • {it.color} • {it.quantity}
              {it.unit ? it.unit.toLowerCase() === 'meters' ? 'm' : ` ${it.unit}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

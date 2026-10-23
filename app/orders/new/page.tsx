"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, ArrowLeft, Save, User, Package, Calculator, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"

// Backend interfaces
interface Customer { 
  _id: string; 
  customerName: string; 
  city: string; 
  customerType: "Wholesale" | "Retail";
}
interface StockVariant { color: string; quantity: number; unit: string; }
interface StockDetails { product: string; factory?: string; agent?: string; orderNumber?: string; processingFactory?: string; processingStage?: string; expectedCompletion?: string; design?: string; warehouse?: string; }
interface Stock { _id: string; stockType: "Gray Stock" | "Factory Stock" | "Design Stock"; status: string; variants: StockVariant[]; stockDetails: StockDetails; addtionalInfo: any; createdAt: string; updatedAt: string; }

// Product interface for order items (derived from stocks)
interface ProductVariant { color: string; pricePerMeters: number; stockInMeters: number }
interface Product { 
  _id: string; 
  productName: string; 
  variants: ProductVariant[]; 
  unit: "METERS" | "SETS";
  stockType?: "Gray Stock" | "Factory Stock" | "Design Stock";
  stockDetails?: StockDetails;
}

// Minimal product master record for display lookups
interface ProductMaster {
  _id: string;
  productName: string; // Design Number
  category?: string;   // Product Name
  unit?: "METERS" | "SETS";
  variants?: { color: string; pricePerMeters: number }[];
  isActive?: boolean;
}

export default function NewOrderPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [selectedCustomerId, setSelectedCustomerId] = useState("")

  // Helper function to get selected customer name
  const getSelectedCustomerName = () => {
    const selectedCustomer = customers.find(c => c._id === selectedCustomerId)
    return selectedCustomer?.customerName || ""
  }



  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [deliveryDate, setDeliveryDate] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [indentNumber, setIndentNumber] = useState<string>("")

  const [orderItems, setOrderItems] = useState([
    { id: 1, productId: "", color: "", quantity: "", unit: "sets", price: "", total: 0 },
  ])

  // Backend data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<ProductMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch customers
        const custRes = await fetch(`${API_BASE_URL}/customer`)
        if (!custRes.ok) throw new Error(`Customers fetch failed: ${custRes.status}`)
        const custData = await custRes.json()
        if (!custData.success) throw new Error(custData.message || "Failed to fetch customers")
        setCustomers(custData.customers || [])

        // Fetch all products for name lookup
        const allProductsRes = await fetch(`${API_BASE_URL}/products`)
        let allProductsList: ProductMaster[] = []
        if (allProductsRes.ok) {
          const data = await allProductsRes.json()
          if (data.success && Array.isArray(data.products)) {
            allProductsList = data.products.map((p: any) => ({
              _id: p._id,
              productName: p.productName,
              category: p.category,
              unit: p.unit,
              variants: Array.isArray(p.variants)
                ? p.variants.map((v: any) => ({ color: v.color, pricePerMeters: v.pricePerMeters }))
                : [],
              isActive: p.isActive,
            }))
          }
        }
        setAllProducts(allProductsList)

        // Fetch products from stocks API (only products that are in stock)
        let productsData: any = null
        let prodRes = await fetch(`${API_BASE_URL}/stock/design`)
        if (prodRes.ok) {
          const data = await prodRes.json()
          if (data?.success && Array.isArray(data.stocks)) {
            // Transform stock data to product format
            const isLikelyObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)
            const isDeleted = (prodRef: string) => {
              if (!prodRef) return true
              if (isLikelyObjectId(prodRef)) {
                return !allProductsList.some((p) => p._id === prodRef)
              }
              return !allProductsList.some((p) => p.productName === prodRef)
            }
            productsData = data.stocks
              .filter((stock: Stock) => stock.status === "available")
              .filter((stock: Stock) => {
                const ref = stock.stockDetails.product
                if (isDeleted(ref)) return false
                // resolve product
                const prod = isLikelyObjectId(ref) ? allProductsList.find(p=>p._id===ref) : allProductsList.find(p=>p.productName===ref)
                return prod ? (prod.isActive !== false) : true
              })
              .map((stock: Stock) => {
                let productName = stock.stockDetails.product
                let foundProduct = undefined as undefined | ProductMaster
                // If product looks like ID, resolve by _id, else by name
                if (/^[a-f\d]{24}$/i.test(productName)) {
                  foundProduct = allProductsList.find((p) => p._id === productName)
                  if (foundProduct) productName = foundProduct.productName
                } else {
                  foundProduct = allProductsList.find((p) => p.productName === productName)
                }
                return {
                  _id: stock._id,
                  productName,
                  variants: stock.variants.map((variant: StockVariant) => {
                    const price = foundProduct?.variants?.find((v) => v.color === variant.color)?.pricePerMeters ?? 0
                    return {
                      color: variant.color,
                      pricePerMeters: price,
                      stockInMeters: variant.quantity,
                    }
                  }),
                  unit: (foundProduct?.unit === "SETS" ? "SETS" : "METERS"),
                  stockType: stock.stockType,
                  stockDetails: stock.stockDetails,
                }
              })
          }
        }
        if (!productsData) {
          // Try fallback route if needed
          prodRes = await fetch(`${API_BASE_URL}/stock/design`)
          if (!prodRes.ok) throw new Error(`Stocks fetch failed: ${prodRes.status}`)
          const data = await prodRes.json()
          if (!data.success) throw new Error(data.message || "Failed to fetch stocks")
          const isLikelyObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)
          const isDeleted = (prodRef: string) => {
            if (!prodRef) return true
            if (isLikelyObjectId(prodRef)) {
              return !allProductsList.some((p) => p._id === prodRef)
            }
            return !allProductsList.some((p) => p.productName === prodRef)
          }
          productsData = data.stocks
            .filter((stock: Stock) => stock.status === "available")
            .filter((stock: Stock) => {
              const ref = stock.stockDetails.product
              if (isDeleted(ref)) return false
              const prod = isLikelyObjectId(ref) ? allProducts.find(p=>p._id===ref) : allProducts.find(p=>p.productName===ref)
              return prod ? (prod.isActive !== false) : true
            })
            .map((stock: Stock) => {
              let productName = stock.stockDetails.product
              let foundProduct = undefined as undefined | ProductMaster
              if (/^[a-f\d]{24}$/i.test(productName)) {
                foundProduct = allProductsList.find((p) => p._id === productName)
                if (foundProduct) productName = foundProduct.productName
              } else {
                foundProduct = allProductsList.find((p) => p.productName === productName)
              }
              return {
                _id: stock._id,
                productName,
                variants: stock.variants.map((variant: StockVariant) => {
                  const price = foundProduct?.variants?.find((v) => v.color === variant.color)?.pricePerMeters ?? 0
                  return {
                    color: variant.color,
                    pricePerMeters: price,
                    stockInMeters: variant.quantity,
                  }
                }),
                unit: (foundProduct?.unit === "SETS" ? "SETS" : "METERS"),
                stockType: stock.stockType,
                stockDetails: stock.stockDetails,
              }
            })
        }
        setProducts(productsData)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Ensure delivery date is always after order date
  const nextDay = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(`${dateStr}T00:00:00`)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }

  useEffect(() => {
    if (!orderDate || !deliveryDate) return
    const orderD = new Date(`${orderDate}T00:00:00`)
    const deliveryD = new Date(`${deliveryDate}T00:00:00`)
    if (deliveryD <= orderD) {
      setDeliveryDate("")
    }
  }, [orderDate])

  const addOrderItem = () => {
    const newItem = { id: Date.now(), productId: "", color: "", quantity: "", unit: "sets", price: "", total: 0 }
    setOrderItems((prev) => [...prev, newItem])
  }

  const removeOrderItem = (id: number) => {
    if (orderItems.length > 1) setOrderItems(orderItems.filter((item) => item.id !== id))
    }

  const getProductColors = (productId: string, excludeId?: number) => {
    return getAvailableColors(productId, excludeId)
  }

  // Add All Colors handler
  const addAllColorsForProduct = (baseItem: typeof orderItems[0]) => {
    if (!baseItem.productId) return
    const product = products.find((p) => p._id === baseItem.productId)
    if (!product) return
    const allColors = product.variants.map((v) => v.color)
    // Get colors already present in orderItems for this product
    const existingColors = orderItems
      .filter((item) => item.productId === baseItem.productId)
      .map((item) => item.color)
    // Determine missing colors, excluding baseItem.color
    const missingColors = allColors.filter(
      (color) => !existingColors.includes(color)
    )
    if (missingColors.length === 0) {
      toast({ title: "No additional colors", description: "All colors already added.", variant: "default" })
      return
    }
    const baseQuantity = baseItem.quantity
    const baseUnit = baseItem.unit
    // Create new order items for missing colors
    const newItems = missingColors.map((color) => {
      const variant = product.variants.find((v) => v.color === color)
      const price = variant ? String(variant.pricePerMeters) : "0"
      return {
        id: Date.now() + Math.random(),
        productId: baseItem.productId,
        color,
        quantity: baseQuantity,
        unit: baseUnit,
        price,
        total: 0,
      }
    })
    setOrderItems((prev) => [...prev, ...newItems])
    toast({ title: "Colors added", description: `Added ${missingColors.length} colors for ${product.productName}` , variant: "default" })
  }

  const updateOrderItem = (id: number, field: string, value: string) => {
    setOrderItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }

        // If product changes, clear color and price to avoid conflicts
        if (field === "productId") {
          updated.color = ""
          updated.price = "0"
        }

        // Auto price from product variant
        if (field === "productId" || field === "color") {
          const product = products.find((p) => p._id === (field === "productId" ? value : item.productId))
          const color = field === "color" ? value : item.color
          const variant = product?.variants.find((v) => v.color === color)
          updated.price = variant ? String(variant.pricePerMeters) : "0"
        }

        // Calculate total
        if (updated.quantity && updated.price) {
          let qty = parseFloat(updated.quantity) || 0
          const price = parseFloat(updated.price) || 0
          if (updated.unit === "sets") {
            // Default: 1 set = 60 meters
                qty = qty * 60
          }
          updated.total = qty * price
        } else {
          updated.total = 0
        }
        return updated
      }),
    )
  }

  const calculateOrderTotal = () => orderItems.reduce((sum, item) => sum + item.total, 0)
  const calculateTax = () => calculateOrderTotal() * 0.18 // 18% GST
  const calculateGrandTotal = () => calculateOrderTotal() + calculateTax()

  // Check for duplicate color within the SAME stock category (Gray/Factory/Design)
  const hasDuplicateInOrder = (productId: string, color: string, excludeId?: number) => {
    const product = products.find((p) => p._id === productId)
    const stockType = product?.stockType
    if (!stockType) return false
    return orderItems.some((item) => {
      if (item.id === excludeId) return false
      if (!item.color) return false
      const p = products.find((pp) => pp._id === item.productId)
      return p?.stockType === stockType && item.color === color
    })
  }

  // Get available colors for a product, excluding already selected combinations
  const getAvailableColors = (productId: string, excludeId?: number) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return []
    
    return product.variants
      .map((v) => v.color)
      .filter(color => !hasDuplicateInOrder(productId, color, excludeId))
  }

  // Check if a specific product+color combination is already used
  const isCombinationUsed = (productId: string, color: string, excludeId?: number) => {
    return hasDuplicateInOrder(productId, color, excludeId)
  }

  // Lookup available meters for a given selected stock (productId) and color
  const getAvailableMeters = (productId: string, color: string): number => {
    const product = products.find((p) => p._id === productId)
    if (!product) return 0
    const v = product.variants.find((vv) => vv.color === color)
    return v?.stockInMeters ?? 0
  }

  const handleCreateOrder = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Basic validation
      if (!selectedCustomerId) throw new Error("Please select a customer")
      if (!orderDate || !deliveryDate) throw new Error("Please select order and delivery dates")
      {
        const orderD = new Date(`${orderDate}T00:00:00`)
        const deliveryD = new Date(`${deliveryDate}T00:00:00`)
        if (!(deliveryD > orderD)) {
          throw new Error("Expected delivery date must be after order date")
        }
      }
      if (orderItems.some((i) => !i.productId || !i.color || !i.quantity || !i.price)) {
        throw new Error("Please complete all order item fields")
      }

      // Restrict duplicate color within the same stock category
      {
        const seen = new Set<string>()
        for (const i of orderItems) {
          const product = products.find((p) => p._id === i.productId)
          const stockType = product?.stockType
          if (!stockType) continue
          const key = `${stockType}__${i.color}`
          if (seen.has(key)) {
            throw new Error(`Duplicate color in ${stockType}: ${i.color}. Same color cannot repeat within the same stock category.`)
          }
          seen.add(key)
        }
      }

      // Stock availability validation
      for (const i of orderItems) {
        const neededMeters = (i.unit === "sets" ? (parseFloat(i.quantity) || 0) * 60 : parseFloat(i.quantity) || 0)
        const availableMeters = getAvailableMeters(i.productId, i.color)
        if (neededMeters > availableMeters) {
          const product = products.find((p) => p._id === i.productId)
          const productName = product?.productName || "Selected Stock"
          throw new Error(`Insufficient stock: ${productName} - ${i.color}. Available: ${availableMeters} m, Requested: ${neededMeters} m`)
        }
      }

      const customer = customers.find((c) => c._id === selectedCustomerId)
      if (!customer) throw new Error("Selected customer not found")

      const backendItems = orderItems.map((i) => {
        const product = products.find((p) => p._id === i.productId)
        const productName = product?.productName || ""
        return {
          product: productName,
          color: i.color,
          quantity: i.unit === "sets" ? (parseFloat(i.quantity) || 0) * 60 : parseFloat(i.quantity) || 0,
          unit: i.unit.toUpperCase(),
          pricePerMeters: parseFloat(i.price) || 0,
          stockId: i.productId, // pass selected stock reference for backend deduction
        }
      })

      const payload = {
        customer: customer.customerName,
        status: "pending", // New orders start as pending
        orderDate: new Date(orderDate).toISOString(),
        deliveryDate: new Date(deliveryDate).toISOString(),
        orderItems: backendItems,
        notes,
        ...(indentNumber ? { indentNumber: Number(indentNumber) } : {}),
      }

      const res = await fetch(`${API_BASE_URL}/order/addOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || "Failed to create order")
      }

      setSuccess(true)
      toast({ title: "Order created", description: `Order for ${getSelectedCustomerName() || 'customer'} created successfully.` })
      setTimeout(() => router.push('/orders'), 900)
      // Reset minimal state
      setOrderItems([{ id: 1, productId: "", color: "", quantity: "", unit: "sets", price: "", total: 0 }])
      setSelectedCustomerId("")
      setDeliveryDate("")
      setNotes("")
      setIndentNumber("")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create order"
      setError(message)
      toast({ title: "Failed to create order", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
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
                <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Order</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading...</div>
        </div>
      </SidebarInset>
    )
  }

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
              <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Order</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Order created successfully
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Create New Order</h2>
              <p className="text-muted-foreground">Add a new order from available stock items</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateOrder} disabled={saving}>
              {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>) : (<><Save className="h-4 w-4 mr-2" />Create Order</>)}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Order Form */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Select customer for this order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Select Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{customer.customerName}</span>
                            <div className="flex gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">{customer.city}</Badge>
                              <Badge variant="secondary" className="text-xs">{customer.customerType}</Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedCustomerId && (
                    <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">
                          Selected Customer: {getSelectedCustomerName()}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="indent-number">INDENT NUMBER (optional, unique)</Label>
                    <Input id="indent-number" type="number" placeholder="Enter indent number" value={indentNumber} onChange={(e) => setIndentNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="order-date">Order Date</Label>
                    <Input id="order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-date">Expected Delivery</Label>
                    <Input id="delivery-date" type="date" min={orderDate ? nextDay(orderDate) : undefined} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order Items</CardTitle>
                    <CardDescription>Add stock items to this order</CardDescription>
                  </div>
                  <Button onClick={addOrderItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4">
                  <p className="text-yellow-800 text-sm font-medium">Only products available in stock are shown. Price per meter auto-fills from product variant and cannot be edited.</p>
                </div>
                {orderItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {orderItems.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => removeOrderItem(item.id)} className="text-red-600">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select value={item.productId} onValueChange={(value) => updateOrderItem(item.id, "productId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => {
                              const master = allProducts.find((p) => p.productName === product.productName)
                              const display = master?.category ? `${master.category} (${product.productName})` : product.productName
                              return (
                                <SelectItem key={product._id} value={product._id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{display}</span>
                                    {product.stockType && (
                                      <Badge variant="outline" className="text-xs ml-2">
                                        {product.stockType}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        {/* Removed gray note showing Design/Warehouse below product */}
                      </div>

                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select value={item.color} onValueChange={(value) => updateOrderItem(item.id, "color", value)} disabled={!item.productId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {getProductColors(item.productId, item.id).map((color) => (
                              <SelectItem key={color} value={color}>{color}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Add All Colors button - appears only if product is selected */}
                        {item.productId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addAllColorsForProduct(item)}
                            disabled={!item.quantity || parseFloat(item.quantity) <= 0}
                            className="mt-2"
                          >
                            Add All Colors
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" placeholder="0" value={item.quantity} onChange={(e) => updateOrderItem(item.id, "quantity", e.target.value)} />
                        {item.productId && item.color && (
                          <div className="text-xs text-muted-foreground">
                            Available: {getAvailableMeters(item.productId, item.color).toLocaleString()} m
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select value={item.unit} onValueChange={(value) => updateOrderItem(item.id, "unit", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="sets">Sets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Price per {item.unit}</Label>
                        <Input type="number" placeholder="0" value={item.price} disabled className="bg-muted" />
                      </div>

                      <div className="space-y-2">
                        <Label>Total</Label>
                        <Input value={`₹${item.total.toLocaleString()}`} disabled className="bg-muted" />
                      </div>
                    </div>

                    {item.unit === "sets" && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                        <p>1 Set = 60 meters (equivalent: {item.quantity ? (parseFloat(item.quantity) * 60).toLocaleString() : 0} meters)</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Duplicate Validation Warning (by Stock Category) */}
            {(() => {
              const duplicates = []
              const seen = new Set()
              
              for (const item of orderItems) {
                if (item.productId && item.color) {
                  const product = products.find(p => p._id === item.productId)
                  const combination = `${product?.stockType}-${item.color}`
                  if (seen.has(combination)) {
                    duplicates.push(`${product?.stockType || 'Stock'} - ${item.color}`)
                  } else {
                    seen.add(combination)
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
                          <p>The following stock category + color pairs are duplicated in this order:</p>
                          <ul className="list-disc list-inside mt-1">
                            {duplicates.map((dup, index) => (
                              <li key={index}>{dup}</li>
                            ))}
                          </ul>
                          <p className="mt-2 font-medium">Please remove duplicates or change the color to proceed. Same color can repeat across different categories (e.g., Gray vs Factory).</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
                <CardDescription>Additional information for this order</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Enter any special instructions or notes..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review order details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">
                  <p className="text-blue-800 text-sm font-medium">All items are from available stock inventory</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items</span>
                    <span>{orderItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{calculateOrderTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST (18%)</span>
                    <span>₹{calculateTax().toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>₹{calculateGrandTotal().toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            {selectedCustomerId && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const customer = customers.find((c) => c._id === selectedCustomerId)
                    return customer ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.customerName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{customer.city}</p>
                          <Badge variant="outline" className="mt-1">{customer.customerType}</Badge>
                        </div>
                      </div>
                    ) : null
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col">
                <Link href="/customers">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <User className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
                </Link>

                <Link href="/stock">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Package className="h-4 w-4 mr-2" />
                    Manage Stock
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}
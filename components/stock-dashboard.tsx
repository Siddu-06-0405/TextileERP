"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  Factory,
  Palette,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react"
import { StockLogsDialog } from "@/components/stock-logs-dialog"

export function StockDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)

  // Mock data for different stock types
  const grayStock = [
    {
      id: "GRY-001",
      product: "Premium Cotton Base",
      quantity: 450,
      factory: "Textile Mills Ltd",
      agent: "Ramesh Kumar",
      date: "2024-01-15",
      orderNumber: "PO-2024-001",
      status: "available",
    },
    {
      id: "GRY-002",
      product: "Silk Blend Base",
      quantity: 280,
      factory: "Silk Weavers Co",
      agent: "Priya Sharma",
      date: "2024-01-14",
      orderNumber: "PO-2024-002",
      status: "low",
    },
  ]

  const factoryStock = [
    {
      id: "FAC-001",
      product: "Cotton Blend Processing",
      quantity: 320,
      factory: "Modern Textiles",
      stage: "Dyeing",
      expectedCompletion: "2024-01-20",
      status: "processing",
    },
    {
      id: "FAC-002",
      product: "Silk Designer Processing",
      quantity: 180,
      factory: "Premium Fabrics",
      stage: "Printing",
      expectedCompletion: "2024-01-18",
      status: "processing",
    },
  ]

  const designStock = [
    {
      id: "DES-001",
      product: "Cotton Blend Fabric",
      design: "Floral Print",
      quantity: 540,
      colors: ["Blue", "Red", "Green"],
      status: "available",
      warehouse: "Main Warehouse",
    },
    {
      id: "DES-002",
      product: "Silk Designer Print",
      design: "Abstract Pattern",
      quantity: 45,
      colors: ["Gold", "Silver"],
      status: "low",
      warehouse: "Main Warehouse",
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "low":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default">Available</Badge>
      case "low":
        return <Badge variant="secondary">Low Stock</Badge>
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>
      case "processing":
        return <Badge variant="outline">Processing</Badge>
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock Dashboard</h2>
          <p className="text-muted-foreground">Track gray, factory, and design stock</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Adjustment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stock Adjustment</DialogTitle>
                <DialogDescription>Adjust stock quantities</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Product</Label>
                  <Input placeholder="Search for product to adjust..." />
                </div>
                <div className="space-y-2">
                  <Label>Actual Quantity</Label>
                  <Input type="number" placeholder="Enter actual quantity" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input placeholder="Reason for adjustment" />
                </div>
                <Button className="w-full">Save Adjustment</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setLogsDialogOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Logs
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Stock</DialogTitle>
                <DialogDescription>Add stock entry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Stock Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stock type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gray">Gray Stock</SelectItem>
                      <SelectItem value="factory">Factory Stock</SelectItem>
                      <SelectItem value="design">Design Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Input placeholder="Product name" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity (meters)</Label>
                  <Input type="number" placeholder="0" />
                </div>
                <Button className="w-full">Add Stock</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gray Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,450m</div>
            <p className="text-xs text-muted-foreground">Unfinished fabric</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">+5% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factory Stock</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,890m</div>
            <p className="text-xs text-muted-foreground">In processing</p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-500">5 batches active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Design Stock</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,240m</div>
            <p className="text-xs text-muted-foreground">Ready for sale</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-500">Available</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Details Tabs */}
      <Tabs defaultValue="gray" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gray">Gray Stock</TabsTrigger>
          <TabsTrigger value="factory">Factory Stock</TabsTrigger>
          <TabsTrigger value="design">Design Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="gray" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gray stock..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gray Stock Inventory</CardTitle>
              <CardDescription>Unfinished fabric from factories</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Quantity</th>
                      <th className="text-left p-4 font-medium">Factory</th>
                      <th className="text-left p-4 font-medium">Agent</th>
                      <th className="text-left p-4 font-medium">Order No.</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grayStock.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-4 font-medium">{item.product}</td>
                        <td className="p-4">{item.quantity}m</td>
                        <td className="p-4">{item.factory}</td>
                        <td className="p-4">{item.agent}</td>
                        <td className="p-4">{item.orderNumber}</td>
                        <td className="p-4">{item.date}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Factory Processing Stock</CardTitle>
              <CardDescription>Stock currently being processed at factories</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Quantity</th>
                      <th className="text-left p-4 font-medium">Factory</th>
                      <th className="text-left p-4 font-medium">Stage</th>
                      <th className="text-left p-4 font-medium">Expected</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factoryStock.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-4 font-medium">{item.product}</td>
                        <td className="p-4">{item.quantity}m</td>
                        <td className="p-4">{item.factory}</td>
                        <td className="p-4">{item.stage}</td>
                        <td className="p-4">{item.expectedCompletion}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Design Stock Inventory</CardTitle>
              <CardDescription>Finished products ready for sale</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Design</th>
                      <th className="text-left p-4 font-medium">Quantity</th>
                      <th className="text-left p-4 font-medium">Colors</th>
                      <th className="text-left p-4 font-medium">Warehouse</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designStock.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-4 font-medium">{item.product}</td>
                        <td className="p-4">{item.design}</td>
                        <td className="p-4">{item.quantity}m</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {item.colors.map((color, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">{item.warehouse}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <StockLogsDialog 
        open={logsDialogOpen} 
        onOpenChange={setLogsDialogOpen} 
      />
    </div>
  )
}

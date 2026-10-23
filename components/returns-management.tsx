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
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw, Search, Plus, Calendar, Package } from "lucide-react"

export function ReturnsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  const returns = [
    {
      id: "RET-001",
      orderId: "ORD-001",
      customer: "Rajesh Textiles",
      product: "Cotton Blend Fabric",
      color: "Blue",
      quantity: 45,
      reason: "Quality issue",
      status: "pending",
      date: "2024-01-15",
      value: 20250,
    },
    {
      id: "RET-002",
      orderId: "ORD-003",
      customer: "Fashion Hub",
      product: "Silk Designer Print",
      color: "Red",
      quantity: 30,
      reason: "Wrong color",
      status: "approved",
      date: "2024-01-14",
      value: 24000,
    },
    {
      id: "RET-003",
      orderId: "ORD-005",
      customer: "Style Point",
      product: "Polyester Mix",
      color: "Green",
      quantity: 60,
      reason: "Damaged in transit",
      status: "processed",
      date: "2024-01-12",
      value: 18000,
    },
  ]

  const recentOrders = [
    { id: "ORD-001", customer: "Rajesh Textiles", date: "2024-01-15", items: 3 },
    { id: "ORD-002", customer: "Fashion Hub", date: "2024-01-14", items: 2 },
    { id: "ORD-003", customer: "Style Point", date: "2024-01-13", items: 4 },
  ]

  const filteredReturns = returns.filter((returnItem) => {
    const matchesSearch =
      returnItem.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.product.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || returnItem.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "approved":
        return "default"
      case "processed":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Returns Management</h2>
          <p className="text-muted-foreground">Process and track product returns</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Process Return
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Process New Return</DialogTitle>
              <DialogDescription>Select order and items to return</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order">Select Order</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose order" />
                  </SelectTrigger>
                  <SelectContent>
                    {recentOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.id} - {order.customer} ({order.items} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cotton-blend">Cotton Blend Fabric</SelectItem>
                    <SelectItem value="silk-print">Silk Designer Print</SelectItem>
                    <SelectItem value="polyester-mix">Polyester Mix</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (meters)</Label>
                  <Input id="quantity" type="number" placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Return Reason</Label>
                <Textarea id="reason" placeholder="Describe the reason for return..." />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">Process Return</Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {returns.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{returns.reduce((sum, r) => sum + r.value, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3%</div>
            <p className="text-xs text-muted-foreground">Of total orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search returns..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <CardDescription>Manage and track all return requests</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Return ID</th>
                  <th className="text-left p-4 font-medium">Order ID</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Product</th>
                  <th className="text-left p-4 font-medium">Qty</th>
                  <th className="text-left p-4 font-medium">Reason</th>
                  <th className="text-left p-4 font-medium">Value</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="border-b">
                    <td className="p-4 font-medium">{returnItem.id}</td>
                    <td className="p-4">{returnItem.orderId}</td>
                    <td className="p-4">{returnItem.customer}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{returnItem.product}</p>
                        <p className="text-sm text-muted-foreground">{returnItem.color}</p>
                      </div>
                    </td>
                    <td className="p-4">{returnItem.quantity}m</td>
                    <td className="p-4">
                      <span className="text-sm">{returnItem.reason}</span>
                    </td>
                    <td className="p-4">₹{returnItem.value.toLocaleString()}</td>
                    <td className="p-4">
                      <Badge variant={getStatusColor(returnItem.status)}>{returnItem.status}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {returnItem.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline">
                              Reject
                            </Button>
                          </>
                        )}
                        {returnItem.status === "approved" && <Button size="sm">Process</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredReturns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No returns found</h3>
              <p className="text-muted-foreground mb-4">No return requests match your current filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

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
import { Plus, Search, Edit, Eye, MapPin, Phone, Mail } from "lucide-react"

export function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")

  const customers = [
    {
      id: "CUST-001",
      name: "Rajesh Textiles",
      city: "Mumbai",
      phone: "+91 98765 43210",
      email: "rajesh@textiles.com",
      totalOrders: 45,
      totalValue: 1250000,
      lastOrder: "2024-01-15",
      status: "active",
    },
    {
      id: "CUST-002",
      name: "Fashion Hub",
      city: "Delhi",
      phone: "+91 87654 32109",
      email: "info@fashionhub.com",
      totalOrders: 32,
      totalValue: 890000,
      lastOrder: "2024-01-12",
      status: "active",
    },
    {
      id: "CUST-003",
      name: "Style Point",
      city: "Bangalore",
      phone: "+91 76543 21098",
      email: "orders@stylepoint.com",
      totalOrders: 28,
      totalValue: 675000,
      lastOrder: "2024-01-10",
      status: "inactive",
    },
  ]

  const cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Surat"]

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = selectedCity === "all" || customer.city === selectedCity
    return matchesSearch && matchesCity
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Create a new customer profile</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input id="name" placeholder="Enter customer name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city.toLowerCase()}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="customer@example.com" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">Save Customer</Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {customer.city}
                  </CardDescription>
                </div>
                <Badge variant={customer.status === "active" ? "default" : "secondary"}>{customer.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Orders</p>
                  <p className="font-medium">{customer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Value</p>
                  <p className="font-medium">₹{customer.totalValue.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Last Order</p>
                <p className="font-medium">{customer.lastOrder}</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

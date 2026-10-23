"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { MessageSquare, Plus, Trash2, Phone, Bell, Settings, Users } from "lucide-react"

export function WhatsAppNotifications() {
  const [adminNumbers, setAdminNumbers] = useState([
    { id: 1, name: "Rajesh Kumar", number: "+91 98765 43210", active: true, role: "Owner" },
    { id: 2, name: "Priya Sharma", number: "+91 87654 32109", active: true, role: "Manager" },
    { id: 3, name: "Suresh Patel", number: "+91 76543 21098", active: false, role: "Assistant" },
  ])

  const [newAdmin, setNewAdmin] = useState({ name: "", number: "", role: "Assistant" })
  const [notifications, setNotifications] = useState({
    stockAlerts: true,
    orderUpdates: true,
    lowStock: true,
    newOrders: true,
    returns: true,
    dailyReports: false,
    productUpdates: false,
  })

  const addAdminNumber = () => {
    if (newAdmin.name && newAdmin.number) {
      setAdminNumbers([
        ...adminNumbers,
        {
          id: Date.now(),
          name: newAdmin.name,
          number: newAdmin.number,
          active: true,
          role: newAdmin.role,
        },
      ])
      setNewAdmin({ name: "", number: "", role: "Assistant" })
    }
  }

  const removeAdminNumber = (id: number) => {
    setAdminNumbers(adminNumbers.filter((admin) => admin.id !== id))
  }

  const toggleAdminStatus = (id: number) => {
    setAdminNumbers(adminNumbers.map((admin) => (admin.id === id ? { ...admin, active: !admin.active } : admin)))
  }

  const updateNotificationSetting = (key: string, value: boolean) => {
    setNotifications({ ...notifications, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Notifications</h2>
          <p className="text-muted-foreground">Manage admin numbers and notification settings</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin Number
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Admin Number</DialogTitle>
              <DialogDescription>Add a new admin number to receive WhatsApp notifications</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Admin Name</Label>
                <Input
                  id="name"
                  placeholder="Enter admin name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Phone Number</Label>
                <Input
                  id="number"
                  placeholder="+91 98765 43210"
                  value={newAdmin.number}
                  onChange={(e) => setNewAdmin({ ...newAdmin, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                >
                  <option value="Owner">Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Assistant">Assistant</option>
                </select>
              </div>
              <Button onClick={addAdminNumber} className="w-full">
                Add Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminNumbers.filter((admin) => admin.active).length}</div>
            <p className="text-xs text-muted-foreground">Receiving notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Active alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">Delivery success</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admins">Admin Numbers</TabsTrigger>
          <TabsTrigger value="settings">Notification Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Numbers</CardTitle>
              <CardDescription>Manage admin phone numbers for WhatsApp notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminNumbers.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-sm text-muted-foreground">{admin.number}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {admin.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={admin.active} onCheckedChange={() => toggleAdminStatus(admin.id)} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdminNumber(admin.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure which notifications to send via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stock-alerts">Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when stock is low or out</p>
                  </div>
                  <Switch
                    id="stock-alerts"
                    checked={notifications.stockAlerts}
                    onCheckedChange={(value) => updateNotificationSetting("stockAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="order-updates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Notifications for order status changes</p>
                  </div>
                  <Switch
                    id="order-updates"
                    checked={notifications.orderUpdates}
                    onCheckedChange={(value) => updateNotificationSetting("orderUpdates", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="low-stock">Low Stock Warnings</Label>
                    <p className="text-sm text-muted-foreground">Alert when products reach minimum stock level</p>
                  </div>
                  <Switch
                    id="low-stock"
                    checked={notifications.lowStock}
                    onCheckedChange={(value) => updateNotificationSetting("lowStock", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="new-orders">New Orders</Label>
                    <p className="text-sm text-muted-foreground">Instant notification for new orders</p>
                  </div>
                  <Switch
                    id="new-orders"
                    checked={notifications.newOrders}
                    onCheckedChange={(value) => updateNotificationSetting("newOrders", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="returns">Return Requests</Label>
                    <p className="text-sm text-muted-foreground">Notifications for product returns</p>
                  </div>
                  <Switch
                    id="returns"
                    checked={notifications.returns}
                    onCheckedChange={(value) => updateNotificationSetting("returns", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="daily-reports">Daily Reports</Label>
                    <p className="text-sm text-muted-foreground">Daily summary of sales and stock</p>
                  </div>
                  <Switch
                    id="daily-reports"
                    checked={notifications.dailyReports}
                    onCheckedChange={(value) => updateNotificationSetting("dailyReports", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="product-updates">Product Updates</Label>
                    <p className="text-sm text-muted-foreground">Product creation, modification and deletion.</p>
                  </div>
                  <Switch
                    id="daily-reports"
                    checked={notifications.productUpdates}
                    onCheckedChange={(value) => updateNotificationSetting("productUpdates", value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

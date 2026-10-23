"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Package,
  ShoppingCart,
  Users,
  RotateCcw,
  BarChart3,
  Bell,
  Settings,
  Home,
  Warehouse,
  ChevronRight,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useSidebarCounts } from "@/hooks/use-sidebar-counts"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()
  const { counts, loading } = useSidebarCounts()

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Create navigation data with real counts
  const navData = {
    navMain: [
      {
        title: "Overview",
        items: [
          {
            title: "Dashboard",
            url: "/",
            icon: Home,
            badge: null,
          },
        ],
      },
      {
        title: "Inventory",
        items: [
          {
            title: "Products",
            url: "/products",
            icon: Package,
            badge: loading ? "..." : counts.products.toString(),
          },
          {
            title: "Stock",
            url: "/stock",
            icon: Warehouse,
            badge: loading ? "..." : counts.stock.toString(),
            badgeVariant: "destructive" as const,
          },
        ],
      },
      {
        title: "Sales",
        items: [
          {
            title: "Orders",
            url: "/orders",
            icon: ShoppingCart,
            badge: loading ? "..." : counts.orders.toString(),
            badgeVariant: "default" as const,
          },
          {
            title: "Customers",
            url: "/customers",
            icon: Users,
            badge: loading ? "..." : counts.customers.toString(),
          },
          {
            title: "Agents",
            url: "/agents",
            icon: Users,
            badge: loading ? "..." : counts.agents.toString(),
          },
          {
            title: "Returns",
            url: "/returns",
            icon: RotateCcw,
            badge: loading ? "..." : counts.returns.toString(),
            badgeVariant: "secondary" as const,
          },
        ],
      },
      {
        title: "Analytics",
        items: [
          {
            title: "Reports",
            url: "/reports",
            icon: BarChart3,
            badge: null,
          },
          {
            title: "Notifications",
            url: "/notifications",
            icon: Bell,
            badge: loading ? "..." : counts.notifications.toString(),
            badgeVariant: "destructive" as const,
          },
        ],
      },
      {
        title: "System",
        items: [
          {
            title: "Settings",
            url: "/settings",
            icon: Settings,
            badge: null,
          },
        ],
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sidebar-primary-foreground">
            <Package className="size-4 text-white" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">Textile ERP</span>
            <span className="truncate text-xs text-muted-foreground">Management System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navData.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url} onClick={handleLinkClick}>
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant={item.badgeVariant || "secondary"} className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="ml-auto size-4 opacity-50" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <span>System Online</span>
          </div>
          <div className="mt-1">v2.1.0</div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

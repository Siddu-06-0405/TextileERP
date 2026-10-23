import { API_BASE_URL } from "@/lib/api";
import { useState, useEffect } from "react";

interface SidebarCounts {
  products: number;
  stock: number;
  orders: number;
  customers: number;
  agents: number;
  returns: number;
  notifications: number;
}

export function useSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>({
    products: 0,
    stock: 0,
    orders: 0,
    customers: 0,
    agents: 0,
    returns: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all counts in parallel
        const [
          productsRes,
          stockRes,
          ordersRes,
          customersRes,
          agentsRes,
          returnsRes,
          notificationsRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/products?page=1&limit=1`), // Use pagination to read totalItems
          fetch(`${API_BASE_URL}/stock/stats`), // Align with Stock page page-size
          fetch(`${API_BASE_URL}/order?page=1&limit=1`), // Just get pagination info
          // Note: routes are singular in backend: /customer and /agent
          fetch(`${API_BASE_URL}/customer`),
          fetch(`${API_BASE_URL}/agent`),
          fetch(`${API_BASE_URL}/returns`),
          fetch(`${API_BASE_URL}/whatsapp-messages`),
        ]);

        const newCounts: SidebarCounts = {
          products: 0,
          stock: 0,
          orders: 0,
          customers: 0,
          agents: 0,
          returns: 0,
          notifications: 0,
        };

        // Process products count (use pagination totalItems)
        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const data = await productsRes.value.json();
          // console.log('Products API response:', data)
          if (data.success && data.pagination) {
            newCounts.products = data.pagination.totalItems;
          } else if (Array.isArray(data.products)) {
            newCounts.products = data.products.length;
          }
        }

        // Process stock count (align with Stock page which loads page-size items)
        if (stockRes.status === "fulfilled" && stockRes.value.ok) {
          const data = await stockRes.value.json();
          newCounts.stock = data.totalStocks;
        }

        // Process orders count
        if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          // console.log('Orders API response:', data)
          if (data.success && data.pagination) {
            newCounts.orders = data.pagination.totalItems;
          }
        }

        // Process customers count
        if (customersRes.status === "fulfilled" && customersRes.value.ok) {
          const data = await customersRes.value.json();
          // console.log('Customers API response:', data)
          if (data.success && data.customers) {
            newCounts.customers = data.customers.length;
          }
        }

        // Process agents count
        if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
          const data = await agentsRes.value.json();
          // console.log('Agents API response:', data)
          if (data.success && data.agents) {
            newCounts.agents = data.agents.length;
          }
        }

        // Process returns count
        if (returnsRes.status === "fulfilled" && returnsRes.value.ok) {
          const data = await returnsRes.value.json();
          if (data.success && data.returns) {
            newCounts.returns = data.returns.length;
          }
        }

        // Process notifications count (unread messages)
        if (
          notificationsRes.status === "fulfilled" &&
          notificationsRes.value.ok
        ) {
          const data = await notificationsRes.value.json();
          if (data.success && data.messages) {
            // Count unread messages or recent messages
            newCounts.notifications = data.messages.filter(
              (msg: any) =>
                msg.status === "Not Delivered" ||
                new Date(msg.createdAt) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            ).length;
          }
        }

        // console.log('Sidebar counts updated:', newCounts)
        setCounts(newCounts);
      } catch (err) {
        console.error("Error fetching sidebar counts:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch counts");
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);

    return () => clearInterval(interval);
  }, []);

  return { counts, loading, error };
}

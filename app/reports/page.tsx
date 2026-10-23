"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import jsPDF from 'jspdf';

interface SalesData {
  totalRevenue: number;
  ordersCompleted: number;
  averageOrderValue: number;
}

interface StockData {
  totalStockValue: number;
  stockTurnover: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

interface TopCustomer {
  name: string;
  orders: number;
  revenue: number;
  city: string;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initialize with safe default values to prevent undefined errors
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    ordersCompleted: 0,
    averageOrderValue: 0,
  });

  const [stockData, setStockData] = useState<StockData>({
    totalStockValue: 0,
    stockTurnover: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);

  const [monthlyData, setMonthlyData] = useState([
    { month: "Jan", revenue: 0, orders: 0 },
    { month: "Feb", revenue: 0, orders: 0 },
    { month: "Mar", revenue: 0, orders: 0 },
    { month: "Apr", revenue: 0, orders: 0 },
    { month: "May", revenue: 0, orders: 0 },
    { month: "Jun", revenue: 0, orders: 0 },
    { month: "Jul", revenue: 0, orders: 0 },
    { month: "Aug", revenue: 0, orders: 0 },
    { month: "Sep", revenue: 0, orders: 0 },
    { month: "Oct", revenue: 0, orders: 0 },
    { month: "Nov", revenue: 0, orders: 0 },
    { month: "Dec", revenue: 0, orders: 0 },
  ]);

  const productPerformanceData = topProducts.map((product) => ({
    name: product.name.split(" ")[0],
    revenue: product.revenue / 1000,
    quantity: product.quantity,
  }));

  const [stockCategoryData, setStockCategoryData] = useState([
    { name: "Gray Stock", value: 0, fill: "#ffffff" },
    { name: "Factory Stock", value: 0, fill: "#ffffff" },
    { name: "Design Stock", value: 0, fill: "#ffffff" },
  ]);

  const [stockMovementData, setStockMovementData] = useState([
    { month: "Jan", inbound: 0, outbound: 0, net: 0 },
    { month: "Feb", inbound: 0, outbound: 0, net: 0 },
    { month: "Mar", inbound: 0, outbound: 0, net: 0 },
    { month: "Apr", inbound: 0, outbound: 0, net: 0 },
    { month: "May", inbound: 0, outbound: 0, net: 0 },
    { month: "Jun", inbound: 0, outbound: 0, net: 0 },
    { month: "Jul", inbound: 0, outbound: 0, net: 0 },
    { month: "Aug", inbound: 0, outbound: 0, net: 0 },
    { month: "Sep", inbound: 0, outbound: 0, net: 0 },
    { month: "Oct", inbound: 0, outbound: 0, net: 0 },
    { month: "Nov", inbound: 0, outbound: 0, net: 0 },
    { month: "Dec", inbound: 0, outbound: 0, net: 0 },
  ]);

  // Filter data based on selected period
  const getFilteredMonthlyData = () => {
    const currentMonth = new Date().getMonth(); // 0-11

    switch (selectedPeriod) {
      case "week":
      case "month":
        // Show only current month
        return monthlyData.filter((_, index) => index === currentMonth);
      case "quarter":
        // Show last 3 months including current
        const quarterStart = Math.max(0, currentMonth - 2);
        return monthlyData.filter(
          (_, index) => index >= quarterStart && index <= currentMonth
        );
      case "year":
      default:
        // Show all months
        return monthlyData;
    }
  };

  const getFilteredStockMovementData = () => {
    const currentMonth = new Date().getMonth(); // 0-11

    switch (selectedPeriod) {
      case "week":
      case "month":
        return stockMovementData.filter((_, index) => index === currentMonth);
      case "quarter":
        const quarterStart = Math.max(0, currentMonth - 2);
        return stockMovementData.filter(
          (_, index) => index >= quarterStart && index <= currentMonth
        );
      case "year":
      default:
        return stockMovementData;
    }
  };

  const filteredMonthlyData = getFilteredMonthlyData();
  const filteredStockMovementData = getFilteredStockMovementData();

  const customerRevenueData = topCustomers.map((customer) => ({
    name: customer.name.split(" ")[0],
    revenue: customer.revenue / 1000,
    orders: customer.orders,
  }));

  // Helper function to draw table in PDF
  const drawTable = (doc: jsPDF, data: any[], headers: string[], startX: number, startY: number, colWidths: number[]) => {
    const rowHeight = 10;
    const headerHeight = 10;
    let currentY = startY;

    // Draw header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Header background
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), headerHeight, 'F');
    
    // Header text
    doc.setTextColor(0, 0, 0);
    let currentX = startX;
    headers.forEach((header, i) => {
      doc.text(header, currentX + 2, currentY + 7);
      currentX += colWidths[i];
    });

    currentY += headerHeight;

    // Draw rows
    doc.setFont("helvetica", "normal");
    data.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }

      currentX = startX;
      row.forEach((cell: string, colIndex: number) => {
        doc.text(cell.toString(), currentX + 2, currentY + 6);
        currentX += colWidths[colIndex];
      });

      currentY += rowHeight;
    });

    // Draw table borders
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    
    // Horizontal lines
    for (let i = 0; i <= data.length + 1; i++) {
      const y = startY + i * (i === 0 ? headerHeight : rowHeight);
      doc.line(startX, y, startX + colWidths.reduce((a, b) => a + b, 0), y);
    }
    
    // Vertical lines
    currentX = startX;
    for (let i = 0; i <= headers.length; i++) {
      doc.line(currentX, startY, currentX, currentY);
      if (i < colWidths.length) currentX += colWidths[i];
    }

    return currentY + 5; // Return next Y position
  };

  // Excel Export Function using XLSX
  const handleExportExcel = () => {
    try {
      // Create CSV content
      let csvContent = "\uFEFF" + "Reports Data Export\n\n";

      // Sales Data
      csvContent += "Sales Summary\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Revenue,Rs.${salesData.totalRevenue}\n`;
      csvContent += `Orders Completed,${salesData.ordersCompleted}\n`;
      csvContent += `Average Order Value,Rs.${salesData.averageOrderValue}\n\n`;

      // Monthly Data
      csvContent += "Monthly Performance\n";
      csvContent += "Month,Revenue,Orders\n";
      monthlyData.forEach((item) => {
        csvContent += `${item.month},Rs.${item.revenue},${item.orders}\n`;
      });
      csvContent += "\n";

      // Top Products
      csvContent += "Top Products\n";
      csvContent += "Product Name,Revenue,Quantity\n";
      topProducts.forEach((product) => {
        csvContent += `${product.name},Rs.${product.revenue},${product.quantity}\n`;
      });
      csvContent += "\n";

      // Top Customers
      csvContent += "Top Customers\n";
      csvContent += "Customer Name,City,Orders,Revenue\n";
      topCustomers.forEach((customer) => {
        csvContent += `${customer.name},${customer.city},${customer.orders},Rs.${customer.revenue}\n`;
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reports_${selectedPeriod}_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Excel report has been downloaded successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description:
          err instanceof Error ? err.message : "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  // Enhanced PDF Export Function with Tables
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text('Business Reports & Order Bills', 20, yPosition);
      
      yPosition += 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Period: ${selectedPeriod}`, 20, yPosition);
      yPosition += 15;

      // Sales Summary Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('SALES SUMMARY', 20, yPosition);
      yPosition += 10;

      const salesSummaryData = [
        ['Total Revenue', `Rs.${salesData.totalRevenue.toLocaleString()}`],
        ['Orders Completed', salesData.ordersCompleted.toString()],
        ['Average Order Value', `Rs.${salesData.averageOrderValue.toLocaleString()}`]
      ];

      yPosition = drawTable(doc, salesSummaryData, ['Metric', 'Value'], 20, yPosition, [80, 60]);
      yPosition += 10;

      // Stock Analysis Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('STOCK ANALYSIS', 20, yPosition);
      yPosition += 10;

      const stockAnalysisData = [
        ['Total Stock Value', `Rs.${stockData.totalStockValue.toLocaleString()}`],
        ['Stock Turnover', `${stockData.stockTurnover}x`],
        ['Low Stock Items', stockData.lowStockItems.toString()],
        ['Out of Stock Items', stockData.outOfStockItems.toString()]
      ];

      yPosition = drawTable(doc, stockAnalysisData, ['Metric', 'Value'], 20, yPosition, [80, 60]);
      yPosition += 10;

      // Check if we need a new page
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      // Top Products Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('TOP PRODUCTS', 20, yPosition);
      yPosition += 10;

      const topProductsData = topProducts.map(product => [
        product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name,
        `Rs.${product.revenue.toLocaleString()}`,
        product.quantity.toString()
      ]);

      yPosition = drawTable(doc, topProductsData, ['Product Name', 'Revenue', 'Quantity'], 20, yPosition, [80, 50, 30]);
      yPosition += 10;

      // Check if we need a new page
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      // Top Customers Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('TOP CUSTOMERS', 20, yPosition);
      yPosition += 10;

      const topCustomersData = topCustomers.map(customer => [
        customer.name.length > 20 ? customer.name.substring(0, 20) + '...' : customer.name,
        customer.city,
        customer.orders.toString(),
        `Rs.${customer.revenue.toLocaleString()}`
      ]);

      yPosition = drawTable(doc, topCustomersData, ['Customer Name', 'City', 'Orders', 'Revenue'], 20, yPosition, [60, 40, 30, 50]);
      yPosition += 10;

      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      // Monthly Performance Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('MONTHLY PERFORMANCE', 20, yPosition);
      yPosition += 10;

      const monthlyPerformanceData = filteredMonthlyData.map(month => [
        month.month,
        `Rs.${month.revenue.toLocaleString()}`,
        month.orders.toString()
      ]);

      yPosition = drawTable(doc, monthlyPerformanceData, ['Month', 'Revenue', 'Orders'], 20, yPosition, [40, 70, 40]);
      yPosition += 10;

      // Stock Movement Table (if there's data and space)
      if (filteredStockMovementData.some(item => item.inbound > 0 || item.outbound > 0) && yPosition < 180) {
        // Check if we need a new page
        if (yPosition > 150) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('STOCK MOVEMENT', 20, yPosition);
        yPosition += 10;

        const stockMovementTableData = filteredStockMovementData
          .filter(item => item.inbound > 0 || item.outbound > 0)
          .map(item => [
            item.month,
            item.inbound.toLocaleString(),
            item.outbound.toLocaleString(),
            item.net.toLocaleString()
          ]);

        if (stockMovementTableData.length > 0) {
          yPosition = drawTable(doc, stockMovementTableData, ['Month', 'Inbound', 'Outbound', 'Net'], 20, yPosition, [30, 40, 40, 40]);
        }
      }

      // Save the PDF
      doc.save(`business_reports_${selectedPeriod}_${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "PDF Export Successful",
        description: "PDF report with detailed tables has been downloaded successfully",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "PDF Export Failed",
        description:
          err instanceof Error ? err.message : "Failed to export PDF file",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        setError(null);

        const countRes = await fetch(`${API_BASE_URL}/order/count/delivered`);
        const countData = await countRes.json();

        const revenueRes = await fetch(`${API_BASE_URL}/order/total/revenue`);
        const revenueData = await revenueRes.json();

        const stockRes = await fetch(`${API_BASE_URL}/stock/get/summary`);
        const stockDataJson = await stockRes.json();
        // console.log("Stock Summary Response:", stockDataJson);

        setStockData({
          totalStockValue: stockDataJson.totalStockValue ?? 0,
          stockTurnover: stockDataJson.stockTurnover ?? 0,
          lowStockItems: stockDataJson.lowStockItems ?? 0,
          outOfStockItems: stockDataJson.outOfStockItems ?? 0,
        });

        const customerRes = await fetch(
          `${API_BASE_URL}/customer/top/Customers`
        );
        const customerData = await customerRes.json();
        setTopCustomers(
          customerData.map((customer: any) => ({
            name: customer.name,
            orders: customer.orders,
            revenue: customer.revenue,
            city: customer.city,
          }))
        );

        const productRes = await fetch(`${API_BASE_URL}/products/top/Products`);
        const productData = await productRes.json();
        setTopProducts(
          productData.map((product: any) => ({
            name: product.name,
            quantity: product.quantity,
            revenue: product.revenue,
          }))
        );

        const ordersCompleted = countData?.deliveredOrdersCount ?? 0;
        const totalRevenue = revenueData?.totalRevenue ?? 0;
        const averageOrderValue =
          ordersCompleted > 0 ? totalRevenue / ordersCompleted : 0;

        setSalesData({
          totalRevenue,
          ordersCompleted,
          averageOrderValue,
        });
      } catch (err) {
        console.error("Error fetching sales data:", err);
        setError("Failed to fetch sales data");
      } finally {
        setLoading(false);
      }
    };

    const fetchMonthlyData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/order/monthly/sales`);
        if (!res.ok) throw new Error("Failed to fetch monthly sales");

        const data = await res.json();

        // Merge API data into default monthlyData
        setMonthlyData((prev) =>
          prev.map((monthObj) => {
            const match = data.find(
              (apiMonth: any) => apiMonth.month === monthObj.month
            );
            return match ? match : monthObj;
          })
        );
      } catch (err) {
        console.error("Error fetching monthly data:", err);
      }
    };

    const fetchStockCategoryData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/stock/get/category-breakdown`);
        if (!res.ok) throw new Error("Failed to fetch stock category data");

        const data = await res.json();

        if (!data || data.length === 0) {
          // No data yet → just clear chart (or set placeholder)
          setStockCategoryData([]);
          return;
        }

        setStockCategoryData(data);

      } catch (err) {
        console.error("Error fetching stock category data:", err);
        toast({
          title: "Error",
          description: "Something went wrong while fetching stock data",
          variant: "destructive",
        });
      }
    };

    const fetchStockMovement = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/stock/get/movement-report`);
        if (!res.ok) throw new Error("Failed to fetch stock movement report");

        const data = await res.json();

        // Merge API data into default monthly list
        setStockMovementData((prev) =>
          prev.map((monthObj) => {
            const match = data.find(
              (apiMonth) => apiMonth.month === monthObj.month
            );
            return match ? match : monthObj;
          })
        );
      } catch (err) {
        console.error("Error fetching stock movement data:", err);
      }
    };

    fetchStockMovement();
    fetchStockCategoryData();
    fetchMonthlyData();
    fetchSalesData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 md:p-8">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span className="ml-3 text-muted-foreground">Loading reports...</span>
      </div>
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
                <BreadcrumbPage>Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load reports
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
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
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-4 md:space-y-6 p-3 md:p-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Reports & Analytics</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Business insights and data export
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-32 lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportExcel} className="flex-1 sm:flex-none">
                <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Excel</span>
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="flex-1 sm:flex-none">
                <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Reports Tabs */}
        <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="flex overflow-x-auto w-full md:grid md:grid-cols-4">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs sm:text-sm">Sales</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm">Inventory</TabsTrigger>
              <TabsTrigger value="customers" className="text-xs sm:text-sm">Customers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    Rs.{salesData?.totalRevenue?.toLocaleString() ?? "0"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Orders Completed
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    {salesData.ordersCompleted}
                  </div>
                  <p className="text-xs text-muted-foreground">This period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Avg Order Value
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    Rs.{salesData?.averageOrderValue?.toLocaleString() ?? "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Stock Turnover
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">
                    {stockData.stockTurnover}x
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inventory turns for start of the month till today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Revenue Trend</CardTitle>
                  <CardDescription className="text-sm">Monthly revenue performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredMonthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) =>
                            `Rs.${(value / 1000).toFixed(0)}K`
                          }
                        />
                        <Tooltip
                          formatter={(value) => [
                            `Rs.${Number(value).toLocaleString()}`,
                            "Revenue",
                          ]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Order Volume</CardTitle>
                  <CardDescription className="text-sm">Monthly order count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredMonthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [value, "Orders"]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Bar dataKey="orders" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Sales Performance</CardTitle>
                  <CardDescription className="text-sm">Key sales metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Total Revenue</span>
                      <span className="font-bold">
                        Rs.{salesData.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Orders Completed</span>
                      <span className="font-bold">
                        {salesData.ordersCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Average Order Value</span>
                      <span className="font-bold">
                        Rs.{salesData.averageOrderValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Top Products by Revenue</CardTitle>
                  <CardDescription className="text-sm">Best performing products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `Rs.${value}K`} 
                        />
                        <Tooltip
                          formatter={(value) => [
                            `Rs.${Number(value).toLocaleString()}K`,
                            "Revenue",
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Stock Distribution</CardTitle>
                  <CardDescription className="text-sm">Stock value by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent = 0 }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stockCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            `Rs.${Number(value).toLocaleString()}`
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Stock Analysis</CardTitle>
                  <CardDescription className="text-sm">
                    Inventory performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Total Stock Value</span>
                      <span className="font-bold">
                        Rs.{stockData.totalStockValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Stock Turnover</span>
                      <span className="font-bold">
                        {stockData.stockTurnover}x
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Low Stock Items</span>
                      <span className="font-bold text-orange-600">
                        {stockData.lowStockItems}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm md:text-base">
                      <span>Out of Stock</span>
                      <span className="font-bold text-red-600">
                        {stockData.outOfStockItems}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Stock Movement</CardTitle>
                <CardDescription className="text-sm">
                  Monthly inbound vs outbound stock flow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredStockMovementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value).toLocaleString()} units`,
                          "",
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar dataKey="inbound" fill="#82ca9d" name="Inbound" />
                      <Bar dataKey="outbound" fill="#8884d8" name="Outbound" />
                      <Bar dataKey="net" fill="#ffc658" name="Net Change" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Customer Revenue Distribution</CardTitle>
                  <CardDescription className="text-sm">Revenue by top customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `Rs.${value}K`} 
                        />
                        <Tooltip
                          formatter={(value) => [
                            `Rs.${Number(value).toLocaleString()}K`,
                            "Revenue",
                          ]}
                        />
                        <Bar dataKey="revenue" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base md:text-lg">Customer Order Frequency</CardTitle>
                  <CardDescription className="text-sm">
                    Orders placed by top customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          fontSize={12}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [value, "Orders"]} />
                        <Bar dataKey="orders" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Top Customers</CardTitle>
                <CardDescription className="text-sm">
                  Best performing customers by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm md:text-base">{customer.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {customer.city}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm md:text-base">
                          Rs.{customer.revenue.toLocaleString()}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {customer.orders} orders
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}
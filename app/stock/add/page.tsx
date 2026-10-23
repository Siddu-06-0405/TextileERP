"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  ArrowLeft,
  Save,
  Factory,
  Palette,
  Plus,
  Loader2,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

// Agent interface based on API response
interface Agent {
  _id: string;
  name: string;
  factory: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

// Product interfaces for color variants
interface ProductVariant {
  color: string;
  pricePerMeters?: number;
  stockInMeters?: number;
}
interface Product {
  _id: string;
  productName: string;
  category?: string;
  variants: ProductVariant[];
  isActive?: boolean;
}

export default function AddStockPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stockType, setStockType] = useState("gray");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [variants, setVariants] = useState([
    { color: "", quantity: "", unit: "sets" },
  ]);
  const [loading, setLoading] = useState(false);

  // Debounce timer for product search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for products fetching
  const [productNames, setProductNames] = useState<string[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Full products list with variants for color options
  const [productsWithVariants, setProductsWithVariants] = useState<Product[]>(
    []
  );

  // Gray Stock products for Factory Stock selection
  const [grayStockProducts, setGrayStockProducts] = useState<Product[]>([]);
  const [grayStockProductsLoading, setGrayStockProductsLoading] =
    useState(true);

  // Factory Stock products for Design Stock selection
  const [factoryStockProducts, setFactoryStockProducts] = useState<Product[]>(
    []
  );
  const [factoryStockProductsLoading, setFactoryStockProductsLoading] =
    useState(true);
  const [factoryStockProductsError, setFactoryStockProductsError] = useState<
    string | null
  >(null);

  // Searchable product selector state
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Add state for agents fetching
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [factories, setFactories] = useState<string[]>([]);
  const [factoryStockFactories, setFactoryStockFactories] = useState<string[]>(
    []
  );

  // Add state for required fields
  const [stockDetails, setStockDetails] = useState({
    factory: "",
    agent: "",
    orderNumber: "",
    processingStage: "",
    expectedCompletion: "",
    design: "",
    warehouse: "",
  });

  const [addtionalInfo, setAddtionalInfo] = useState({
    batchNumber: "BTH-" + Date.now(), // Default batch number with timestamp
    qualityGrade: "A+",
    notes: "",
  });

  const [bulkQuantity, setBulkQuantity] = useState("");
  const [bulkUnit, setBulkUnit] = useState("");

  // Search functionality for products
  useEffect(() => {
  // Fetch initial products when stock type changes
  fetchProductsFromServer("", 1, 50);
  
  // Clear selected product
  setSelectedProduct("");
  setProductSearchTerm("");

  // Cleanup timeout on unmount
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, [stockType]);

  // Refetch Gray Stock products when switching to Factory Stock
  useEffect(() => {
    // console.log("Stock type changed to:", stockType); // Debug log
    // console.log("Products with variants length:", productsWithVariants.length); // Debug log

    if (stockType === "factory") {
      // console.log("Switching to Factory Stock, fetching Gray Stock products..."); // Debug log
      const fetchGrayStockProducts = async () => {
        try {
          setGrayStockProductsLoading(true);

          // Wait for productsWithVariants to be loaded
          if (productsWithVariants.length === 0) {
            return;
          }

          const response = await fetch(
            `${API_BASE_URL}/stock?stockType=Gray Stock&limit=1000`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (response.ok) {
            const data = await response.json();
            // console.log("Gray Stock API Response:", data); // Debug log

            if (data?.success && Array.isArray(data.stocks)) {
              // console.log("All Gray Stock entries:", data.stocks); // Debug log

              // Extract unique products from Gray Stock
              const grayStockProductNames = [
                ...new Set(
                  data.stocks.map((stock: any) => stock.stockDetails?.product)
                ),
              ].filter(Boolean);
              // console.log("Extracted Gray Stock product names:", grayStockProductNames); // Debug log
              // console.log("Available products with variants:", productsWithVariants); // Debug log

              // Get full product details for these products
              const grayStockProductsData = productsWithVariants.filter(
                (product) => grayStockProductNames.includes(product.productName)
              );
              // console.log("Final filtered Gray Stock products:", grayStockProductsData); // Debug log

              setGrayStockProducts(grayStockProductsData);
            }
          }
        } catch (err) {
          console.error("Error fetching Gray Stock products:", err);
        } finally {
          setGrayStockProductsLoading(false);
        }
      };

      fetchGrayStockProducts();
    } else if (stockType === "design") {
      // Design Stock is independent: use full products list directly
      setFactoryStockProducts(productsWithVariants);
      setFactoryStockProductsError(null);
      setFactoryStockProductsLoading(false);
    }

    // Clear selected product when switching stock types
    setSelectedProduct("");
    setProductSearchTerm("");
  }, [stockType, productsWithVariants]);

  // Refetch Gray Stock products when productsWithVariants is loaded
  useEffect(() => {
    if (
      stockType === "factory" &&
      productsWithVariants.length > 0 &&
      grayStockProducts.length === 0
    ) {
      const fetchGrayStockProducts = async () => {
        try {
          setGrayStockProductsLoading(true);
          const response = await fetch(
            `${API_BASE_URL}/stock?stockType=Gray Stock&limit=1000`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (response.ok) {
            const data = await response.json();
            // console.log("Refetch - Gray Stock API Response:", data); // Debug log

            if (data?.success && Array.isArray(data.stocks)) {
              // console.log("Refetch - All Gray Stock entries:", data.stocks); // Debug log

              const grayStockProductNames = [
                ...new Set(
                  data.stocks.map((stock: any) => stock.stockDetails?.product)
                ),
              ].filter(Boolean);
              // console.log("Refetch - Extracted product names:", grayStockProductNames); // Debug log
              // console.log("Refetch - Available products with variants:", productsWithVariants); // Debug log

              const grayStockProductsData = productsWithVariants.filter(
                (product) => grayStockProductNames.includes(product.productName)
              );
              // console.log("Refetch - Final filtered products:", grayStockProductsData); // Debug log

              setGrayStockProducts(grayStockProductsData);
            }
          }
        } catch (err) {
          console.error("Error refetching Gray Stock products:", err);
        } finally {
          setGrayStockProductsLoading(false);
        }
      };

      fetchGrayStockProducts();
    }
  }, [productsWithVariants, stockType, grayStockProducts.length]);

  // For Design Stock, mirror products list and ensure no loading/error
  useEffect(() => {
    if (stockType === "design") {
      setFactoryStockProducts(productsWithVariants);
      setFactoryStockProductsError(null);
      setFactoryStockProductsLoading(false);
    }
  }, [productsWithVariants, stockType]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target as Node)
      ) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProductSelect = (product: Product) => {
    // Check if product is inactive
    if (product.isActive === false) {
      toast({
        title: "Product Inactive",
        description:
          "Cannot select inactive products for stock. Please activate the product first.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProduct(product.productName);
    setProductSearchTerm(getProductDisplayName(product));
    setShowProductSuggestions(false);
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductSuggestions(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If empty, fetch all products immediately
    if (value.trim() === "") {
      fetchProductsFromServer("", 1, 50);
      return;
    }

    // Set new timeout for debounced search (300ms delay)
    searchTimeoutRef.current = setTimeout(() => {
      fetchProductsFromServer(value, 1, 50);
    }, 300);
  };

  const getProductDisplayName = (product: Product) => {
    const productName = product.productName || "";
    const category = product.category || "";
    return category ? `${category} (${productName})` : productName;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowProductSuggestions(false);
    }
  };

  // Fetch products and agents from backend on component mount
  useEffect(() => {
    const fetchAgentsAndFactories = async () => {
      try {
        setAgentsLoading(true);
        const response = await fetch(`${API_BASE_URL}/agent/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agents: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success) {
          setAgents(data.agents || []);

          // Flatten all factories and deduplicate
          const uniqueFactories = [
            ...new Set(
              data.agents.flatMap((agent: Agent) => agent.factory || [])
            ),
          ] as string[];

          setFactories(uniqueFactories);
          setFactoryStockFactories(uniqueFactories);
        }
      } catch (err) {
        console.error("Error fetching agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgentsAndFactories();
  }, []);

  const addVariant = () => {
    setVariants([...variants, { color: "", quantity: "", unit: "sets" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: string, value: string) => {
    const updated = variants.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant
    );
    setVariants(updated);
  };

  const getTotalQuantity = () => {
    return variants.reduce((sum, variant) => {
      const qty = Number.parseFloat(variant.quantity) || 0;
      // Convert sets to meters if needed
      if (variant.unit === "sets") {
        return sum + qty * 60; // 1 set = 60 meters
      }
      return sum + qty;
    }, 0);
  };

  // Colors for the currently selected product (variant colors from product creation)
  const getAvailableColorsForSelectedProduct = (): string[] => {
    if (!selectedProduct) return [];
    const product = productsWithVariants.find(
      (p) => p.productName === selectedProduct
    );
    if (!product) return [];
    // Ensure unique color list to avoid duplicate select items
    const unique = Array.from(new Set(product.variants.map((v) => v.color)));
    return unique;
  };

  // Colors already chosen across variants (excluding empties)
  const getSelectedColors = (): string[] => {
    return variants.map((v) => v.color).filter((c) => !!c);
  };

  // Remaining colors for a specific variant index, keeping its current selection visible
  const getAvailableColorsForVariant = (index: number): string[] => {
    const allColors = getAvailableColorsForSelectedProduct();
    if (allColors.length === 0) return [];
    const currentColor = variants[index]?.color;
    const selectedByOthers = variants
      .filter((_, i) => i !== index)
      .map((v) => v.color)
      .filter((c) => !!c);
    return allColors.filter(
      (color) => color === currentColor || !selectedByOthers.includes(color)
    );
  };

  // Helper function to retry fetching product names
  const retryFetchProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);

      const response = await fetch(`${API_BASE_URL}/products/all/names`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch product names: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setProductNames(data.productNames || []);
    } catch (err) {
      console.error("Error fetching product names:", err);
      setProductsError(
        err instanceof Error ? err.message : "Failed to fetch product names"
      );
    } finally {
      setProductsLoading(false);
    }
  };

  // Helper function to retry fetching Factory Stock products
  const retryFetchFactoryStockProducts = async () => {
    try {
      setFactoryStockProductsLoading(true);
      setFactoryStockProductsError(null);

      const response = await fetch(
        `${API_BASE_URL}/stock?stockType=Factory Stock&limit=1000`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data?.success && Array.isArray(data.stocks)) {
          const factoryStockProductNames = [
            ...new Set(
              data.stocks.map((stock: any) => stock.stockDetails?.product)
            ),
          ].filter(Boolean);
          const factoryStockProductsData = productsWithVariants.filter(
            (product) => factoryStockProductNames.includes(product.productName)
          );
          setFactoryStockProducts(factoryStockProductsData);
        } else {
          throw new Error(
            `Failed to fetch Factory Stock: ${response.status} ${response.statusText}`
          );
        }
      } else {
        throw new Error(
          `Failed to fetch Factory Stock: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      console.error("Error refetching Factory Stock products:", err);
      setFactoryStockProductsError(
        err instanceof Error
          ? err.message
          : "Failed to fetch Factory Stock products"
      );
    } finally {
      setFactoryStockProductsLoading(false);
    }
  };

  // Add this handler for form submission
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate that a product is selected
    if (!selectedProduct) {
      toast({
        title: "Product required",
        description: "Please select a product",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Filter out empty/incomplete variants
      const completedVariants = variants.filter((v) => {
        const hasColor = (v.color || "").trim().length > 0;
        const qty = Number.parseFloat(v.quantity as string);
        const hasQty = !Number.isNaN(qty) && qty > 0;
        return hasColor && hasQty;
      });

      if (completedVariants.length === 0) {
        toast({
          title: "Variant required",
          description: "Add at least one variant with color and quantity",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate additional info (backend requires these)
      if (
        !addtionalInfo.batchNumber.trim() ||
        !addtionalInfo.qualityGrade.trim()
      ) {
        toast({
          title: "Missing required fields",
          description: "Batch Number and Quality Grade are required",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Map variants to backend schema
      const backendVariants = completedVariants.map((v) => ({
        color: v.color,
        quantity:
          v.unit === "sets"
            ? (parseFloat(v.quantity) || 0) * 60
            : parseFloat(v.quantity) || 0,
        unit: "METERS",
      }));

      // Prepare stockDetails based on stockType
      let backendStockDetails: any = {};
      if (stockType === "gray") {
        backendStockDetails = {
          product: selectedProduct,
          factory: stockDetails.factory,
          agent: stockDetails.agent,
          orderNumber: stockDetails.orderNumber,
        };
      } else if (stockType === "factory") {
        backendStockDetails = {
          product: selectedProduct,
          processingFactory: stockDetails.factory,
          processingStage: stockDetails.processingStage,
          expectedCompletion: stockDetails.expectedCompletion,
        };
      } else if (stockType === "design") {
        backendStockDetails = {
          product: selectedProduct,
        };
      }

      // Prepare addtionalInfo (single object, not array)
      const backendAddtionalInfo = {
        batchNumber: addtionalInfo.batchNumber,
        qualityGrade: addtionalInfo.qualityGrade,
        notes: addtionalInfo.notes,
      };

      // Determine initial status based on total quantity
      const totalQuantity = backendVariants.reduce(
        (sum, variant) => sum + variant.quantity,
        0
      );
      let initialStatus = "available";
      if (totalQuantity === 0) {
        initialStatus = "out";
      } else if (totalQuantity < 100) {
        initialStatus = "low";
      } else if (stockType === "factory") {
        initialStatus = "processing";
      }

      const payload = {
        stockType:
          stockType === "gray"
            ? "Gray Stock"
            : stockType === "factory"
            ? "Factory Stock"
            : "Design Stock",
        status: initialStatus,
        variants: backendVariants,
        stockDetails: backendStockDetails,
        addtionalInfo: backendAddtionalInfo,
      };

      // console.log("Sending payload:", payload); // Debug log

      const response = await fetch(`${API_BASE_URL}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add stock");
      }

      const result = await response.json();
      // console.log("Success:", result); // Debug log

      toast({
        title: "Stock added",
        description: `${selectedProduct} ${
          stockType === "design"
            ? "(Design)"
            : stockType === "factory"
            ? "(Factory)"
            : "(Gray)"
        } added successfully.`,
      });
      // Redirect to stock list after a short delay
      setTimeout(() => {
        router.push("/stock");
      }, 900);
    } catch (err) {
      console.error("Error:", err); // Debug log
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Failed to add stock",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsFromServer = async (
  searchTerm = "",
  page = 1,
  limit = 50
) => {
  try {
    setProductsLoading(true);
    setProductsError(null);

    const endpoint = `${API_BASE_URL}/products/search?search=${encodeURIComponent(
      searchTerm
    )}&page=${page}&limit=${limit}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.products)) {
      const activeProducts = data.products.filter(
        (product: Product) => product.isActive !== false
      );

      // ✅ Store both filtered products and products with variants
      setFilteredProducts(activeProducts);
      setProductsWithVariants(activeProducts); // <-- this line is important now
    } else {
      throw new Error(data.message || "Invalid response format");
    }
  } catch (err) {
    console.error("Error fetching products:", err);
    setProductsError(
      err instanceof Error ? err.message : "Failed to fetch products"
    );
    setFilteredProducts([]);
    setProductsWithVariants([]); // reset on error
  } finally {
    setProductsLoading(false);
  }
};

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
              <BreadcrumbLink href="/stock">Stock</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Add Stock</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* --- Demo: Adjustment Improvements --- */}
        {/* <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded mb-4">
          <p className="text-orange-800 text-sm font-medium">
            
          </p>
        </div> */}
        {/* --- End Demo --- */}
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/stock">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Add Stock Entry</h2>
              <p className="text-muted-foreground">
                Add new stock to your inventory
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddStock}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Stock Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stock Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Type</CardTitle>
                  <CardDescription>
                    Select the type of stock you're adding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={stockType}
                    onValueChange={setStockType}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="gray">Gray Stock</TabsTrigger>
                      <TabsTrigger value="factory">Factory Stock</TabsTrigger>
                      <TabsTrigger value="design">Design Stock</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gray" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search products..."
                                value={productSearchTerm}
                                onChange={(e) =>
                                  handleProductSearchChange(e.target.value)
                                }
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>

                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
    {productsLoading ? (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span>Searching products...</span>
      </div>
    ) : productsError ? (
      <div className="p-4 text-red-500 text-sm">
        <div>Error: {productsError}</div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => fetchProductsFromServer(productSearchTerm, 1, 50)}
          type="button"
        >
          Retry
        </Button>
      </div>
    ) : filteredProducts.length === 0 ? (
      <div className="p-4 text-muted-foreground text-sm">
        {productSearchTerm
          ? "No products found matching your search"
          : "No products available"}
      </div>
    ) : (
      filteredProducts.map((product) => (
        <div
          key={product._id}
          className={`px-4 py-2 flex items-center justify-between ${
            product.isActive === false
              ? "bg-gray-50 text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-100 cursor-pointer"
          }`}
          onClick={() =>
            product.isActive !== false && handleProductSelect(product)
          }
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <div>
              <div className="font-medium">
                {getProductDisplayName(product)}
              </div>
              {product.variants.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {product.variants.length} color{product.variants.length > 1 ? "s" : ""} available
                </div>
              )}
            </div>
          </div>
          {product.isActive === false && (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {selectedProduct === product.productName && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </div>
      ))
    )}
  </div>
)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factory">Factory</Label>
                          <Select
                            value={stockDetails.factory}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                factory: value,
                              })
                            }
                            disabled={!stockDetails.agent} // disable Select if no agent chosen
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select factory" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading factories...</span>
                                </div>
                              ) : (
                                factories.map((factory, index) => (
                                  <SelectItem key={index} value={factory}>
                                    {factory}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agent">Agent</Label>
                          <Select
                            value={stockDetails.agent}
                            onValueChange={(value) => {
                              setStockDetails({
                                ...stockDetails,
                                agent: value,
                                factory: "",
                              });

                              // Find the agent object
                              const selectedAgent = agents.find(
                                (a) => a.name === value
                              );

                              // Extract its factories
                              const agentFactories =
                                selectedAgent?.factory ? [selectedAgent.factory] : [];

                              // Update factories state
                              setFactories(agentFactories);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading agents...</span>
                                </div>
                              ) : (
                                agents.map((agent) => (
                                  <SelectItem
                                    key={agent._id}
                                    value={agent.name}
                                  >
                                    {agent.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="order-number">Order Number</Label>
                          <Input
                            id="order-number"
                            placeholder="PO-2024-001"
                            value={stockDetails.orderNumber}
                            onChange={(e) =>
                              setStockDetails({
                                ...stockDetails,
                                orderNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="factory" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder={
                                  stockType === "factory"
                                    ? "Search Gray Stock products..."
                                    : "Search products..."
                                }
                                value={productSearchTerm}
                                onChange={(e) =>
                                  handleProductSearchChange(e.target.value)
                                }
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>

                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {stockType === "factory" &&
                                grayStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading Gray Stock products...</span>
                                  </div>
                                ) : stockType === "design" &&
                                  factoryStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>
                                      Loading Factory Stock products...
                                    </span>
                                  </div>
                                ) : productsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : productsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {productsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : stockType === "design" &&
                                  factoryStockProductsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>
                                      Error: {factoryStockProductsError}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchFactoryStockProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {stockType === "factory"
                                      ? "No products found in Gray Stock. Add products to Gray Stock first."
                                      : productSearchTerm
                                      ? "No products found"
                                      : "No products available"}
                                  </div>
                                ) : (
                                  filteredProducts.map((product) => {
                                    const isInactive =
                                      product.isActive === false;
                                    return (
                                      <div
                                        key={product._id}
                                        className={`px-4 py-2 flex items-center justify-between ${
                                          isInactive
                                            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                                            : "hover:bg-gray-100 cursor-pointer"
                                        }`}
                                        onClick={() =>
                                          !isInactive &&
                                          handleProductSelect(product)
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {getProductDisplayName(product)}
                                          </span>
                                          {isInactive && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              Inactive
                                            </Badge>
                                          )}
                                        </div>
                                        {selectedProduct ===
                                          product.productName &&
                                          !isInactive && (
                                            <Check className="h-4 w-4 text-green-500" />
                                          )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factory">Processing Factory</Label>
                          <Select
                            value={stockDetails.factory}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                factory: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select factory" />
                            </SelectTrigger>
                            <SelectContent>
                              {agentsLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Loading factories...</span>
                                </div>
                              ) : (
                                factoryStockFactories.map((factory, index) => (
                                  <SelectItem key={index} value={factory}>
                                    {factory}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stage">Processing Stage</Label>
                          <Select
                            value={stockDetails.processingStage}
                            onValueChange={(value) =>
                              setStockDetails({
                                ...stockDetails,
                                processingStage: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dyeing">Dyeing</SelectItem>
                              <SelectItem value="printing">Printing</SelectItem>
                              <SelectItem value="finishing">
                                Finishing
                              </SelectItem>
                              <SelectItem value="quality-check">
                                Quality Check
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expected-completion">
                            Expected Completion
                          </Label>
                          <Input
                            id="expected-completion"
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            value={stockDetails.expectedCompletion}
                            onChange={(e) => {
                              const selectedDate = new Date(e.target.value);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);

                              if (selectedDate < today) {
                                toast({
                                  title: "Invalid Date",
                                  description:
                                    "Expected completion date must be in the future.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              setStockDetails({
                                ...stockDetails,
                                expectedCompletion: e.target.value,
                              });
                            }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="design" className="space-y-4 mt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="product">Product</Label>
                          <div className="relative" ref={productSearchRef}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search products..."
                                value={productSearchTerm}
                                onChange={(e) =>
                                  handleProductSearchChange(e.target.value)
                                }
                                onFocus={() => setShowProductSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="pl-10 pr-10"
                              />
                              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>

                            {/* Product Suggestions Dropdown */}
                            {showProductSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {stockType === "design" &&
                                factoryStockProductsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>
                                      Loading Factory Stock products...
                                    </span>
                                  </div>
                                ) : productsLoading ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : stockType === "design" &&
                                  factoryStockProductsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>
                                      Error: {factoryStockProductsError}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchFactoryStockProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : productsError ? (
                                  <div className="p-4 text-red-500 text-sm">
                                    <div>Error: {productsError}</div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={retryFetchProducts}
                                    >
                                      Retry
                                    </Button>
                                  </div>
                                ) : filteredProducts.length === 0 ? (
                                  <div className="p-4 text-muted-foreground text-sm">
                                    {productSearchTerm
                                      ? "No products found"
                                      : "No products available"}
                                  </div>
                                ) : (
                                  filteredProducts.map((product) => {
                                    const isInactive =
                                      product.isActive === false;
                                    return (
                                      <div
                                        key={product._id}
                                        className={`px-4 py-2 flex items-center justify-between ${
                                          isInactive
                                            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                                            : "hover:bg-gray-100 cursor-pointer"
                                        }`}
                                        onClick={() =>
                                          !isInactive &&
                                          handleProductSelect(product)
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {getProductDisplayName(product)}
                                          </span>
                                          {isInactive && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              Inactive
                                            </Badge>
                                          )}
                                        </div>
                                        {selectedProduct ===
                                          product.productName &&
                                          !isInactive && (
                                            <Check className="h-4 w-4 text-green-500" />
                                          )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Stock Variants */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Stock Variants</CardTitle>
                      <CardDescription>
                        Add different colors and quantities
                      </CardDescription>
                    </div>
                    <Button type="button" onClick={addVariant} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* --- Apply to All Section --- */}
                  <div className="flex gap-4 items-end p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1 space-y-2">
                      <Label>Quantity (Apply to All)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={bulkQuantity}
                        onChange={(e) => setBulkQuantity(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Unit (Apply to All)</Label>
                      <Select
                        value={bulkUnit}
                        onValueChange={(value) => setBulkUnit(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meters">Meters</SelectItem>
                          <SelectItem value="sets">Sets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setVariants((prev) =>
                          prev.map((v) => ({
                            ...v,
                            quantity: bulkQuantity || v.quantity,
                            unit: bulkUnit || v.unit,
                          }))
                        );
                      }}
                    >
                      Apply to All
                    </Button>
                  </div>

                  {/* --- Variants Section --- */}
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="flex gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-2">
                        <Label>Color</Label>
                        <Select
                          value={variant.color}
                          onValueChange={(value) =>
                            updateVariant(index, "color", value)
                          }
                          disabled={!selectedProduct}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                selectedProduct
                                  ? "Select color"
                                  : "Select product first"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {getAvailableColorsForVariant(index).map(
                              (color, i) => (
                                <SelectItem
                                  key={`${color}-${i}`}
                                  value={color}
                                >
                                  {color}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.quantity}
                          onChange={(e) =>
                            updateVariant(index, "quantity", e.target.value)
                          }
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={variant.unit}
                          onValueChange={(value) =>
                            updateVariant(index, "unit", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="sets">Sets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {variants.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="text-red-600"
                          type="button"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}

                  {variants.some((v) => v.unit === "sets") && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                      <p className="font-medium">Set Conversion:</p>
                      <p>• 1 Set (3 colors) = 180 meters (60m per color)</p>
                      <p>• 1 Set (2 colors) = 120 meters (60m per color)</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>
                    Extra details about this stock entry
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch-number">Batch Number</Label>
                      <Input
                        id="batch-number"
                        placeholder="BTH-2024-001"
                        value={addtionalInfo.batchNumber}
                        onChange={(e) =>
                          setAddtionalInfo({
                            ...addtionalInfo,
                            batchNumber: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quality-grade">Quality Grade</Label>
                      <Select
                        value={addtionalInfo.qualityGrade}
                        onValueChange={(value) =>
                          setAddtionalInfo({
                            ...addtionalInfo,
                            qualityGrade: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional notes..."
                      rows={3}
                      value={addtionalInfo.notes}
                      onChange={(e) =>
                        setAddtionalInfo({
                          ...addtionalInfo,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stock Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Summary</CardTitle>
                  <CardDescription>Overview of stock entry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {stockType === "gray" && (
                      <Package className="h-4 w-4 text-blue-500" />
                    )}
                    {stockType === "factory" && (
                      <Factory className="h-4 w-4 text-orange-500" />
                    )}
                    {stockType === "design" && (
                      <Palette className="h-4 w-4 text-green-500" />
                    )}
                    <Badge variant="outline">
                      {stockType.charAt(0).toUpperCase() + stockType.slice(1)}{" "}
                      Stock
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {selectedProduct && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Selected Product
                        </span>
                        <span className="font-medium">{selectedProduct}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Variants
                      </span>
                      <span className="font-medium">{variants.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Quantity
                      </span>
                      <span className="font-medium">
                        {getTotalQuantity().toLocaleString()} meters
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entry Date</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Type Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Stock Type Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {stockType === "gray" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Gray Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unfinished fabric received from factories. Requires
                        further processing.
                      </p>
                    </div>
                  )}

                  {stockType === "factory" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Factory Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Stock currently being processed at factories. Track
                        processing stages.
                      </p>
                    </div>
                  )}

                  {stockType === "design" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Design Stock</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Finished products ready for sale. Stored in warehouses.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalQuantity().toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Meters
                    </p>
                  </div>

                  {variants.some((v) => v.unit === "sets") && (
                    <div className="text-center">
                      <div className="text-lg font-medium text-blue-600">
                        {variants
                          .filter((v) => v.unit === "sets")
                          .reduce(
                            (sum, v) =>
                              sum + (Number.parseFloat(v.quantity) || 0),
                            0
                          )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Sets
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </form>
      </div>
    </SidebarInset>
  );
}

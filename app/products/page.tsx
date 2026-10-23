"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ChevronsDown,
  Trash2,
  Settings,
  FolderPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Types
interface ProductStats {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  categories: string[];
}

interface Product {
  _id: string;
  productName: string;
  category: string;
  tags: string[];
  variants: any[];
  images?: string[];
  isActive?: boolean;
  stockInfo?: {
    minimumStock: number;
    reorderPoint: number;
    storageLocation: string;
  };
  unit?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Tag {
  _id: string;
  name: string;
}

interface Category {
  _id: string;
  name: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // UI states
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showManagement, setShowManagement] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [productStats, setProductStats] = useState<ProductStats>({
    totalProducts: 0,
    totalVariants: 0,
    totalStock: 0,
    categories: [],
  });

  // Categories and Tags
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Management states
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [deletingCategories, setDeletingCategories] = useState(false);
  const [deletingTags, setDeletingTags] = useState(false);

  // Create states
  const [customCategory, setCustomCategory] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Fetch products with server-side filtering
  const fetchProducts = useCallback(async (
    page: number = 1,
    limit: number = 12,
    filters?: {
      search?: string;
      category?: string;
      tags?: string[];
      status?: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: "-createdAt",
      });

      // Add filter parameters
      if (filters?.search) {
        params.append("search", filters.search);
      }
      if (filters?.category && filters.category !== "all") {
        params.append("category", filters.category);
      }
      if (filters?.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters?.tags && filters.tags.length > 0) {
        params.append("tags", filters.tags.join(","));
      }

      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
        setPagination(data.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: data.products.length,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setProducts([]);
      toast({
        title: "Error fetching products",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/stats`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch product stats");
      }

      setProductStats(data.stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
      toast({
        title: "Error fetching statistics",
        description: err instanceof Error ? err.message : "Failed to load stats",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${API_BASE_URL}/products/categories`);
      const result = await response.json();
      setAllCategories(result.categories || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast({
        title: "Error loading categories",
        description: err instanceof Error ? err.message : "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setCategoriesLoading(false);
    }
  }, [toast]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      setTagsLoading(true);
      const response = await fetch(`${API_BASE_URL}/products/tags`);
      const result = await response.json();
      setAllTags(result.tags || []);
    } catch (err) {
      console.error("Error fetching tags:", err);
      toast({
        title: "Error loading tags",
        description: err instanceof Error ? err.message : "Failed to load tags",
        variant: "destructive",
      });
    } finally {
      setTagsLoading(false);
    }
  }, [toast]);

  // Initial data load
  useEffect(() => {
    fetchProducts(1, 12);
    fetchStats();
    fetchCategories();
    fetchTags();
  }, [fetchProducts, fetchStats, fetchCategories, fetchTags]);

  // Trigger server-side search when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, pagination.itemsPerPage, {
        search: searchTerm,
        category: selectedCategory,
        tags: selectedTags,
        status: selectedStatus,
      });
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedTags, selectedStatus, pagination.itemsPerPage, fetchProducts]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage, pagination.itemsPerPage, {
      search: searchTerm,
      category: selectedCategory,
      tags: selectedTags,
      status: selectedStatus,
    });
  };

  // Create category
  const handleCustomCategory = async () => {
    const newCategory = customCategory.trim();
    if (!newCategory) return;

    try {
      setIsCreatingCategory(true);
      const response = await fetch(`${API_BASE_URL}/products/addCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Category created",
          description: `Category "${newCategory}" has been created successfully`,
        });
        setCustomCategory("");
        fetchCategories();
      } else {
        toast({
          title: "Failed to create category",
          description: result.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Create tag
  const handleCustomTag = async () => {
    const newTag = customTag.trim();
    if (!newTag) return;

    try {
      setIsCreatingTag(true);
      const response = await fetch(`${API_BASE_URL}/products/addTag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Tag created",
          description: `Tag "${newTag}" has been created successfully`,
        });
        setCustomTag("");
        fetchTags();
      } else {
        toast({
          title: "Failed to create tag",
          description: result.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create tag",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Delete categories
  const deleteSelectedCategories = async () => {
    if (selectedCategoryIds.length === 0) return;

    try {
      setDeletingCategories(true);
      const response = await fetch(`${API_BASE_URL}/products/categories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: selectedCategoryIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete categories");
      }

      const result = await response.json();
      const { deletedCount, skipped } = result;

      if (deletedCount > 0) {
        toast({
          title: "Categories deleted",
          description: `Successfully deleted ${deletedCount} categor${deletedCount === 1 ? "y" : "ies"}`,
        });
      }

      if (skipped && skipped.length > 0) {
        toast({
          title: "Some categories not deleted",
          description: `${skipped.length} categor${skipped.length === 1 ? "y is" : "ies are"} still in use`,
          variant: "destructive",
        });
      }

      setSelectedCategoryIds([]);
      fetchCategories();
      fetchProducts(pagination.currentPage, pagination.itemsPerPage);
    } catch (err) {
      toast({
        title: "Error deleting categories",
        description: err instanceof Error ? err.message : "Failed to delete categories",
        variant: "destructive",
      });
    } finally {
      setDeletingCategories(false);
    }
  };

  // Delete tags
  const deleteSelectedTags = async () => {
    if (selectedTagIds.length === 0) return;

    try {
      setDeletingTags(true);
      const response = await fetch(`${API_BASE_URL}/products/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: selectedTagIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete tags");
      }

      const result = await response.json();
      const { deletedCount, skipped } = result;

      if (deletedCount > 0) {
        toast({
          title: "Tags deleted",
          description: `Successfully deleted ${deletedCount} tag${deletedCount === 1 ? "" : "s"}`,
        });
      }

      if (skipped && skipped.length > 0) {
        toast({
          title: "Some tags not deleted",
          description: `${skipped.length} tag${skipped.length === 1 ? "" : "s"} still in use`,
          variant: "destructive",
        });
      }

      setSelectedTagIds([]);
      fetchTags();
      fetchProducts(pagination.currentPage, pagination.itemsPerPage);
    } catch (err) {
      toast({
        title: "Error deleting tags",
        description: err instanceof Error ? err.message : "Failed to delete tags",
        variant: "destructive",
      });
    } finally {
      setDeletingTags(false);
    }
  };

  const getStatusIcon = (isActive: boolean = true) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <SidebarInset>
      {/* Header */}
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
              <BreadcrumbPage>Products</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Products</h2>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowManagement(!showManagement)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Names, Colors & Tags
            </Button>
            <Button onClick={() => router.push("/products/add")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Management Section */}
        {showManagement && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Names, Colors & Tags</CardTitle>
              <CardDescription>
                Select and delete product names, colors or tags in bulk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="categories" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="categories">Product Names</TabsTrigger>
                  <TabsTrigger value="colors">Colors</TabsTrigger>
                  <TabsTrigger value="tags">Tags</TabsTrigger>
                </TabsList>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Product Names ({allCategories.length})
                    </h3>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Custom Category</DialogTitle>
                            <DialogDescription>
                              Create a new category for your products
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Enter category name"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleCustomCategory()
                              }
                            />
                            <Button
                              className="w-full"
                              onClick={handleCustomCategory}
                              disabled={!customCategory.trim() || isCreatingCategory}
                            >
                              {isCreatingCategory ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <FolderPlus className="h-4 w-4 mr-2" />
                                  Create Category
                                </>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {selectedCategoryIds.length > 0 && (
                        <Button
                          variant="destructive"
                          onClick={deleteSelectedCategories}
                          disabled={deletingCategories}
                        >
                          {deletingCategories ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete ({selectedCategoryIds.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  {categoriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allCategories.map((category) => (
                        <div
                          key={category._id}
                          className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`category-${category._id}`}
                            checked={selectedCategoryIds.includes(category._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategoryIds([...selectedCategoryIds, category._id]);
                              } else {
                                setSelectedCategoryIds(
                                  selectedCategoryIds.filter((id) => id !== category._id)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`category-${category._id}`}
                            className="text-sm font-medium leading-none flex-1 cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {!categoriesLoading && allCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No categories found
                    </div>
                  )}
                </TabsContent>

                {/* Tags Tab */}
                <TabsContent value="tags" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Tags ({allTags.length})
                    </h3>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Custom Tag</DialogTitle>
                            <DialogDescription>
                              Create a new tag for your products
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Enter tag name"
                              value={customTag}
                              onChange={(e) => setCustomTag(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleCustomTag()}
                            />
                            <Button
                              className="w-full"
                              onClick={handleCustomTag}
                              disabled={!customTag.trim() || isCreatingTag}
                            >
                              {isCreatingTag ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <FolderPlus className="h-4 w-4 mr-2" />
                                  Create Tag
                                </>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {selectedTagIds.length > 0 && (
                        <Button
                          variant="destructive"
                          onClick={deleteSelectedTags}
                          disabled={deletingTags}
                        >
                          {deletingTags ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete ({selectedTagIds.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  {tagsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allTags.map((tag) => (
                        <div
                          key={tag._id}
                          className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`tag-${tag._id}`}
                            checked={selectedTagIds.includes(tag._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTagIds([...selectedTagIds, tag._id]);
                              } else {
                                setSelectedTagIds(
                                  selectedTagIds.filter((id) => id !== tag._id)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`tag-${tag._id}`}
                            className="text-sm font-medium leading-none flex-1 cursor-pointer"
                          >
                            {tag.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {!tagsLoading && allTags.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tags found
                    </div>
                  )}
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors" className="space-y-4">
                  <ColorsManager />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productStats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {productStats.totalVariants}
              </div>
              <p className="text-xs text-muted-foreground">Color variants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Names</CardTitle>
              <AlertTriangle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {productStats.categories.length}
              </div>
              <p className="text-xs text-muted-foreground">Product types</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Product Names" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Product Names</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category._id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  {selectedTags.length === 0
                    ? "All Tags"
                    : selectedTags.length === 1
                    ? selectedTags[0]
                    : `${selectedTags.length} tags selected`}
                  <ChevronsDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <div className="max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-tags"
                        checked={
                          selectedTags.length === allTags.length && allTags.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTags(allTags.map((t) => t.name));
                          } else {
                            setSelectedTags([]);
                          }
                        }}
                      />
                      <label
                        htmlFor="select-all-tags"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Select All
                      </label>
                    </div>
                  </div>
                  <div className="border-t">
                    {allTags.map((tag) => (
                      <div
                        key={tag._id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted"
                      >
                        <Checkbox
                          id={`tag-${tag._id}`}
                          checked={selectedTags.includes(tag.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTags([...selectedTags, tag.name]);
                            } else {
                              setSelectedTags(selectedTags.filter((t) => t !== tag.name));
                            }
                          }}
                        />
                        <label
                          htmlFor={`tag-${tag._id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {tag.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Products Display */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Loading products...</span>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Error loading products</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchProducts()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                No products match your current filters
              </p>
              <Button onClick={() => router.push("/products/add")}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt={product.productName}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setExpandedImage(product.images?.[0] ?? "");
                          setCurrentImageIndex(0);
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        {getStatusIcon(product.isActive)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{product.category}</h3>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {product.productName}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={product.isActive !== false ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {product.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {product.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.tags.length - 2}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm">
                        <p className="font-medium">
                          {product.variants.length} color
                          {product.variants.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => router.push(`/products/${product._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/products/${product._id}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}{" "}
              of {pagination.totalItems} products
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
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
                      className="w-8 h-8 p-0"
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
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={!pagination.hasNextPage}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {expandedImage && (
          <Dialog
            open={!!expandedImage}
            onOpenChange={() => {
              setExpandedImage(null);
              setCurrentImageIndex(0);
            }}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Product Images</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={expandedImage || "/placeholder.svg"}
                  alt="Expanded product"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SidebarInset>
  );
}

// Colors Manager Component
function ColorsManager() {
  const { toast } = useToast();
  const [colors, setColors] = useState<{ id: string; name: string }[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("");
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  useEffect(() => {
    const loadColors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products/colors`);
        const data = await res.json();
        const list = (data.colors || []).map((c: any) => ({
          id: c._id,
          name: c.name,
        }));
        setColors(list);
      } catch (err) {
        toast({
          title: "Error loading colors",
          description: err instanceof Error ? err.message : "Failed to load colors",
          variant: "destructive",
        });
      } finally {
        setIsLoadingColors(false);
      }
    };
    loadColors();
  }, [toast]);

  const handleCreateColor = async () => {
    const name = customColor.trim();
    if (!name) return;

    setIsCreatingColor(true);
    try {
      if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        toast({
          title: "Color already exists",
          description: "This color name is already in use",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/addColor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to create color");
      }

      const created = result.color;
      const newColor = {
        id: created?._id || Date.now().toString(),
        name: created?.name || name,
      };

      setColors([...colors, newColor]);
      setCustomColor("");
      toast({
        title: "Color added",
        description: `"${name}" has been added successfully`,
      });
    } catch (err) {
      toast({
        title: "Error creating color",
        description: err instanceof Error ? err.message : "Failed to create color",
        variant: "destructive",
      });
    } finally {
      setIsCreatingColor(false);
    }
  };

  const deleteSelectedColors = async () => {
    if (selectedColorIds.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/products/colors`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorIds: selectedColorIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete colors");
      }

      const deletedCount = colors.filter((c) => selectedColorIds.includes(c.id)).length;
      const next = colors.filter((c) => !selectedColorIds.includes(c.id));
      
      setColors(next);
      setSelectedColorIds([]);
      
      toast({
        title: "Colors deleted",
        description: `Successfully removed ${deletedCount} color${deletedCount === 1 ? "" : "s"}`,
      });
    } catch (err) {
      toast({
        title: "Error deleting colors",
        description: err instanceof Error ? err.message : "Failed to delete colors",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Colors ({colors.length})</h3>
        <div className="flex items-center gap-2">
          {selectedColorIds.length > 0 && (
            <Button variant="destructive" onClick={deleteSelectedColors}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedColorIds.length})
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Color</DialogTitle>
                <DialogDescription>
                  Create a color available for variants
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter color name"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateColor()}
                />
                <Button
                  className="w-full"
                  onClick={handleCreateColor}
                  disabled={!customColor.trim() || isCreatingColor}
                >
                  {isCreatingColor ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Create Color
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingColors ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {colors.map((color) => (
            <div
              key={color.id}
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                id={`color-${color.id}`}
                checked={selectedColorIds.includes(color.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedColorIds([...selectedColorIds, color.id]);
                  } else {
                    setSelectedColorIds(selectedColorIds.filter((id) => id !== color.id));
                  }
                }}
              />
              <label
                htmlFor={`color-${color.id}`}
                className="text-sm font-medium leading-none flex-1 cursor-pointer"
              >
                {color.name}
              </label>
            </div>
          ))}
        </div>
      )}

      {!isLoadingColors && colors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No colors found
        </div>
      )}
    </div>
  );
}

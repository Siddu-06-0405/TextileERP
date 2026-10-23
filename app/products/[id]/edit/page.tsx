"use client";

import type React from "react";

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
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Plus, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { API_BASE_URL } from "@/lib/api";

interface Variant {
  color: string;
  pricePerMeters: number;
}

interface StockInfo {
  minimumStock: number;
  reorderPoint: number;
  storageLocation: string;
}

interface ProductFormData {
  productName: string;
  category: string;
  description: string;
  tags: string[];
  variants: Variant[];
  stockInfo: StockInfo;
  unit: "METERS" | "SETS";
  images: string[];
  isActive: boolean;
}

interface Tag {
  _id: string;
  name: string;
  __v?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  _id: string;
  name: string;
  __v?: number;
  createdAt?: string;
  updatedAt?: string;
}

// API functions
const fetchTags = async (): Promise<Tag[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/tags`);
    const result = await response.json();
    if (result.success && result.tags) {
      return result.tags;
    }
    return [];
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
};

const fetchCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/categories`);
    const result = await response.json();
    if (result.success && result.categories) {
      return result.categories;
    }
    return [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

const createTag = async (data: {
  name: string;
}): Promise<{ ok: boolean; data: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/addTag`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    // console.log("Create Tag Response:", result);
    return { ok: response.ok, data: result };
  } catch (error) {
    console.error("Error creating tag:", error);
    return { ok: false, data: { message: "Failed to create tag" } };
  }
};

const createCategory = async (data: {
  name: string;
}): Promise<{ ok: boolean; data: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/addCategory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { ok: response.ok, data: result };
  } catch (error) {
    console.error("Error creating category:", error);
    return { ok: false, data: { message: "Failed to create category" } };
  }
};

export default function EditProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const productId = params.id as string;

  const [formData, setFormData] = useState<ProductFormData>({
    productName: "",
    category: "",
    tags: [],
    variants: [],
    images: [],
    isActive: true,
    description: "",
    stockInfo: {
      minimumStock: 0,
      reorderPoint: 0,
      storageLocation: "",
    },
    unit: "METERS",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Data from API
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch product");
        }
        const data = await response.json();

        // Map backend fields to form fields correctly
        setFormData({
          productName: data.product.productName || "",
          category:
            typeof data.product.category === "object"
              ? data.product.category._id
              : data.product.category || "",
          description: data.product.description || "",
          tags: data.product.tags || [],
          variants: data.product.variants || [],
          images: data.product.images || [],
          stockInfo: data.product.stockInfo || {
            minimumStock: 0,
            reorderPoint: 0,
            storageLocation: "",
          },
          unit: data.product.unit || "METERS",
          isActive:
            data.product.isActive !== undefined ? data.product.isActive : true,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        toast({
          title: "Error loading product",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const loadData = async () => {
      try {
        const [tagsData, categoriesData] = await Promise.all([
          fetchTags(),
          fetchCategories(),
        ]);

        setAvailableTags(tagsData);
        setAvailableCategories(categoriesData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error loading data",
          description: "Failed to load tags and categories",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTags(false);
        setIsLoadingCategories(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
    loadData();
  }, [productId, toast]);

  const [productColors, setProductColors] = useState<
    { id: string; name: string }[]
  >([]);
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
        setProductColors(list);
      } catch (err) {
        toast({
          title: "Error loading colors",
          description:
            err instanceof Error ? err.message : "Failed to load colors",
          variant: "destructive",
        });
      } finally {
        setIsLoadingColors(false);
      }
    };
    loadColors();
  }, [toast]);

  const handleVariantChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    if (field === "color" && typeof value === "string") {
      const nextColor = value.trim().toLowerCase();
      const isDuplicate = formData.variants.some(
        (v, i) =>
          i !== index && (v.color || "").trim().toLowerCase() === nextColor
      );
      if (isDuplicate) {
        toast({
          title: "Duplicate color",
          description: "This color is already added.",
          variant: "destructive",
        });
        return;
      }
    }
    setFormData((prev) => {
      const newVariants = [...prev.variants];
      newVariants[index] = {
        ...newVariants[index],
        [field]: value,
      };
      return {
        ...prev,
        variants: newVariants,
      };
    });
  };

  const addVariant = () => {
    setFormData((prev) => {
      const last = prev.variants[prev.variants.length - 1];
      return {
        ...prev,
        variants: [
          ...prev.variants,
          {
            color: "",
            pricePerMeters: last?.pricePerMeters ?? 0,
          },
        ],
      };
    });
  };

  const removeVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleInputChange = (
    field: string,
    value: string | boolean | number
  ) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof ProductFormData] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const addTag = (tagId: string) => {
    if (!tagId) return;

    // Check if tag ID is already in the array
    if (!formData.tags.includes(tagId)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagId],
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const createAndAddTag = async () => {
    if (!customTag.trim()) return;

    setIsCreatingTag(true);
    try {
      const result = await createTag({ name: customTag.trim() });
      // console.log("CreateandaddTag Result:", result);
      if (result.ok) {
        // Refresh tags list
        const updatedTags = await fetchTags();
        setAvailableTags(updatedTags);

        // Add the new tag to form
        const newTagId = result.data.tag._id;
        addTag(newTagId);

        setCustomTag("");
        toast({
          title: "Tag created",
          description: `Tag "${customTag}" has been created successfully.`,
          variant: "default",
        });
      } else {
        throw new Error(result.data.message || "Failed to create tag");
      }
    } catch (err) {
      toast({
        title: "Failed to create tag",
        description:
          err instanceof Error ? err.message : "Failed to create tag",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const createAndAddCategory = async () => {
    if (!customCategory.trim()) return;

    setIsCreatingCategory(true);
    try {
      const result = await createCategory({ name: customCategory.trim() });
      if (result.ok) {
        // Refresh categories list
        const updatedCategories = await fetchCategories();
        setAvailableCategories(updatedCategories);

        // Set the new category as selected
        const newCategoryId = result.data.category._id;
        handleInputChange("category", newCategoryId);

        setCustomCategory("");
        toast({
          title: "Category created",
          description: `Category "${customCategory}" has been created successfully.`,
          variant: "default",
        });
      } else {
        throw new Error(result.data.message || "Failed to create category");
      }
    } catch (err) {
      toast({
        title: "Failed to create category",
        description:
          err instanceof Error ? err.message : "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true);
    try {
      const uploadFormData = new FormData();

      // Append all files to FormData with 'images' field name
      for (let i = 0; i < files.length; i++) {
        uploadFormData.append("images", files[i]);
      }

      const response = await fetch(`${API_BASE_URL}/products/upload-images`, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }

      const result = await response.json();

      if (result.success && result.images) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...result.images],
        }));

        toast({
          title: "Images uploaded",
          description: `${result.images.length} image(s) uploaded successfully.`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error uploading images:", err);
      toast({
        title: "Upload failed",
        description:
          err instanceof Error ? err.message : "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prevent duplicate colors (case-insensitive)
      const seen = new Set<string>();
      for (const v of formData.variants) {
        const key = (v.color || "").trim().toLowerCase();
        if (!key) continue;
        if (seen.has(key)) {
          toast({
            title: "Duplicate colors",
            description: "Please remove duplicate color variants.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        seen.add(key);
      }
      // Prepare payload matching backend schema
      const payload = {
        productName: formData.productName,
        category: formData.category,
        description: formData.description,
        tags: formData.tags,
        variants: formData.variants.map((v) => ({
          color: v.color,
          pricePerMeters: Number(v.pricePerMeters) || 0,
        })),
        stockInfo: {
          minimumStock: Number(formData.stockInfo.minimumStock) || 0,
          reorderPoint: Number(formData.stockInfo.reorderPoint) || 0,
          storageLocation: formData.stockInfo.storageLocation || "",
        },
        unit: formData.unit,
        images: formData.images,
        isActive: formData.isActive,
      };

      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }

      toast({
        title: "Product updated",
        description: `${payload.productName} has been updated successfully.`,
        variant: "default",
      });

      setTimeout(() => router.push("/products"), 900);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Failed to update product",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete product");
      }

      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully.",
        variant: "default",
      });

      setTimeout(() => router.push("/products"), 900);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete product";
      setError(errorMessage);
      toast({
        title: "Failed to delete product",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Helper function to get tag name by ID
  const getTagName = (tagId: string): string => {
    const tag = availableTags.find((t) => t._id === tagId);
    return tag ? tag.name : tagId;
  };

  // Helper function to get category name by ID
  const getCategoryName = (categoryId: string): string => {
    const category = availableCategories.find((c) => c._id === categoryId);
    return category ? category.name : categoryId;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-8">Loading...</div>
    );
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/products/${productId}`}>
                {formData.productName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="sm:hidden text-sm font-medium text-muted-foreground">
          Edit Product
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold">Edit Product</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Update product information and settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential product details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Product Name *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Add custom category */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Input
                      placeholder="Create new product name"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={createAndAddCategory}
                      disabled={isCreatingCategory || !customCategory.trim()}
                      className="shrink-0"
                    >
                      {isCreatingCategory ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productName">Design Number *</Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) =>
                      handleInputChange("productName", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: "METERS" | "SETS") =>
                      handleInputChange("unit", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="METERS">Meters</SelectItem>
                      <SelectItem value="SETS">Sets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Variants & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
                <CardDescription>
                  Manage product color variants and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.variants.map((variant, index) => {
                  // Filter out colors that are already selected in other variants
                  const availableColors = productColors.filter(
                    (color: any) =>
                      !formData.variants.some(
                        (v, i) => i !== index && v.color === color.name
                      )
                  );

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`color-${index}`}>Color</Label>
                        <select
                          id={`color-${index}`}
                          value={variant.color}
                          onChange={(e) =>
                            handleVariantChange(index, "color", e.target.value)
                          }
                          required
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select Color</option>
                          {availableColors.map((color: any, i: number) => (
                            <option key={i} value={color.name}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`price-${index}`}>
                          Price per Meter (₹)
                        </Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          step="0.01"
                          value={variant.pricePerMeters}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "pricePerMeters",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="shrink-0 mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button type="button" variant="outline" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Inventory management settings</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.stockInfo.minimumStock}
                  onChange={(e) =>
                    handleInputChange(
                      "stockInfo.minimumStock",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  value={formData.stockInfo.reorderPoint}
                  onChange={(e) =>
                    handleInputChange(
                      "stockInfo.reorderPoint",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageLocation">Storage Location</Label>
                <Input
                  id="storageLocation"
                  value={formData.stockInfo.storageLocation}
                  onChange={(e) =>
                    handleInputChange(
                      "stockInfo.storageLocation",
                      e.target.value
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Add tags to help categorize and search for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tagId) => (
                  <Badge key={tagId} variant="secondary" className="gap-1">
                    {getTagName(tagId)}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tagId)}
                    />
                  </Badge>
                ))}
              </div>

              {/* Available tags as clickable badges */}
              <div className="space-y-2">
                <Label>Add existing tag</Label>
                {isLoadingTags ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading tags...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags
                      .filter((tag) => !formData.tags.includes(tag._id))
                      .map((tag) => (
                        <Badge
                          key={tag._id}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => addTag(tag._id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* Create new tag */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Create new tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={createAndAddTag}
                  disabled={isCreatingTag || !customTag.trim()}
                  className="shrink-0"
                >
                  {isCreatingTag ? "Creating..." : "Create & Add"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload and manage product images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-muted rounded-lg overflow-hidden"
                      >
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index),
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop images here, or click to browse
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? "Uploading..." : "Choose Files"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Status */}
          <Card>
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
              <CardDescription>
                Set whether this product is active or inactive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">
                  {formData.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formData.isActive
                  ? "This product will be visible and available for orders"
                  : "This product will be hidden and unavailable for orders"}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 order-2 sm:order-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* Delete Product */}
            <div className="order-1 sm:order-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={deleting}
                    className="w-full sm:w-auto"
                  >
                    {deleting ? "Deleting..." : "Delete Product"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4 sm:mx-0">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the product and remove it from the product list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel
                      disabled={deleting}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full sm:w-auto"
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </form>
      </div>
    </SidebarInset>
  );
}

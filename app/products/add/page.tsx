"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  X,
  Plus,
  ArrowLeft,
  Save,
  Tag,
  Loader2,
  FolderPlus,
} from "lucide-react";
import Link from "next/link";
import { createProduct, uploadProductImages } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";

interface Tag {
  _id: string;
  name: string;
}

interface Category {
  _id: string;
  name: string;
}

interface LocalColor {
  id: string;
  name: string;
}

// API functions
const fetchTags = async (): Promise<Tag[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/tags`);
    const result = await response.json();
    return result.tags || [];
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
};

const fetchCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/categories`);
    const result = await response.json();
    return result.categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

const createTag = async (data: {
  name: string;
}): Promise<{ ok: boolean; data: any }> => {
  const response = await fetch(`${API_BASE_URL}/products/addTag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  return { ok: response.ok, data: result };
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

export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [variants, setVariants] = useState([
    { color: "", price: "" },
  ]);
  const [unit, setUnit] = useState("SETS");

  // Data from API
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [availableColors, setAvailableColors] = useState<LocalColor[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    category: "",
    unit: "SETS",
    stockInfo: {
      minimumStock: 0,
      reorderPoint: 0,
      storageLocation: "",
    },
    isActive: true,
  });
  const [customTag, setCustomTag] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customColor, setCustomColor] = useState("");

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tagsData, categoriesData] = await Promise.all([
          fetchTags(),
          fetchCategories(),
        ]);
        // console.log("Fetched tags:", tagsData);
        setAvailableTags(tagsData);
        setAvailableCategories(categoriesData);
        // Load colors from backend
        try {
          const res = await fetch(`${API_BASE_URL}/products/colors`);
          const data = await res.json();
          const list = (data.colors || []).map((c: any) => ({ id: c._id, name: c.name }));
          setAvailableColors(list);
        } catch (e) {
          // ignore
        }
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
        setIsLoadingColors(false);
      }
    };

    loadData();
  }, [toast]);

  // handle input change
  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // handle stock change
  const handleStockInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      stockInfo: {
        ...prev.stockInfo,
        [id]:
          id === "minimumStock" || id === "reorderPoint"
            ? Number(value) || 0 // Ensure number conversion
            : value,
      },
    }));
  };

  // handle category change
  const handleCategoryChange = (value: string) => {
    const category = availableCategories.find((cat) => cat.name === value);
    setSelectedCategory(value);
    setSelectedCategoryId(category?._id || "");
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  // Handle unit change
  const handleUnitChange = (value: string) => {
    setUnit(value);
    setFormData((prev) => ({
      ...prev,
      unit: value,
    }));
  };

  // handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate required fields
      const requiredFields = [
        { field: formData.productName, message: "Design number is required" },
        { field: formData.category, message: "Category is required" },
        {
          field: formData.stockInfo.storageLocation,
          message: "Storage location is required",
        },
      ];

      for (const { field, message } of requiredFields) {
        if (!field) {
          toast({
            title: "Missing information",
            description: message,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      // Require at least one tag
      if (selectedTags.length === 0) {
        toast({
          title: "Tags required",
          description: "Please select at least one tag",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      // Require at least one product image
      if (!productImages || productImages.length === 0) {
        toast({
          title: "Images required",
          description: "Please upload at least one product image",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      // Validate variants: must have at least one, and each must have color and price>0
      if (variants.length === 0) {
        toast({
          title: "Variant required",
          description: "Add at least one variant (color, price, stock)",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      for (const [idx, v] of variants.entries()) {
        const priceNum = parseFloat(v.price);
        if (!v.color) {
          toast({
            title: "Invalid variant",
            description: `Variant ${idx + 1}: Color is required`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
          toast({
            title: "Invalid variant",
            description: `Variant ${idx + 1}: Price must be greater than 0`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Format variants to match backend schema
      const formattedVariants = variants.map((variant) => ({
        color: variant.color,
        pricePerMeters: parseFloat(variant.price),
      }));

      // Prepare complete product data with mongoose IDs
      const productData = {
        ...formData,
        variants: formattedVariants,
        tags: selectedTagIds, // Send mongoose IDs
        category: selectedCategoryId, // Send mongoose ID
        images: productImages,
      };

      // Validate required fields
      if (
        !productData.productName ||
        !productData.category ||
        !productData.unit
      ) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await createProduct(productData);
      if (response.success) {
        toast({
          title: "Product created",
          description: `${productData.productName} has been added successfully.`,
        });
        setTimeout(() => router.push("/products"), 900);
      } else {
        toast({
          title: "Failed to create product",
          description: response.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error submitting product:", message);
      toast({
        title: "Error",
        description: `An error occurred while creating the product: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const predefinedTags = [
    "Premium",
    "Cotton",
    "Silk",
    "Polyester",
    "Designer",
    "Casual",
    "Formal",
    "Summer",
    "Winter",
    "Printed",
    "Solid",
    "Textured",
    "Lightweight",
    "Heavy",
  ];

  const categories = [
    "Cotton Fabrics",
    "Silk Fabrics",
    "Polyester Fabrics",
    "Blended Fabrics",
    "Designer Prints",
    "Solid Colors",
    "Textured Fabrics",
    "Seasonal Collection",
  ];

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      const tag = availableTags.find((t) => t.name === tagName);
      if (tag) {
        setSelectedTags([...selectedTags, tagName]);
        setSelectedTagIds([...selectedTagIds, tag._id]);
      }
    }
  };

  const removeTag = (tagName: string) => {
    const tagIndex = selectedTags.indexOf(tagName);
    if (tagIndex > -1) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
      setSelectedTagIds(
        selectedTagIds.filter((_, index) => index !== tagIndex)
      );
    }
  };

  const addVariant = () => {
    // Get the last variant's price and stock to pre-fill the new variant
    const lastVariant = variants[variants.length - 1];
    const newVariant = {
      color: "",
      price: lastVariant?.price || "",
      stock: lastVariant?.stock || "",
    };
    setVariants([...variants, newVariant]);
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

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleCustomTag = async () => {
    const newTag = customTag.trim();
    if (!newTag) return;

    if (selectedTags.includes(newTag)) {
      toast({
        title: "Tag exists",
        description: "This tag is already selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingTag(true);
      const response = await createTag({ name: newTag });

      if (response.ok) {
        // Add to available tags and select it
        const newTagObj = {
          _id: response.data.tag?._id || Date.now().toString(),
          name: newTag,
        };
        setAvailableTags([...availableTags, newTagObj]);
        setSelectedTags([...selectedTags, newTag]);
        setSelectedTagIds([...selectedTagIds, newTagObj._id]);
        setCustomTag("");
        toast({
          title: "Tag created",
          description: `Tag "${newTag}" has been created and added`,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to create tag",
          description: response.data.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error creating tag:", message);
      toast({
        title: "Error",
        description: `Failed to create tag: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCustomCategory = async () => {
    const newCategory = customCategory.trim();
    if (!newCategory) return;

    try {
      setIsCreatingCategory(true);
      const response = await createCategory({ name: newCategory });

      if (response.ok) {
        // Add to available categories and select it
        const newCategoryObj = {
          _id: response.data.category?._id || Date.now().toString(),
          name: newCategory,
        };
        setAvailableCategories([...availableCategories, newCategoryObj]);
        setSelectedCategory(newCategory);
        setSelectedCategoryId(newCategoryObj._id);
        setFormData((prev) => ({
          ...prev,
          category: newCategory,
        }));
        setCustomCategory("");
        toast({
          title: "Category created",
          description: `Category "${newCategory}" has been created and selected`,
        });
      } else {
        toast({
          title: "Failed to create category",
          description: response.data.message || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error creating category:", message);
      toast({
        title: "Error",
        description: `Failed to create category: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Colors helpers
  const handleCreateColor = async () => {
    const name = customColor.trim();
    if (!name) return;
    setIsCreatingColor(true);
    try {
      if (availableColors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        toast({ title: "Color exists", description: "This color already exists", variant: "destructive" });
        return;
      }
      const response = await fetch(`${API_BASE_URL}/products/addColor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Failed to create color");
      const created = result.color;
      const newColor = { id: created?._id || Date.now().toString(), name: created?.name || name } as LocalColor;
      const next = [...availableColors, newColor];
      setAvailableColors(next);
      setCustomColor("");
      toast({ title: "Color created", description: `Color "${name}" added` });
    } finally {
      setIsCreatingColor(false);
    }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log("Upload triggered");

    const files = e.target.files;
    // console.log("Selected files:", files);
    if (!files || files.length === 0) {
      // console.log("No files selected");
      return;
    }
    // Check file sizes
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${files[i].name} exceeds 5MB limit`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsUploading(true);
      // Check if we've reached the 5-image limit
      if (productImages.length + files.length > 5) {
        toast({
          title: "Image limit reached",
          description: "You can upload a maximum of 5 images",
          variant: "destructive",
        });
        return;
      }

      const result = await uploadProductImages(files);

      if (result.images && result.images.length > 0) {
        setProductImages((prev) => [...prev, ...result.images]);
      } else {
        throw new Error("No images returned from server");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error uploading images:", message);
      toast({
        title: "Image upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
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
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/products">Products</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Add Product</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <form className="flex-1 space-y-6 p-4 md:p-6" onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl font-bold">Add New Product</h2>
              <p className="text-muted-foreground">
                Create a new product in your inventory
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Product
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Product Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the basic details of your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Product Name</Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedCategory}
                          onValueChange={handleCategoryChange}
                          disabled={isLoadingCategories}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue
                              placeholder={
                                isLoadingCategories
                                  ? "Loading product names..."
                                  : "Select Product Name"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map((category) => (
                              <SelectItem
                                key={category._id}
                                value={category.name}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" type="button">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Custom Product Name</DialogTitle>
                              <DialogDescription>
                                Create a new product name for your products
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Input
                                placeholder="Enter product name"
                                value={customCategory}
                                onChange={(e) =>
                                  setCustomCategory(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleCustomCategory()
                                }
                              />
                              <Button
                                className="w-full"
                                onClick={handleCustomCategory}
                                disabled={
                                  !customCategory.trim() || isCreatingCategory
                                }
                                type="button"
                              >
                                {isCreatingCategory ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    Create Product Name
                                  </>
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Design Number</Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={handleInput}
                      placeholder="Enter design number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={handleUnitChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="METERS">Meters</SelectItem>
                        <SelectItem value="SETS">Sets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter product description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInput}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      Add different colors and their pricing
                    </CardDescription>
                  </div>
                  <Button onClick={addVariant} size="sm" type="button">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex gap-4 items-end p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Select
                          value={variant.color}
                          onValueChange={(val) => updateVariant(index, "color", val)}
                          disabled={isLoadingColors}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={isLoadingColors ? "Loading colors..." : "Select Color"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" type="button">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Color</DialogTitle>
                              <DialogDescription>Create a new color for variants</DialogDescription>
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
                                type="button"
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
                    <div className="flex-1 space-y-2">
                      <Label>Price per {unit}</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={variant.price}
                        onChange={(e) =>
                          updateVariant(index, "price", e.target.value)
                        }
                        min="0.01"
                        step="any"
                      />
                    </div>
                    {variants.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeVariant(index)}
                        className="text-red-600"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>
                  Upload product images (up to 5 images)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer bg-transparent"
                      disabled={isUploading}
                      onClick={triggerFileInput}
                    >
                      {isUploading ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Images
                        </>
                      )}
                    </Button>
                  </div>

                  {productImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {productImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Add tags to help categorize your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Available Tags</Label>
                  {isLoadingTags ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading tags...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTags
                        .filter((tag) => !selectedTags.includes(tag.name))
                        .map((tag) => (
                          <Badge
                            key={tag._id}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => addTag(tag.name)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {tag.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      type="button"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Add Custom Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Tag</DialogTitle>
                      <DialogDescription>
                        Create a new tag for this product
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter tag name"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCustomTag()
                        }
                      />
                      <Button
                        className="w-full"
                        onClick={handleCustomTag}
                        disabled={!customTag.trim() || isCreatingTag}
                        type="button"
                      >
                        {isCreatingTag ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Tag className="h-4 w-4 mr-2" />
                            Create Tag
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Stock Information */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Information</CardTitle>
                <CardDescription>Inventory and stock details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumStock">Minimum Stock Level</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    placeholder="0"
                    value={formData.stockInfo.minimumStock}
                    onChange={handleStockInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    placeholder="0"
                    value={formData.stockInfo.reorderPoint}
                    onChange={handleStockInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageLocation">Storage Location</Label>
                  <Input
                    id="storageLocation"
                    placeholder="Warehouse section"
                    value={formData.stockInfo.storageLocation}
                    onChange={handleStockInfo}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Variants
                  </span>
                  <span className="font-medium">{variants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Images</span>
                  <span className="font-medium">{productImages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <span className="font-medium">{selectedTags.length}</span>
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
          </div>
        </div>
      </form>
    </SidebarInset>
  );
}

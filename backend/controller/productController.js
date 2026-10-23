import Product from "../models/productSchema.js";
import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Order from "../models/orderSchema.js";
import Stock from "../models/stockScehma.js"; // Added Stock import
import Adjustment from "../models/adjustmentSchema.js"; // Added Adjustment import
import Category from "../models/category.js";
import Tag from "../models/tag.js";
import Color from "../models/color.js";
import mongoose from "mongoose";

export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const newProduct = new Product(productData);
    await newProduct.save();


    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const populatedProduct = await Product.findById(newProduct._id).populate("category", "name");

      const messageText = `🆕 New product added!\n\n📦 Product: *${populatedProduct.productName}*\n🆔 SKU: ${populatedProduct.sku}\n📂 Category: ${populatedProduct.category.name}\n\nView details: ${process.env.CLIENT_URL}/products/${populatedProduct._id}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (createProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount, // or dynamically get from your admin list
        status,
      });
    }

    res.status(201).json({
      success: true,
      message: "Product Created Successfully!",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error Creating Product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const searchTerm = (req.query.search || "").trim();
    const skip = (page - 1) * limit;

    // Build search filter
    const filter = searchTerm
      ? {
          $or: [
            { productName: { $regex: searchTerm, $options: "i" } },
            { categoryName: { $regex: searchTerm, $options: "i" } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .populate("tags", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const formattedProducts = products.map((p) => ({
      _id: p._id,
      productName: p.productName,
      category: p.category?.name || "",
      tags: p.tags?.map((t) => t.name) || [],
      variants: p.variants || [],
      images: p.images || [],
      isActive: p.isActive !== false,
    }));

    res.status(200).json({
      success: true,
      products: formattedProducts,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Sorting
    const sort = req.query.sort || "-createdAt";
    let sortObj = {};
    if (sort === "-createdAt") sortObj = { createdAt: -1 };
    else if (sort === "createdAt") sortObj = { createdAt: 1 };
    else if (sort === "-updatedAt") sortObj = { updatedAt: -1 };
    else if (sort === "updatedAt") sortObj = { updatedAt: 1 };
    else if (sort === "productName") sortObj = { productName: 1 };
    else if (sort === "-productName") sortObj = { productName: -1 };

    // Filters
    const searchTerm = req.query.search || "";
    const categoryName = req.query.category || "";
    const status = req.query.status || "";
    const tagsParam = req.query.tags || ""; // comma-separated tag names

    // Build query object
    const query = {};

    // Search by product name (case-insensitive)
    if (searchTerm) {
      query.productName = { $regex: searchTerm, $options: "i" };
    }

    // Category filter - find category ObjectId by name first
    if (categoryName && categoryName !== "all") {
      const category = await Category.findOne({ name: categoryName }).lean();
      if (category) {
        query.category = category._id;
      } else {
        // Category doesn't exist, return empty results
        return res.status(200).json({
          success: true,
          products: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }
    }

    // Status filter
    if (status && status !== "all") {
      query.isActive = status === "active";
    }

    // Tags filter - find tag ObjectIds by names first
    if (tagsParam) {
      const tagNamesArray = tagsParam.split(",").filter(Boolean);
      if (tagNamesArray.length > 0) {
        const foundTags = await Tag.find({ name: { $in: tagNamesArray } }).select("_id").lean();
        if (foundTags.length > 0) {
          const tagIds = foundTags.map(t => t._id);
          query.tags = { $in: tagIds };
        } else {
          // No matching tags found, return empty results
          return res.status(200).json({
            success: true,
            products: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: limit,
              hasNextPage: false,
              hasPrevPage: false,
            },
          });
        }
      }
    }

    // Fetch products + total count
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name")
        .populate("tags", "name")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Transform for frontend
    const formattedProducts = products.map((p) => ({
      _id: p._id,
      productName: p.productName,
      sku: p.sku,
      description: p.description,
      category: p.category?.name || "",
      tags: p.tags?.map((t) => t.name) || [],
      variants: p.variants || [],
      images: p.images || [],
      isActive: p.isActive !== undefined ? p.isActive : true,
      stockInfo: p.stockInfo
        ? {
            minimumStock: p.stockInfo.minimumStock,
            reorderPoint: p.stockInfo.reorderPoint,
            storageLocation: p.stockInfo.storageLocation,
          }
        : undefined,
      unit: p.unit,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    // Response
    return res.status(200).json({
      success: true,
      products: formattedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name")

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const tags = (await Tag.find({ _id: { $in: product.tags } }).select('name')).map(tag => tag.name);
    const category = product.category && typeof product.category === 'object' && 'name' in product.category
      ? product.category.name
      : null;

    const formattedProduct = {
      ...product.toObject(),
      category,
      tags,
    };

    res.status(200).json({ success: true, product, formattedProduct });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};


export const updateProduct = async (req, res) => {
  try {
    // Get the original product to check what changed
    const originalProduct = await Product.findById(req.params.id);
    if (!originalProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Find all stocks related to this product (by product name)
    const relatedStocks = await Stock.find({
      "stockDetails.product": originalProduct.productName
    });


    // Update each related stock with the new product information
    for (const stock of relatedStocks) {
      const updateData = {};

      // Update product name if it changed
      if (originalProduct.productName !== updatedProduct.productName) {
        updateData["stockDetails.product"] = updatedProduct.productName;
      }

      // Update variants if they changed
      if (JSON.stringify(originalProduct.variants) !== JSON.stringify(updatedProduct.variants)) {
        // Only update color information; preserve existing quantities in stock
        // Build a map of existing quantities by color
        const existingQuantities = new Map();
        for (const v of stock.variants || []) {
          existingQuantities.set((v.color || '').toLowerCase(), v.quantity);
        }
        const updatedVariants = updatedProduct.variants.map(productVariant => ({
          color: productVariant.color,
          quantity: existingQuantities.get((productVariant.color || '').toLowerCase()) || 0,
          unit: updatedProduct.unit || "METERS"
        }));

        updateData.variants = updatedVariants;
      }

      // Update unit if it changed
      if (originalProduct.unit !== updatedProduct.unit) {
        updateData.unit = updatedProduct.unit;
      }

      // Update category if it changed (store in additional info or stock details)
      if (originalProduct.category !== updatedProduct.category) {
        updateData["stockDetails.category"] = updatedProduct.category;
      }

      // Update description if it changed
      if (originalProduct.description !== updatedProduct.description) {
        updateData["stockDetails.description"] = updatedProduct.description;
      }

      // Update tags if they changed
      if (JSON.stringify(originalProduct.tags) !== JSON.stringify(updatedProduct.tags)) {
        updateData["stockDetails.tags"] = updatedProduct.tags;
      }

      // Update SKU if it changed
      if (originalProduct.sku !== updatedProduct.sku) {
        updateData["stockDetails.sku"] = updatedProduct.sku;
      }

      // Update stock info if it changed
      if (JSON.stringify(originalProduct.stockInfo) !== JSON.stringify(updatedProduct.stockInfo)) {
        updateData["stockDetails.stockInfo"] = updatedProduct.stockInfo;
      }

      // Update images if they changed
      if (JSON.stringify(originalProduct.images) !== JSON.stringify(updatedProduct.images)) {
        updateData["stockDetails.images"] = updatedProduct.images;
      }

      // Apply updates if there are any changes
      if (Object.keys(updateData).length > 0) {
        await Stock.updateOne(
          { _id: stock._id },
          { $set: updateData }
        );
      } else {
      }
    }

    // Also update orders if product name changed
    if (originalProduct.productName !== updatedProduct.productName) {
      const orderUpdateResult = await Order.updateMany(
        { "orderItems.product": originalProduct.productName },
        { $set: { "orderItems.$[elem].product": updatedProduct.productName } },
        {
          arrayFilters: [{ "elem.product": originalProduct.productName }],
          multi: true
        }
      );

      // Update adjustments
      const adjustmentUpdateResult = await Adjustment.updateMany(
        { "product": originalProduct.productName },
        { $set: { "product": updatedProduct.productName } }
      );
    }


    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const populatedProduct = await Product.findById(updatedProduct._id).populate("category", "name");
      const messageText = `✏️ Product Updated!\n\n📦 Product: *${updatedProduct.productName}*\n🆔 SKU: ${updatedProduct.sku}\n📂 Category: ${populatedProduct.category.name}\n\nCheck the changes here: ${process.env.CLIENT_URL}/products/${updatedProduct._id}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (updateProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Product updated successfully. ${relatedStocks.length} related stocks synchronized.`,
      product: updatedProduct,
      stocksUpdated: relatedStocks.length
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let productUpdatesEnabled = false;
    if (notificationSettings) {
      productUpdatesEnabled = notificationSettings.productUpdates;
    }

    /** 📲 WhatsApp Notification **/
    if (productUpdatesEnabled) {
      const populatedProduct = await Product.findById(deleteProduct._id).populate("category", "name");

      const messageText = `🗑️ Product Deleted!\n\n📦 Product: *${deletedProduct.productName}*\n🆔 SKU: ${deletedProduct.sku}\n📂 Category: ${populatedProduct.category.name}`;

      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (deleteProduct):", whatsAppError);
        status = "Not Delivered";
      }

      // Save message log
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

// Get top 5 products based on revenue and quantity sold
export const getTopProducts = async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product", // product name string
          quantity: { $sum: "$orderItems.quantity" },
          revenue: {
            $sum: {
              $multiply: [
                "$orderItems.quantity",
                "$orderItems.pricePerMeters"
              ]
            }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "productName",
          as: "productInfo"
        }
      },
      {
        $project: {
          name: "$_id",
          revenue: 1,
          quantity: 1
          // No growth field here
        }
      }
    ];

    const data = await Order.aggregate(pipeline);

    const topProducts = data.map((product) => ({
      name: product.name,
      revenue: product.revenue,
      quantity: product.quantity
      // growth removed
    }));

    res.status(200).json(topProducts);
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// GET recent orders for a particular product
export const getRecentOrdersByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;


    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Find the product name from Product collection
    const product = await Product.findById(productId).select("productName");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }


    // Debug: Get all unique product names from orders
    const allOrders = await Order.find().lean();
    const allProductNames = new Set();
    allOrders.forEach(order => {
      order.orderItems.forEach(item => {
        allProductNames.add(item.product);
      });
    });

    // Check for exact match first
    const exactMatchOrders = await Order.find({
      "orderItems.product": product.productName
    }).lean();

    // Check for partial matches (in case product was renamed)
    const partialMatchOrders = await Order.find({
      "orderItems.product": { $regex: new RegExp(product.productName.split(' ')[0], 'i') }
    }).lean();

    // Use exact matches if available, otherwise use partial matches
    let orders = exactMatchOrders;
    if (orders.length === 0 && partialMatchOrders.length > 0) {
      orders = partialMatchOrders;
    }

    // Sort by order date and limit
    orders = orders
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, limit);


    return res.status(200).json({
      success: true,
      product: product.productName,
      recentOrders: orders.map(order => {
        // Format order ID as ORD-XXX where XXX is a number
        const orderId = order._id.toString();
        // Extract only numeric digits from the ID
        const numericChars = orderId.replace(/[^0-9]/g, '');
        // Use the last 3 digits, or pad with zeros if less than 3 digits
        const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
        const formattedOrderId = `ORD-${lastThreeDigits}`;

        return {
          orderId: formattedOrderId,
          originalId: order._id, // Keep original ID for reference
          customer: order.customer,
          status: order.status,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          items: order.orderItems.filter(item =>
            item.product === product.productName ||
            item.product.toLowerCase().includes(product.productName.toLowerCase().split(' ')[0])
          )
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching recent orders by product:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Controller to get all product names
export const getAllProductNames = async (req, res) => {
  try {
    const products = await Product.find({}, 'productName'); // Only fetch the productName field
    const productNames = products.map(product => product.productName);
    res.status(200).json({ productNames });
  } catch (error) {
    console.error('Error fetching product names:', error);
    res.status(500).json({ message: 'Server Error: Unable to fetch product names.' });
  }
};

// Utility function to fix orders for renamed products (run this once to fix existing data)
export const fixOrdersForRenamedProducts = async (req, res) => {
  try {

    // Get all products
    const products = await Product.find({}, 'productName');

    // Get all orders
    const orders = await Order.find().lean();

    let totalUpdated = 0;

    // For each order, check if any product names need updating
    for (const order of orders) {
      for (const item of order.orderItems) {
        // Check if this product name exists in products collection
        const productExists = products.some(p => p.productName === item.product);

        if (!productExists) {
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Checked ${orders.length} orders. Found ${totalUpdated} items that need attention.`,
      totalOrders: orders.length,
      totalUpdated
    });

  } catch (error) {
    console.error('Error fixing orders for renamed products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fix orders for renamed products.',
      error: error.message
    });
  }
};

// Utility function to fix data inconsistencies between products and stocks
export const fixProductStockInconsistencies = async (req, res) => {
  try {

    // Get all products
    const products = await Product.find({}, 'productName _id');
    const productNames = products.map(p => p.productName);

    // Get all stocks
    const stocks = await Stock.find().lean();

    let totalFixed = 0;
    let inconsistencies = [];

    // Check each stock for inconsistencies
    for (const stock of stocks) {
      const stockProductName = stock.stockDetails?.product;

      if (stockProductName && !productNames.includes(stockProductName)) {
        inconsistencies.push({
          stockId: stock._id,
          stockType: stock.stockType,
          productName: stockProductName,
          issue: "Product name not found in products collection"
        });

        // Try to find a similar product name (basic matching)
        const similarProduct = products.find(p =>
          p.productName.toLowerCase().includes(stockProductName.toLowerCase().split(' ')[0]) ||
          stockProductName.toLowerCase().includes(p.productName.toLowerCase().split(' ')[0])
        );

        if (similarProduct) {

          // Update the stock
          await Stock.updateOne(
            { _id: stock._id },
            { $set: { "stockDetails.product": similarProduct.productName } }
          );

          totalFixed++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Fixed ${totalFixed} inconsistencies out of ${inconsistencies.length} found.`,
      totalStocks: stocks.length,
      totalFixed,
      inconsistencies: inconsistencies.slice(0, 10) // Show first 10 for reference
    });

  } catch (error) {
    console.error('Error fixing product-stock inconsistencies:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fix product-stock inconsistencies.',
      error: error.message
    });
  }
};

// Utility function to sync all stocks with their current product data
export const syncAllStocksWithProducts = async (req, res) => {
  try {

    // Get all products
    const products = await Product.find();
    const productsByName = {};
    products.forEach(p => {
      productsByName[p.productName] = p;
    });

    // Get all stocks
    const stocks = await Stock.find();

    let totalSynced = 0;
    let totalSkipped = 0;
    let errors = [];

    for (const stock of stocks) {
      try {
        const stockProductName = stock.stockDetails?.product;

        if (!stockProductName) {
          totalSkipped++;
          continue;
        }

        const product = productsByName[stockProductName];

        if (!product) {
          totalSkipped++;
          continue;
        }

        // Prepare update data
        const updateData = {
          "stockDetails.product": product.productName,
          "stockDetails.category": product.category,
          "stockDetails.description": product.description,
          "stockDetails.tags": product.tags,
          "stockDetails.sku": product.sku,
          "stockDetails.stockInfo": product.stockInfo,
          "stockDetails.images": product.images,
          "unit": product.unit
        };

        // Update variants to match product variants (but keep existing quantities)
        const updatedVariants = product.variants.map(productVariant => {
          // Find existing stock variant with same color
          const existingVariant = stock.variants.find(sv => sv.color === productVariant.color);
          return {
            color: productVariant.color,
            quantity: existingVariant ? existingVariant.quantity : 0, // Keep existing quantity
            unit: product.unit || "METERS"
          };
        });

        updateData.variants = updatedVariants;

        // Apply updates
        await Stock.updateOne(
          { _id: stock._id },
          { $set: updateData }
        );

        totalSynced++;

      } catch (error) {
        console.error(`❌ Error syncing stock ${stock._id}:`, error);
        errors.push({
          stockId: stock._id,
          error: error.message
        });

      }
    }

    res.status(200).json({
      success: true,
      message: `Sync completed. ${totalSynced} stocks synced, ${totalSkipped} skipped.`,
      totalStocks: stocks.length,
      totalSynced,
      totalSkipped,
      errors: errors.slice(0, 10) // Show first 10 errors
    });

  } catch (error) {
    console.error('Error syncing stocks with products:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to sync stocks with products.',
      error: error.message
    });
  }
}

// category controllers
// Create Category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }

    const categoryExists = await Category.findOne({ name: name.trim() });
    if (categoryExists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name: name.trim() });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body; // expecting an array of category IDs (strings)

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ message: "No category IDs provided" });
    }

    // Convert to ObjectIds for querying
    const objectIds = categoryIds.map((id) => new mongoose.Types.ObjectId(id));

    // Find categories that are referenced by products
    const usedCategories = await Product.distinct("category", {
      category: { $in: objectIds },
    });

    // Normalize both sides to strings
    const usedCategoryIds = usedCategories.map((id) => id.toString());
    const deletableCategories = categoryIds.filter(
      (id) => !usedCategoryIds.includes(id)
    );

    // Perform deletion
    const result = await Category.deleteMany({ _id: { $in: deletableCategories } });

    res.status(200).json({
      message: "Category deletion completed",
      deletedCount: result.deletedCount,
      skipped: usedCategoryIds, // categories not deleted because they are in use
    });
  } catch (error) {
    console.error("Error deleting categories:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Tags based controllers
// Create Tag
export const createTag = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Tag name is required" });
    }

    const tagExists = await Tag.findOne({ name: name.trim() });
    if (tagExists) {
      return res.status(400).json({ message: "Tag already exists" });
    }

    const tag = await Tag.create({ name: name.trim() });

    res.status(201).json({
      message: "Tag created successfully",
      tag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ success: true, message: "Server error" });
  }
};

// Get Tags
export const getTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 }); // Sort alphabetically by name
    res.status(200).json({ success: true, tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteTags = async (req, res) => {
  try {
    const { tagIds } = req.body; // expecting an array of tag IDs (strings)

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({ message: "No tag IDs provided" });
    }

    // Convert to ObjectIds for querying
    const objectIds = tagIds.map((id) => new mongoose.Types.ObjectId(id));

    // Find tags currently used in products
    const usedTags = await Product.distinct("tags", {
      tags: { $in: objectIds },
    });

    // Normalize everything to string for comparison
    const usedTagIds = usedTags.map((id) => id.toString());
    const deletableTags = tagIds.filter((id) => !usedTagIds.includes(id));

    // Delete only safe tags
    const result = await Tag.deleteMany({ _id: { $in: deletableTags } });

    res.status(200).json({
      message: "Tag deletion completed",
      deletedCount: result.deletedCount,
      skipped: usedTagIds, // these were in use, not deleted
    });
  } catch (error) {
    console.error("Error deleting tags:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Colors controllers
export const createColor = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Color name is required" });
    }
    const existing = await Color.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Color already exists" });
    }
    const color = await Color.create({ name: name.trim() });
    res.status(201).json({ message: "Color created successfully", color });
  } catch (error) {
    console.error("Error creating color:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getColors = async (req, res) => {
  try {
    const colors = await Color.find().sort({ name: 1 });
    res.status(200).json({ success: true, colors });
  } catch (error) {
    console.error("Error fetching colors:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteColors = async (req, res) => {
  try {
    const { colorIds } = req.body;
    if (!Array.isArray(colorIds) || colorIds.length === 0) {
      return res.status(400).json({ message: "No color IDs provided" });
    }
    // Colors are not referenced elsewhere; safe delete directly
    const result = await Color.deleteMany({ _id: { $in: colorIds } });
    res.status(200).json({
      message: "Color deletion completed",
      deletedCount: result.deletedCount,
      skipped: [],
    });
  } catch (error) {
    console.error("Error deleting colors:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getProductStats = async (req, res) => {
  try {
    // Fetch all products
    const products = await Product.find().populate("category", "name");

    if (!products.length) {
      return res.json({
        success: true,
        stats: {
          totalProducts: 0,
          activeProducts: 0,
          inactiveProducts: 0,
          totalVariants: 0,
          totalStockInMeters: 0,
          totalStockInSets: 0,
          categories: [],
        },
      });
    }

    // Compute Stats
    let totalVariants = 0;
    let totalStockInMeters = 0;
    let totalStockInSets = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    const categorySummary = {};

    products.forEach((product) => {
      const variantCount = product.variants?.length || 0;
      totalVariants += variantCount;

      // Calculate total stock per product based on unit
      if (product.unit === "METERS") {
        const meters = product.variants.reduce(
          (sum, v) => sum + (v.stockInMeters || 0),
          0
        );
        totalStockInMeters += meters;
      } else if (product.unit === "SETS") {
        const sets = product.variants.reduce(
          (sum, v) => sum + (v.stockInSets || 0),
          0
        );
        totalStockInSets += sets;
      }

      // Active / Inactive
      if (product.isActive) activeCount++;
      else inactiveCount++;

      // Category breakdown
      const categoryName =
        typeof product.category === "object"
          ? product.category.name
          : product.category;
      categorySummary[categoryName] = (categorySummary[categoryName] || 0) + 1;
    });

    // Format response
    const stats = {
      totalProducts: products.length,
      activeProducts: activeCount,
      inactiveProducts: inactiveCount,
      totalVariants,
      totalStockInMeters: totalStockInMeters.toFixed(2),
      totalStockInSets: totalStockInSets.toFixed(2),
      categories: Object.entries(categorySummary).map(([name, count]) => ({
        name,
        count,
      })),
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error("❌ Error fetching product stats:", err);
    res.status(500).json({
      success: false,
      message: "Server Error while computing product statistics",
    });
  }
};
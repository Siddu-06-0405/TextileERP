import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Stock from "../models/stockScehma.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Order from "../models/orderSchema.js";
import Product from "../models/productSchema.js";
import { logStockAction } from "./stockLogsController.js";

export const createStock = async (req, res) => {
  try {
    const { stockType, status, variants, stockDetails, addtionalInfo } = req.body;

    // Validate required fields with specific messages
    const missingFields = [];

    if (!stockType) missingFields.push("Stock Type");
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      missingFields.push("Variants (at least one variant required)");
    } else {
      // Validate each variant
      variants.forEach((variant, index) => {
        if (!variant.color) missingFields.push(`Variant ${index + 1} Color`);
        if (!variant.quantity || variant.quantity <= 0) missingFields.push(`Variant ${index + 1} Quantity`);
        if (!variant.unit) missingFields.push(`Variant ${index + 1} Unit`);
      });
    }

    if (!stockDetails) {
      missingFields.push("Stock Details");
    } else {
      // Validate stock details based on stock type
      if (stockType === "Gray Stock") {
        if (!stockDetails.product) missingFields.push("Product (for Gray Stock)");
        if (!stockDetails.factory) missingFields.push("Factory (for Gray Stock)");
        if (!stockDetails.agent) missingFields.push("Agent (for Gray Stock)");
        if (!stockDetails.orderNumber) missingFields.push("Order Number (for Gray Stock)");
      } else if (stockType === "Factory Stock") {
        if (!stockDetails.product) missingFields.push("Product (for Factory Stock)");
        if (!stockDetails.processingFactory) missingFields.push("Processing Factory (for Factory Stock)");
        if (!stockDetails.processingStage) missingFields.push("Processing Stage (for Factory Stock)");
        if (!stockDetails.expectedCompletion) missingFields.push("Expected Completion Date (for Factory Stock)");
      } else if (stockType === "Design Stock") {
        if (!stockDetails.product) missingFields.push("Product (for Design Stock)");
      }
    }

    // Additional info is optional for most flows; validate only if provided
    if (addtionalInfo) {
      if (addtionalInfo.batchNumber !== undefined && addtionalInfo.batchNumber === "") missingFields.push("Batch Number");
      if (addtionalInfo.qualityGrade !== undefined && addtionalInfo.qualityGrade === "") missingFields.push("Quality Grade");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields: missingFields
      });
    }

    // Validate that the product is active
    if (stockDetails && stockDetails.product) {
      const product = await Product.findOne({ productName: stockDetails.product });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      if (product.isActive === false) {
        return res.status(400).json({
          success: false,
          message: "Cannot add stock for inactive products. Please activate the product first."
        });
      }
    }

    // Check for duplicate colors within the same payload
    {
      const colorSet = new Set();
      const dupInPayload = new Set();
      for (const v of variants) {
        const key = (v.color || '').trim().toLowerCase();
        if (colorSet.has(key)) dupInPayload.add(v.color);
        colorSet.add(key);
      }
      if (dupInPayload.size > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate colors in request: ${Array.from(dupInPayload).join(', ')}. Each color must appear only once per stock item.`,
        });
      }
    }

    // Check for duplicate stocks (same product and color combination) limited to the SAME stock category
    const duplicateVariants = [];

    for (const variant of variants) {
      const existingStock = await Stock.findOne({
        stockType: stockType, // category-specific validation
        "stockDetails.product": stockDetails.product,
        "variants.color": variant.color
      });

      if (existingStock) {
        duplicateVariants.push(variant.color);
      }
    }

    // If duplicates found, return error
    // if (duplicateVariants.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Duplicate stock detected! The following variants already exist for ${stockDetails.product} in ${stockType}: ${duplicateVariants.join(", ")}. Please use the Edit option to increase quantities.`,
    //     duplicateVariants: duplicateVariants
    //   });
    // }

    // Implement stock flow logic: Gray → Factory
    // Design Stock is independent and should NOT deduct from Factory Stock
    if (stockType === "Factory Stock") {
      const sourceStockType = "Gray Stock";

      // Check if source stock exists and has sufficient quantity
      for (const variant of variants) {
        const sourceStock = await Stock.findOne({
          stockType: sourceStockType,
          "stockDetails.product": stockDetails.product,
          "variants.color": variant.color
        });

        if (!sourceStock) {
          return res.status(400).json({
            success: false,
            message: `No ${sourceStockType} found for ${stockDetails.product} - ${variant.color}. Please add ${sourceStockType} first.`
          });
        }

        // Find the specific variant in source stock
        const sourceVariant = sourceStock.variants.find(v => v.color === variant.color);
        if (!sourceVariant) {
          return res.status(400).json({
            success: false,
            message: `Color ${variant.color} not found in ${sourceStockType} for ${stockDetails.product}.`
          });
        }

        // Check if source has sufficient quantity
        if (sourceVariant.quantity < variant.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient ${sourceStockType} quantity. Available: ${sourceVariant.quantity} ${sourceVariant.unit}, Required: ${variant.quantity} ${variant.unit} for ${stockDetails.product} - ${variant.color}.`
          });
        }
      }

      // Deduct quantities from source stock (only for Factory Stock)
      for (const variant of variants) {
        const sourceStock = await Stock.findOne({
          stockType: sourceStockType,
          "stockDetails.product": stockDetails.product,
          "variants.color": variant.color
        });

        if (sourceStock) {
          const sourceVariantIndex = sourceStock.variants.findIndex(v => v.color === variant.color);
          if (sourceVariantIndex >= 0) {
            // Deduct the quantity
            sourceStock.variants[sourceVariantIndex].quantity -= variant.quantity;

            // Update status based on new quantity
            const newQuantity = sourceStock.variants[sourceVariantIndex].quantity;
            if (newQuantity <= 0) {
              sourceStock.variants[sourceVariantIndex].status = "out";
            } else if (newQuantity <= 10) {
              sourceStock.variants[sourceVariantIndex].status = "low";
            } else {
              sourceStock.variants[sourceVariantIndex].status = "available";
            }

            // Save the updated source stock
            await sourceStock.save();

            console.log(`Deducted ${variant.quantity} ${variant.unit} from ${sourceStockType} for ${stockDetails.product} - ${variant.color}. Remaining: ${newQuantity} ${variant.unit}`);
          }
        }
      }
    }

    // Merge behavior: if a stock exists for the same stockType and product, merge variants by color
    let newStock;
    const targetExistingStock = await Stock.findOne({
      stockType,
      "stockDetails.product": stockDetails.product,
    });
    const oldVariants = targetExistingStock ? targetExistingStock.variants.map(v => v.toObject()) : [];

    if (targetExistingStock) {
      // Build a map for quick lookup of existing colors (case-insensitive compare)
      const existingIndexByColor = new Map();
      targetExistingStock.variants.forEach((v, idx) => {
        const key = (v.color || "").trim().toLowerCase();
        existingIndexByColor.set(key, idx);
      });

      for (const incoming of variants) {
        const key = (incoming.color || "").trim().toLowerCase();
        if (existingIndexByColor.has(key)) {
          const idx = existingIndexByColor.get(key);
          // Increase quantity of existing variant; keep existing unit as source of truth
          targetExistingStock.variants[idx].quantity += incoming.quantity;
        } else {
          // Add new color variant
          targetExistingStock.variants.push({
            color: incoming.color,
            quantity: incoming.quantity,
            unit: incoming.unit,
          });
          existingIndexByColor.set(key, targetExistingStock.variants.length - 1);
        }
      }

      // Save merged stock
      await targetExistingStock.save();
      newStock = targetExistingStock;

      // console.log("old variants", oldVariants);
      await logStockAction({
        action: "merged",
        stockType: targetExistingStock.stockType,
        product: targetExistingStock.stockDetails.product,
        status: targetExistingStock.status,
        variants: targetExistingStock.variants,
        details: { ...targetExistingStock.stockDetails, ...targetExistingStock.addtionalInfo },
        notes: "Stock merged successfully",
        previousVariants: oldVariants
      });
    } else {
      newStock = await Stock.create({
        stockType,
        status: status || "available",
        variants,
        stockDetails,
        addtionalInfo,
      });

      await logStockAction({
        action: "created",
        stockType: newStock.stockType,
        product: stockDetails.product,
        status: newStock.status,
        variants: newStock.variants,
        details: { ...stockDetails, ...addtionalInfo },
        notes: "New stock created",
        previousVariants: []
      });
    }

    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `📦 New Stock Added!\n\n🏷 Stock Type: ${newStock.stockType}\n📋 Status: ${newStock.status}\n🎨 Variants: ${newStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/stock/${newStock._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (createStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock added successfully!",
      stock: newStock,
    });
  } catch (error) {
    console.error("Stock Creation Error:", error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry found",
        field: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


export const getAllStocks = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Sorting
    const sort = req.query.sort || "-createdAt";
    let sortObj = {};
    if (sort === "-createdAt") sortObj = { createdAt: -1 };
    else if (sort === "createdAt") sortObj = { createdAt: 1 };
    else if (sort === "-updatedAt") sortObj = { updatedAt: -1 };
    else if (sort === "updatedAt") sortObj = { updatedAt: 1 };

    // Filters
    const searchTerm = req.query.search || "";
    const stockType = req.query.stockType;
    const status = req.query.status || "";

    // Build query filter
    const filter = {};

    // Stock type filter
    if (stockType && stockType !== "all") {
      filter.stockType = stockType;
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Search filter - search across product names and other fields
    if (searchTerm) {
      // First, find products that match the search term
      const matchingProducts = await Product.find({
        productName: { $regex: searchTerm, $options: "i" },
      }).select("productName").lean();

      const productNames = matchingProducts.map(p => p.productName);

      // Build search conditions
      const searchConditions = [
        { "stockDetails.product": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.factory": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.agent": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.orderNumber": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.processingFactory": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.processingStage": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.design": { $regex: searchTerm, $options: "i" } },
        { "stockDetails.warehouse": { $regex: searchTerm, $options: "i" } },
        { "variants.color": { $regex: searchTerm, $options: "i" } },
        { status: { $regex: searchTerm, $options: "i" } },
      ];

      // Add product name matches to search conditions
      if (productNames.length > 0) {
        searchConditions.push({ "stockDetails.product": { $in: productNames } });
      }

      filter.$or = searchConditions;
    }

    // Fetch stocks + total count
    const [stocks, total] = await Promise.all([
      Stock.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Stock.countDocuments(filter),
    ]);

    // Validate products exist and enrich stock data
    const enrichedStocks = await Promise.all(
      stocks.map(async (stock) => {
        const stockObj = { ...stock };
        const productName = stockObj.stockDetails?.product;

        if (productName) {
          const productExists = await Product.findOne({
            productName: productName,
            isActive: true,
          }).select("_id sku category images productName").populate("category", "name");

          stockObj.productExists = !!productExists;

          if (productExists) {
            stockObj.productDetails = {
              _id: productExists._id,
              sku: productExists.sku,
              category: productExists.category?.name || "",
              images: productExists.images,
              productName: productExists.productName,
            };

            // 💡 Optionally merge into stockDetails for direct use in frontend
            if (!stockObj.stockDetails.images || stockObj.stockDetails.images.length === 0) {
              stockObj.stockDetails.images = productExists.images || [];
            }
          } else {
            stockObj.productDetails = null;
          }
        } else {
          stockObj.productExists = false;
          stockObj.productDetails = null;
        }

        return stockObj;
      })
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      stocks: enrichedStocks,
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
    console.error("❌ Error fetching stocks:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getDesignStocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { stockType: "Design Stock" };

    const [stocks, total] = await Promise.all([
      Stock.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Stock.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      stocks,
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
    console.error("Error fetching design stocks:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }
    res.status(200).json({
      success: true,
      stock,
    });
  } catch (error) {
    console.error("Error fetching stock by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { stockType, variants, stockDetails, addtionalInfo } = req.body;

    // Validate required fields if they are being updated
    const missingFields = [];

    if (stockType !== undefined && !stockType) missingFields.push("Stock Type");

    if (variants !== undefined) {
      if (!Array.isArray(variants) || variants.length === 0) {
        missingFields.push("Variants (at least one variant required)");
      } else {
        variants.forEach((variant, index) => {
          if (!variant.color) missingFields.push(`Variant ${index + 1} Color`);
          if (!variant.quantity || variant.quantity <= 0) missingFields.push(`Variant ${index + 1} Quantity`);
          if (!variant.unit) missingFields.push(`Variant ${index + 1} Unit`);
        });
      }
    }

    if (stockDetails !== undefined) {
      if (!stockDetails) {
        missingFields.push("Stock Details");
      } else {
        // Validate stock details based on stock type
        const currentStockType = stockType || (await Stock.findById(req.params.id))?.stockType;
        if (currentStockType === "Gray Stock") {
          if (!stockDetails.product) missingFields.push("Product (for Gray Stock)");
          if (!stockDetails.factory) missingFields.push("Factory (for Gray Stock)");
          if (!stockDetails.agent) missingFields.push("Agent (for Gray Stock)");
          if (!stockDetails.orderNumber) missingFields.push("Order Number (for Gray Stock)");
        } else if (currentStockType === "Factory Stock") {
          if (!stockDetails.product) missingFields.push("Product (for Factory Stock)");
          if (!stockDetails.processingFactory) missingFields.push("Processing Factory (for Factory Stock)");
          if (!stockDetails.processingStage) missingFields.push("Processing Stage (for Factory Stock)");
          if (!stockDetails.expectedCompletion) missingFields.push("Expected Completion Date (for Factory Stock)");
        } else if (currentStockType === "Design Stock") {
          if (!stockDetails.product) missingFields.push("Product (for Design Stock)");
        }
      }
    }

    if (addtionalInfo !== undefined) {
      if (addtionalInfo) {
        if (addtionalInfo.batchNumber !== undefined && addtionalInfo.batchNumber === "") missingFields.push("Batch Number");
        if (addtionalInfo.qualityGrade !== undefined && addtionalInfo.qualityGrade === "") missingFields.push("Quality Grade");
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields: missingFields
      });
    }

    // Get current stock to check for quantity changes
    const currentStock = await Stock.findById(req.params.id);
    if (!currentStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const oldVariants = currentStock.variants.map(v => v.toObject());
    // Validate duplicate colors in payload for update
    if (variants && Array.isArray(variants)) {
      const colorSet = new Set();
      const dupInPayload = new Set();
      for (const v of variants) {
        const key = (v.color || '').trim().toLowerCase();
        if (colorSet.has(key)) dupInPayload.add(v.color);
        colorSet.add(key);
      }
      if (dupInPayload.size > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate colors in request: ${Array.from(dupInPayload).join(', ')}. Each color must appear only once per stock item.`,
        });
      }
    }

    // Validate that no other stock in the SAME category and product already has these colors
    if (variants && Array.isArray(variants)) {
      const currentType = currentStock.stockType;
      const productName = currentStock.stockDetails.product;
      const colors = variants.map(v => v.color);
      if (colors.length > 0) {
        const otherStocks = await Stock.find({
          _id: { $ne: currentStock._id },
          stockType: currentType,
          "stockDetails.product": productName,
          "variants.color": { $in: colors }
        }).lean();
        if (otherStocks && otherStocks.length > 0) {
          // Collect overlapping colors
          const overlapping = new Set();
          for (const s of otherStocks) {
            for (const v of s.variants || []) {
              if (colors.includes(v.color)) overlapping.add(v.color);
            }
          }
          // if (overlapping.size > 0) {
          //   return res.status(400).json({
          //     success: false,
          //     message: `Duplicate stock detected in ${currentType} for product ${productName}: ${Array.from(overlapping).join(', ')}. Colors must be unique within the same stock category for a product.`,
          //   });
          // }
        }
      }
    }

    // Implement stock flow validation for quantity changes
    if (variants && (currentStock.stockType === "Factory Stock")) {
      const sourceStockType = "Gray Stock";

      // Check if source stock exists and has sufficient quantity for the new quantities
      for (const variant of variants) {
        const sourceStock = await Stock.findOne({
          stockType: sourceStockType,
          "stockDetails.product": currentStock.stockDetails.product,
          "variants.color": variant.color
        });

        if (!sourceStock) {
          return res.status(400).json({
            success: false,
            message: `No ${sourceStockType} found for ${currentStock.stockDetails.product} - ${variant.color}. Please add ${sourceStockType} first.`
          });
        }

        // Find the specific variant in source stock
        const sourceVariant = sourceStock.variants.find(v => v.color === variant.color);
        if (!sourceVariant) {
          return res.status(400).json({
            success: false,
            message: `Color ${variant.color} not found in ${sourceStockType} for ${currentStock.stockDetails.product}.`
          });
        }

        // Find current variant quantity to calculate the difference
        const currentVariant = currentStock.variants.find(v => v.color === variant.color);
        const currentQuantity = currentVariant ? currentVariant.quantity : 0;
        const newQuantity = variant.quantity;
        const quantityDifference = newQuantity - currentQuantity;

        // Only check if quantity is being increased
        if (quantityDifference > 0) {
          // Check if source has sufficient additional quantity
          if (sourceVariant.quantity < quantityDifference) {
            return res.status(400).json({
              success: false,
              message: `Insufficient ${sourceStockType} quantity for increase. Available: ${sourceVariant.quantity} ${sourceVariant.unit}, Required additional: ${quantityDifference} ${variant.unit} for ${currentStock.stockDetails.product} - ${variant.color}.`
            });
          }
        }
      }
    }

    // Handle quantity adjustments in source stock when quantities are changed
    if (variants && (currentStock.stockType === "Factory Stock")) {
      const sourceStockType = "Gray Stock";

      // Adjust quantities in source stock based on the difference
      for (const variant of variants) {
        const currentVariant = currentStock.variants.find(v => v.color === variant.color);
        const currentQuantity = currentVariant ? currentVariant.quantity : 0;
        const newQuantity = variant.quantity;
        const quantityDifference = newQuantity - currentQuantity;

        // Only adjust if there's a change in quantity
        if (quantityDifference !== 0) {
          const sourceStock = await Stock.findOne({
            stockType: sourceStockType,
            "stockDetails.product": currentStock.stockDetails.product,
            "variants.color": variant.color
          });

          if (sourceStock) {
            const sourceVariantIndex = sourceStock.variants.findIndex(v => v.color === variant.color);
            if (sourceVariantIndex >= 0) {
              // Adjust the quantity (add if decreasing, subtract if increasing)
              sourceStock.variants[sourceVariantIndex].quantity -= quantityDifference;

              // Update status based on new quantity
              const newSourceQuantity = sourceStock.variants[sourceVariantIndex].quantity;
              if (newSourceQuantity <= 0) {
                sourceStock.variants[sourceVariantIndex].status = "out";
              } else if (newSourceQuantity <= 10) {
                sourceStock.variants[sourceVariantIndex].status = "low";
              } else {
                sourceStock.variants[sourceVariantIndex].status = "available";
              }

              // Save the updated source stock
              await sourceStock.save();

              console.log(`Adjusted ${sourceStockType} for ${currentStock.stockDetails.product} - ${variant.color}: ${quantityDifference > 0 ? 'deducted' : 'restored'} ${Math.abs(quantityDifference)} ${variant.unit}. New quantity: ${newSourceQuantity} ${variant.unit}`);
            }
          }
        }
      }
    }

    const updatedStock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    await logStockAction({
      action: "updated",
      stockType: updatedStock.stockType,
      product: updatedStock.stockDetails.product,
      status: updatedStock.status,
      variants: updatedStock.variants,
      details: { ...updatedStock.stockDetails, ...updatedStock.addtionalInfo },
      notes: "Stock updated",
      previousVariants: oldVariants
    });
    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `✏️ Stock Updated!\n\n🏷 Stock Type: ${updatedStock.stockType}\n📋 Status: ${updatedStock.status}\n🎨 Variants: ${updatedStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}\n\nView details: ${process.env.CLIENT_URL}/stock/${updatedStock._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (updateStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      stock: updatedStock,
    });
  } catch (error) {
    console.error("Error updating stock:", error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry found",
        field: Object.keys(error.keyPattern)[0]
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const deleteStock = async (req, res) => {
  try {
    const deletedStock = await Stock.findByIdAndDelete(req.params.id);
    if (!deletedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    await logStockAction({
      action: "Stock deleted",
      stockType: deletedStock.stockType,
      product: deletedStock.stockDetails.product,
      status: deletedStock.status,
      variants: deletedStock.variants,
      details: { ...deletedStock.stockDetails, ...deletedStock.addtionalInfo },
      notes: "Stock deleted",
      previousVariants: deletedStock.variants
    });

    // Restore quantities to source stock when Factory stock is deleted
    if (deletedStock.stockType === "Factory Stock") {
      const sourceStockType = "Gray Stock";

      // Restore quantities to source stock
      for (const variant of deletedStock.variants) {
        const sourceStock = await Stock.findOne({
          stockType: sourceStockType,
          "stockDetails.product": deletedStock.stockDetails.product,
          "variants.color": variant.color
        });

        if (sourceStock) {
          const sourceVariantIndex = sourceStock.variants.findIndex(v => v.color === variant.color);
          if (sourceVariantIndex >= 0) {
            // Restore the quantity
            sourceStock.variants[sourceVariantIndex].quantity += variant.quantity;

            // Update status based on new quantity
            const newQuantity = sourceStock.variants[sourceVariantIndex].quantity;
            if (newQuantity <= 0) {
              sourceStock.variants[sourceVariantIndex].status = "out";
            } else if (newQuantity <= 10) {
              sourceStock.variants[sourceVariantIndex].status = "low";
            } else {
              sourceStock.variants[sourceVariantIndex].status = "available";
            }

            // Save the updated source stock
            await sourceStock.save();

            console.log(`Restored ${variant.quantity} ${variant.unit} to ${sourceStockType} for ${deletedStock.stockDetails.product} - ${variant.color}. New quantity: ${newQuantity} ${variant.unit}`);
          }
        }
      }
    }

    const notificationSettings = await WhatsappNotification.findOne();

    let stockUpdatesEnabled = false;
    if (notificationSettings) {
      stockUpdatesEnabled = notificationSettings.stockAlerts;
    }
    /** 📲 WhatsApp Notification **/
    if (stockUpdatesEnabled) {
      const messageText = `🗑 Stock Deleted!\n\n🏷 Stock Type: ${deletedStock.stockType}\n📋 Status: ${deletedStock.status}\n🎨 Variants: ${deletedStock.variants
        .map(v => `${v.color} (${v.quantity} ${v.unit})`)
        .join(", ")}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (deleteStock):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting stock:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

// Utility: Calculate total stock value (dummy formula)
const calculateStockValue = (stocks) => {
  // Assuming each variant quantity represents "value" in Rs 100 per unit
  return stocks.reduce((total, stock) => {
    const variantsValue = stock.variants.reduce((sum, v) => {
      return sum + (v.quantity * 100); // You can replace 100 with actual price per unit
    }, 0);
    return total + variantsValue;
  }, 0);
};

// Calculate stock turnover

const calculateStockTurnover = async (startDate, endDate) => {
  // 1. Fetch orders in the given period
  const orders = await Order.find({
    orderDate: { $gte: startDate, $lte: endDate }
  });

  // 2. Calculate total sales value (COGS approximation)
  const totalSalesValue = orders.reduce((sum, order) => {
    const orderValue = order.orderItems.reduce((itemSum, item) => {
      return itemSum + (item.quantity * item.pricePerMeters);
    }, 0);
    return sum + orderValue;
  }, 0);

  // 3. Calculate current stock value
  const allStocks = await Stock.find();
  const totalStockValue = calculateStockValue(allStocks); // your existing function

  // 4. Approximate average stock value (current only for now)
  const averageStockValue = totalStockValue || 1; // avoid division by zero

  // 5. Turnover formula
  return (totalSalesValue / averageStockValue).toFixed(2);
};


export const getStockSummary = async (req, res) => {
  try {
    const allStocks = await Stock.find();
    const totalStockValue = calculateStockValue(allStocks);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const today = new Date();

    const stockTurnover = await calculateStockTurnover(startOfMonth, today);

    const lowStockItems = allStocks.filter((stock) =>
      stock.variants.some((v) => v.quantity < 10 && v.quantity > 0)
    ).length;

    const outOfStockItems = allStocks.filter((stock) =>
      stock.variants.every((v) => v.quantity === 0)
    ).length;

    res.json({
      totalStockValue,
      stockTurnover,
      lowStockItems,
      outOfStockItems,
    });
  } catch (error) {
    console.error("Error fetching stock summary:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getStockCategoryBreakdown = async (req, res) => {
  try {
    const breakdown = await Stock.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: "$stockType",
          totalQuantity: { $sum: "$variants.quantity" }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    const colors = {
      "Gray Stock": "#8884d8",
      "Factory Stock": "#82ca9d",
      "Design Stock": "#ffc658"
    };

    const formatted = breakdown.map(item => ({
      name: item._id,
      value: item.totalQuantity,
      fill: colors[item._id] || "#8884d8"
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Stock category breakdown error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getStockMovement = async (req, res) => {
  try {
    // Inbound: from stock creation
    const inboundAgg = await Stock.aggregate([
      { $unwind: "$variants" },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          inbound: { $sum: "$variants.quantity" }
        }
      }
    ]);

    // Outbound: from orders
    const outboundAgg = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: { month: { $month: "$orderDate" } },
          outbound: { $sum: "$orderItems.quantity" }
        }
      }
    ]);

    // Merge results into all months
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = months.map((name, idx) => {
      const inbound = inboundAgg.find(m => m._id.month === idx + 1)?.inbound || 0;
      const outbound = outboundAgg.find(m => m._id.month === idx + 1)?.outbound || 0;
      return {
        month: name,
        inbound,
        outbound,
        net: inbound - outbound
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Stock movement error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper to convert quantity to sets
const quantityToSets = (variants) => {
  return variants.reduce((sum, v) => {
    if (v.unit === "METERS") return sum + v.quantity / 60;
    if (v.unit === "SETS") return sum + v.quantity;
    return sum;
  }, 0);
};

export const getStockCount = async (req, res) => {
  try {
    // Fetch all stocks
    const stocks = await Stock.find();

    // Total stocks count
    const totalStocks = stocks.length;

    // Initialize summary
    const summary = {
      "Gray Stock": 0,
      "Factory Stock": 0,
      "Design Stock": 0,
    };

    // Calculate quantities in sets
    stocks.forEach((stock) => {
      const sets = quantityToSets(stock.variants || []);
      if (summary[stock.stockType] !== undefined) {
        summary[stock.stockType] += sets;
      }
    });

    // Format response
    return res.json({
      success: true,
      totalStocks,
      stocksByType: [
        { type: "Gray Stock", quantity: summary["Gray Stock"].toFixed(2) },
        { type: "Factory Stock", quantity: summary["Factory Stock"].toFixed(2) },
        { type: "Design Stock", quantity: summary["Design Stock"].toFixed(2) },
      ],
      info: "1 set = 60 meters",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
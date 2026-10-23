import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Return from "../models/returnSchema.js";
import Order from "../models/orderSchema.js";
import Stock from "../models/stockScehma.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";


export const createReturn = async (req, res) => {
  try {
    const { order, product, color, quantityInMeters, returnReason } = req.body;

    // Validate required fields with specific messages
    const missingFields = [];
    const validationErrors = [];
    
    if (!order || order.trim() === "") missingFields.push("Order");
    if (!product || product.trim() === "") missingFields.push("Product");
    if (!color || color.trim() === "") missingFields.push("Color");
    if (!quantityInMeters || quantityInMeters <= 0) {
      if (!quantityInMeters) {
        missingFields.push("Quantity in Meters");
      } else {
        validationErrors.push("Quantity must be greater than 0");
      }
    }
    if (!returnReason || returnReason.trim() === "") missingFields.push("Return Reason");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields: missingFields
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: validationErrors
      });
    }

    // Get order details to extract customer name
    const orderDetails = await Order.findById(order);
    if (!orderDetails) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }

    // Generate Return ID
    const returnsCount = await Return.countDocuments();
    const returnId = `RET-${String(returnsCount + 1).padStart(3, "0")}`;

    const newReturn = await Return.create({
      id: returnId,
      order,
      orderId: order,
      customer: orderDetails.customer,
      product,
      color,
      quantityInMeters,
      returnReason,
    });

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
      const messageText = `📦 New Return Request!\n\n🆔 Return ID: *${returnId}*\n👤 Customer: ${orderDetails.customer}\n🛍 Product: ${product}\n🎨 Color: ${color}\n📏 Qty (m): ${quantityInMeters}\n💬 Reason: ${returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (createReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Return request created successfully!",
      return: newReturn,
    });
  } catch (error) {
    console.error("Error while creating return request", error);
    
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

export const getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      returns,
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getReturnById = async (req, res) => {
  try {
    const ret = await Return.findById(req.params.id);
    if (!ret) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }
    res.status(200).json({
      success: true,
      return: ret,
    });
  } catch (error) {
    console.error("Error fetching return by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateReturn = async (req, res) => {
  try {
    const { isApprove, isRejected, order, product, color, quantityInMeters, returnReason, ...otherUpdates } = req.body;
    
    // Validate required fields if they are being updated
    const missingFields = [];
    
    if (order !== undefined && !order) missingFields.push("Order");
    if (product !== undefined && !product) missingFields.push("Product");
    if (color !== undefined && !color) missingFields.push("Color");
    if (quantityInMeters !== undefined && (!quantityInMeters || quantityInMeters <= 0)) missingFields.push("Quantity in Meters");
    if (returnReason !== undefined && !returnReason) missingFields.push("Return Reason");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        missingFields: missingFields
      });
    }
    
    // Get the current return to check if status is changing
    const currentReturn = await Return.findById(req.params.id);
    if (!currentReturn) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

      // If return is being approved, restore stock quantities
      if (isApprove && !currentReturn.isApprove) {
        try {
        // Prefer restoring to the exact stock used in the original order (correct category)
        let stockDoc = null;
        try {
          const orderDoc = await Order.findById(currentReturn.orderId || currentReturn.order);
          const matchingItem = orderDoc?.orderItems?.find((it) => it.product === currentReturn.product && it.color === currentReturn.color);
          if (matchingItem?.stockId) {
            stockDoc = await Stock.findById(matchingItem.stockId);
          }
        } catch {}
        // Fallback: find by product and color if original stockId cannot be resolved
        if (!stockDoc) {
          stockDoc = await Stock.findOne({
            "stockDetails.product": currentReturn.product,
            "variants.color": currentReturn.color
          });
        }
 
        if (stockDoc) {
          // Find the specific color variant
          const variantIndex = stockDoc.variants.findIndex((v) => v.color === currentReturn.color);
          
          if (variantIndex >= 0) {
            const variant = stockDoc.variants[variantIndex];
            const currentQuantity = Number(variant.quantity) || 0;
            const quantityToRestore = Number(currentReturn.quantityInMeters) || 0;

            // Restore the quantity
            stockDoc.variants[variantIndex].quantity = currentQuantity + quantityToRestore;

            // Update stock status based on new quantity
            const newQuantity = stockDoc.variants[variantIndex].quantity;
            if (newQuantity <= 0) {
              stockDoc.variants[variantIndex].status = "out";
            } else if (newQuantity <= 10) {
              stockDoc.variants[variantIndex].status = "low";
            } else {
              stockDoc.variants[variantIndex].status = "available";
            }

            // Save the updated stock
            await stockDoc.save();
            
            console.log(`Stock restored: ${quantityToRestore}m of ${currentReturn.product} - ${currentReturn.color}. New quantity: ${newQuantity}m`);
          } else {
            console.warn(`Color variant not found for ${currentReturn.product} - ${currentReturn.color}`);
          }
        } else {
          console.warn(`Stock not found for product: ${currentReturn.product} - ${currentReturn.color}`);
        }
        } catch (stockError) {
          console.error("Error restoring stock for return:", stockError);
          // Don't fail the return approval if stock restoration fails
          // Just log the error and continue
        }
      }

    // Update the return
    const updatedReturn = await Return.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
             let messageText = "";
       if (isApprove && !currentReturn.isApprove) {
         messageText = `✅ Return Approved!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
       } else if (isRejected && !currentReturn.isRejected) {
        messageText = `❌ Return Rejected!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      } else {
        messageText = `✏️ Return Updated!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      }
      
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (updateReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: isApprove ? "Return approved successfully" : "Return updated successfully",
      return: updatedReturn,
    });
  } catch (error) {
    console.error("Error updating return:", error);
    
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

export const undoReturn = async (req, res) => {
  try {
    const returnId = req.params.id;
    
    // Find the return and check if it's approved or rejected
    const returnItem = await Return.findById(returnId);
    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

    // Check if the return is either approved or rejected
    if (!returnItem.isApprove && !returnItem.isRejected) {
      return res.status(400).json({
        success: false,
        message: "Return is already pending. Cannot undo.",
      });
    }

    // Determine the previous status for the notification message
    const previousStatus = returnItem.isApprove ? "approved" : "rejected";

    // If the return was approved, reverse the stock restoration
    if (returnItem.isApprove) {
      try {
        // Prefer reversing on the exact stock used in the original order (correct category)
        let stockDoc = null;
        try {
          const orderDoc = await Order.findById(returnItem.orderId || returnItem.order);
          const matchingItem = orderDoc?.orderItems?.find((it) => it.product === returnItem.product && it.color === returnItem.color);
          if (matchingItem?.stockId) {
            stockDoc = await Stock.findById(matchingItem.stockId);
          }
        } catch {}
        // Fallback: find by product and color if original stockId cannot be resolved
        if (!stockDoc) {
          stockDoc = await Stock.findOne({
            "stockDetails.product": returnItem.product,
            "variants.color": returnItem.color
          });
        }

        if (stockDoc) {
          // Find the specific color variant
          const variantIndex = stockDoc.variants.findIndex((v) => v.color === returnItem.color);
          
          if (variantIndex >= 0) {
            const variant = stockDoc.variants[variantIndex];
            const currentQuantity = Number(variant.quantity) || 0;
            const quantityToReverse = Number(returnItem.quantityInMeters) || 0;

            // Reverse the stock restoration (subtract the quantity)
            stockDoc.variants[variantIndex].quantity = Math.max(0, currentQuantity - quantityToReverse);

            // Update stock status based on new quantity
            const newQuantity = stockDoc.variants[variantIndex].quantity;
            if (newQuantity <= 0) {
              stockDoc.variants[variantIndex].status = "out";
            } else if (newQuantity <= 10) {
              stockDoc.variants[variantIndex].status = "low";
            } else {
              stockDoc.variants[variantIndex].status = "available";
            }

            // Save the updated stock
            await stockDoc.save();
            
            console.log(`Stock restoration reversed: ${quantityToReverse}m of ${returnItem.product} - ${returnItem.color}. New quantity: ${newQuantity}m`);
          } else {
            console.warn(`Color variant not found for ${returnItem.product} - ${returnItem.color}`);
          }
        } else {
          console.warn(`Stock not found for product: ${returnItem.product} - ${returnItem.color}`);
        }
      } catch (stockError) {
        console.error("Error reversing stock restoration for return:", stockError);
        // Don't fail the return undo if stock reversal fails
        // Just log the error and continue
      }
    }

    // Reset the return to pending status
    const updatedReturn = await Return.findByIdAndUpdate(
      returnId,
      {
        isApprove: false,
        isRejected: false
      },
      { new: true }
    );

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
      const messageText = `↩️ Return Undone!\n\n🆔 Return ID: *${updatedReturn.id}*\n👤 Customer: ${updatedReturn.customer}\n🛍 Product: ${updatedReturn.product}\n🎨 Color: ${updatedReturn.color}\n📏 Qty (m): ${updatedReturn.quantityInMeters}\n💬 Reason: ${updatedReturn.returnReason}\n\nPrevious Status: ${previousStatus}\nNew Status: Pending\n\nView details: ${process.env.CLIENT_URL}/returns/`;
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (undoApprovedReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Return undone successfully. Moved back to pending requests from ${previousStatus} status.`,
      return: updatedReturn,
    });
  } catch (error) {
    console.error("Error undoing return:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const deleteReturn = async (req, res) => {
  try {
    const deletedReturn = await Return.findByIdAndDelete(req.params.id);
    if (!deletedReturn) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let returnRequestsEnabled = false;
    if (notificationSettings) {
      returnRequestsEnabled = notificationSettings.returnRequests;
    }

    /** 📲 WhatsApp Notification **/
    if (returnRequestsEnabled) {
      const messageText = `🗑 Return Deleted!\n\n🆔 Return ID: *${deletedReturn.id}*\n👤 Customer: ${deletedReturn.customer}\n🛍 Product: ${deletedReturn.product}\n🎨 Color: ${deletedReturn.color}\n📏 Qty (m): ${deletedReturn.quantityInMeters}\n💬 Reason: ${deletedReturn.returnReason}`;
      let status = "Delivered";
      try {
        await sendWhatsAppMessage(
          messageText
        );
      } catch (whatsAppError) {
        console.error(
          "WhatsApp Notification Failed (deleteReturn):",
          whatsAppError
        );
        status = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "return_request",
        sentToCount: sentToCount,
        status,
      });
    }

    res.status(200).json({
      success: true,
      message: "Return deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting return:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

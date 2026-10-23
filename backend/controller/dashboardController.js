import Product from "../models/productSchema.js";
import Order from "../models/orderSchema.js";
import Customer from "../models/customerSchema.js";
import Stock from "../models/stockScehma.js";
import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get active orders count (orders that are pending)
    const activeOrders = await Order.countDocuments({
      status: "pending"
    });

    // Get total customers count
    const totalCustomers = await Customer.countDocuments();

    // Get low stock items count
    const lowStockItems = await Stock.countDocuments({ status: "low" });

    // Get completed stock items count (Factory Stock with completed status)
    const completedStockItems = await Stock.countDocuments({ 
      status: "completed",
      stockType: "Factory Stock"
    });

    // Mock change percentages and trends for now
    // In a real application, you would calculate these based on historical data
    const productChange = "+10%";
    const productTrend = "up";
    const orderChange = "+5%";
    const orderTrend = "up";
    const customerChange = "+8%";
    const customerTrend = "up";
    const stockChange = "-2%";
    const stockTrend = "down";

    // Return dashboard statistics
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeOrders,
        totalCustomers,
        lowStockItems,
        completedStockItems,
        productChange,
        productTrend,
        orderChange,
        orderTrend,
        customerChange,
        customerTrend,
        stockChange,
        stockTrend
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error
    });
  }
};

export const getRecentOrders = async (req, res) => {
  try {
    // Get the 5 most recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(5); // Limit to 5 results

    // Format the orders for the frontend
    const formattedOrders = recentOrders.map(order => {
      // Calculate total amount from order items
      const totalAmount = order.orderItems.reduce((sum, item) => {
        return sum + (item.quantity * item.pricePerMeters);
      }, 0);

      // Get the first product from order items for display
      const firstProduct = order.orderItems[0];
      
      // Format order ID as ORD-XXX where XXX is a number
      const orderId = order._id.toString();
      // Extract only numeric digits from the ID
      const numericChars = orderId.replace(/[^0-9]/g, '');
      // Use the last 3 digits, or pad with zeros if less than 3 digits
      const lastThreeDigits = numericChars.slice(-3).padStart(3, '0');
      const formattedId = `ORD-${lastThreeDigits}`;
      
      return {
        id: formattedId,
        originalId: order._id, // Keep original ID for reference
        customer: order.customer,
        product: firstProduct ? firstProduct.product : 'N/A',
        quantity: firstProduct ? `${firstProduct.quantity}${firstProduct.unit}` : 'N/A',
        status: order.status,
        priority: getPriorityFromDate(order.deliveryDate), // Helper function to determine priority
        amount: `₹${totalAmount.toLocaleString('en-IN')}`
      };
    });

    res.status(200).json({
      success: true,
      recentOrders: formattedOrders
    });
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error
    });
  }
};

// Helper function to determine priority based on delivery date
function getPriorityFromDate(deliveryDate) {
  const today = new Date();
  const delivery = new Date(deliveryDate);
  const daysUntilDelivery = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDelivery <= 3) {
    return "high";
  } else if (daysUntilDelivery <= 7) {
    return "medium";
  } else {
    return "low";
  }
}

export const getLatestProducts = async (req, res) => {
  try {
    const latestProducts = await Product.find()
      .populate("category", "name") // only bring 'name'
      .sort({ createdAt: -1 })
      .limit(5);

    // Replace category object with just the name
    const formattedProducts = latestProducts.map(product => {
      const productObj = product.toObject(); // convert mongoose doc to plain object
      return {
        id: productObj._id,
        name: productObj.productName,
        category: product.category?.name || "Uncategorized",
        createdAt: productObj.createdAt
      };
    });

    res.status(200).json({
      success: true,
      latestProducts: formattedProducts
    });
  } catch (error) {
    console.error("Error fetching latest products:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error
    });
  }
};


export const getStockAlerts = async (req, res) => {
  try {
    const stockAlerts = await Stock.find({
      status: { $in: ["low", "out"] }
    })
      .sort({ updatedAt: -1 })
      .limit(5);

    const formattedAlerts = stockAlerts.map(stock => {
      let productName = "Unknown Product";
      let stockTypeLabel = "";

      try {
        const stockObj = stock.toObject();
        const details = stockObj.stockDetails || {};

        if (stock.stockType === "Gray Stock") {
          productName = details.product || "Unknown Product";
          stockTypeLabel = `${details.factory || ""} Gray Stock`;
        } else if (stock.stockType === "Design Stock") {
          productName = details.product || "Unknown Product";
          stockTypeLabel = `${details.design || ""} Design`;
        } else if (stock.stockType === "Factory Stock") {
          productName = details.product || "Unknown Product";
          stockTypeLabel = `${details.processingFactory || ""} Factory Stock`;
        } else {
          stockTypeLabel = stock.stockType;
        }

        if (productName === "Unknown Product") {
          if (stockObj.variants?.length > 0 && stockObj.variants[0].product) {
            productName = stockObj.variants[0].product;
          } else if (stockObj.addtionalInfo?.product) {
            productName = stockObj.addtionalInfo.product;
          } else {
            productName = "Premium Cotton Base";
          }
        }
      } catch (error) {
        console.error('Error extracting product name:', error);
        productName = "Premium Cotton Base";
        stockTypeLabel = stock.stockType || "Unknown Type";
      }

      const variantsDetails = stock.variants?.map(v => ({
        color: v.color,
        quantity: v.quantity,
        unit: v.unit
      })) || [];

      return {
        id: stock._id,
        product: productName,
        stockTypeLabel,
        variantsDetails,
        minimum: "100",
        severity: stock.status === "out" ? "critical" : "warning",
        stockType: stock.stockType
      };
    });

    // 🔔 WhatsApp notification logic
    const notificationSettings = await WhatsappNotification.findOne();
    let stockAlertsEnabled = false;
    if (notificationSettings) {
      stockAlertsEnabled = notificationSettings.lowStockWarnings;
    }

    if (stockAlertsEnabled && formattedAlerts.length > 0) {
      const alertLines = formattedAlerts.map(alert => {
        const variantsText = alert.variantsDetails
          .map(v => `${v.color}: ${v.quantity} ${v.unit || 'm'}`)
          .join(", ");
        return `📦 *${alert.product}* (${alert.stockTypeLabel})\n   ${variantsText}\n   Status: ${alert.severity.toUpperCase()}`;
      }).join("\n\n");

      const messageText = `🚨 *Stock Alerts* 🚨\n\n${alertLines}\n\n📅 Last Updated: ${new Date().toLocaleString()}`;
      
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (getStockAlerts):", whatsAppError);
        statusMsg = "Not Delivered";
      }

      await WhatsappMessages.create({
        message: messageText,
        type: "stock_alert",
        sentToCount: sentToCount,
        status: statusMsg
      });
    }

    res.status(200).json({
      success: true,
      stockAlerts: formattedAlerts
    });

  } catch (error) {
    console.error("Error fetching stock alerts:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error
    });
  }
};
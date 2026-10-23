import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import Customer from "../models/customerSchema.js";
import Product from "../models/productSchema.js";
import { sendWhatsAppToCustomers } from "../utils/whatsappService.js";

/**
 * Get notification settings
 */
export const getNotificationSettings = async (req, res) => {
  try {
    let settings = await WhatsappNotification.findOne();

    // If no document exists, create one with default values
    if (!settings) {
      settings = await WhatsappNotification.create({});
    }

    res.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (req, res) => {
  try {
    const {
      orderUpdates,
      stockAlerts,
      lowStockWarnings,
      newCustomers,
      dailyReports,
      returnRequests,
      productUpdates
    } = req.body;

    let settings = await WhatsappNotification.findOne();

    if (!settings) {
      settings = await WhatsappNotification.create({});
    }

    settings.orderUpdates = orderUpdates ?? settings.orderUpdates;
    settings.stockAlerts = stockAlerts ?? settings.stockAlerts;
    settings.lowStockWarnings = lowStockWarnings ?? settings.lowStockWarnings;
    settings.newCustomers = newCustomers ?? settings.newCustomers;
    settings.dailyReports = dailyReports ?? settings.dailyReports;
    settings.returnRequests = returnRequests ?? settings.returnRequests;
    settings.productUpdates = productUpdates ?? settings.productUpdates;

    await settings.save();

    res.json({ message: "Notification settings updated", settings });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Send product updates to selected customers
 */
export const sendProductUpdatesToCustomers = async (req, res) => {
  try {
    const { customerIds, productIds } = req.body;

    if (!customerIds?.length || !productIds?.length) {
      return res.status(400).json({ error: "Customer IDs and Product IDs are required" });
    }

    // Fetch customers
    const customers = await Customer.find({ _id: { $in: customerIds } });
    const customerNumbers = customers.map(c => c.phone);

    if (!customerNumbers.length) {
      return res.status(404).json({ error: "No valid customer phone numbers found" });
    }

    // Fetch products with category populated
    const products = await Product.find({ _id: { $in: productIds } })
      .populate("category", "name"); // only get the "name" field


    if (!products.length) {
      return res.status(404).json({ error: "No products found" });
    }

    // Format product details message
    let productMessage = "📢 Product Updates:\n\n";
    products.forEach((p, index) => {
      productMessage += `${index + 1}. ${p.productName}\n`;
      if (p.description) productMessage += `   📝 ${p.description}\n`;
      productMessage += `   Category: ${p.category?.name || "N/A"}\n`; // <-- use name safely
      productMessage += `   Unit: ${p.unit}\n`;

      if (p.variants?.length) {
        productMessage += "   Variants:\n";
        p.variants.forEach(v => {
          productMessage += `     - ${v.color}: ₹${v.pricePerMeters}/m, Stock: ${v.stockInMeters}m\n`;
        });
      }

      productMessage += "\n";
    });

    // Send WhatsApp message
    await sendWhatsAppToCustomers(productMessage, customerNumbers);

    res.json({ message: "Product updates sent to customers", customers: customerNumbers });
  } catch (error) {
    console.error("Error sending product updates:", error);
    res.status(500).json({ error: "Server error" });
  }
};
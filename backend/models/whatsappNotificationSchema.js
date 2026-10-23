import mongoose from "mongoose";

const whatsappNotificationSchema = new mongoose.Schema(
  {
    orderUpdates: {
      type: Boolean,
      default: false, // New orders, status changes, deliveries
    },
    stockAlerts: {
      type: Boolean,
      default: false, // Stock movements and updates
    },
    lowStockWarnings: {
      type: Boolean,
      default: false, // When stock falls below minimum
    },
    newCustomers: {
      type: Boolean,
      default: false, // When new customers are added
    },
    dailyReports: {
      type: Boolean,
      default: false, // End of day summary reports
    },
    returnRequests: {
      type: Boolean,
      default: false, // New return requests from customers
    },
    productUpdates: {
      type: Boolean,
      default: false, // create, update, or delete product notifications
    }
  },
  { timestamps: true }
);

export const WhatsappNotification = mongoose.model("WhatsappNotification", whatsappNotificationSchema);

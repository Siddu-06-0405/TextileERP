import express from "express";
import { 
  getNotificationSettings, 
  sendProductUpdatesToCustomers, 
  updateNotificationSettings 
} from "../controller/whatsappNotificationController.js";

const router = express.Router();

// Get settings
router.get("/", getNotificationSettings);

// Update settings
router.put("/", updateNotificationSettings);

// Send WhatsApp message to customers
router.post("/send-product-updates", sendProductUpdatesToCustomers);
export default router;

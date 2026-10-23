import express from "express";
import { getDashboardStats, getRecentOrders, getStockAlerts, getLatestProducts } from "../controller/dashboardController.js";

const router = express.Router();

// Get dashboard statistics
router.get("/stats", getDashboardStats);

// Get recent orders
router.get("/recent-orders", getRecentOrders);

// Get stock alerts
router.get("/stock-alerts", getStockAlerts);

// Get latest products
router.get("/latest-products", getLatestProducts);

export default router;
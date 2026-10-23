import express from "express";
import { getStockLogs } from "../controller/stockLogsController.js";

const router = express.Router();

// GET /api/stock-logs - Get stock logs with pagination
router.get("/", getStockLogs);

export default router;

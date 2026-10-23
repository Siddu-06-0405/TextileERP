import express from "express";
import { getBusinessInfo, updateBusinessInfo } from "../controller/business.js";

const router = express.Router();

// Get business info
router.get("/", getBusinessInfo);

// Update business info
router.put("/", updateBusinessInfo);

export default router;

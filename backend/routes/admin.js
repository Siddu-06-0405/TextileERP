import express from "express";
import { createAdmin, deleteAdmin, getAdminById, getAdmins, updateAdmin, updateAdminActiveStatus } from "../controller/admin.js";

const router = express.Router();

// Create admin
router.post("/", createAdmin);

// Get all admins
router.get("/", getAdmins);

// Get admin by MongoDB _id
router.get("/:id", getAdminById);

// Update admin by ID
router.put("/:id", updateAdmin);

// Update admin active status
router.put("/active/status", updateAdminActiveStatus)

// Delete admin by ID
router.delete("/:id", deleteAdmin);

export default router;

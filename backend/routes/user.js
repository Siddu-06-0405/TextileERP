import express from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controller/user.js";

const router = express.Router();

// CRUD Routes
router.post("/", createUser);       // Create
router.get("/", getUsers);          // Read all
router.get("/:id", getUserById);    // Read one
router.put("/:id", updateUser);     // Update
router.delete("/:id", deleteUser);  // Delete

export default router;

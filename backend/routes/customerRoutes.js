import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getTopCustomers
} from "../controller/customerController.js";

const router = express.Router();

// Create a new customer
router.post("/addCustomer", createCustomer);

// Get all customers
router.get("/", getAllCustomers);

// Get customer by ID
router.get("/:id", getCustomerById);

// Update customer
router.put("/:id", updateCustomer);

// Delete customer
router.delete("/:id", deleteCustomer);

// Get top customers
router.get("/top/Customers", getTopCustomers);

export default router;

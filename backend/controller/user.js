import User from "../models/user.js";
import { clerkClient } from "@clerk/express";

// Create Clerk user + store ERP metadata
export const createUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: "Name, email, role, and password are required" });
    }

    // 1. Create user in Clerk with role in metadata
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName: name, // Clerk stores display name
      publicMetadata: { role }, // role saved in Clerk
    });

    // 2. Store ERP metadata in DB
    const user = await User.create({
      clerkId: clerkUser.id,
      name,
      email,
      role,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.errors && Array.isArray(error.errors)) {
      // Clerk validation errors
      return res.status(400).json({
        message: error.errors[0].message, // send first error message
        errors: error.errors.map(e => e.message), // send full list if you want
      });
    }

    // fallback
    res.status(500).json({ message: error.message || "Internal server error" });
  }

};


// Get all ERP users (DB only)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single ERP user (DB only)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update ERP + Clerk metadata
export const updateUser = async (req, res) => {
  try {
    const { name, role, email } = req.body;

    // Step 1: Find ERP user
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ownerCount = await User.countDocuments({ role: "owner" });
    if (role != "owner" && ownerCount <= 1) {
      return res.status(400).json({
        message: "At least one owner must exist.",
      });
    }

    // Step 2: Update Clerk user
    await clerkClient.users.updateUser(user.clerkId, {
      firstName: name ?? user.name,
      emailAddress: email ? [email] : [user.email], // Clerk needs array
      publicMetadata: { role: role ?? user.role },
    });

    // Step 3: Update ERP DB
    if (name) user.name = name;
    if (role) user.role = role;
    if (email) user.email = email;
    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({
        message: error.errors[0].message,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Delete Clerk user + ERP metadata
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ownerCount = await User.countDocuments({ role: "owner" });
    if (user.role == "owner" && ownerCount <= 1) {
      return res.status(400).json({
        message: "At least one owner must exist.",
      });
    }
    // 1. Delete from Clerk
    await clerkClient.users.deleteUser(user.clerkId);

    // 2. Delete from ERP DB
    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

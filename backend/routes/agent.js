import express from "express";
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
} from "../controller/agent.js";

const router = express.Router();

// Create agent
router.post("/", createAgent);

// Get all agents
router.get("/", getAgents);

// Get agent by MongoDB _id
router.get("/:id", getAgentById);

// Update agent by ID
router.put("/:id", updateAgent);

// Delete agent by ID
router.delete("/:id", deleteAgent);

export default router;

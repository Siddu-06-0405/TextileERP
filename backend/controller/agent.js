import Agent from "../models/agent.js";

/** Create a new agent **/
export const createAgent = async (req, res) => {
  try {
    const { name, factory } = req.body;
    const userRole = req.headers["x-user-role"] || req.body.role;

    // Check if user has permission to add agents (only owners)
    if (userRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Owners can add agents.",
      });
    }

    if (!name || !factory) {
      return res
        .status(400)
        .json({ success: false, message: "Name and Factory are required" });
    }

    // Normalize factory to array
    const factoryArray = Array.isArray(factory) ? factory : [factory];

    const newAgent = await Agent.create({ name, factory: factoryArray });

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      agent: newAgent,
    });
  } catch (error) {
    console.error("Create Agent Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/** Get all agents **/
export const getAgents = async (req, res) => {
  try {
    const agents = await Agent.find();
    res.status(200).json({ success: true, agents });
  } catch (error) {
    console.error("Get Agents Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/** Get agent by MongoDB _id **/
export const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }
    res.status(200).json({ success: true, agent });
  } catch (error) {
    console.error("Get Agent By ID Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/** Update agent by ID **/
export const updateAgent = async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"] || req.body.role;

    // Check if user has permission to edit agents (only owners)
    if (userRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Owners can edit agents.",
      });
    }

    const updateData = { ...req.body };

    // Normalize factory to array if provided
    if (updateData.factory) {
      updateData.factory = Array.isArray(updateData.factory)
        ? updateData.factory
        : [updateData.factory];
    }

    const updatedAgent = await Agent.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedAgent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    res.status(200).json({
      success: true,
      message: "Agent updated successfully",
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("Update Agent Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/** Delete agent by ID **/
export const deleteAgent = async (req, res) => {
  try {
    const userRole = req.headers["x-user-role"] || req.body.role;

    // Check if user has permission to delete agents (only owners)
    if (userRole !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Owners can delete agents.",
      });
    }

    const deletedAgent = await Agent.findByIdAndDelete(req.params.id);

    if (!deletedAgent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    res.status(200).json({
      success: true,
      message: "Agent deleted successfully",
      agent: deletedAgent,
    });
  } catch (error) {
    console.error("Delete Agent Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

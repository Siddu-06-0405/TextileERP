// controllers/whatsappMessage.controller.js
import WhatsappMessage from "../models/whatsappMessages.js";

/**
 * Create a new WhatsApp message record
 */
export const createWhatsappMessage = async (req, res) => {
  try {
    const { message, sentToCount, status } = req.body;

    const newMessage = await WhatsappMessage.create({
      message,
      sentToCount,
      status: status || "Delivered",
    });

    res.status(201).json({
      success: true,
      message: "WhatsApp message saved successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error creating WhatsApp message:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

/**
 * Get paginated WhatsApp messages
 * @query page - current page number (default: 1)
 * @query limit - number of items per page (default: 4)
 */
export const getWhatsappMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const skip = (page - 1) * limit;

    const totalMessages = await WhatsappMessage.countDocuments();
    const messages = await WhatsappMessage.find()
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      messages,
    });
  } catch (error) {
    console.error("Error fetching WhatsApp messages:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getTodayMessageStats = async (req, res) => {
  try {
    // Calculate today's start & end
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Count total messages today
    const totalMessagesToday = await WhatsappMessage.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    // Count messages by type
    const orderUpdateCount = await WhatsappMessage.countDocuments({
      type: "order_update",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const stockAlertCount = await WhatsappMessage.countDocuments({
      type: "stock_alert",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      stats: {
        total: totalMessagesToday,
        order_update: orderUpdateCount,
        stock_alert: stockAlertCount,
      },
    });
  } catch (error) {
    console.error("Error fetching message stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
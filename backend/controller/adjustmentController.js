import Adjustment from "../models/adjustmentSchema.js";
import Stock from "../models/stockScehma.js";

export const getAdjustments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      Adjustment.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Adjustment.countDocuments()
    ]);

    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({ 
      success: true, 
      adjustments,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const createAdjustment = async (req, res) => {
  try {
    const { stockId, color, newQuantity, reason } = req.body;
    if (!stockId || !color || typeof newQuantity !== "number" || !reason) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const stock = await Stock.findById(stockId);
    if (!stock) return res.status(404).json({ success: false, message: "Stock not found" });

    const idx = stock.variants.findIndex(v => v.color === color);
    if (idx < 0) return res.status(400).json({ success: false, message: "Color not found in stock" });

    const prevQuantity = Number(stock.variants[idx].quantity) || 0;
    if (newQuantity <= prevQuantity) {
      return res.status(400).json({ success: false, message: "New quantity must be greater than previous quantity" });
    }

    stock.variants[idx].quantity = newQuantity;
    const totalQty = stock.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
    if (totalQty === 0) stock.status = "out";
    else if (totalQty < 100 && stock.status !== "processing") stock.status = "low";
    else if (stock.status !== "processing") stock.status = "available";
    await stock.save();

    const adjustment = await Adjustment.create({
      stockId,
      product: (stock.stockDetails && stock.stockDetails.product) || "",
      stockType: stock.stockType,
      color,
      prevQuantity,
      newQuantity,
      reason,
    });

    res.status(201).json({ success: true, adjustment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error });
  }
}; 
import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    stockType: {
      type: String,
      enum: ["Gray Stock", "Factory Stock", "Design Stock"],
      required: true,
    },
    product: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "low", "out", "processing", "quality_check", "completed"],
      default: "available",
    },
    variants: [
      {
        color: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
      },
    ],
    details: {
      factory: String,
      agent: String,
      orderNumber: String,
      processingFactory: String,
      processingStage: String,
      expectedCompletion: String,
      design: String,
      warehouse: String,
      batchNumber: String,
      qualityGrade: String,
      notes: String,
    },
    notes: { type: String }
  },
  { timestamps: true }
);

const StockLog = mongoose.model("StockLog", stockLogSchema);
export default StockLog;

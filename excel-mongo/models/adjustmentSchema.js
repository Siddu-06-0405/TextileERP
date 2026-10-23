import mongoose from "mongoose";

const adjustmentSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true },
    product: { type: String, required: true },
    stockType: { type: String, required: true },
    color: { type: String, required: true },
    prevQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

const Adjustment = mongoose.model("Adjustment", adjustmentSchema);
export default Adjustment; 
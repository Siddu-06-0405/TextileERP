import mongoose from "mongoose";

const businessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  gstNumber: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  phone: { type: String },
  email: { type: String },
}, { timestamps: true });

export default mongoose.model("Business", businessSchema, "business");

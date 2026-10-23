import mongoose from "mongoose";

const whatsappMessagesSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  sentToCount: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ["stock_alert", "order_update", "return_request", "product_update"],
  },
  status: {
    type: String,
    default: "Delivered",
  },
}, { timestamps: true });

const WhatsappMessage = mongoose.model("WhatsappMessage", whatsappMessagesSchema);
export default WhatsappMessage;

import mongoose from "mongoose";

// order Items Schema
const orderItemsSchema = new mongoose.Schema({
  product: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    enum: ["METERS", "SETS"],
    required: true,
  },
  pricePerMeters: {
    type: Number,
    required: true,
  },
  stockId: {
    type: String,
    required: true,
  },
}, { _id: false });

const ORDER_STATUSES = ["pending", "confirmed"];

const orderSchema = new mongoose.Schema({
  // Customer Information
  customer: {
    type: String,
    required: true,
  },
  // Order Status
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: "pending"
  },
  // Optional unique indent number
  indentNumber: {
    type: Number,
    unique: true,
    sparse: true,
    index: true,
  },
  orderDate: {
    type: Date,
    required: true,
  },
  deliveryDate: {
    type: Date,
    required: true,
  },
  // Order Items
  orderItems: [orderItemsSchema],
  // Order Notes
  notes: {
    type: String,
  },
  // Paid Amount
  paidAmount: {
    type: Number,
    default: null,
  },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
export default Order;
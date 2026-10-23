import mongoose from "mongoose";

const STOCK_TYPES = ["Gray Stock", "Factory Stock", "Design Stock"];
const STOCK_STATUSES = ["available", "low", "out", "processing", "quality_check", "completed"];
const PROCESSING_STAGES = ["Dyeing", "Printing", "Finishing", "Quality Check"];
const DESIGNS = [
  "Floral Print",
  "Abstract Print",
  "Geometric Design",
  "Solid Colors",
];
const WAREHOUSES = [
  "Main Warehouse - Mumbai",
  "Secondary Warehouse - Delhi",
  "Regional Warehouse - Bangalore",
];
const QUALITY_GRADES = ["A", "A+", "B+", "B"];
const UNITS = ["METERS", "SETS"];

// variant Schema
const variantSchema = new mongoose.Schema(
  {
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
      enum: UNITS,
      required: true,
    },
  },
  { _id: false }
);

// Addtional Info Schema
const addtionalSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: false,
    },
    qualityGrade: {
      type: String,
      enum: QUALITY_GRADES,
      required: false,
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

// Gray Stock
const grayStockSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
    },
    factory: {
      type: String,
      required: true,
    },
    agent: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Factory Stock
const factoryStockSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
    },
    processingFactory: {
      type: String,
      required: true,
    },
    processingStage: {
      type: String,
      enum: PROCESSING_STAGES,
      required: true,
    },
    expectedCompletion: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

// Design Stock
const designStockSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

// Stock Schema
const stockSchema = new mongoose.Schema({
    stockType:{
        type: String,
        enum: STOCK_TYPES,
        required: true
    },
    status:{
        type: String,
        enum: STOCK_STATUSES,
        default: "available"
    },
    variants:[variantSchema],
    stockDetails:{
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    addtionalInfo: addtionalSchema,
},{timestamps: true});

const Stock = mongoose.model('Stock', stockSchema);
export default Stock;

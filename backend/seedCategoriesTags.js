import mongoose from "mongoose";
import Category from "./models/category.js";
import Tag from "./models/tag.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const categories = [
  "Cotton Fabrics",
  "Silk Fabrics",
  "Polyester Fabrics",
  "Blended Fabrics",
  "Designer Prints",
  "Solid Colors",
  "Textured Fabrics",
  "Seasonal Collection"
];

const tags = [
  "Premium",
  "Cotton",
  "Silk",
  "Polyester",
  "Designer",
  "Casual",
  "Formal",
  "Summer",
  "Winter",
  "Printed",
  "Solid",
  "Textured",
  "Lightweight",
  "Heavy"
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Insert categories
    for (const name of categories) {
      await Category.updateOne({ name }, { name }, { upsert: true });
    }

    // Insert tags
    for (const name of tags) {
      await Tag.updateOne({ name }, { name }, { upsert: true });
    }

    console.log("🌱 Categories & Tags seeded successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seed();

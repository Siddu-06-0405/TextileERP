import mongoose from "mongoose";
import Product from "./models/productSchema.js";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/textile_erp");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Migration function to add isActive field to existing products
const migrateProductStatus = async () => {
  try {
    console.log("Starting product status migration...");
    
    // Find all products that don't have the isActive field
    const productsWithoutStatus = await Product.find({
      isActive: { $exists: false }
    });
    
    console.log(`Found ${productsWithoutStatus.length} products without isActive field`);
    
    if (productsWithoutStatus.length > 0) {
      // Update all products without isActive field to be active by default
      const result = await Product.updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } }
      );
      
      console.log(`Updated ${result.modifiedCount} products to be active by default`);
    } else {
      console.log("All products already have isActive field");
    }
    
    console.log("Product status migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run migration
connectDB().then(() => {
  migrateProductStatus();
});

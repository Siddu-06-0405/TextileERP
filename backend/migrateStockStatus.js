import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stock from './models/stockScehma.js';

dotenv.config();

async function migrateStockStatus() {
  try {
    // Check if MONGO_URI is provided
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI environment variable is not set!');
      console.log('📝 Please create a .env file with MONGO_URI');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all stocks without status field
    const stocks = await Stock.find({ status: { $exists: false } });
    console.log(`📋 Found ${stocks.length} stocks without status field`);

    if (stocks.length === 0) {
      console.log('✅ All stocks already have status field');
      return;
    }

    // Update each stock with appropriate status
    let updatedCount = 0;
    for (const stock of stocks) {
      const totalQuantity = stock.variants.reduce((sum, variant) => sum + variant.quantity, 0);
      
      let status = "available";
      if (totalQuantity === 0) {
        status = "out";
      } else if (totalQuantity < 100) {
        status = "low";
      } else if (stock.stockType === "Factory Stock") {
        status = "processing";
      }

      await Stock.findByIdAndUpdate(stock._id, { status });
      updatedCount++;
      console.log(`✅ Updated stock ${stock._id} with status: ${status}`);
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Updated ${updatedCount} stocks with status field`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateStockStatus();

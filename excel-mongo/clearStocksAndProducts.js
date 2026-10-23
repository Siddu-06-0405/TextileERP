import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/productSchema.js';
import Stock from './models/stockSchema.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not set in environment.');
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Confirm action
    console.log('About to delete ALL documents from collections: Product, Stock');

    // Delete all stocks
    const stockRes = await Stock.deleteMany({});
    console.log(`Deleted ${stockRes.deletedCount || 0} documents from Stock collection`);

    // Delete all products
    const prodRes = await Product.deleteMany({});
    console.log(`Deleted ${prodRes.deletedCount || 0} documents from Product collection`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB. Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();

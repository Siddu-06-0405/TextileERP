import mongoose from "mongoose";
import dotenv from "dotenv";
import xlsx from "xlsx";
import Category from "./models/category.js";
import Product from "./models/productSchema.js";
import Stock from "./models/stockSchema.js"; // <-- import stock model

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

// ====== CONFIG VARIABLES ======
const EXCEL_FILE_PATH = "./modal-dobby-stock.xlsx"; // Path to Excel file

const DEFAULT_DESCRIPTION = "To be updated";
const DEFAULT_UNIT = "SETS";
const DEFAULT_MINIMUM_STOCK = 10;
const DEFAULT_REORDER_POINT = 5;
const DEFAULT_STORAGE_LOCATION = "Main Warehouse";
const DEFAULT_VARIANTS = [
  {
    color: "Default Color",
    pricePerMeters: 100 / 60,
  },
];
const DEFAULT_IMAGES = [
  "https://res.cloudinary.com/dk9264fym/image/upload/v1760609777/products/bkipdp3t0tnspfsgigz3.jpg",
];
const DEFAULT_TAGS = [new mongoose.Types.ObjectId("68f0a4f22ae3ad625c97c050")];
// ==============================================

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Step 1: Read Excel file
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📦 Loaded ${rawData.length} rows from Excel`);

    // Normalize header keys
    const sheetData = rawData.map((row) => {
      const normalized = {};
      for (const key in row) {
        normalized[key.trim()] = row[key];
      }
      return normalized;
    });

    // Filter valid rows
    const validData = sheetData.filter(
      (r) => r["Product Category"] && r["Design Number"]
    );

    console.log(`✅ ${validData.length} valid rows after cleaning`);

    // Step 2: Unique categories
    const categories = [
      ...new Set(validData.map((row) => row["Product Category"].trim())),
    ];

    console.log(`🗂 Found ${categories.length} unique categories`);

    // Step 3: Insert categories if missing
    const categoryMap = {};
    for (const name of categories) {
      let category = await Category.findOne({ name: name.trim() });
      if (!category) {
        category = await Category.create({ name: name.trim() });
        console.log(`✅ Added category: ${name}`);
      } else {
        console.log(`⚡ Category exists: ${name}`);
      }
      categoryMap[name.trim()] = category._id;
    }

    // Step 4: Prepare products
    const productsToInsert = validData.map((row) => ({
      productName: row["Design Number"]?.toString().trim(),
      category: categoryMap[row["Product Category"].trim()],
      unit: DEFAULT_UNIT,
      description: DEFAULT_DESCRIPTION,
      variants: DEFAULT_VARIANTS,
      images: DEFAULT_IMAGES,
      tags: DEFAULT_TAGS,
      stockInfo: {
        minimumStock: DEFAULT_MINIMUM_STOCK,
        reorderPoint: DEFAULT_REORDER_POINT,
        storageLocation: DEFAULT_STORAGE_LOCATION,
      },
      isActive: true,
    }));

    // Step 5: Generate SKUs
    for (const product of productsToInsert) {
      const tempId = new mongoose.Types.ObjectId();
      product.sku = `SKU-${tempId.toString().slice(-6).toUpperCase()}`;
    }

    // Step 6: Insert products
    const insertedProducts = await Product.insertMany(productsToInsert, {
      ordered: false,
    });
    console.log(`✅ Inserted ${insertedProducts.length} products`);

    if (true) {
      // Step 7: Create Design Stocks
      const productsForStock = insertedProducts.slice(0, 1);

      const stocksToInsert = insertedProducts.map((product, index) => {
        const row = validData[index];
        const quantity = Number(row["Quantity (In Sets)"]) || 0;

        return {
          stockType: "Design Stock",
          status: "available",
          variants: [
            {
              color: "DEFAULT",
              quantity: quantity * 60,   // must exist
              unit: "METERS",
            },
          ],
          stockDetails: {
            product: product.productName, // use name string, not _id
          },
          addtionalInfo: {
            batchNumber: `BATCH-${product.sku.slice(-4)}`,
            qualityGrade: "A",
            notes: "Imported from Excel",
          },
        };
      });


      await Stock.insertMany(stocksToInsert);
      console.log(`✅ Created ${stocksToInsert.length} design stock entries`);

      console.log("🆔 Sample Products and Stocks:");
      insertedProducts.slice(0, 5).forEach((p, i) => {
        console.log(
          `   ${p.productName} → ${p.sku} | Qty: ${stocksToInsert[i]?.variants[0]?.quantity
          }`
        );
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();

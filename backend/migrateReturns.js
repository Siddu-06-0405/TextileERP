import mongoose from 'mongoose';
import Return from './models/returnSchema.js';
import Order from './models/orderSchema.js';

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/textile_erp');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const migrateReturns = async () => {
  try {
    await connectDB();
    
    console.log('Starting returns migration...');
    
    // Get all returns that don't have the required fields
    const returns = await Return.find({
      $or: [
        { id: { $exists: false } },
        { orderId: { $exists: false } },
        { customer: { $exists: false } }
      ]
    });
    
    console.log(`Found ${returns.length} returns to migrate`);
    
    for (let i = 0; i < returns.length; i++) {
      const returnItem = returns[i];
      
      try {
        // Generate Return ID if missing
        if (!returnItem.id) {
          const returnsCount = await Return.countDocuments();
          returnItem.id = `RET-${String(returnsCount + 1).padStart(3, '0')}`;
        }
        
        // Set orderId if missing
        if (!returnItem.orderId) {
          returnItem.orderId = returnItem.order;
        }
        
        // Get customer from order if missing
        if (!returnItem.customer) {
          const orderDetails = await Order.findById(returnItem.order);
          if (orderDetails) {
            returnItem.customer = orderDetails.customer;
          } else {
            returnItem.customer = 'Unknown Customer';
          }
        }
        
        // Save the updated return
        await returnItem.save();
        console.log(`Migrated return ${returnItem.id}`);
        
      } catch (error) {
        console.error(`Error migrating return ${returnItem._id}:`, error);
      }
    }
    
    console.log('Returns migration completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrateReturns();

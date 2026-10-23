import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/orderSchema.js';

dotenv.config();

const migrateOrderStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all orders without a status field
    const ordersWithoutStatus = await Order.find({ status: { $exists: false } });
    
    console.log(`Found ${ordersWithoutStatus.length} orders without status field`);

    if (ordersWithoutStatus.length === 0) {
      console.log('No orders need migration');
      return;
    }

    // Update each order with a default status
    for (const order of ordersWithoutStatus) {
      // Simple logic to assign status based on order date
      const orderDate = new Date(order.orderDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let status = 'pending';
      if (daysDiff > 7) {
        status = 'delivered';
      } else if (daysDiff > 2) {
        status = 'confirmed';
      } else if (daysDiff >= 0) {
        status = 'processing';
      }

      await Order.findByIdAndUpdate(order._id, { status });
      console.log(`Updated order ${order._id} with status: ${status}`);
    }

    console.log(`Migration completed! Updated ${ordersWithoutStatus.length} orders`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run migration
migrateOrderStatus();

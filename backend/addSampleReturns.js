import mongoose from 'mongoose';
import Return from './models/returnSchema.js';

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

const addSampleReturns = async () => {
  try {
    await connectDB();
    
    console.log('Adding sample returns...');
    
    // Clear existing returns
    await Return.deleteMany({});
    console.log('Cleared existing returns');
    
    // Sample returns data with all required fields
    const sampleReturns = [
      {
        id: 'RET-001',
        order: 'ORD-001',
        orderId: 'ORD-001',
        customer: 'Rajesh Textiles',
        product: 'Cotton Blend Fabric',
        color: 'Blue',
        quantityInMeters: 45,
        returnReason: 'Quality issue - fabric has stains',
        isApprove: false
      },
      {
        id: 'RET-002',
        order: 'ORD-003',
        orderId: 'ORD-003',
        customer: 'Fashion Hub',
        product: 'Silk Designer Print',
        color: 'Red',
        quantityInMeters: 30,
        returnReason: 'Wrong color received',
        isApprove: true
      },
      {
        id: 'RET-003',
        order: 'ORD-005',
        orderId: 'ORD-005',
        customer: 'Style Point',
        product: 'Polyester Mix',
        color: 'Green',
        quantityInMeters: 60,
        returnReason: 'Damaged in transit',
        isApprove: false
      },
      {
        id: 'RET-004',
        order: 'ORD-002',
        orderId: 'ORD-002',
        customer: 'Modern Fabrics',
        product: 'Premium Cotton',
        color: 'White',
        quantityInMeters: 25,
        returnReason: 'Size mismatch',
        isApprove: true
      }
    ];
    
    // Insert sample returns
    const createdReturns = await Return.insertMany(sampleReturns);
    console.log(`Created ${createdReturns.length} sample returns`);
    
    // Display the created returns
    console.log('\nCreated returns:');
    createdReturns.forEach(ret => {
      console.log(`- ${ret.id} | ${ret.orderId} | ${ret.customer}`);
    });
    
    console.log('\nSample returns added successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Error adding sample returns:', error);
    process.exit(1);
  }
};

addSampleReturns();

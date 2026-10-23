import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './models/customerSchema.js';

dotenv.config();

async function seedCustomers() {
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

    // Check if customers already exist
    const existingCustomers = await Customer.find();
    if (existingCustomers.length > 0) {
      console.log(`📋 Found ${existingCustomers.length} existing customers`);
      console.log('✅ Database already has customer data');
      return;
    }

    // Sample customer data
    const sampleCustomers = [
      {
        customerName: "Rajesh Textiles",
        customerType: "Wholesale",
        email: "rajesh@rajeshtextiles.com",
        phone: 919876543210,
        city: "Mumbai",
        address: "123 Textile Market, Mumbai, Maharashtra",
      },
      {
        customerName: "Fashion Hub",
        customerType: "Retail",
        email: "orders@fashionhub.com",
        phone: 918765432109,
        city: "Delhi",
        address: "456 Fashion Street, Delhi",
      },
      {
        customerName: "Style Point",
        customerType: "Wholesale",
        email: "info@stylepoint.com",
        phone: 917654321098,
        city: "Bangalore",
        address: "789 Commercial Complex, Bangalore, Karnataka",
      },
      {
        customerName: "Modern Fabrics",
        customerType: "Wholesale",
        email: "purchase@modernfabrics.com",
        phone: 916543210987,
        city: "Chennai",
        address: "321 Industrial Area, Chennai, Tamil Nadu",
      },
      {
        customerName: "Premium Garments",
        customerType: "Retail",
        email: "sales@premiumgarments.com",
        phone: 915432109876,
        city: "Pune",
        address: "654 Shopping Mall, Pune, Maharashtra",
      },
    ];

    // Insert sample customers
    const insertedCustomers = await Customer.insertMany(sampleCustomers);
    console.log(`✅ Successfully seeded ${insertedCustomers.length} customers`);

    console.log('\n📊 Seeded Customers:');
    insertedCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.customerName} (${customer.customerType}) - ${customer.city}`);
    });

    console.log('\n🎉 Customer seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during customer seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedCustomers();

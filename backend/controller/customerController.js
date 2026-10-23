import Customer from "../models/customerSchema.js";
import { sendWhatsAppMessage, sentToCount } from "../utils/whatsappService.js";
import { WhatsappNotification } from "../models/whatsappNotificationSchema.js";
import WhatsappMessages from "../models/whatsappMessages.js";
import Order from "../models/orderSchema.js";

export const createCustomer = async (req, res) => {
  try {
    const {
      customerName,
      customerType,
      email,
      phone,
      city,
      address,
    } = req.body;

    if (
      !customerName || !customerType || !email || !phone ||
      !city || !address
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newCustomer = await Customer.create({
      customerName,
      customerType,
      email,
      phone,
      city,
      address,
    });

    /** 🔔 Check Notification Settings **/
    const notificationSettings = await WhatsappNotification.findOne();

    let customerAlertsEnabled = false;
    if (notificationSettings) {
      customerAlertsEnabled = notificationSettings.newCustomers;
    }

    /** 📲 WhatsApp Notification **/
    if (customerAlertsEnabled) {
      const messageText = `🆕 New Customer Added!\n\n👤 Name: ${newCustomer.customerName}\n🏷 Type: ${newCustomer.customerType}\n📧 Email: ${newCustomer.email}\n📞 Phone: ${newCustomer.phone}\n🏙 City: ${newCustomer.city}\n📍 Address: ${newCustomer.address}\n\nView details: ${process.env.CLIENT_URL}/customers/${newCustomer._id}`;
      let statusMsg = "Delivered";
      try {
        await sendWhatsAppMessage(messageText);
      } catch (whatsAppError) {
        console.error("WhatsApp Notification Failed (createCustomer):", whatsAppError);
        statusMsg = "Not Delivered";
      }
      await WhatsappMessages.create({
        message: messageText,
        type: "product_update",
        sentToCount: sentToCount,
        status: statusMsg,
      });
    }

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer: newCustomer,
    });
  } catch (error) {
    console.error("Create Customer Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error,
    });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    
    res.status(200).json({
      success: true,
      customers: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error,
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error,
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error,
    });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error,
    });
  }
};

// Get top customers based on order count and revenue
export const getTopCustomers = async (req, res) => {
  try {
    const topCustomers = await Order.aggregate([
      { $unwind: "$orderItems" },   // Now each order item is a document

      {
        $group: {
          _id: "$customer",      // group by customer name string
          orders: { $sum: 1 },   // count of all order items (could do $addToSet for unique orders)
          revenue: {
            $sum: {              // sum over each order item
              $multiply: [
                "$orderItems.quantity",
                "$orderItems.pricePerMeters"
              ]
            }
          }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      // Join city using $lookup
      {
        $lookup: {
          from: "customers",        // collection name in MongoDB
          localField: "_id",        // customer name from Order
          foreignField: "customerName", // customer name from Customer
          as: "customerInfo"
        }
      },
      { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          orders: 1,
          revenue: 1,
          city: { $ifNull: ["$customerInfo.city", "Unknown"] }
        }
      }
    ]);

    res.status(200).json(topCustomers);
  } catch (error) {
    console.error("Error fetching top customers:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

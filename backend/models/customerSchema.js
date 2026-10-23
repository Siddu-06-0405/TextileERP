import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    customerName:{
        type: String,
        required: true,
    },
    customerType:{
        type: String,
        enum: ["Wholesale", "Retail"],
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    phone:{
        type: String,
        required: true,
    },
    city:{
        type: String,
        required: true,
    },
    address:{
        type: String,
        required: true,
    }
},{timestamps: true});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
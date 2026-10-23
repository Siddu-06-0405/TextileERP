import mongoose from "mongoose";

const returnSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    order: {
        type: String,
        required: true,
    },
    orderId: {
        type: String,
        required: true,
    },
    customer: {
        type: String,
        required: true,
    },
    product:{
        type: String,
        required: true,
    },
    color:{
        type: String,
        required: true,
    },
    quantityInMeters:{
        type: Number,
        required: true,
        min: [0.01, 'Quantity must be greater than 0'],
    },
    returnReason:{
        type: String,
        required: true,
    },
    isApprove: {
        type: Boolean,
        default: false,
    },
    isRejected: {
        type: Boolean,
        default: false,
    }
}, {timestamps: true});

const Return = mongoose.model('Return', returnSchema);
export default Return;
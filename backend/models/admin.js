import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        number: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true,
            enum: ['owner', 'manager', 'sales', 'inventory head'],
            default: 'owner'
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;

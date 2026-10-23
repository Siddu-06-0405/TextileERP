import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true, // every Clerk user is unique
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String, // store for reference/search
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["owner", "manager", "sales", "inventory head"],
      default: "sales",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;

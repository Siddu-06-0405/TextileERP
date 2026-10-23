// models/tag.model.js
import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // prevent duplicates
      trim: true,
    },
  },
  { timestamps: true }
);

const Tag = mongoose.model("Tag", tagSchema);
export default Tag;

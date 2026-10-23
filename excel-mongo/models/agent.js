import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    factory: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length > 0; // must have at least one factory
        },
        message: "At least one factory is required",
      },
    },
  },
  { timestamps: true }
);

// Auto-generate agentId before saving
agentSchema.pre("save", async function (next) {
  if (this.agentId) {
    return next(); // already set
  }

  try {
    // Find the last agent by createdAt
    const lastAgent = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });

    let nextNumber = 1;
    if (lastAgent && lastAgent.agentId) {
      const lastNumber = parseInt(lastAgent.agentId.replace("AGT-", ""), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    this.agentId = `AGT-${String(nextNumber).padStart(3, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

const Agent = mongoose.model("Agent", agentSchema);
export default Agent;
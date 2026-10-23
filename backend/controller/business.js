import Business from "../models/business.js";

export const getBusinessInfo = async (req, res) => {
  try {
    const business = await Business.findOne();
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const updateBusinessInfo = async (req, res) => {
  try {
    const business = await Business.findOneAndUpdate(
      {}, // no filter, always update the single business document
      { $set: req.body },
      { new: true, upsert: true } // create if not exists, return updated doc
    );

    res.json({
      message: "Business info updated successfully",
      business,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

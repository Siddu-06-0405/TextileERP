import Admin from "../models/admin.js";

/** Create a new admin **/
export const createAdmin = async (req, res) => {
  try {
    const { name, number, role, active } = req.body;

    if (!name || !number || !role ) {
      return res.status(400).json({ success: false, message: "All details are required" });
    }

    const newAdmin = await Admin.create({ name, number, role, active });

    res.status(201).json({
      success: true,
      message: `${role} created successfully`,
      admin: newAdmin
    });
  } catch (error) {
    console.error("Create Admin Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/** Get all admins **/
export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error("Get Admins Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/** Get admin by MongoDB _id **/
export const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("Get Admin By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/** Update admin by ID **/
export const updateAdmin = async (req, res) => {
  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: updateAdmin,
    });
  } catch (error) {
    console.error("Update Admin Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/** Delete admin by ID **/
export const deleteAdmin = async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);

    if (!deletedAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
      admin: deletedAdmin,
    });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// update admin active status
export const updateAdminActiveStatus = async (req, res) => {
  try {
    const { id, active } = req.body;

    if (!id || typeof active !== "boolean") {
      return res.status(400).json({ success: false, message: "Invalid request data" });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { active },
      { new: true, runValidators: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin status updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Update Admin Active Status Error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
}
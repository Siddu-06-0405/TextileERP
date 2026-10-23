import StockLog from "../models/stockLog.js";

export const logStockAction = async ({
  action,
  stockType,
  product,
  status,
  variants,
  details,
  notes,
  previousVariants = []
}) => {
  try {
     const totalBefore = (previousVariants || []).reduce(
      (sum, v) => sum + (Number(v?.quantity) || 0),
      0
    );

    const totalAfter = (variants || []).reduce(
      (sum, v) => sum + (Number(v?.quantity) || 0),
      0
    );

    const diff = totalAfter - totalBefore;

    let actionStr = `${diff >= 0 ? "+" : ""}${diff} (${totalBefore} → ${totalAfter})`;

    if(notes=="Stock deleted"){
      actionStr = "Deleted";
    }
    
    if(notes=="New stock created"){
      actionStr = "created";
    }

    await StockLog.create({
      action: actionStr,
      stockType,
      product,
      status,
      variants,
      details,
      notes
    });
  } catch (error) {
    console.error("Error logging stock action:", error);
  }
};

export const getStockLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch logs instead of live stocks
    const logsFromDb = await StockLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalItems = await StockLog.countDocuments();

    // Transform logs to the exact same format your frontend expects
    const logs = logsFromDb.map((log) => {
      // Get product name
      let productName = log.product || "Unknown Product";


      // Get total quantity from variants
      const totalQuantity = log.variants.reduce(
        (sum, variant) => sum + variant.quantity,
        0
      );

      // Get colors from variants
      const colors = log.variants.map((variant) => variant.color).join(", ");

      // Get additional details based on stock type
      let additionalDetails = {};
      if (log.stockType === "Gray Stock") {
        additionalDetails = {
          factory: log.details?.factory || "",
          agent: log.details?.agent || "",
          orderNumber: log.details?.orderNumber || "",
        };
      } else if (log.stockType === "Factory Stock") {
        additionalDetails = {
          processingFactory: log.details?.processingFactory || "",
          processingStage: log.details?.processingStage || "",
          expectedCompletion: log.details?.expectedCompletion || "",
        };
      } else if (log.stockType === "Design Stock") {
        additionalDetails = {
          design: log.details?.design || "",
          warehouse: log.details?.warehouse || "",
        };
      }

      return {
        _id: log._id,
        product: productName,
        stockType: log.stockType,
        status: log.status,
        totalQuantity,
        colors,
        variants: log.variants,
        additionalDetails,
        batchNumber: log.details?.batchNumber || "",
        qualityGrade: log.details?.qualityGrade || "",
        notes: log.details?.notes || "",
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
        action: log.action
      };
    });

    // Pagination
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching stock logs:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
import express from "express";
import { verifyToken } from "../controllers/user.controllers.js";
import Product from "../models/Product.js";

const products = express.Router();

products.get("/", verifyToken, async (req, res) => {
  const userId = req.id;
  const { projectId } = req.query;
  if (!userId) {
    return res.status(400).json({
      msg: "Token has been expired login again ...!",
      success: false,
    });
  }

  try {
    const products = await Product.find({ userId, projectId });
    return res.status(200).json({
      msg: "Products Fetched Successfully ...!",
      success: true,
      data: products,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

products.put("/bulk-update", verifyToken, async (req, res) => {
  const userId = req.id;
  if (!userId) {
    return res.status(401).json({
      msg: "Token has expired. Please log in again.",
      success: false,
    });
  }

  const { projectId } = req.query;
  try {
    const { updatedData, deletedProductsId } = req.body;

    if (deletedProductsId && deletedProductsId.length > 0) {
      await Product.deleteMany({
        id: { $in: deletedProductsId },
        userId,
        projectId,
      });
    }

    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({
        msg: "No data provided for update.",
        success: false,
      });
    }

    const bulkOps = updatedData.map((product) => ({
      updateOne: {
        filter: { id: product.id, userId, projectId },
        update: { $set: product },
        upsert: true,
      },
    }));

    await Product.bulkWrite(bulkOps);

    console.log(bulkOps);

    return res.status(200).json({
      msg: "Products updated successfully!",
      success: true,
    });
  } catch (err) {
    console.error("Bulk update error:", err);
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

products.delete("/", verifyToken, async (req, res) => {
  const userId = req.id;
  if (!userId) {
    return res.status(400).json({
      msg: "Token has been expired login again ...!",
      success: false,
    });
  }

  const { projectId } = req.query;
  const { subCategory } = req.body;
  if (!subCategory) {
    return res.status(400).json({
      msg: "Sub-category name is missing ...!",
      success: false,
    });
  }

  if (!projectId) {
    return res.status(400).json({
      msg: "Project Id is missing ...!",
      success: false,
    });
  }

  try {
    const products = await Product.deleteMany({
      sub_category: subCategory,
      userId,
      projectId,
    });

    return res.status(200).json({
      msg: "Products deleted successfully!",
      success: true,
      deletedCount: products.deletedCount,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

products.delete("/single", verifyToken, async (req, res) => {
  const userId = req.id;
  const { id, projectId } = req.query;

  if (!userId) {
    return res.status(400).json({
      msg: "Token has expired, please log in again!",
      success: false,
    });
  }

  if (!projectId) {
    return res.status(400).json({
      msg: "Project ID is missing!",
      success: false,
    });
  }

  if (!id) {
    return res.status(400).json({
      msg: "Product ID is missing!",
      success: false,
    });
  }

  try {
    const deletedProduct = await Product.findOneAndDelete({
      userId,
      projectId,
      _id: id,
    });

    if (!deletedProduct) {
      return res.status(404).json({
        msg: "Product not found!",
        success: false,
      });
    }

    return res.status(200).json({
      msg: "Product deleted successfully!",
      success: true,
      data: deletedProduct,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});


export default products;

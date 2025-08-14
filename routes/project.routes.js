import express from "express";
import Project from "../models/Project.js";
import { verifyToken } from "../controllers/user.controllers.js";
import { upload } from "../middleware/upload.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const project = express.Router();

project.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { name, description, crmProject } = req.body;
    const userId = req.id;

    console.log("crm", crmProject);

    if (!userId) {
      return res.status(401).json({
        msg: "Unauthorized. Please log in!",
        success: false,
      });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        msg: "Project name is required!",
        success: false,
      });
    }

    let imageUrl =
      "https://image.shutterstock.com/z/stock-vector-restaurant-cafe-menu-template-design-food-flyer-293829758.jpg"; // Default image

    if (req.file) {
      const { file } = req;
      const allowedMimeTypes = [
        "image/png",
        "image/webp",
        "image/jpeg",
        "image/avif",
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          msg: "Only PNG, WebP, JPEG, and AVIF images are allowed!",
          success: false,
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          msg: "File size must be less than 5MB!",
          success: false,
        });
      }

      const filePath = file.path;
      if (!fs.existsSync(filePath)) {
        return res
          .status(400)
          .json({ msg: "Uploaded file not found.", success: false });
      }

      try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
          folder: "uploads/project",
          public_id: file.filename,
          resource_type: "auto",
        });

        imageUrl = uploadResult.url;
      } catch (uploadError) {
        console.error("Cloudinary Upload Error:", uploadError);
        return res.status(500).json({
          msg: "File upload failed!",
          success: false,
        });
      } finally {
        fs.unlinkSync(filePath);
      }
    }

    const newProject = new Project({
      name,
      description,
      userId,
      image: imageUrl,
      crmProject: crmProject || false,
    });

    await newProject.save();

    console.log(newProject);

    return res.status(201).json({
      msg: "Project created successfully!",
      success: true,
      data: newProject,
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

project.get("/", verifyToken, async (req, res) => {
  const userId = req.id;
  if (!userId) {
    return res.status(401).json({
      msg: "Unauthorized. Please log in!",
      success: false,
    });
  }

  try {
    const projects = await Project.find({ userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      msg: "All Projects",
      data: projects,
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

project.delete("/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({
      msg: "Project Id is missing!",
      success: false,
    });
  }

  try {
    const project = await Project.findOneAndDelete({ _id: id });

    if (!project) {
      return res.status(404).json({
        msg: "Project not found or you don't have permission to delete it.",
        success: false,
      });
    }

    return res.status(200).json({
      msg: "Project deleted successfully!",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
});

export default project;

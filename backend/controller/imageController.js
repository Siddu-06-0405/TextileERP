// controllers/imageController.js
import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs';
import util from 'util';


const unlinkFile = util.promisify(fs.unlink);

export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No files uploaded' 
      });
    }

    // Check number of files (max 5)
    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images can be uploaded at once'
      });
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of req.files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type: ${file.originalname}. Only JPEG, PNG, and WEBP are allowed.`
        });
      }
    }

    // Upload to Cloudinary
    const uploadPromises = req.files.map(file => 
      cloudinary.uploader.upload(file.path, {
        folder: 'products',
        
      })
    );

    const results = await Promise.all(uploadPromises);
    const imageUrls = results.map(result => result.secure_url);

    // Clean up - delete temp files
    await Promise.all(req.files.map(file => unlinkFile(file.path)));

    res.status(200).json({ 
      success: true,
      images: imageUrls 
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    
    // Clean up temp files if error occurs
    if (req.files) {
      await Promise.all(req.files.map(file => unlinkFile(file.path).catch(console.error)))
    }

    res.status(500).json({ 
      success: false,
      message: 'Image upload failed',
      error: error.message 
    });
  }
};
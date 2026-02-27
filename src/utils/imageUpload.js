const cloudinary = require("../config/cloudinary")
const fs = require("fs");

const uploadToCloudinary = async (filePath, userId) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `devTinderProfiles/${userId}`,
      public_id: userId,  
      overwrite: true,
      resource_type: "image",
    });

    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting upload file:", err);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (e) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting upload file:", err);
      } else {
        console.log("Upload file deleted:", filePath);
      }
    });

    console.error("Error while uploading to cloudinary", e);
    throw new Error("Error while uploading to cloudinary");
  }
};



const deleteFromCloudinary = async(publicId)=>{
try {
  await cloudinary.uploader.destroy(publicId)
} catch (error) {
    console.error("Error deleting image from Cloudinary", error);
}
}
module.exports = {uploadToCloudinary,deleteFromCloudinary};
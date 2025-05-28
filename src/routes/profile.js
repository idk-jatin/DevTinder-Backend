const express = require("express");
const profileRouter = express.Router();
const fs = require("fs");
const Image = require("../models/images");
const User = require("../models/user");
const Connection = require("../models/connections");
const { userAuth } = require("../middlewares/auth");
const { validateProfileData } = require("../utils/validation");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { uploadToCloudinary,deleteFromCloudinary } = require("../utils/imageUpload");
const upload = require("../middlewares/multer");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      age,
      gender,
      about,
      skills,
      likes,
      experience,
      githubUsername,
      linkedinProfile,
    } = req.user;
    res.json({
      profile: [
        firstName,
        lastName,
        age,
        gender,
        about,
        skills,
        likes,
        experience,
        githubUsername,
        linkedinProfile,
      ],
    });
  } catch (error) {
    res.status(400).send("Error : " + error.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    validateProfileData(req);
    const loggedInUser = req.user;
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();
    res.json({
      message: `${loggedInUser.firstName}, Your profile updated successfully`,
    });
  } catch (err) {
    res.status(400).send("Error : " + err.message);
  }
});

profileRouter.patch("/profile/edit/password", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { currPassword, newPassword } = req.body;
    const isPassValid = await loggedInUser.validatePassword(currPassword);
    if (!isPassValid) {
      return res.status(403).json({ error: "Invalid Current PassWord" });
    }
    if (
      !newPassword ||
      !validator.isStrongPassword(newPassword, {
        minLength: 8,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res
        .status(400)
        .json({
          error: "Invalid new password! Must contain a symbol and a number!",
        });
    }
    const isSamePassword = await bcrypt.compare(
      newPassword,
      loggedInUser.password
    );
    if (isSamePassword) {
      return res
        .status(400)
        .json({ error: "New password is same as old password!" });
    }
    const hashedNewPass = await bcrypt.hash(newPassword, 10);
    loggedInUser.password = hashedNewPass;
    await loggedInUser.save();
    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(400).json({ error: "Error updating password!" });
  }
});

profileRouter.put(
  "/profile/edit/upload",
  userAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      if (!req.file) {
        return res.status(400).json({
          message: "File is required. Please upload an image",
        });
      }

      const { url, publicId } = await uploadToCloudinary(
        req.file.path,
        loggedInUser._id
      );

      const newlyUploadedImage = new Image({
        url,
        publicId,
        uploadedBy: loggedInUser._id,
      });

      loggedInUser.photoUrl = url;
      await loggedInUser.save();
      await newlyUploadedImage.save();

      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error("Error deleting upload file:", err);
        } else {
          console.log("Upload file deleted:", req.file.path);
        }
      });

      return res.status(201).json({
        message: "Image uploaded successfully",
        image: {
          url,
          id: newlyUploadedImage._id,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        message: "Error Updating Profile Picture",
      });
    }
  }
);

profileRouter.delete("/profile/delete", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const userId = loggedInUser._id;

    const { currPassword } = req.body;

    const isSamePassword = await bcrypt.compare(
     currPassword,
      loggedInUser.password
    );
    if (!isSamePassword) {
      return res
        .status(400)
        .json({ error: "Password does not match" });
    }
    
    const userImages = await Image.find({ uploadedBy: userId });
    for (let img of userImages) {
      if (img.publicId) {
        await deleteFromCloudinary(img.publicId); 
      }
    }
    await Image.deleteMany({ uploadedBy: userId });

    await Connection.deleteMany({
      $or: [{ fromUserId: userId }, { toUserId: userId }]
    });

    await User.deleteOne({ _id: userId });
    res.cookie('token',null,{expires: new Date(Date.now())});
    res.status(200).json({ message: "User and all related data deleted successfully." });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Failed to delete profile." });
  }
});

module.exports = profileRouter;

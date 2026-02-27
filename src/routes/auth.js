const express = require("express");
const authRouter = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { validateSignupData } = require("../utils/validation");

authRouter.post("/signup", async (req, res) => {
  console.log("UI SIGNUP PAYLOAD:", req.body);
  try {
    //validn of data
    await validateSignupData(req.body);
    // pass encryption
    const { firstName, lastName, emailId, password } = req.body;
    const user = new User({ firstName, lastName, emailId, password });

    await user.save({ runValidators: true });
    res.json({ message: "User added successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ error: "Email/Password is required!" });
    }
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid Credentials");
    }
   ;
    const isPassValid = await user.validatePassword(password);
 
    if (!isPassValid) {
      throw new Error("Invalid Credentials");
    } else {
      const accessToken = user.getJWT();
      const refreshToken = user.getRefreshToken();

      res
        .cookie("token", accessToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 15 * 60 * 1000,
        })
        .cookie("refreshToken", refreshToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        
          res.json({
          message: "Login successful",
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailId: user.emailId,
            age: user.age,
            gender: user.gender,
            photoUrl: user.photoUrl,
            likes: user.likes,
            experience: user.experience,
            githubUsername: user.githubUsername,
            linkedinProfile: user.linkedinProfile,
            about: user.about,
            skills: user.skills,
            profileCompleted: user.profileCompleted
          },
        })
    
  }
  } catch (error) {
    return res.status(400).json({ error: "Login Failed" });
  }
});

authRouter.post("/logout", (req, res) => {
  res
    .clearCookie("token", { sameSite: "none", secure: true })
    .clearCookie("refreshToken", { sameSite: "none", secure: true })
    .json({ message: "Logout Successful" });
});

authRouter.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) throw new Error("User not found");

    const newAccessToken = user.getJWT();

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed" });
  } catch (err) {
    res.clearCookie("refreshToken", { sameSite: "none", secure: true });
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

module.exports = authRouter;

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import generateToken from "../utils/utils.js";
import cloudinary from "../lib/cloudinary.js";

//signup controller
const signup = async (req, res) => {
  const { firstName, lastName, username, email, password, profilePic } =
    req.body;

  try {
    //validations
    if (!firstName || !username || !email || !password) {
      return res.status(400).json({ message: "all fields are required" });
    }
    //pass validation
    if (password.length < 4) {
      return res
        .status(400)
        .json({ message: "password hsould be minmimum 4 charctaers short" });
    }
    //checking if user already exist or not
    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ message: "user already exists!! please login" });
    }
    //gen salts and hasing pass
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    //creating new user
    const newUser = new User({
      firstName,
      lastName,
      username,
      email,
      password: hashedPass,
    });

    //gen jwtToken before saving it
    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();
      res.status(201).json({
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "invalid user" });
    }
  } catch (error) {
    console.error("Error in signup COntrolelr", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};

//login controller
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    //validations
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }
    //getting user by email
    const user = await User.findOne({ email });
    //if user does not exists
    if (!user) {
      return res.status(400).json({ message: "invalid credentials!!" });
    }
    //if exists then compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    //if pass not matched
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "invalid credentials!!" });
    }
    //if everything is correct then generate token
    generateToken(user._id, res);
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Error in login COntroller", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};

//logout controller
const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error in logout COntrolelr", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};

//updateProfile controller
const updateProfile = async (req, res) => {
  try {
    //getting profilePic
    const { profilePic } = req.body;
    //getting user
    const userId = req.user._id;
    if (!profilePic) {
      return res.status(400).json({ message: "Profile picture is required!!" });
    }
    //setting up cloudinary
    try {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        resource_type: "auto",
        folder: "chat-app-profiles",
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: uploadResponse.secure_url },
        { new: true },
      );
      res.status(200).json(updatedUser);
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ message: "Failed to upload profile picture" });
    }
  } catch (error) {
    console.error("Error in updateProfile COntrolelr", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};


//checkAuth
const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("Error in checkAuth COntrolelr", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};
export { login, logout, signup, updateProfile,checkAuth };

//making protetcted routes using jwt.vrify

import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const protectedRoute = async (req, res,next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Unauthorized- no token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectedRoute middleares", error.message);
    res.status(500).json({ message: "internal server error!!" });
  }
};
export default protectedRoute;

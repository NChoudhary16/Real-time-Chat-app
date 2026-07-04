import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieparser from "cookie-parser";


import connectDB from "./lib/db.config.js";
import authRoutes from "./routes/auth.routes.js"
import messageRoutes from "./routes/message.routes.js"


dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieparser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use("/api/v1/auth",authRoutes);
app.use("/api/v1/messages",messageRoutes);

const start = async () => {
  try {
    await connectDB();
  app.listen(PORT, () => {
    console.log(`serevr is running on http://localhost:${PORT}/api/v1/`);
  });
  } catch (error) {
    onsole.error("Failed to start server:", error);
    process.exit(1);
  }
};
start();

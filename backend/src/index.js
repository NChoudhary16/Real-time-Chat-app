import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieparser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./lib/db.config.js";
import authRoutes from "./routes/auth.routes.js"
import messageRoutes from "./routes/message.routes.js"

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5001;

const userSocketMap = {}; // { userId: socketId }

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb" }));
app.use(cookieparser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  }),
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/messages", messageRoutes);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Broadcast online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

app.set("io", io);
app.set("userSocketMap", userSocketMap);

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}/api/v1/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
start();

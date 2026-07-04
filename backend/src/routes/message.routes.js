import express from "express";
import protectedRoute from "../middlewares/Auth.middlewares.js";
import { getMessages, getUserForSidebar, sendMessages } from "../controllers/message.controllers.js";

const router = express.Router();

router.get("/users",protectedRoute,getUserForSidebar)
router.get("/:id",protectedRoute,getMessages)
router.post("/send/:id",protectedRoute,sendMessages)

export default router;
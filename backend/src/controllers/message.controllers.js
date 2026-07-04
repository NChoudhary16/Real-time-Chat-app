import User from "../models/user.model.js";

import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";

//getting alluser except myself in sidebar of chats
const getUserForSidebar = async (req, res) => {
  try {
    // console.log(req.user._id);

    const loggedInUserId = req.user._id;
    const filteredUser = await User.find({
      _id: { $ne: loggedInUserId },
    }).select(-"password");
    res.status(200).json(filteredUser);
  } catch (error) {
    console.error("Error is getusersForSidebar :", error.message);
    res.status(500).json({ error: "internal server error" });
  }
};

//getting one-one messages
const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    //sender,receiver and vie versa

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error is getmessages controller :", error.message);
    res.status(500).json({ error: "internal server error" });
  }
};

//sendingMessages
const sendMessages = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    //todo implement socet.io to send
    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error is sednMessages controller :", error.message);
    res.status(500).json({ error: "internal server error" });
  }
};

export { getUserForSidebar, getMessages, sendMessages };

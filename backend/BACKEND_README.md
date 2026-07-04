# Backend Architecture Guide 🏗️

Detailed explanation of the backend structure, how data flows, and the critical Socket.io implementation for real-time chat.

---

## 📋 Backend Overview

The backend is an **Express.js server** with **Socket.io** for real-time communication. It handles:
- User authentication (signup/login/JWT)
- Message storage in MongoDB
- Real-time message delivery via WebSockets
- Online user tracking
- Image uploads to Cloudinary

---

## 📁 Backend File Structure

```
backend/src/
├── index.js                      # ⭐ Main server file with Socket.io
├── controllers/
│   ├── Auth.controllers.js       # Authentication logic
│   └── message.controllers.js    # Message & user list logic
├── models/
│   ├── user.model.js            # User Mongoose schema
│   └── message.model.js         # Message Mongoose schema
├── routes/
│   ├── auth.routes.js           # Auth endpoints (/signup, /login)
│   └── message.routes.js        # Message endpoints
├── middlewares/
│   └── Auth.middlewares.js      # JWT verification
└── lib/
    ├── db.config.js             # MongoDB connection
    └── cloudinary.js            # Cloudinary initialization
```

---

## 🔌 Socket.io Architecture (The Heart of Real-Time Chat)

### What is Socket.io?

Socket.io enables **bidirectional, real-time communication** between server and clients. Unlike HTTP (request-response), Socket.io keeps a persistent connection open, allowing instant message delivery.

### How It's Used in This App

```
                    Server (index.js)
                           |
        ┌──────────────────┼──────────────────┐
        |                  |                  |
    Socket.io          Express.js          MongoDB
   (Real-time)        (HTTP APIs)        (Database)
        |                  |                  |
        └──────────────────┼──────────────────┘
                           |
        ┌──────────────────┴──────────────────┐
        |                                     |
    Client 1 (React)                   Client 2 (React)
   Socket Connection                  Socket Connection
```

---

## 🔑 Key Concept: userSocketMap

### What is userSocketMap?

```javascript
const userSocketMap = {
  "userId_123": "socketId_abc123",
  "userId_456": "socketId_def456",
  "userId_789": "socketId_ghi789"
}
```

It's a **map that tracks which socket connections belong to which users**. This is essential for:
1. Broadcasting online users to all clients
2. Sending messages to specific users (not broadcast)
3. Knowing when users disconnect

### Why We Need It

Without this map, the server wouldn't know:
- Who is connected?
- Which socket to send a message to?
- How to update online status when someone disconnects?

---

## 📖 Backend File Explanations

### [index.js](./src/index.js) - Main Server File ⭐⭐⭐

**Purpose:** Initialize Express server, Socket.io, and handle real-time connections.

```javascript
// 1. Create HTTP server (required for Socket.io)
const server = createServer(app);

// 2. Create Socket.io instance with CORS settings
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],  // Frontend URL
    credentials: true,  // Allow cookies
  },
});

// 3. Track connected users
const userSocketMap = {};  // { userId: socketId }
```

**Socket.io Connection Handler:**

```javascript
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  // Get userId from query params sent by frontend
  const userId = socket.handshake.query.userId;
  
  if (userId) {
    // Store: "user_123" -> "socket_abc123"
    userSocketMap[userId] = socket.id;
  }
  
  // Send all connected user IDs to ALL clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  
  // When user disconnects
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    
    // Remove from map
    delete userSocketMap[userId];
    
    // Notify all clients of updated list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Store on app for controllers to access
app.set("io", io);
app.set("userSocketMap", userSocketMap);
```

**Key Socket Methods:**
- `io.emit()` - Send to ALL clients
- `io.to(socketId).emit()` - Send to specific client
- `socket.on()` - Listen for events from client
- `socket.handshake.query` - Get data sent when connecting

---

### [Auth.controllers.js](./src/controllers/Auth.controllers.js)

**Purpose:** Handle user authentication (signup, login, profile updates).

#### `signup()`

```javascript
const signup = async (req, res) => {
  // 1. Validate input
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }
  
  // 2. Check if user exists
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: "Email already exists" });
  }
  
  // 3. Hash password with bcryptjs (10 salt rounds)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // 4. Create user in MongoDB
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,  // Never store plain password!
  });
  
  // 5. Generate JWT token
  generateToken(user._id, res);
  
  // 6. Send user data (without password)
  res.status(201).json({
    _id: user._id,
    firstName: user.firstName,
    // ... other fields
  });
};
```

**Security Points:**
- ✅ Password is hashed with bcryptjs (can't be decrypted)
- ✅ JWT token is sent in HTTP-only cookie (JavaScript can't access)
- ✅ Password never returned to frontend

#### `login()`

```javascript
const login = async (req, res) => {
  // 1. Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  
  // 2. Compare provided password with stored hash
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  
  // 3. Generate JWT and send user data
  generateToken(user._id, res);
  res.status(200).json(user);
};
```

#### `updateProfile()`

```javascript
const updateProfile = async (req, res) => {
  const { profilePic } = req.body;  // Base64 image
  const userId = req.user._id;  // From JWT token
  
  // Upload to Cloudinary
  const uploadResponse = await cloudinary.uploader.upload(profilePic, {
    resource_type: "auto",
    folder: "chat-app-profiles",
  });
  
  // Update user in MongoDB
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePic: uploadResponse.secure_url },
    { new: true }  // Return updated user
  );
  
  res.status(200).json(updatedUser);
};
```

---

### [message.controllers.js](./src/controllers/message.controllers.js)

**Purpose:** Handle message operations and user list retrieval.

#### `getUserForSidebar()` - Get All Users Except Self

```javascript
const getUserForSidebar = async (req, res) => {
  const loggedInUserId = req.user._id;  // From JWT
  
  // Get all users EXCEPT the logged-in user
  const filteredUser = await User.find({
    _id: { $ne: loggedInUserId }  // $ne = not equal
  }).select("-password");  // Don't return password
  
  res.status(200).json(filteredUser);
};
```

#### `getMessages()` - Get Chat History

```javascript
const getMessages = async (req, res) => {
  const { id: otherUserId } = req.params;
  const userId = req.user._id;
  
  // Find messages where:
  // - sender is me AND receiver is otherUser, OR
  // - sender is otherUser AND receiver is me
  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ]
  }).sort({ createdAt: 1 });  // Oldest first
  
  res.status(200).json(messages);
};
```

#### `sendMessages()` - Save Message & Emit via Socket.io ⭐

**This is where real-time chat happens!**

```javascript
const sendMessages = async (req, res) => {
  const { text, image } = req.body;
  const { id: receiverId } = req.params;
  const senderId = req.user._id;
  
  // 1. Upload image to Cloudinary if provided
  let imageUrl;
  if (image) {
    const uploadResponse = await cloudinary.uploader.upload(image, {
      resource_type: "auto",
      folder: "chat-app",
    });
    imageUrl = uploadResponse.secure_url;
  }
  
  // 2. Save message to MongoDB
  const newMessage = new Message({
    senderId,
    receiverId,
    text,
    image: imageUrl,
  });
  await newMessage.save();
  
  // 3. Get Socket.io instance and user map from app context
  const io = req.app.get("io");
  const userSocketMap = req.app.get("userSocketMap");
  
  // 4. Find receiver's socket ID
  const receiverSocketId = userSocketMap[receiverId];
  
  // 5. Send message via Socket.io ONLY to receiver
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }
  
  // 6. Send response to sender
  res.status(201).json(newMessage);
};
```

**Data Flow Explained:**

```
Frontend sends: POST /api/v1/messages/send/:userId
    ↓
Backend receives text + image (base64)
    ↓
Upload image to Cloudinary (get URL)
    ↓
Save to MongoDB: { senderId, receiverId, text, image: cloudinaryURL }
    ↓
Look up receiverSocketId in userSocketMap
    ↓
io.to(receiverSocketId).emit("newMessage", messageObject)
    ↓
Receiver's Socket.io listener triggers
    ↓
Frontend updates messages array
    ↓
Message appears in ChatContainer
```

---

### [Auth.middlewares.js](./src/middlewares/Auth.middlewares.js)

**Purpose:** Verify JWT token on protected routes.

```javascript
const protectedRoute = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.jwt;
    
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Verify token with secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const user = await User.findById(decoded.userId);
    req.user = user;
    
    next();  // Continue to next handler
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
```

**How It's Used:**

```javascript
// Protected route - only runs if valid JWT present
router.get("/check", protectedRoute, checkAuth);

// Request flow:
// POST /api/v1/auth/check
// → protectedRoute middleware verifies JWT
// → If valid: req.user set, checkAuth runs
// → If invalid: 401 error returned
```

---

### [user.model.js](./src/models/user.model.js) & [message.model.js](./src/models/message.model.js)

**User Model:**

```javascript
const userSchema = new Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String,  // Hashed with bcryptjs
  profilePic: String,  // Cloudinary URL
  createdAt: { type: Date, default: Date.now },
});
```

**Message Model:**

```javascript
const messageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: Schema.Types.ObjectId, ref: "User" },
  text: String,
  image: String,  // Cloudinary URL
  createdAt: { type: Date, default: Date.now },
});
```

---

## 🔄 Complete Request Flow Example

### User Sends a Message

```
1. FRONTEND sends message
   POST /api/v1/messages/send/userId_456
   {
     text: "Hello!",
     image: "data:image/png;base64,..."
   }
   
2. BACKEND receives request
   ↓
   protectedRoute middleware verifies JWT
   ↓
   sendMessages controller:
   
   a) Upload image to Cloudinary
      Result: https://res.cloudinary.com/...
   
   b) Save to MongoDB
      Document: {
        senderId: userId_123,
        receiverId: userId_456,
        text: "Hello!",
        image: "https://res.cloudinary.com/...",
        createdAt: 2024-01-15T10:30:00Z
      }
   
   c) Get receiver's socketId from userSocketMap
      userSocketMap[userId_456] = "socket_xyz789"
   
   d) Emit via Socket.io
      io.to("socket_xyz789").emit("newMessage", messageObject)
      
   e) Send response to sender
      res.status(201).json(messageObject)

3. RECEIVER's browser receives Socket.io event
   socket.on("newMessage", (newMessage) => {
     // Update Zustand store
     set({ messages: [...messages, newMessage] })
   })
   
4. REACT component re-renders
   ChatContainer shows new message
```

---

## 🎯 Socket.io Event Sequence

### User Logs In

```
Frontend:
  1. User enters credentials
  2. POST /auth/login
  3. Receive JWT + user data
  4. useAuthStore.connectSocket()
     ↓
     Create socket connection:
     io(BASE_URL, { query: { userId: user._id } })

Backend:
  1. io.on("connection", (socket) => {
       const userId = socket.handshake.query.userId
       userSocketMap[userId] = socket.id
       io.emit("getOnlineUsers", Object.keys(userSocketMap))
     })

Frontend:
  1. socket.on("getOnlineUsers", (userIds) => {
       set({ onlineUsers: userIds })
     })
  2. Sidebar component sees updated onlineUsers
  3. Green dot appears next to online users
```

### User Disconnects

```
Browser:
  1. User closes tab / logs out
  2. Socket connection closes

Backend:
  1. socket.on("disconnect", () => {
       delete userSocketMap[userId]
       io.emit("getOnlineUsers", Object.keys(userSocketMap))
     })

Frontend:
  1. All clients receive new onlineUsers list
  2. Green dot disappears from disconnected user
```

---

## 🛡️ Security Features

### Password Security

✅ **Bcryptjs Hashing**
- 10 salt rounds (computationally expensive to crack)
- Different hash for same password (salt is random)
- One-way encryption (can't be reversed)

```javascript
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);
// Result: $2b$10$...long_random_hash...
```

### JWT Authentication

✅ **HTTP-Only Cookies**
- Token stored in cookie that JavaScript can't access
- Automatically sent with every request
- Protected from XSS attacks

```javascript
// In generateToken function:
res.cookie("jwt", token, {
  httpOnly: true,  // JavaScript can't access
  secure: true,    // Only sent over HTTPS
  sameSite: "strict"  // CSRF protection
});
```

### Socket.io Security

✅ **CORS Protection**
- Only requests from frontend URL allowed
- Prevents connections from other domains

```javascript
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],  // Only this URL
    credentials: true,
  },
});
```

---

## 🚀 Startup Sequence

When backend starts:

```
1. Load environment variables (.env)
2. Create Express app
3. Create HTTP server
4. Create Socket.io instance
5. Connect to MongoDB
6. Register middleware (JSON parser, CORS, cookies)
7. Mount routes (/auth, /messages)
8. Setup Socket.io connection handler
9. Listen on PORT 5001

Server ready for:
✅ HTTP requests at http://localhost:5001/api/v1
✅ WebSocket connections from http://localhost:5173
```

---

## 📊 Data Types & Flow

### Message Object (sent via Socket.io)

```javascript
{
  _id: "507f1f77bcf86cd799439011",
  senderId: "507f1f77bcf86cd799439012",
  receiverId: "507f1f77bcf86cd799439013",
  text: "Hello!",
  image: "https://res.cloudinary.com/...",
  createdAt: "2024-01-15T10:30:00.000Z",
  __v: 0
}
```

### User Object

```javascript
{
  _id: "507f1f77bcf86cd799439012",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  username: "johndoe",
  profilePic: "https://res.cloudinary.com/...",
  password: "$2b$10$...hashed...",
  createdAt: "2024-01-10T15:20:00.000Z"
}
```

---

## 🐛 Common Issues & Solutions

**Issue: Socket.io not connecting**
- Check CORS origin matches frontend URL
- Ensure Socket.io port (5001) is not blocked

**Issue: Online users not showing**
- Verify userId is passed in Socket.io query
- Check userSocketMap is being populated

**Issue: Messages not received**
- Check receiverId matches user._id format
- Verify receiver is connected (in userSocketMap)
- Check Cloudinary credentials for image uploads

**Issue: JWT expired**
- Token expires after 1 hour
- User needs to login again
- Token auto-refreshed on login

---

## 📚 Next Steps

1. Explore [Socket.io documentation](https://socket.io/docs/)
2. Try adding typing indicators
3. Implement message delivery receipts
4. Add user presence (away/online/busy)
5. Deploy to production with proper secrets


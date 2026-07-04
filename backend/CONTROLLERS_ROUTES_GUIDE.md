# Backend Controllers & Routes Guide 🎯

Detailed explanation of backend controller logic, request handling, and API endpoints.

---

## 📋 Backend File Structure

```
backend/src/
├── controllers/
│   ├── Auth.controllers.js       ← Authentication logic
│   └── message.controllers.js    ← Messages & users logic
│
├── routes/
│   ├── auth.routes.js           ← Auth endpoints
│   └── message.routes.js        ← Message endpoints
│
├── middlewares/
│   └── Auth.middlewares.js      ← JWT verification
│
└── models/
    ├── user.model.js            ← User schema
    └── message.model.js         ← Message schema
```

---

## 🔐 Authentication Flow

### [Auth.controllers.js](./src/controllers/Auth.controllers.js) - Detailed Explanation

#### 1. SIGNUP Controller

**File Location:** `backend/src/controllers/Auth.controllers.js` (lines ~1-60)

**HTTP Request:**
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Code Explanation:**

```javascript
const signup = async (req, res) => {
  try {
    // 1. EXTRACT & VALIDATE INPUT
    const { firstName, lastName, email, password } = req.body;
    
    // Check all fields present
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: "All fields are required" 
      });
    }
    
    // Check password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be 6 characters or longer" 
      });
    }
    
    // 2. CHECK IF EMAIL ALREADY EXISTS
    const userAlreadyExists = await User.findOne({ email });
    
    if (userAlreadyExists) {
      return res.status(400).json({ 
        message: "Email already exists" 
      });
    }
    
    // 3. HASH PASSWORD (Security!)
    // Why bcryptjs?
    // - bcrypt is extremely slow to crack (1000x slower than regular hash)
    // - Each password gets a random "salt" added
    // - Even same password → different hash
    
    const salt = await bcrypt.genSalt(10);
    // genSalt(10) = 10 rounds of hashing = very secure + slow
    // Takes ~1 second to hash one password
    // Attacker needs 1 second × 1 billion passwords = 30+ years
    
    const hashedPassword = await bcrypt.hash(password, salt);
    // Result: $2b$10$aB5cD9eF2gH1iJ3kL5mN7oP9qR1sT3uV5wX7yZ9aB1cD3eF5
    // ✅ Can't be reversed back to plain text
    // ✅ Each hash is unique (due to random salt)
    
    // 4. CREATE NEW USER IN MONGODB
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,  // Never store plain password!
      // profilePic: defaults to undefined (uses DiceBear avatar)
    });
    
    // 5. GENERATE JWT TOKEN
    // generateToken(userId, res) creates JWT and sets cookie
    generateToken(newUser._id, res);
    // JWT expires in 1 hour
    // Sent in HTTP-only cookie (JavaScript can't access)
    
    // 6. SEND USER DATA (WITHOUT PASSWORD!)
    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
    // ✅ Never send password to frontend!
    
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**Step-by-Step Flow:**

```
1. Frontend sends: { firstName, lastName, email, password }
   ↓
2. Backend validates:
   • All fields present?
   • Password 6+ chars?
   • Email not already used?
   ↓
3. Hash password with bcryptjs:
   "password123" → "$2b$10$...long_hash..."
   ↓
4. Save to MongoDB:
   {
     _id: ObjectId("..."),
     firstName: "John",
     lastName: "Doe",
     email: "john@example.com",
     password: "$2b$10$...hash...",
     profilePic: undefined,
     createdAt: Date.now()
   }
   ↓
5. Generate JWT token:
   • Create: jwt.sign({ userId }, SECRET, { expiresIn: "1h" })
   • Send in HTTP-only cookie
   ↓
6. Return user data (NO PASSWORD)
   ✅ Success!
```

---

#### 2. LOGIN Controller

**File Location:** `backend/src/controllers/Auth.controllers.js` (lines ~63-100)

**HTTP Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Code Explanation:**

```javascript
const login = async (req, res) => {
  try {
    // 1. EXTRACT EMAIL & PASSWORD
    const { email, password } = req.body;
    
    // 2. VALIDATE INPUT
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }
    
    // 3. FIND USER BY EMAIL
    const user = await User.findOne({ email });
    
    // User doesn't exist → return generic error (security!)
    // Why generic? So attackers can't enumerate emails
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid credentials" 
        // Not: "Email not found" ← too specific!
      });
    }
    
    // 4. COMPARE PASSWORDS
    // user.password = stored hash: "$2b$10$...hash..."
    // password = plain text: "password123"
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    // bcrypt.compare:
    // - Hashes the plain password
    // - Compares to stored hash
    // - Returns true/false
    
    // Password doesn't match
    if (!isPasswordCorrect) {
      return res.status(400).json({ 
        message: "Invalid credentials" 
      });
    }
    
    // 5. GENERATE JWT TOKEN
    generateToken(user._id, res);
    
    // 6. RETURN USER DATA
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePic: user.profilePic,
    });
    
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**Password Comparison Explained:**

```javascript
// Plain text password entered by user
const password = "password123";

// Stored hash from database
const storedHash = "$2b$10$aB5cD9eF2gH1iJ3kL5mN7oP9qR1sT3uV5wX7yZ9aB1cD3eF5";

// Compare them
const isCorrect = await bcrypt.compare(password, storedHash);
// ✅ true - passwords match!

// If wrong password:
const isCorrect = await bcrypt.compare("wrong", storedHash);
// ❌ false - passwords don't match
```

---

#### 3. LOGOUT Controller

**File Location:** `backend/src/controllers/Auth.controllers.js` (lines ~103-113)

**HTTP Request:**
```http
POST /api/v1/auth/logout
(Requires valid JWT in cookie)
```

**Code Explanation:**

```javascript
const logout = async (req, res) => {
  try {
    // Clear JWT cookie (sets it to empty)
    res.clearCookie("jwt");
    
    res.status(200).json({ message: "Logged out successfully" });
    
  } catch (error) {
    console.error("Error in logout:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**How It Works:**

```javascript
// Cookie is set like:
res.cookie("jwt", token, {
  httpOnly: true,      // Can't access with JS
  secure: true,        // Only over HTTPS
  sameSite: "strict",  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Logout clears it:
res.clearCookie("jwt");  // Sets maxAge=0, expires immediately

// Frontend can't set cookies (security!)
// Must be done by backend in Set-Cookie header
```

---

#### 4. UPDATE PROFILE Controller

**File Location:** `backend/src/controllers/Auth.controllers.js` (lines ~116-145)

**HTTP Request:**
```http
PUT /api/v1/auth/update-profile
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "profilePic": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Code Explanation:**

```javascript
const updateProfile = async (req, res) => {
  try {
    // 1. GET DATA FROM REQUEST
    const { profilePic } = req.body;  // Base64 image
    const userId = req.user._id;      // From JWT middleware
    
    // 2. VALIDATE
    if (!profilePic) {
      return res.status(400).json({ 
        message: "Profile picture is required" 
      });
    }
    
    // 3. UPLOAD TO CLOUDINARY
    // Why Cloudinary?
    // - Free storage (up to 25GB)
    // - CDN for fast delivery
    // - Auto image optimization
    // - No server storage needed
    
    try {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        resource_type: "auto",      // Auto-detect image type
        folder: "chat-app-profiles" // Organize uploads
      });
      
      // uploadResponse = {
      //   public_id: "chat-app-profiles/abc123",
      //   secure_url: "https://res.cloudinary.com/...",
      //   format: "png",
      //   width: 200,
      //   height: 200,
      //   ...
      // }
      
    } catch (uploadError) {
      console.error("Cloudinary error:", uploadError);
      return res.status(400).json({ 
        message: "Failed to upload profile picture" 
      });
    }
    
    // 4. UPDATE USER IN MONGODB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }  // Return updated document
    );
    
    // 5. RETURN UPDATED USER
    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**Image Upload Flow:**

```
1. User selects image on ProfilePage
   ↓
2. FileReader converts to base64
   data:image/png;base64,iVBORw0KGgoAAAA...
   ↓
3. Frontend sends to: PUT /auth/update-profile
   ↓
4. Backend receives base64
   ↓
5. Cloudinary.uploader.upload() receives base64
   ↓
6. Cloudinary:
   • Validates image format
   • Stores on CDN servers
   • Returns HTTPS URL
   ↓
7. Backend saves URL to MongoDB
   ↓
8. User's profilePic = "https://res.cloudinary.com/..."
   ↓
9. Frontend gets updated user data
   ↓
10. ProfilePage renders new avatar
```

---

#### 5. CHECK AUTH Controller

**File Location:** `backend/src/controllers/Auth.controllers.js` (lines ~148-160)

**HTTP Request:**
```http
GET /api/v1/auth/check
Authorization: Bearer {JWT_TOKEN}
(Cookie has jwt token)
```

**Code Explanation:**

```javascript
const checkAuth = async (req, res) => {
  try {
    // req.user is set by protectedRoute middleware
    // If invalid JWT → middleware returns 401
    // If valid JWT → req.user contains user data
    
    res.status(200).json(req.user);
    
    // Returns: { _id, firstName, lastName, email, profilePic, ... }
    
  } catch (error) {
    console.error("Error in checkAuth:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**Used By Frontend:**

```javascript
// In useAuthStore.checkAuth():
const checkAuth = async () => {
  try {
    const res = await axiosInstance.get("/auth/check");
    set({ authUser: res.data });  // User is logged in
    get().connectSocket();         // Connect to Socket.io
  } catch (error) {
    set({ authUser: null });       // Not logged in
  }
};
```

---

## 💬 Message Handlers

### [message.controllers.js](./src/controllers/message.controllers.js) - Detailed Explanation

#### 1. GET USERS FOR SIDEBAR

**File Location:** `backend/src/controllers/message.controllers.js` (lines ~6-22)

**HTTP Request:**
```http
GET /api/v1/messages/users
Authorization: Bearer {JWT_TOKEN}
```

**Code Explanation:**

```javascript
const getUserForSidebar = async (req, res) => {
  try {
    // 1. GET LOGGED-IN USER ID FROM JWT
    const loggedInUserId = req.user._id;
    
    // 2. FIND ALL USERS EXCEPT SELF
    const filteredUser = await User.find({
      _id: { $ne: loggedInUserId }  // $ne = not equal
      // Finds all users where _id is NOT loggedInUserId
    }).select("-password");  // Don't return password field
    
    // 3. RETURN USERS
    res.status(200).json(filteredUser);
    
    // Returns array:
    // [
    //   { _id, firstName, lastName, email, profilePic },
    //   { _id, firstName, lastName, email, profilePic },
    //   ...
    // ]
    
  } catch (error) {
    console.error("Error in getUserForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

**MongoDB Query Explained:**

```javascript
// Find all users
await User.find({});

// Find all users except me
await User.find({ _id: { $ne: myId } });

// Also exclude password
await User.find({ _id: { $ne: myId } }).select("-password");
// .select("-password") removes password from result

// Result:
[
  {
    _id: ObjectId("507f1f77bcf86cd799439012"),
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    profilePic: "https://res.cloudinary.com/...",
    // ✅ No password field!
  },
  // ... more users
]
```

---

#### 2. GET MESSAGES BETWEEN TWO USERS

**File Location:** `backend/src/controllers/message.controllers.js` (lines ~25-42)

**HTTP Request:**
```http
GET /api/v1/messages/507f1f77bcf86cd799439012
Authorization: Bearer {JWT_TOKEN}
```

**Code Explanation:**

```javascript
const getMessages = async (req, res) => {
  try {
    // 1. GET USER IDS
    const { id: otherUserId } = req.params;  // From URL
    const userId = req.user._id;              // From JWT
    
    // 2. FIND ALL MESSAGES BETWEEN USERS
    const messages = await Message.find({
      $or: [
        // Messages I sent to other user
        { senderId: userId, receiverId: otherUserId },
        
        // Messages other user sent to me
        { senderId: otherUserId, receiverId: userId },
      ]
    }).sort({ createdAt: 1 });  // Oldest first
    
    // 3. RETURN MESSAGES
    res.status(200).json(messages);
    
    // Returns array:
    // [
    //   {
    //     _id: ObjectId("..."),
    //     senderId: ObjectId("user_123"),
    //     receiverId: ObjectId("user_456"),
    //     text: "Hello!",
    //     image: "https://res.cloudinary.com/...",
    //     createdAt: "2024-01-15T10:30:00Z"
    //   },
    //   ...
    // ]
    
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

**MongoDB Query Explained:**

```javascript
// Find messages I sent to user_456
await Message.find({
  senderId: user_123,
  receiverId: user_456
});

// Find messages from user_456 to me
await Message.find({
  senderId: user_456,
  receiverId: user_123
});

// Find both (conversation)
await Message.find({
  $or: [
    { senderId: user_123, receiverId: user_456 },
    { senderId: user_456, receiverId: user_123 },
  ]
});

// Sort by date (oldest first)
.sort({ createdAt: 1 });
// 1 = ascending (oldest first)
// -1 = descending (newest first)
```

---

#### 3. SEND MESSAGE (With Socket.io) ⭐⭐⭐

**File Location:** `backend/src/controllers/message.controllers.js` (lines ~45-85)

**HTTP Request:**
```http
POST /api/v1/messages/send/507f1f77bcf86cd799439012
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "text": "Hello!",
  "image": "data:image/png;base64,iVBORw0KGgoAAAA..."
}
```

**Code Explanation:**

```javascript
const sendMessages = async (req, res) => {
  try {
    // 1. EXTRACT DATA
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    
    // 2. UPLOAD IMAGE TO CLOUDINARY (if provided)
    let imageUrl;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: "auto",
          folder: "chat-app",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary error:", uploadError);
        return res.status(400).json({ 
          error: "Failed to upload image" 
        });
      }
    }
    
    // 3. SAVE MESSAGE TO MONGODB
    const newMessage = new Message({
      senderId,           // Who sent it
      receiverId,         // Who receives it
      text,               // Message text
      image: imageUrl,    // Cloudinary URL
      // createdAt: auto-generated by Mongoose
    });
    
    await newMessage.save();
    
    // 4. EMIT MESSAGE VIA SOCKET.IO ⭐
    // This is what makes it REAL-TIME!
    
    const io = req.app.get("io");              // Get Socket.io instance
    const userSocketMap = req.app.get("userSocketMap");  // Get user→socket map
    
    // Find receiver's socket ID
    const receiverSocketId = userSocketMap[receiverId];
    
    // If receiver is online
    if (receiverSocketId) {
      // Send message ONLY to receiver (not broadcast)
      io.to(receiverSocketId).emit("newMessage", newMessage);
      // receiverSocketId = "FKgMw-h8A3LVAAAAB"
      // io.to("FKgMw-h8A3LVAAAAB") = target that specific socket
      // .emit("newMessage", ...) = send event named "newMessage"
    }
    
    // 5. SEND RESPONSE TO SENDER
    res.status(201).json(newMessage);
    
  } catch (error) {
    console.error("Error in sendMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

**Complete Message Flow:**

```
SENDER SIDE:
  1. Types message in frontend
  2. Clicks send button
  3. MessageInput calls sendMessage()
  4. useChatStore.sendMessage()
  5. POST /api/v1/messages/send/receiver_id
     { text: "Hello!", image: null }
  
BACKEND:
  6. sendMessages controller receives
  7. Validates senderId from JWT ✅
  8. Saves to MongoDB
  9. Looks up receiver in userSocketMap
  10. If receiver online:
      io.to(receiverSocketId).emit("newMessage", messageData)
  11. Returns response to sender
  
RECEIVER SIDE:
  12. Socket.io listener fires
      socket.on("newMessage", (newMessage) => {...})
  13. Updates useChatStore.messages
  14. ChatContainer re-renders
  15. Message appears instantly! ✅
  
SENDER SIDE:
  16. Receives API response
  17. Updates useChatStore.messages
  18. Message appears for sender
```

---

## 🛣️ Routes & Middleware

### [auth.routes.js](./src/routes/auth.routes.js)

```javascript
import express from "express";
import { signup, login, logout, updateProfile, checkAuth } from "../controllers/Auth.controllers.js";
import { protectedRoute } from "../middlewares/Auth.middlewares.js";

const router = express.Router();

// PUBLIC routes (anyone can access)
router.post("/signup", signup);           // POST /api/v1/auth/signup
router.post("/login", login);             // POST /api/v1/auth/login

// PROTECTED routes (require valid JWT)
router.post("/logout", protectedRoute, logout);                    // POST /api/v1/auth/logout
router.put("/update-profile", protectedRoute, updateProfile);     // PUT /api/v1/auth/update-profile
router.get("/check", protectedRoute, checkAuth);                  // GET /api/v1/auth/check

export default router;
```

**Route Protection:**

```javascript
// Public route - anyone can access
router.post("/signup", signup);

// Protected route - requires valid JWT
router.post("/logout", protectedRoute, logout);
//          ↑middleware↑   ↑controller↑
// Request flow:
// POST /logout
//   → protectedRoute middleware runs
//   → Verifies JWT in cookie
//   → If valid: next() → logout controller runs
//   → If invalid: 401 error response
```

---

### [message.routes.js](./src/routes/message.routes.js)

```javascript
import express from "express";
import { getUserForSidebar, getMessages, sendMessages } from "../controllers/message.controllers.js";
import { protectedRoute } from "../middlewares/Auth.middlewares.js";

const router = express.Router();

// ALL PROTECTED (require JWT)

// GET all users except self
router.get("/users", protectedRoute, getUserForSidebar);
// GET /api/v1/messages/users

// GET messages with specific user
router.get("/:id", protectedRoute, getMessages);
// GET /api/v1/messages/:userId

// SEND message (with optional image)
router.post("/send/:id", protectedRoute, sendMessages);
// POST /api/v1/messages/send/:userId

export default router;
```

---

### [Auth.middlewares.js](./src/middlewares/Auth.middlewares.js) - JWT Verification

**File Location:** `backend/src/middlewares/Auth.middlewares.js`

**Code Explanation:**

```javascript
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectedRoute = async (req, res, next) => {
  try {
    // 1. GET JWT TOKEN FROM COOKIE
    const token = req.cookies.jwt;
    
    if (!token) {
      return res.status(401).json({ 
        message: "Not authenticated - No token" 
      });
    }
    
    // 2. VERIFY TOKEN WITH SECRET
    // jwt.verify(token, secret) returns:
    // { userId: "507f1f77bcf86cd799439012", iat: ..., exp: ... }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // If invalid/expired → throws error → catch block
    
    // 3. GET USER FROM DATABASE
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        message: "Not authenticated - User not found" 
      });
    }
    
    // 4. ATTACH USER TO REQUEST
    req.user = user;  // Now controller can access req.user._id
    
    // 5. CONTINUE TO NEXT MIDDLEWARE/CONTROLLER
    next();
    
  } catch (error) {
    console.log("Error in protectedRoute middleware:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token expired" 
      });
    }
    
    res.status(401).json({ 
      message: "Not authenticated - Invalid token" 
    });
  }
};
```

**Middleware Flow:**

```
Request arrives: POST /api/v1/messages/send/user_456
  ↓
Express routing matches: router.post("/send/:id", protectedRoute, sendMessages)
  ↓
protectedRoute middleware runs:
  ├─ Get JWT from cookie
  ├─ Verify JWT with secret
  ├─ Get user from database
  ├─ Attach user to req.user
  └─ next() → continue
  ↓
sendMessages controller runs:
  ├─ Access req.user._id (sender)
  ├─ Access req.params.id (receiver)
  ├─ Process request
  └─ Send response
```

---

## 🔑 JWT Token Explained

### How JWT Works

**JWT Format:** `header.payload.signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTIiLCJpYXQiOjE3MDUzMjM4MDAsImV4cCI6MTcwNTMyNzQwMH0
.
x7K3Z9mL2pQ5rS8uV1wX4yZ6aB3cD5eF7gH9iJ1kL3m
```

**Decoded Payload:**

```json
{
  "userId": "507f1f77bcf86cd799439012",
  "iat": 1705323800,      // issued at
  "exp": 1705327400       // expires at (1 hour later)
}
```

### Token Generation (in Auth.middlewares.js)

```javascript
const generateToken = (userId, res) => {
  // Create JWT
  const token = jwt.sign(
    { userId },                              // Payload
    process.env.JWT_SECRET,                 // Secret key
    { expiresIn: "1h" }                     // Expires in 1 hour
  );
  
  // Set as HTTP-only cookie
  res.cookie("jwt", token, {
    httpOnly: true,      // 🔒 Can't access with JavaScript
    secure: true,        // 🔒 Only over HTTPS
    sameSite: "strict",  // 🔒 CSRF protection
    maxAge: 60 * 60 * 1000  // 1 hour in milliseconds
  });
  
  return token;
};
```

**Token Flow:**

```
1. User logs in successfully
   ↓
2. generateToken(userId, res)
   ↓
3. JWT created: jwt.sign({ userId }, SECRET, { expiresIn: "1h" })
   ↓
4. Set in HTTP-only cookie:
   Set-Cookie: jwt=eyJhbGciOi...; HttpOnly; Secure; ...
   ↓
5. Browser stores cookie automatically
   ↓
6. All future requests auto-include cookie
   ↓
7. Backend extracts from req.cookies.jwt
   ↓
8. Verify with jwt.verify(token, SECRET)
   ↓
9. If valid: continue
   If expired/invalid: return 401
```

---

## 🔌 Socket.io Integration in Controllers

### How Backend Emits to Specific User

**Concept:** `userSocketMap` maps users to their Socket connections

```javascript
// Example userSocketMap
{
  "user_123": "socket_abc",
  "user_456": "socket_def",
  "user_789": "socket_ghi"
}
```

**In sendMessages controller:**

```javascript
// Get receiver's socket ID
const receiverSocketId = userSocketMap[receiverId];
// receiverSocketId = "socket_def"

// Send message ONLY to that socket
if (receiverSocketId) {
  io.to(receiverSocketId).emit("newMessage", newMessage);
}

// If receiver offline:
if (!receiverSocketId) {
  // Message still saved in MongoDB
  // Receiver gets it when they login and fetch history
}
```

---

## 📊 Complete Request/Response Examples

### Example 1: User Signs Up

**Request:**
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Set-Cookie: jwt=eyJhbGciOi...; HttpOnly; Secure

{
  "_id": "507f1f77bcf86cd799439012",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "profilePic": null
}
```

**Backend Processing:**
```
1. Receive request
2. Validate input
3. Check email not used
4. Hash password: "password123" → "$2b$10$..."
5. Save to MongoDB
6. Generate JWT
7. Set JWT in cookie
8. Return user data (no password)
```

---

### Example 2: User Sends Message

**Request:**
```http
POST /api/v1/messages/send/507f1f77bcf86cd799439456
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "text": "Hello!",
  "image": null
}
```

**Response:**
```http
HTTP/1.1 201 Created

{
  "_id": "507f1f77bcf86cd799439567",
  "senderId": "507f1f77bcf86cd799439012",
  "receiverId": "507f1f77bcf86cd799439456",
  "text": "Hello!",
  "image": null,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Backend Processing:**
```
1. protectedRoute middleware verifies JWT
   → req.user = sender user data
2. sendMessages controller:
   a) Get senderId from req.user._id
   b) Get receiverId from req.params.id
   c) Save message to MongoDB
   d) Look up receiverId in userSocketMap
   e) If online:
      io.to(receiverSocketId).emit("newMessage", messageData)
   f) Return message to sender
```

**Receiver Side:**
```
1. Socket.io event received: "newMessage"
2. Frontend socket listener fires:
   socket.on("newMessage", (newMessage) => {
     if (newMessage.senderId === selectedUser._id) {
       set({ messages: [...messages, newMessage] })
     }
   })
3. Message added to messages array
4. React component re-renders
5. Message appears in chat
```

---

## 🎯 Error Handling

### Common HTTP Status Codes

```javascript
// 200 - OK (successful GET/DELETE)
res.status(200).json(data);

// 201 - CREATED (successful POST/PUT)
res.status(201).json(newData);

// 400 - BAD REQUEST (validation error)
res.status(400).json({ message: "Missing required fields" });

// 401 - UNAUTHORIZED (invalid/missing JWT)
res.status(401).json({ message: "Not authenticated" });

// 404 - NOT FOUND (resource doesn't exist)
res.status(404).json({ message: "User not found" });

// 500 - INTERNAL SERVER ERROR (unhandled exception)
res.status(500).json({ message: "Internal server error" });
```

### Example Error Response

**Frontend tries to send message to non-existent user:**

```javascript
// Frontend
POST /api/v1/messages/send/invalid_user_id
{ text: "Hello" }

// Backend receives, receiver not in userSocketMap
// Message still saved to MongoDB (future delivery)
// Returns to frontend:
{
  "_id": "...",
  "senderId": "...",
  "receiverId": "invalid_user_id",
  "text": "Hello",
  "image": null,
  "createdAt": "2024-01-15T10:30:00Z"
}

// Status: 201 (saved successfully)
// ✅ Even if receiver offline, message is stored
```

---

## 📚 Summary

**Authentication Flow:**
1. Signup → Hash password → Save to DB → Generate JWT
2. Login → Compare password → Generate JWT
3. Protected routes → Verify JWT → Attach user to request

**Messaging Flow:**
1. Send message → Save to DB → Upload image (if any) → Emit via Socket.io
2. Receiver gets message via Socket.io (if online) or from DB history (if offline)

**Socket.io Integration:**
- `userSocketMap` tracks connected users
- `io.to(socketId)` sends to specific user
- Backend emits "newMessage" event
- Frontend listens and updates chat


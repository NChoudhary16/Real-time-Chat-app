# Real-Time Chat Application 🎉

A full-stack real-time chat application built with **React + Node.js + MongoDB + Socket.io**. Users can sign up, log in, chat with other users, send images, and see who's online in real-time.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [How It Works](#how-it-works)
- [API Endpoints](#api-endpoints)
- [Socket.io Events](#socketio-events)

---

## ✨ Features

✅ **User Authentication**
- Secure signup/login with bcryptjs password hashing
- JWT token-based authentication
- Session management with HTTP-only cookies

✅ **Real-Time Chat**
- Send and receive messages instantly via Socket.io
- Message history with message timestamps
- Real-time online status indicators

✅ **Image Sharing**
- Upload profile pictures and message images
- Cloudinary integration for image storage
- Auto-generated anime avatars for default profiles

✅ **User Management**
- See all online users in sidebar
- Filter to show only online users
- View user profiles with profile pictures

✅ **Theme Customization**
- Multiple DaisyUI theme options
- Theme persistence in localStorage
- Instant theme switching

---

## 🛠 Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool with hot reload
- **React Router** - Client-side navigation
- **Zustand** - State management
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **DaisyUI** - Component library
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **JWT** - Token authentication
- **Cloudinary** - Image storage
- **CORS** - Cross-origin requests

---

## 📁 Project Structure

```
Real time Chat app/
├── frontend/                          # React application
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── HomePage.jsx          # Chat interface
│   │   │   ├── LoginPage.jsx         # Login form
│   │   │   ├── SignupPage.jsx        # Registration form
│   │   │   ├── ProfilePage.jsx       # User profile
│   │   │   └── SettingsPage.jsx      # Theme settings
│   │   ├── components/               # Reusable components
│   │   │   ├── Navbar.jsx            # Navigation header
│   │   │   ├── Sidebar.jsx           # User list
│   │   │   ├── ChatContainer.jsx     # Messages area
│   │   │   ├── ChatHeader.jsx        # Chat title bar
│   │   │   ├── MessageInput.jsx      # Message form
│   │   │   └── skeletons/            # Loading placeholders
│   │   ├── store/                    # Zustand state stores
│   │   │   ├── useAuthStore.js       # Auth & Socket.io state
│   │   │   ├── useChatStore.js       # Chat & messages state
│   │   │   ├── useThemeStore.js      # Theme state
│   │   │   └── constants.js          # Theme list
│   │   ├── lib/
│   │   │   ├── axios.js              # Axios config with baseURL
│   │   │   └── utils.js              # Helper functions
│   │   ├── App.jsx                   # Main app with routes
│   │   └── main.jsx                  # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── backend/                           # Express application
    ├── src/
    │   ├── index.js                  # Server entry & Socket.io setup
    │   ├── controllers/              # Request handlers
    │   │   ├── Auth.controllers.js   # Auth logic (signup/login)
    │   │   └── message.controllers.js # Message & user logic
    │   ├── models/                   # Mongoose schemas
    │   │   ├── user.model.js         # User schema
    │   │   └── message.model.js      # Message schema
    │   ├── routes/                   # API endpoints
    │   │   ├── auth.routes.js        # Auth endpoints
    │   │   └── message.routes.js     # Message endpoints
    │   ├── middlewares/              # Express middlewares
    │   │   └── Auth.middlewares.js   # JWT verification
    │   └── lib/
    │       ├── db.config.js          # MongoDB connection
    │       └── cloudinary.js         # Cloudinary config
    ├── .env                          # Environment variables
    └── package.json
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB running locally or Atlas URL
- Cloudinary account for image uploads

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file with:
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/chatapp
JWT_SECRET=your_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Start server
npm start
# Server runs on http://localhost:5001
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs on http://localhost:5173
```

---

## 📡 How It Works

### Authentication Flow

```
User enters email/password
         ↓
Frontend POST /api/v1/auth/signup or /login
         ↓
Backend validates and hashes password with bcryptjs
         ↓
JWT token generated and sent in HTTP-only cookie
         ↓
Frontend receives user data and stores in Zustand
         ↓
User connects to Socket.io with userId in query
         ↓
User is added to userSocketMap on backend
         ↓
All clients receive updated onlineUsers list
```

### Real-Time Messaging Flow

```
User sends message via MessageInput component
         ↓
Frontend calls sendMessage (POST /api/v1/messages/send/:userId)
         ↓
Backend saves message to MongoDB
         ↓
Backend looks up receiver's socketId from userSocketMap
         ↓
Backend emits "newMessage" event to receiver via Socket.io
         ↓
Receiver's frontend receives message and updates chat state
         ↓
Message displays in ChatContainer component
```

### Online Status Flow

```
User logs in
    ↓
Frontend creates Socket.io connection with userId
    ↓
Backend adds userId to userSocketMap
    ↓
Backend broadcasts "getOnlineUsers" with all connected IDs
    ↓
All clients update onlineUsers array in Zustand
    ↓
Sidebar component displays green dot next to online users
```

---

## 🔌 API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/signup` | Create new account | ❌ |
| POST | `/api/v1/auth/login` | Login user | ❌ |
| POST | `/api/v1/auth/logout` | Logout user | ✅ |
| GET | `/api/v1/auth/check` | Verify JWT token | ✅ |
| PUT | `/api/v1/auth/update-profile` | Upload profile pic | ✅ |

### Message Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/messages/users` | Get all users | ✅ |
| GET | `/api/v1/messages/:userId` | Get chat history | ✅ |
| POST | `/api/v1/messages/send/:userId` | Send message/image | ✅ |

---

## 🎯 Socket.io Events

See [SOCKET_IO_GUIDE.md](./backend/SOCKET_IO_GUIDE.md) for detailed Socket.io documentation.

### Events Overview

**Server → Client:**
- `getOnlineUsers` - List of online user IDs
- `newMessage` - New message received
- `userConnected` - User came online
- `userDisconnected` - User went offline

**Client → Server:**
- (No custom events currently - uses HTTP POST for messages)

---

## 📝 File-by-File Breakdown

### Frontend Components

#### [App.jsx](./frontend/src/App.jsx)
- Main app component with React Router
- Protected routes for authenticated users
- Loading state while checking authentication
- Renders Navbar and Routes

#### [HomePage.jsx](./frontend/src/pages/HomePage.jsx)
- Main chat interface with Sidebar and ChatContainer
- Flex layout with user list on left, chat on right

#### [Sidebar.jsx](./frontend/src/components/Sidebar.jsx)
- Displays list of all users
- Shows online status with green indicator
- Filter for showing only online users
- Clicking user sets selectedUser for chat

#### [ChatContainer.jsx](./frontend/src/components/ChatContainer.jsx)
- Shows message history with sender/receiver
- Subscribes to real-time messages via Socket.io
- Auto-scrolls to latest message

#### [MessageInput.jsx](./frontend/src/components/MessageInput.jsx)
- Text input for messages
- Image picker for sending images as base64

### Backend Files

#### [index.js](./backend/src/index.js)
- Express app setup and middleware configuration
- Socket.io server initialization
- `userSocketMap` for tracking connected users
- Socket connection/disconnection handlers

#### [Auth.controllers.js](./backend/src/controllers/Auth.controllers.js)
- `signup()` - Create user with bcryptjs password hashing
- `login()` - Validate credentials, generate JWT
- `logout()` - Clear JWT cookie
- `updateProfile()` - Upload profile pic to Cloudinary
- `checkAuth()` - Verify JWT token

#### [message.controllers.js](./backend/src/controllers/message.controllers.js)
- `getUserForSidebar()` - Return all users except self
- `getMessages()` - Fetch chat history between users
- `sendMessages()` - Save message and emit via Socket.io

### Zustand Stores (Frontend)

#### [useAuthStore.js](./frontend/src/store/useAuthStore.js)
- State: `authUser`, `onlineUsers`, `socket`
- Methods: `signup()`, `login()`, `logout()`, `connectSocket()`, `checkAuth()`
- Socket.io connection management

#### [useChatStore.js](./frontend/src/store/useChatStore.js)
- State: `messages`, `users`, `selectedUser`
- Methods: `getUsers()`, `getMessages()`, `sendMessage()`
- Socket.io message subscription

---

## 🔐 Security Features

✅ **Password Security**
- Passwords hashed with bcryptjs (10 salt rounds)
- Never stored in plain text

✅ **JWT Authentication**
- Tokens stored in HTTP-only cookies (can't be accessed by JavaScript)
- 1-hour expiration time
- Protected routes require valid token

✅ **CORS Protection**
- Only requests from http://localhost:5173 allowed
- Credentials included with requests

✅ **Input Validation**
- Email format validation
- Password minimum 6 characters
- Required field checking

---

## 🎨 Component Data Flow

```
App.jsx (Routes & Auth Check)
├── HomePage.jsx (Main Chat)
│   ├── Sidebar.jsx (User List)
│   │   └── Uses: useChatStore.getUsers()
│   │   └── Shows: onlineUsers from useAuthStore
│   │   └── Sets: selectedUser
│   └── ChatContainer.jsx (Messages)
│       ├── Uses: useChatStore.getMessages()
│       ├── Uses: useChatStore.sendMessage()
│       ├── Subscribes: Socket.io "newMessage"
│       └── Shows: messages array
│           └── MessageInput.jsx (Form)
├── ProfilePage.jsx (Profile)
│   └── Uses: useAuthStore.updateProfile()
├── SettingsPage.jsx (Theme)
│   └── Uses: useThemeStore.setTheme()
└── LoginPage/SignupPage
    └── Uses: useAuthStore.login() / signup()
        └── Triggers: connectSocket()
```

---

## 🐛 Troubleshooting

**Issue: "Cannot find module"**
- Run `npm install` in both frontend and backend

**Issue: "Connection refused"**
- Ensure backend is running on port 5001
- Check MongoDB is running

**Issue: "Image upload fails"**
- Check Cloudinary credentials in .env
- Verify image is valid base64

**Issue: "Online status not showing"**
- Check Socket.io is connected (check browser console)
- Verify Socket.io port 5001 is accessible

---

## 📚 Additional Documentation

- [Backend Socket.io Guide](./backend/SOCKET_IO_GUIDE.md)
- [Frontend State Management Guide](./frontend/STORE_GUIDE.md)
- [Component Details](./frontend/COMPONENTS_GUIDE.md)

---

## 👨‍💻 Author Notes

This is a learning project demonstrating:
- Full-stack JavaScript development
- Real-time communication with Socket.io
- State management with Zustand
- MongoDB database operations
- JWT authentication
- Image uploads with Cloudinary
- React component architecture

Enjoy exploring the code! 🚀

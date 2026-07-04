# Frontend Architecture Guide 🎨

Complete guide to the React frontend, state management with Zustand, and how components work together.

---

## 📋 Frontend Overview

The frontend is a **React 19 + Vite** single-page application that provides:
- User authentication (signup/login)
- Real-time chat interface
- User listing with online status
- Profile management
- Theme customization
- Socket.io real-time updates

---

## 📁 Frontend Project Structure

```
frontend/src/
├── pages/                          # Full page components (routes)
│   ├── HomePage.jsx               # Main chat interface
│   ├── LoginPage.jsx              # Login form
│   ├── SignupPage.jsx             # Registration form
│   ├── ProfilePage.jsx            # User profile & avatar upload
│   └── SettingsPage.jsx           # Theme selector
│
├── components/                    # Reusable components
│   ├── Navbar.jsx                # Navigation header (profile, settings, logout)
│   ├── Sidebar.jsx               # User list sidebar
│   ├── ChatContainer.jsx         # Messages display area
│   ├── ChatHeader.jsx            # Chat title with user info
│   ├── MessageInput.jsx          # Text input & image upload
│   ├── NoChatSelected.jsx        # Empty state
│   ├── AuthImagePattern.jsx      # Decorative pattern for auth pages
│   └── skeletons/                # Loading placeholders
│       ├── SidebarSkeleton.jsx
│       └── MessageSkeleton.jsx
│
├── store/                         # Zustand state management
│   ├── useAuthStore.js           # Authentication & Socket.io state
│   ├── useChatStore.js           # Messages & chat state
│   ├── useThemeStore.js          # Theme state
│   └── constants.js              # Constants (themes list)
│
├── lib/                           # Utilities
│   ├── axios.js                  # Axios instance configuration
│   └── utils.js                  # Helper functions
│
├── App.jsx                        # Main app component with routing
└── main.jsx                       # Entry point
```

---

## 🎯 Application Flow

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ main.jsx                                                     │
│ Entry point, mounts App to DOM                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ App.jsx                                                      │
│ - React Router setup                                        │
│ - checkAuth() on mount                                      │
│ - Protected routes                                          │
│ - Navbar                                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    HomePage      LoginPage   SignupPage
   (Protected)     (Public)     (Public)
        │
        ├─ Sidebar.jsx       (User list)
        ├─ ChatContainer.jsx (Messages)
        │   └─ MessageInput.jsx
        └─ ChatHeader.jsx
```

---

## 🔑 State Management with Zustand

### What is Zustand?

Zustand is a lightweight state management library (simpler than Redux):

```javascript
// Create store
import { create } from "zustand";

const useMyStore = create((set) => ({
  // State
  count: 0,
  
  // Methods to update state
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Use in component
function MyComponent() {
  const { count, increment } = useMyStore();
  return <button onClick={increment}>{count}</button>;
}
```

### Store Architecture

```
┌────────────────────────────────────────────────────┐
│ useAuthStore.js                                   │
├────────────────────────────────────────────────────┤
│ STATE:                                             │
│   • authUser (logged-in user data)               │
│   • onlineUsers (Socket.io online list)          │
│   • socket (Socket.io instance)                  │
│   • isCheckingAuth, isSigningUp, isLoggingIn    │
│                                                  │
│ METHODS:                                          │
│   • signup(fullName, email, password)            │
│   • login(email, password)                       │
│   • logout()                                     │
│   • checkAuth() (verify JWT)                    │
│   • connectSocket() (Socket.io setup)           │
│   • disconnectSocket()                          │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ useChatStore.js                                   │
├────────────────────────────────────────────────────┤
│ STATE:                                             │
│   • messages (chat history)                      │
│   • users (all users for sidebar)                │
│   • selectedUser (current chat)                  │
│   • isUsersLoading, isMessagesLoading           │
│                                                  │
│ METHODS:                                          │
│   • getUsers() (fetch from API)                 │
│   • getMessages(userId)                        │
│   • sendMessage({ text, image })               │
│   • subscribeToMessage() (Socket.io)            │
│   • setSelectedUser(user)                       │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ useThemeStore.js                                  │
├────────────────────────────────────────────────────┤
│ STATE:                                             │
│   • theme (current DaisyUI theme)               │
│                                                  │
│ METHODS:                                          │
│   • setTheme(themeName)                         │
│                                                  │
│ FEATURES:                                         │
│   • Persists to localStorage                     │
│   • Updates document[data-theme]                │
└────────────────────────────────────────────────────┘
```

---

## 📖 File-by-File Explanation

### [App.jsx](./src/App.jsx) - Main Application

```javascript
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";

const App = () => {
  // Get auth state and methods
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  
  // On component mount: verify JWT token
  useEffect(() => {
    checkAuth();  // GET /auth/check to verify token
  }, [checkAuth]);
  
  // Update DOM theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  
  // Show loading spinner while checking auth
  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  
  return (
    <div>
      <Navbar />  {/* Navigation on all pages */}
      
      <Routes>
        {/* Protected route - only if logged in */}
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        
        {/* Public route - only if NOT logged in */}
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        />
        
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        
        {/* Protected routes */}
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
      </Routes>
      
      <Toaster />  {/* Toast notifications */}
    </div>
  );
};

export default App;
```

**Route Protection Logic:**
```
- `/` → HomePage: ✅ if authUser, ❌ redirect to /login
- `/login` → LoginPage: ✅ if !authUser, ❌ redirect to /
- `/profile` → ProfilePage: ✅ if authUser, ❌ redirect to /login
```

### [HomePage.jsx](./src/pages/HomePage.jsx) - Main Chat Interface

```javascript
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  
  return (
    <div className="h-screen bg-base-200">
      {/* Container with top padding for navbar */}
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-lg w-full max-w-6xl h-[calc(100vh-8rem)]">
          
          {/* Flex row: left sidebar, right chat area */}
          <div className="flex h-full rounded-lg overflow-hidden">
            
            {/* LEFT SIDE: User list */}
            <Sidebar />
            
            {/* RIGHT SIDE: Chat or empty state */}
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│              Navbar (fixed top)                 │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Sidebar         │   ChatContainer or           │
│  (User list)     │   NoChatSelected             │
│  • online users  │   • Messages                 │
│  • green dot     │   • Message input            │
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

### [Sidebar.jsx](./src/components/Sidebar.jsx) - User List

```javascript
import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  // Get state from stores
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();  // From Socket.io!
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  
  // Fetch users on mount
  useEffect(() => {
    getUsers();  // GET /messages/users
  }, [getUsers]);
  
  // Filter users if "show online only" is checked
  const filteredUsers = showOnlineOnly
    ? users.filter(user => onlineUsers.includes(user._id))
    : users;
  
  // Show loading state while fetching
  if (isUsersLoading) return <SidebarSkeleton />;
  
  return (
    <aside className="h-full w-20 lg:w-64 border-r border-base-300 flex flex-col transition-all duration-200">
      
      {/* Header */}
      <div className="border-b border-base-300 p-4">
        <h2 className="font-bold text-lg">Messages</h2>
      </div>
      
      {/* Filter button */}
      <div className="p-3 border-b border-base-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
            className="checkbox checkbox-sm"
          />
          <span className="text-sm">Online only</span>
        </label>
      </div>
      
      {/* User list */}
      <div className="overflow-y-auto flex-1">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex gap-3 hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300" : ""}
            `}
          >
            {/* Avatar */}
            <div className="relative">
              <img
                src={
                  user.profilePic ||
                  `https://avatars.dicebear.com/api/anime/${user.firstName}.svg`
                }
                alt={user.firstName}
                className="w-12 h-12 object-cover rounded-full"
              />
              
              {/* Online indicator (green dot) */}
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-base-100" />
              )}
            </div>
            
            {/* User info */}
            <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:text-left">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-base-content/50">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
```

**Key Features:**
- ✅ Fetches user list on mount
- ✅ Shows online status from Socket.io (green dot)
- ✅ Filters to show only online users
- ✅ Clicking user sets `selectedUser` in chat store
- ✅ Selected user is highlighted
- ✅ Shows loading skeleton while fetching

### [ChatContainer.jsx](./src/components/ChatContainer.jsx) - Messages Display

```javascript
import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    getMessages,
    subscribeToMessage,
    unsubscribeFromMessages,
    isMessagesLoading,
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  
  // Fetch messages when selectedUser changes
  useEffect(() => {
    getMessages(selectedUser._id);  // GET /messages/:userId
    
    // Subscribe to real-time messages
    subscribeToMessage();  // socket.on("newMessage")
    
    // Cleanup: unsubscribe when component unmounts
    return () => unsubscribeFromMessages();
  }, [selectedUser._id]);
  
  // Auto-scroll to latest message
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);
  
  if (isMessagesLoading) return <MessageSkeleton />;
  
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      
      {/* Chat header with user info */}
      <ChatHeader />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.senderId === authUser._id ? "justify-end" : "justify-start"
            }`}
          >
            {/* Receiver's message (left) */}
            {message.senderId !== authUser._id && (
              <div className="flex gap-3">
                <img
                  src={
                    selectedUser.profilePic ||
                    `https://avatars.dicebear.com/api/anime/${selectedUser.firstName}.svg`
                  }
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
                <div className="chat-bubble">
                  {message.image && (
                    <img src={message.image} alt="Attachment" className="max-w-xs rounded-md mb-2" />
                  )}
                  {message.text}
                </div>
              </div>
            )}
            
            {/* Sender's message (right) */}
            {message.senderId === authUser._id && (
              <div className="chat chat-end">
                <div className="chat-bubble chat-bubble-primary">
                  {message.image && (
                    <img src={message.image} alt="Attachment" className="max-w-xs rounded-md mb-2" />
                  )}
                  {message.text}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Invisible element for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input at bottom */}
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
```

**Socket.io Integration:**
```javascript
// 1. Subscribe to messages when component mounts
useEffect(() => {
  subscribeToMessage();  // socket.on("newMessage", ...)
  return () => unsubscribeFromMessages();
}, [selectedUser._id]);

// In useChatStore:
subscribeToMessage: () => {
  const socket = useAuthStore.getState().socket;
  
  socket.on("newMessage", (newMessage) => {
    // Check if from selected user
    if (newMessage.senderId === selectedUser._id) {
      // Add to messages array
      set({ messages: [...get().messages, newMessage] });
    }
  });
};
```

### [MessageInput.jsx](./src/components/MessageInput.jsx) - Text & Image Input

```javascript
import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();
  
  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);  // data:image/png;base64,...
    };
    reader.readAsDataURL(file);
  };
  
  // Remove selected image
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!text.trim() && !imagePreview) return;
    
    try {
      // Send message (POST /messages/send/:userId)
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });
      
      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  
  return (
    <div className="p-4 w-full border-t border-base-300">
      
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-base-300"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* Input form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          
          {/* Text input */}
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          {/* Image input (hidden) */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          
          {/* Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-circle"
          >
            <Image className="w-5 h-5" />
          </button>
        </div>
        
        {/* Send button */}
        <button type="submit" className="btn btn-circle btn-primary">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
```

**Image Upload Flow:**
```
1. User clicks image icon
2. File picker opens (accept="image/*")
3. User selects image
4. handleImageChange fires
5. FileReader converts to base64
6. Preview shows image
7. User types message (optional)
8. User clicks send
9. sendMessage called with { text, image: base64 }
10. Frontend: POST /messages/send/:userId { text, image }
11. Backend: Uploads base64 to Cloudinary
12. Backend: Saves with Cloudinary URL
13. Backend: Emits to receiver via Socket.io
14. Message appears with image
```

### [Navbar.jsx](./src/components/Navbar.jsx) - Navigation

```javascript
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  
  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold">Talkative🦜</h1>
          </Link>
          
          {/* Right navigation */}
          <div className="flex items-center gap-2">
            
            {/* Settings link */}
            <Link to="/settings" className="btn btn-sm gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            
            {/* Auth links */}
            {authUser && (
              <>
                {/* Profile link */}
                <Link to="/profile" className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
                
                {/* Logout button */}
                <button className="btn btn-sm gap-2" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
```

---

## 🔐 [useAuthStore.js](./src/store/useAuthStore.js) - Authentication & Socket.io

```javascript
import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "http://production-url.com";

export const useAuthStore = create((set, get) => ({
  
  // STATE
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: false,
  onlineUsers: [],
  socket: null,
  
  // SIGNUP
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      // Transform fullName to firstName/lastName
      const [firstName, lastName = ""] = data.fullName.split(" ");
      
      // POST /auth/signup
      const res = await axiosInstance.post("/auth/signup", {
        firstName,
        lastName,
        email: data.email,
        password: data.password,
      });
      
      // Store user and connect Socket.io
      set({ authUser: res.data });
      get().connectSocket();
      
      toast.success("Account created successfully");
    } catch (error) {
      const message = error.response?.data?.message || "Signup failed";
      toast.error(message);
    } finally {
      set({ isSigningUp: false });
    }
  },
  
  // LOGIN
  login: async (email, password) => {
    set({ isLoggingIn: true });
    try {
      // POST /auth/login
      const res = await axiosInstance.post("/auth/login", {
        email,
        password,
      });
      
      // Store user and connect Socket.io
      set({ authUser: res.data });
      get().connectSocket();
      
      toast.success("Logged in successfully");
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
    } finally {
      set({ isLoggingIn: false });
    }
  },
  
  // LOGOUT
  logout: async () => {
    try {
      // POST /auth/logout
      await axiosInstance.post("/auth/logout");
      
      // Disconnect Socket.io and clear auth
      set({ authUser: null, onlineUsers: [] });
      get().disconnectSocket();
      
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  },
  
  // CHECK AUTH (verify JWT)
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      // GET /auth/check (requires valid JWT)
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();  // Connect Socket.io if valid
    } catch (error) {
      // Invalid/expired JWT
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  
  // UPDATE PROFILE
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      // PUT /auth/update-profile
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      const message = error.response?.data?.message || "Update failed";
      toast.error(message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  
  // CONNECT SOCKET.IO ⭐⭐⭐
  connectSocket: () => {
    const { authUser } = get();
    
    // Don't connect if no user or already connected
    if (!authUser || get().socket?.connected) return;
    
    // Create Socket.io connection
    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,  // Send userId to backend
      },
    });
    
    set({ socket: socket });
    
    // LISTENER 1: Receive online users list
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
    
    // LISTENER 2: User came online
    socket.on("userConnected", (userId) => {
      set((state) => ({
        onlineUsers: [...new Set([...state.onlineUsers, userId])],
      }));
    });
    
    // LISTENER 3: User went offline
    socket.on("userDisconnected", (userId) => {
      set((state) => ({
        onlineUsers: state.onlineUsers.filter((id) => id !== userId),
      }));
    });
  },
  
  // DISCONNECT SOCKET.IO
  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
      set({ socket: null });
    }
  },
}));
```

---

## 💬 [useChatStore.js](./src/store/useChatStore.js) - Messages & Chat

```javascript
import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useChatStore = create((set, get) => ({
  
  // STATE
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  
  // GET ALL USERS
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // GET /messages/users
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load users";
      toast.error(message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  // GET MESSAGES WITH USER
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      // GET /messages/:userId
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load messages";
      toast.error(message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  // SEND MESSAGE
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      // POST /messages/send/:userId
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData  // { text, image }
      );
      
      // Add to messages array
      set({ messages: [...messages, res.data] });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to send message";
      toast.error(message);
    }
  },
  
  // SUBSCRIBE TO REAL-TIME MESSAGES ⭐
  subscribeToMessage: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    
    // Get Socket.io instance from auth store
    const socket = useAuthStore.getState().socket;
    
    // Listen for "newMessage" event
    socket.on("newMessage", (newMessage) => {
      // Only add if from selected user
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;
      
      // Add message to array
      set({ messages: [...get().messages, newMessage] });
    });
  },
  
  // UNSUBSCRIBE FROM MESSAGES
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
  
  // SET SELECTED USER
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  
  // SET TYPING STATUS
  setTyping: (isTyping) => set({ isTyping }),
}));
```

---

## 🎨 Component Tree

```
App
├── Navbar
│   ├── Link to /settings
│   ├── Link to /profile
│   └── Logout button
│
├── Routes
│   ├── HomePage (/)
│   │   ├── Sidebar
│   │   │   └── User list with online dots
│   │   │
│   │   └── ChatContainer or NoChatSelected
│   │       ├── ChatHeader
│   │       ├── Messages list
│   │       │   ├── Avatar
│   │       │   ├── Message text
│   │       │   └── Image (if any)
│   │       │
│   │       └── MessageInput
│   │           ├── Text input
│   │           ├── Image button
│   │           └── Send button
│   │
│   ├── LoginPage (/login)
│   │   └── Login form
│   │
│   ├── SignupPage (/signup)
│   │   └── Signup form
│   │
│   ├── ProfilePage (/profile)
│   │   └── Profile form
│   │
│   └── SettingsPage (/settings)
│       └── Theme selector
│
└── Toaster (notifications)
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User interacts with UI                                  │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│ Component calls Zustand method                          │
│ Example: sendMessage({ text, image })                  │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│ Zustand method makes API call                           │
│ POST /api/v1/messages/send/:userId                      │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│ Backend processes request                               │
│ • Saves to MongoDB                                      │
│ • Uploads image to Cloudinary                          │
│ • Emits via Socket.io to receiver                      │
└─────────────┬───────────────────────────────────────────┘
              │
              ├─────────────────────────────────────────→ Receiver via Socket.io
              │                                            │
              ↓                                            ↓
┌───────────────────────────┐     ┌──────────────────────────────────┐
│ Sender receives response  │     │ Receiver listens for newMessage  │
│ Updates Zustand state     │     │ Updates Zustand state            │
│ Component re-renders      │     │ Component re-renders             │
│ Message appears           │     │ Message appears                  │
└───────────────────────────┘     └──────────────────────────────────┘
```

---

## 🛡️ Error Handling

The app uses `react-hot-toast` for user feedback:

```javascript
try {
  await someAction();
  toast.success("Action completed!");
} catch (error) {
  const message = error.response?.data?.message || "Something went wrong";
  toast.error(message);
}
```

---

## 🎨 Styling with Tailwind + DaisyUI

- **Tailwind CSS**: Utility-first CSS framework
- **DaisyUI**: Component library on top of Tailwind
- **Themes**: Multiple built-in DaisyUI themes (coffee, dark, light, etc.)
- **Applied with**: `data-theme` attribute on `<html>` element

```javascript
// In App.jsx
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
}, [theme]);
```

---

## 🚀 Next Steps to Enhance Frontend

1. **Typing Indicator**
   - Show "User is typing..." while other person types
   - Emit typing event to Socket.io

2. **Message Read Receipts**
   - Show ✓ for sent, ✓✓ for received
   - Show timestamps

3. **Image Preview Modal**
   - Click image to enlarge in modal

4. **Search Messages**
   - Search chat history by text

5. **Delete/Edit Messages**
   - Allow editing sent messages
   - Delete messages (soft delete)

6. **Group Chats**
   - Create group conversations
   - Add/remove members

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [DaisyUI Documentation](https://daisyui.com)
- [Socket.io Client Documentation](https://socket.io/docs/v4/client-api/)

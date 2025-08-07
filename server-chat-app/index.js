import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoute from "./Routes/authRoute.js";
import userRoute from "./Routes/userRoute.js";
import postRoute from "./Routes/postRoute.js";
// import uploadRouter from "./Routes/UploadRoute.js";
import chatRoute from "./Routes/chatRoute.js";
import messageRoute from "./Routes/messageRoute.js";
import { createServer } from "http";
import { Server } from "socket.io";
import addProduct from "./Routes/addProduct.js";

const app = express();
app.use(express.static("public"));
app.use("/images", express.static("images"));
app.use(cookieParser());
app.use(express.json());
app.use(cors());
dotenv.config();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "https://dream-tech.netlify.app/" },
  // cors: { origin: "https://prismatic-sorbet-b96267.netlify.app/" },
  // cors: { origin: "https://deft-paprenjak-f681e6.netlify.app/" },
});
// const io = new Server(httpServer, {
//   cors: { origin: "https://chat-app-client-2dm9.onrender.com" },
// });

let activeUsers = [];

io.on("connection", (socket) => {
  // add new User
  socket.on("new-user-add", (newUserId) => {
    // if user is not added previously
    if (!activeUsers.some((user) => user.userId === newUserId)) {
      activeUsers.push({ userId: newUserId, socketId: socket.id });
      console.log("New User Connected", activeUsers);
    }
    // send all active users to new users
    io.emit("get-users", activeUsers);
  });

  socket.on("disconnect", () => {
    // remove user from active users
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    console.log("User Disconnected", activeUsers);
    // send all active users to all users
    io.emit("get-users", activeUsers);
  });

  socket.on("send-message", (data) => {
    const { receiverId } = data;
    const user = activeUsers.find((user) => user.userId === receiverId);
    console.log("Sending from socket to :", receiverId);
    console.log("Data: ", data);
    if (user) {
      io.to(user.socketId).emit("recieve-message", data);
    }
  });
});

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("successfully connect with mongodb");
  } catch (error) {
    throw error;
  }
};
mongoose.connection.on("disconnected", () => {
  console.log("mongoDB disconnected!");
});
mongoose.connection.on("connected", () => {
  console.log("mongoDB connected!");
});

app.get("/", (req, res) => {
  res.json("hello users");
});

app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use("/post", postRoute);
// app.use("/upload", uploadRouter);
app.use("/chat", chatRoute);
app.use("/message", messageRoute);
app.use("/product", addProduct);

app.set("port", process.env.PORT || 5002);

httpServer.listen(app.get("port"), function () {
  connect();
  console.log("connect with backend");
});

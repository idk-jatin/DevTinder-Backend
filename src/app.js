require("dotenv").config();
const cors = require('cors')
const express = require("express");
const app = express();
const http = require("http");
const connectdb = require("./config/database");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 7777;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://devtinder-virid.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat");
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", chatRouter);

const server = http.createServer(app);
const initializeSocket = require("./utils/socket");
initializeSocket(server);

connectdb()
  .then(() => {
    console.log("connection successfull");
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}...`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
//const upload = multer({ dest: "uploads/" });

const salt = bcrypt.genSaltSync(10);
const secret = "nedamtipassword!24";

const app = express();
const PORT = process.env.PORT || 8080;
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.set("strictQuery", false);

//create mongoose connection
mongoose.connect(
  "mongodb+srv://Dea:Nika2805@cluster0.cewwyfa.mongodb.net/?retryWrites=true&w=majority",
  () => {
    console.log("\x1b[35m", "Connected to MongoDB");
  }
);

//middleware
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log("body", req.body);
  // const avatarUrl = req.file ? "/uploads/" + req.file.filename : null;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    console.log("infoid", info.username);
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
      created_by: info.username,
    });
    res.json(postDoc);
  });
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(req.body.id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("You are not author of this post");
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(10)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Post.findById(id).populate("author", ["username"]));
});

app.delete(`/post/:id`, async (req, res) => {
  const { id } = req.params;
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("You are not author of this post");
    }
    await postDoc.delete();
    res.json("ok");
  });
});

app.get("/user/:userId/posts", async (req, res) => {
  const { userId } = req.params;
  const posts = await (
    await Post.find({ created_by: userId }).exec()
  ).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json(posts);
});

/* app.get(`/user/:userId/posts`, async (req, res) => {
  const { userId } = req.params;
  res.json(await Post.find({ author: userId }));
}); */

//universal error handler middleware
// request along with an error enters into this middleware
// app.use((err, req, res, next) => {
//   res.status(err.status || 500).json({ success: false, message: err.message });
// });

//listening request on port 8080
app.listen(PORT, () =>
  console.log("\x1b[36m%s\x1b[0m", `Server is running on port ${PORT} `)
);

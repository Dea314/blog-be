const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const model = mongoose.model;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatarUrl: {
    type: String,
    default: "", // Optional: you can provide a default avatar image if none is provided by the user.
  },
});

const UserModel = model("User", UserSchema);

module.exports = UserModel;

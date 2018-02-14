const mongoose = require("mongoose");
// db schema
const campgroundSchema = new mongoose.Schema({
  name: String,
  image: String,
  url: String,
  description: String,
  cost: Number,
  createdAt: { type: Date, default: Date.now },
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }
  ]
});
module.exports = mongoose.model("Campground", campgroundSchema);
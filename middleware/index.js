const middleware = {};
const Campground = require("../models/campground");
const Comment = require("../models/comment");

middleware.checkCampgroundOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, (err, campground) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        if (!campground) {
          req.flash("error", "A database error has occurred.");
          return res.redirect("back");
        }
        if (campground.author.id.equals(req.user._id)) {
          next();
        } else {
          req.flash("error", "You do not have permission to do that.");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You must be logged in to do that.");
    res.redirect("back");
  }
};

middleware.checkCommentOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, (err, comment) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        if (!comment) {
          req.flash("error", "A database error has occurred.");
          return res.redirect("back");
        }
        if (comment.author.id.equals(req.user._id)) {
          next();
        } else {
          req.flash("error", "You do not have permission to do that.");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You must be logged in to do that.");
    res.redirect("back");
  }
};

middleware.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in to do that.");
  res.redirect("/login");
};

module.exports = middleware;

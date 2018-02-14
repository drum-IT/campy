const express = require("express");
const router = express.Router({ mergeParams: true });
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware");

// show new comment form
router.get("/new", middleware.isLoggedIn, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      res.render("comments/new", { campground });
    }
  });
});

// show the comment edit form
router.get(
  "/:comment_id/edit",
  middleware.checkCommentOwnership,
  (req, res) => {
    Comment.findById(req.params.comment_id, (err, comment) => {
      res.render("comments/edit", { campground_id: req.params.id, comment });
    });
  }
);

// creates a new comment in the database
router.post("/", middleware.isLoggedIn, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash("error", "A database error has occurred.");
          res.redirect("back");
        } else {
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          comment.save();
          campground.comments.push(comment._id);
          campground.save();
          req.flash("success", "Comment added.");
          res.redirect(`/campgrounds/${campground.id}`);
        }
      });
    }
  });
});

// update a comment
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  Comment.findByIdAndUpdate(
    req.params.comment_id,
    req.body.comment,
    (err, comment) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        req.flash("success", "Comment edited.");
        res.redirect(`/campgrounds/${req.params.id}`);
      }
    }
  );
});

// delete a comment
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
  Comment.findByIdAndRemove(req.params.comment_id, err => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      req.flash("success", "Comment deleted.");
      res.redirect("back");
    }
  });
});

module.exports = router;

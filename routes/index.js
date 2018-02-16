const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const middleware = require("../middleware/index");
const Campground = require("../models/campground");

router.get("/", (req, res) => {
  res.render("landing");
});

// show the register form
router.get("/register", (req, res) => {
  res.render("register", { page: "register" });
});

// show the login form
router.get("/login", (req, res) => {
  res.render("login", { page: "login" });
});

// show the logout form
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "You have been logged out.");
  res.redirect("/campgrounds");
});

// create a new user, add them to the database, and authenticate them
router.post("/register", (req, res) => {
  const user = new User(
    {
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      avatar: req.body.avatar === '' ? "http://i.pravatar.cc/300" : req.body.avatar,
      bio: req.body.bio
    }
  );
  if (req.body.adminCode === process.env.ADMIN_CODE) {
    user.isAdmin = true;
  }
  User.register(user, req.body.password, (err, newUser) => {
    if (err) {
      req.flash("error", err.message);
      console.log(err);
      return res.redirect("register");
    }
    passport.authenticate("local")(req, res, () => {
      req.flash(
        "success",
        `You have successfully signed up! Thanks for joining Campy, ${
          newUser.username
        }!`
      );
      res.redirect("/campgrounds");
    });
  });
});

// log a user in
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
  }),
  (req, res) => {}
);

router.get("/users/:user_id", (req, res) => {
  User.findById(req.params.user_id, (err, user) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else if(!user) {
      req.flash("error", "That user no longer exists.");
      res.redirect("back");
    } else {
      Campground.find().where("author.id").equals(user._id).exec((err, campgrounds) => {
        if (err) {
          req.flash("error", "A database error has occurred.");
          res.redirect("back");
        } else {
          res.render("users/show", { user, campgrounds });
        }
      });
    }
  });
});

module.exports = router;

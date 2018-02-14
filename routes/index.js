const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const middleware = require("../middleware/index");

router.get("/", (req, res) => {
  res.render("landing");
});

// show the register form
router.get("/register", (req, res) => {
  res.render("register");
});

// show the login form
router.get("/login", (req, res) => {
  res.render("login");
});

// show the logout form
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "You have been logged out.");
  res.redirect("/campgrounds");
});

// create a new user, add them to the database, and authenticate them
router.post("/register", (req, res) => {
  const user = new User({ username: req.body.username });
  User.register(user, req.body.password, (err, user) => {
    if (err) {
      req.flash("error", err.message);
      console.log(err);
      return res.redirect("register");
    }
    passport.authenticate("local")(req, res, () => {
      req.flash(
        "success",
        `You have successfully signed up! Thanks for joining Campy, ${
          req.body.username
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

module.exports = router;

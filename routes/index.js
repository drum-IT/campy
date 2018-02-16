const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const middleware = require("../middleware/index");
const Campground = require("../models/campground");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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

router.get("/forgot", (req, res) => {
  res.render("forgot");
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
    failureRedirect: "/login",
    failureFlash: true,
    successFlash: "Welcome back!"
  }),
  (req, res) => {}
);

router.get("/reset/:token", (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot");
    }
    res.render("reset", { token: req.params.token });
  });
});

router.post("/reset/:token", (req, res) => {
  async.waterfall([
    (done) => {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
        if (!user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          return res.redirect("/forgot");
        }
        if (req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, (err) => {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(err => {
              req.logIn(user, err => {
                done(err, user);
              });
            });
          });
        } else {
          req.flash("error", "Passwords do not match.");
          return res.redirect("back");
        }
      });
    },
    (user, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PW
        }
      });
      const mailOptions = {
        to: user.email,
        from: "campycontact@gmail.com",
        subject: "Your Campy password has been changed",
        text: "Hello,\n\n" + "This is a confirmation that the Campy password for your account has been changed."
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        req.flash("success", "Your password has been changed!");
        done(err);
      });
    }
  ], (err) => {
    res.redirect("/campgrounds");
  });
});

router.post("/forgot", (req, res) => {
  async.waterfall([
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString('hex');
        done(err, token);
      });
    },
    (token, done) => {
      User.findOne({ email: req.body.email }, (err, user) => {
        if (!user) {
          req.flash("error", "A user account with that email address was not found.");
          return res.redirect("/forgot");
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;

        user.save(err => {
          done(err, token, user);
        });
      });
    },
    (token, user, done) => {
      const smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PW
        }
      });
      const mailOptions = {
        to: user.email,
        from: "campycontact@gmail.com",
        subject: "Campy Password Reset",
        text: "Click below to reset your Campy password." + "\n\n" + (process.env.DEV_URL || "https://") + req.headers.host + "/reset/" + token
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        req.flash("success", `A password reset email has been sent to ${user.email}.`);
        done(err, "done");
      });
    }
  ], (err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/forgot");
  });
});

// get a user profile
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

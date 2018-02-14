// get everything we need
const bodyParser = require("body-parser");
const flash = require("connect-flash");
const express = require("express");
const LocalStrategy = require("passport-local");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const passport = require("passport");

// === === ===
// connect to database and configure express server
// === === ===
// mongoose.connect("mongodb://localhost/yelp_camp");
mongoose.connect("mongodb://campydb:SGAkjUqznGdbxd8eKCN3@ds235708.mlab.com:35708/heroku_dz4pp4js");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

// get the data models
const Campground = require("./models/campground");
const Comment = require("./models/comment");
const User = require("./models/user");

// === === ===
// configure passport for authentication
// === === ===
app.use(
  require("express-session")({
    secret: "I love to eat burgers, but they are not good for me.",
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// === === ===
// Routes and routers
// === === ===

// get the routers
const campgroundRoutes = require("./routes/campgrounds");
const commentRoutes = require("./routes/comments");
const indexRoutes = require("./routes/index");

// attach the user for use in EJS templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

// === === ===
// set the server port, and start the server
// === === ===
const PORT = 5000;
app.listen(process.env.PORT, process.env.IP, () => {
  console.log("YelpCamp Server has Started!");
});

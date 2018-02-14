const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware/index");

// show all campgrounds
router.get("/", (req, res) => {
  Campground.find({}, (err, campgrounds) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      res.render("campgrounds/index", { campgrounds });
    }
  });
});

// show the new campground form
router.get("/new", middleware.isLoggedIn, (req, res) => {
  res.render("campgrounds/new");
});

// show a campground
router.get("/:id", (req, res) => {
  Campground.findById(req.params.id)
    .populate("comments")
    .exec((err, campground) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        res.render("campgrounds/show", { campground });
      }
    });
});

// show campground edit form
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    res.render("campgrounds/edit", { campground });
  });
});

// create a new campground in the database
router.post("/", middleware.isLoggedIn, (req, res) => {
  const name = req.body.name;
  const image = `https://source.unsplash.com/random/700x400/?${req.body.image}`;
  const description = req.body.description;
  const author = { id: req.user._id, username: req.user.username };
  const newCampground = { name, image, description, author };
  Campground.create(newCampground, (err, campground) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      req.flash("success", "Campground created.");
      res.redirect(`campgrounds/${campground._id}`);
    }
  });
});

// update a campground
router.put("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  req.body.campground.image = `https://source.unsplash.com/random/700x400/?${
    req.body.campground.image
  }`;
  Campground.findByIdAndUpdate(
    req.params.id,
    req.body.campground,
    (err, campground) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        req.flash(
          "success",
          `Successfully updated the ${campground.name} campground.`
        );
        res.redirect(`/campgrounds/${campground._id}`);
      }
    }
  );
});

// delete a campground
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  Campground.findByIdAndRemove(req.params.id, err => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      req.flash("success", `Campground deleted.`);
      res.redirect("/campgrounds");
    }
  });
});

module.exports = router;

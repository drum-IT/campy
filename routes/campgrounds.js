const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware/index");

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = function(req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter });
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "drumit",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// show all campgrounds
router.get("/", (req, res) => {
  Campground.find({}, (err, campgrounds) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      res.render("campgrounds/index", { campgrounds, page: "campgrounds" });
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
router.post("/", middleware.isLoggedIn, upload.single("image"), (req, res) => {
  cloudinary.uploader.upload(req.file.path, result => {
    // add cloudinary url for the image to the campground object under image property
    req.body.campground.image = result.secure_url;
    req.body.campground.imageID = result.public_id;
    // add author to campground
    req.body.campground.author = {
      id: req.user._id,
      username: req.user.username
    };
    Campground.create(req.body.campground, (err, campground) => {
      if (err) {
        req.flash("error", err.message);
        return res.redirect("back");
      }
      res.redirect(`/campgrounds/${campground.id}`);
    });
  });
});

// update a campground
router.put("/:id", middleware.checkCampgroundOwnership, (req, res) => {
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
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      req.flash("error", "A database error has occurred.");
      res.redirect("back");
    } else {
      cloudinary.uploader.destroy(campground.imageID, (result) => {});
      campground.remove((err, campground) => {
        if (err) {
          req.flash("error", "A database error has occurred.");
          res.redirect("back");
        } else {
          req.flash("success", `Campground deleted.`);
          res.redirect("/campgrounds");
        }
      });
    }
  });
});

module.exports = router;

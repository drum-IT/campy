const Campground = require("../models/campground");
const express = require("express");
const geocoder = require("geocoder");
const middleware = require("../middleware/index");
const multer = require("multer");

const router = express.Router();

const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
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
  if (req.query.search && req.query.search.length > 0) {
    const searchTerm = new RegExp(escapeRegex(req.query.search), "gi");
    Campground.find({$or:[{name: searchTerm}, {location: searchTerm}, {description: searchTerm}]}, (err, campgrounds) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        if (campgrounds.length > 0) {
          let success = '';
          if (campgrounds.length === 1) {
            success = "Found 1 campground!";
          } else {
            success = `Found ${campgrounds.length} campgrounds!`;
          }
          res.render("campgrounds/index", { campgrounds, page: "campgrounds", success });
        } else {
          res.render("campgrounds/index", { campgrounds, page: "campgrounds", error: "No campgrounds found :(" });
        }
      }
    });
  } else {
    Campground.find({}, (err, campgrounds) => {
      if (err) {
        req.flash("error", "A database error has occurred.");
        res.redirect("back");
      } else {
        res.render("campgrounds/index", { campgrounds, page: "campgrounds" });
      }
    });
  }
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
        res.render("campgrounds/show", { campground, gmapAPIKey: process.env.GMAP_API_KEY });
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
router.post("/", middleware.isLoggedIn, upload.single("image"), async (req, res) => {
  // eval(require("locus"));
  if (req.file) {
    cloudinary.v2.uploader.upload(req.file.path,
      { width: 1920, height: 1080, crop: "limit" },
      (error, result) => {
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      req.body.campground.imageID = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      };
      geocoder.geocode(req.body.campground.location, (err, data) => {
        const lat = data.results[0].geometry.location.lat;
        const lng = data.results[0].geometry.location.lng;
        const location = data.results[0].formatted_address;
        req.body.campground.location = location;
        req.body.campground.lat = lat;
        req.body.campground.lng = lng;
        Campground.create(req.body.campground, (err, campground) => {
          if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
          }
          res.redirect(`/campgrounds/${campground.id}`);
        });
      });
    });
  } else {
    req.body.campground.image = "/images/camping.jpg";
    req.body.campground.imageID = "default";
    // add author to campground
    req.body.campground.author = {
      id: req.user._id,
      username: req.user.username
    };
    await geocoder.geocode(req.body.campground.location, (err, data) => {
      if (err || data.results.length === 0) {
        req.body.campground.location = "No Location Provided";
        req.body.campground.lat = 0;
        req.body.campground.lng = 0;
      } else {
        const lat = data.results[0].geometry.location.lat;
        const lng = data.results[0].geometry.location.lng;
        const location = data.results[0].formatted_address;
        req.body.campground.location = location;
        req.body.campground.lat = lat;
        req.body.campground.lng = lng;
      }
      Campground.create(req.body.campground, (err, campground) => {
        if (err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
        res.redirect(`/campgrounds/${campground.id}`);
      });
    });
  }
});

// update a campground
router.put("/:id", middleware.checkCampgroundOwnership, (req, res) => {
  geocoder.geocode(req.body.campground.location, (err, data) => {
    const lat = data.results[0].geometry.location.lat;
    const lng = data.results[0].geometry.location.lng;
    const location = data.results[0].formatted_address;
    req.body.campground.location = location;
    req.body.campground.lat = lat;
    req.body.campground.lng = lng;
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
            `Successfully updated the ${req.body.campground.name} campground.`
          );
          res.redirect(`/campgrounds/${campground._id}`);
        }
      }
    );
  });
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

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;

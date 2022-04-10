require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;


const app = express();


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session stuff
app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false,
  cookies: {}
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/secretsDB");

// Session stuff
const { User } = require("./schema");

passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//------------ google oauth 2.0 via passport.js ------------//
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//----------------------------- Routes -----------------------------//
app.route("/")
  .get((req, res) => {
    res.render("home");
  });

app.route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {

    const user = new User({
      email: req.body.email,
      password: req.body.password
    });
    req.login(user, (err) => {
      if (err) console.log(err);
      else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("secrets");
        });
      }
    });
  });

app.route("/logout")
  .get((req, res) => {
    req.logout();
    res.redirect("/");
  });

app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {

    User.register({ email: req.body.email }, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("secrets");
        });
      }
    });
  });

app.route("/secrets")
  .get((req, res) => {
    if (req.isAuthenticated()) res.render("secrets");
    else res.redirect("login");
  });

app.listen(3000, () => {
  console.log("Successfully started server");
});
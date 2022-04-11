require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


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

// schema import from schema.js
const userSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
    googleId: String,
    secret: String
  });

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});


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

app.route("/auth/google")
  .get(passport.authenticate("google", { scope: ["profile"] }));

app.route("/auth/google/secrets")
  .get(passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
      // Successful authentication, redirect to secrets.
      res.redirect('/secrets');
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
    User.find({ "secret": { $ne: null } }, (err, foundUsers) => {
      if (err) console.log(err);
      else {
        if (foundUsers) {
          res.render("secrets", { usersWithSecrets: foundUsers });
        }
      }
    });
  });

app.route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) res.render("submit");
    else res.redirect("login");
  })
  .post((req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, (err, foundUser) => {
      if (err) console.log(err);
      else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(() => {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

app.listen(3000, () => {
  console.log("Successfully started server");
});
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

const { User } = require("./schema");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


mongoose.connect("mongodb://localhost:27017/secretsDB");


app.route("/")
  .get((req, res) => {
    res.render("home");
  });

app.route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email: email }, (err, foundUser) => {
      if (err) console.log(err);
      else {
        if (foundUser) {
          if (foundUser.password === password) res.render("secrets");
          else (console.log("Password is incorrect"));
        }
        else console.log("User not found");
      }
    });
  });

app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const newUser = new User({
      email: req.body.email,
      password: req.body.password
    });
    newUser.save((err) => {
      if (err) console.log(err);
      else res.render("secrets");
    });
  });

app.listen(3000, () => {
  console.log("Successfully started server");
});
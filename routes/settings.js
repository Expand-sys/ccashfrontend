const express = require("express");
const router = express.Router();
const path = require("path");
const { ensureAuthenticated } = require("../config/auth.js");
const { checkAdmin } = require("../config/admin.js");
var pug = require("pug");
const flash = require("connect-flash");
const expressValidator = require("express-validator");
const session = require("express-session");
const { postUser } = require("../helpers/functions.js");
const got = require("got");

router.get("/", ensureAuthenticated, function (req, res) {
  let successes = req.session.successes;
  req.session.successes = [];
  let errors = req.session.errors;
  req.session.errors = [];

  res.render("settings", {
    errors: errors,
    successes: successes,
    user: req.session.user,
    admin: req.session.admin,
  });
});

router.post("/pass", ensureAuthenticated, async function (req, res) {
  let { attempt, new_pass, password2 } = req.body;
  let patch;
  if (!attempt || !new_pass || !password2) {
    req.session.errors.push({ msg: "please fill in all fields" });
  }
  //check if match
  if (new_pass != password2) {
    req.session.errors.push({ msg: "Passwords don't match" });
  }

  //check if password is more than 6 characters
  if (new_pass.length < 6) {
    req.session.errors.push({ msg: "Password must be at least 6 characters" });
  }
  if (req.session.errors.length > 0) {
    console.log(req.session.errors);
    res.redirect("/settings");
  } else {
    try {
      patch = await got.patch(process.env.BANKAPIURL + "BankF/changepass", {
        json: {
          name: req.session.user,
          attempt: attempt,
          new_pass: new_pass,
        },
        responseType: "json",
      });
    } catch (err) {
      console.log(err);
    }
    console.log(patch.body);
    if (patch.body.value == 0) {
      req.session.errors.push({
        msg: "Password Wrong",
      });
      res.redirect("/settings");
    } else {
      req.session.regenerate(function (err) {
        if (patch.body.value == 1) {
          req.session.successes = [];
          req.session.successes.push({
            msg: "Change Password Successful, Please Login Again",
          });
        }
        res.redirect("/login");
      });
    }
  }
});

module.exports = router;

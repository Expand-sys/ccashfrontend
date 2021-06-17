const root = process.env.PWD;
const express = require("express");
const router = express.Router();
const path = require("path");
const { ensureAuthenticated } = require(`${root}/config/auth.js`);
const { checkAdmin } = require(`${root}/config/admin.js`);
var pug = require("pug");
const flash = require("connect-flash");
const expressValidator = require("express-validator");
const session = require("express-session");
const { postUser } = require(`${root}/helpers/functions.js`);
const { CCashClient } = require("ccash-client-js");

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
  const client = new CCashClient(process.env.BANKAPIURL);
  let { attempt, new_pass, password2 } = req.body;
  let patch;
  if (attempt == undefined) {
    attempt = "";
  }
  if (!new_pass || !password2) {
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
    patch = await client.changePassword(req.session.user, attempt, new_pass);
    console.log(patch);
    if (patch == -2) {
      req.session.errors.push({
        msg: "Password Wrong",
      });
      res.redirect("/settings");
    } else {
      req.session.regenerate(function (err) {
        req.session.successes = [];
        req.session.successes.push({
          msg: "Change Password Successful, Please Login Again",
        });
        res.redirect("/login");
      });
    }
  }
});

module.exports = router;

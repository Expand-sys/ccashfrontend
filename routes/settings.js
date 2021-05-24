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
  res.render("settings", {
    user: req.session.user,
    admin: req.session.admin,
  });
});

router.post("/pass", ensureAuthenticated, async function (req, res) {
  let { attempt, new_pass, password2 } = req.body;
  let patch;
  let successes = [];
  let errors = [];
  if (!attempt || !new_pass || !password2) {
    errors.push({ msg: "please fill in all fields" });
  }
  //check if match
  if (new_pass !== password2) {
    errors.push({ msg: "Passwords don't match" });
  }

  //check if password is more than 6 characters
  if (new_pass.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }
  if (errors[0]) {
    res.render("settings", {
      errors: errors,
      user: req.session.user,
      admin: req.session.admin,
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  }
  try {
    patch = await got.patch("https://ccash.ryzerth.com/BankF/changepass", {
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
  console.log(patch);
  if (patch.body.value == true) {
    successes.push({ msg: "Change Password Successful, Please Login Again" });
  }
  req.session.regenerate(function (err) {
    res.render("login", {
      successes: successes,
      errors: errors,
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  });
});
function papy() {
  const rndInt = Math.floor(Math.random() * 1337);
  let random = false;
  if (rndInt == 420) {
    random = true;
  }
  return random;
}
module.exports = router;

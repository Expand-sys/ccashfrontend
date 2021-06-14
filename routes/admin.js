const express = require("express");
const router = express.Router();
const path = require("path");
const { ensureAuthenticated } = require("../config/auth.js");
const { checkAdmin } = require("../config/admin.js");
const pug = require("pug");
const flash = require("connect-flash");
const expressValidator = require("express-validator");
const session = require("express-session");
const { postUser } = require("../helpers/functions.js");
const got = require("got");
const MemoryStore = require("memorystore")(session);
const fs = require("fs");
const mongoose = require("mongoose");
const { CCashClient } = require("ccash-client-js");

const client = new CCashClient(process.env.BANKAPIURL);
console.log("Sen was here");

function mongo() {
  if (process.env.MONGO) {
    console.log(process.env.MONGO);
    mongoose.connect(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
    });

    let db = mongoose.connection;
    db.once("open", function () {
      console.log("Connected to MongoDB");
    });

    //check for DB errors
    db.on("error", function (err) {
      console.log(err);
    });
  }
}

router.get("/", checkAdmin, function (req, res) {
  let successes = req.session.successes;
  let errors = req.session.errors;

  res.render("adminsettings", {
    user: req.session.user,
    admin: req.session.admin,
    errors: errors,
    successes: successes,
    marketplace: process.env.MARKETPLACE,
    random: papy(),
  });
});

router.post("/user", checkAdmin, async function (req, res) {
  let { name, init_pass, init_bal, password2 } = req.body;
  let contains = await client.contains(name);
  req.session.errors = [];
  req.session.successes = [];
  if (contains == true) {
    errors.push({ msg: "User already exists" });
    res.render("adminsettings", {
      errors: errors,
    });
  } else {
    if (!name || !init_pass || !init_bal || !password2) {
      req.session.errors.push({ msg: "please fill in all fields" });
    }
    //check if match
    if (init_pass !== password2) {
      req.session.errors.push({ msg: "Passwords don't match" });
    }

    //check if password is more than 6 characters
    if (init_pass.length < 6) {
      req.session.errors.push({
        msg: "Password must be at least 6 characters",
      });
    }
    let post;
    let successes = [];
    try {
      post = await client.adminAddUser(
        name,
        req.session.adminp,
        init_pass,
        parseInt(init_bal)
      );
    } catch (err) {
      console.log(err);
    }
    if (post) {
      successes.push({ msg: "Account Creation Successful" });
    }
  }
  res.redirect("/admin");
});

router.post("/baluser", checkAdmin, async function (req, res) {
  let { name } = req.body;
  let balance;
  req.session.successes = [];
  req.session.errors = [];
  try {
    balance = await client.balance(name);
  } catch (err) {
    console.log(err);
  }
  balance = parseInt(balance);
  console.log(balance);
  if (balance < 0) {
    req.session.errors.push({ msg: "User not found" });
  } else {
    req.session.successes.push({
      msg: "User: " + name + " has " + balance.value + " monies",
    });
  }
  res.redirect("/admin");
});

router.post("/bal", checkAdmin, async function (req, res) {
  let { name, amount } = req.body;
  let patch;
  req.session.successes = [];
  req.session.errors = [];
  try {
    patch = await client.setBalance(name, req.session.adminp, parseInt(amount));
  } catch (err) {
    console.log(err);
  }
  if (patch) {
    req.session.successes.push({ msg: "Change Funds Successful" });
  }
  res.redirect("/admin");
});
router.post("/userdelete", checkAdmin, async function (req, res) {
  let { name, attempt } = req.body;
  console.log(name);
  let contains = await client.contains(name);
  let deleteUser;
  let successes = [];
  let errors = [];
  if (attempt != req.session.adminp) {
    req.session.errors.push({ msg: "Wrong Admin Password" });
  }
  console.log(contains);
  if (contains == true) {
    deleteUser = client.adminDeleteUser(name, attempt);
    req.session.successes.push({ msg: "User Deletion Successful" });
  } else {
    req.session.errors.push({ msg: "User Deletion Failed, User Not Found" });
  }
  res.redirect("/admin");
});
router.post("/destroyallsessions", checkAdmin, async function (req, res) {
  let { attempt } = req.body;
  let adminTest;
  req.session.errors = [];
  try {
    adminTest = await client.adminVerifyPass(attempt);
  } catch (err) {
    console.log(err);
  }
  if (adminTest) {
    req.sessionStore.clear(function (err) {
      console.log(err);
    });
    res.redirect("/");
  } else {
    req.session.errors.push({ msg: "failed admin password check" });
    res.redirect("/admin");
  }
});

router.post("/changebackend", checkAdmin, async function (req, res) {
  let { url } = req.body;
  if (!url.endsWith("/")) {
    url = url + "/";
  }
  process.env.BANKAPIURL = url;
  fs.writeFileSync(
    ".env",
    "BANKAPIURL=" +
      process.env.BANKAPIURL +
      "\n" +
      "SECURE=" +
      process.env.SECURE +
      "\n" +
      "MARKETPLACE=" +
      process.env.MARKETPLACE +
      "\n" +
      "MONGO=" +
      process.env.MONGO +
      "\nSETUP=true"
  );
  res.redirect("../");
});
router.post("/mongodb", checkAdmin, async function (req, res) {
  let { url } = req.body;
  process.env.MONGO = url;

  if (process.env.MONGO.length < 3) {
    process.env.MARKETPLACE = false;
    console.log("false");
  } else {
    process.env.MARKETPLACE = true;
    console.log("true");
  }
  fs.writeFileSync(
    ".env",
    "BANKAPIURL=" +
      process.env.BANKAPIURL +
      "\n" +
      "SECURE=" +
      process.env.SECURE +
      "\n" +
      "MARKETPLACE=" +
      process.env.MARKETPLACE +
      "\n" +
      "MONGO=" +
      process.env.MONGO +
      "\nSETUP=true"
  );
  try {
    mongo();
  } catch (e) {
    console.log(e);
  }

  res.redirect("../");
});
router.post("/close", checkAdmin, async function (req, res) {
  let { attempt } = req.body;
  let close;
  close = client.close();
  res.redirect("../");
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

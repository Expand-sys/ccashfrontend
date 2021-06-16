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

console.log("Sen was here");

router.get("/", checkAdmin, function (req, res) {
  let successes = req.session.successes;
  req.session.successes = [];
  let errors = req.session.errors;
  req.session.errors = [];
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
  const client = new CCashClient(process.env.BANKAPIURL);
  req.session.errors = [];
  req.session.successes = [];
  let { name, init_pass, init_bal, password2 } = req.body;
  if (!name || !init_pass || !init_bal || !password2) {
    req.session.errors.push({ msg: "please fill in all fields" });
  } else if (init_pass !== password2) {
    req.session.errors.push({ msg: "Passwords don't match" });
  } else if (init_pass.length < 6) {
    req.session.errors.push({
      msg: "Password must be at least 6 characters",
    });
  }
  let post = await client.adminAddUser(
    name,
    req.session.adminp,
    init_pass,
    parseInt(init_bal)
  );
  console.log(post);
  if (post == -3) {
    req.session.errors.push({ msg: "Invalid Request" });
  } else if (post == -4) {
    req.session.errors.push({ msg: "Name too long" });
  } else if (post == -5) {
    req.session.errors.push({ msg: "User already exists" });
  } else {
    req.session.successes.push({ msg: "Account Creation Successful" });
  }
  res.redirect("/admin");
});

router.post("/baluser", checkAdmin, async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  let { name } = req.body;
  let balance;
  req.session.successes = [];
  req.session.errors = [];
  balance = await client.balance(name);
  console.log(balance.body);
  balance = parseInt(balance);
  if (balance < 0) {
    req.session.errors.push({ msg: "User not found" });
  } else {
    req.session.successes.push({
      msg: "User: " + name + " has " + balance + " monies",
    });
  }
  res.redirect("/admin");
});

router.post("/bal", checkAdmin, async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  let { name, amount } = req.body;
  let patch;
  req.session.successes = [];
  req.session.errors = [];
  patch = await client.setBalance(name, req.session.adminp, parseInt(amount));
  console.log(patch);
  if (patch == -1) {
    req.session.errors.push({ msg: "User not Found" });
  } else if (patch == 1) {
    req.session.successes.push({ msg: "Change Funds Successful" });
  }
  res.redirect("/admin");
});

router.post("/userdelete", checkAdmin, async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  let { name, attempt } = req.body;
  if (attempt != req.session.adminp) {
    req.session.errors.push({ msg: "Wrong Admin Password" });
    res.redirect("/admin");
  } else {
    let deleteUser = client.adminDeleteUser(name, attempt);
    if (deleteUser == -1) {
      req.session.errors.push({ msg: "User Deletion Failed, User Not Found" });
      res.redirect("/admin");
    } else {
      req.session.successes.push({ msg: "User Deletion Successful" });
      res.redirect("/admin");
    }
  }
});

router.post("/destroyallsessions", checkAdmin, async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  let { attempt } = req.body;
  let adminTest;
  req.session.errors = [];
  try {
    adminTest = await client.adminVerifyPassword(attempt);
  } catch (err) {
    console.log(err);
  }
  if (adminTest) {
    req.sessionStore.clear(function (err) {
      console.log(err);
      res.redirect("/");
    });
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
  fs.mkdirSync("tmp");
  fs.writeFileSync("tmp/restart.txt", "");
  res.redirect("../");
});

router.post("/close", checkAdmin, async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
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

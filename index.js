const express = require("express");
const path = require("path");
const https = require("https");
const got = require("got");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const flash = require("connect-flash");
const session = require("express-session");
const { ensureAuthenticated } = require("./config/auth.js");
const app = express();
const MemoryStore = require("memorystore")(session);
const url = require("url");
const dotenv = require("dotenv");
const fs = require("fs");
let Log = require("./schemas/log.js");
const mongoose = require("mongoose");
const { CCashClient } = require("ccash-client-js");
dotenv.config();
const { postUser } = require("./helpers/functions.js");
if (process.env.BANKAPIURL) {
  const client = new CCashClient(process.env.BANKAPIURL);
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(flash());
app.use(require("connect-flash")());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(function (req, res, next) {
  res.locals.messages = require("express-messages")(req, res);
  next();
});
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "fuck shit cunt",
    resave: true,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    saveUninitialized: true,
    cookie: { secure: process.env.SECURE, maxAge: 86400000 },
  })
);
app.use(
  expressValidator({
    errorFormatter: function (param, msg, value) {
      var namespace = param.split("."),
        root = namespace.shift(),
        formParam = root;

      while (namespace.length) {
        formParam += "[" + namespace.shift() + "]";
      }
      return {
        param: formParam,
        msg: msg,
        value: value,
      };
    },
  })
);

function papy() {
  const rndInt = Math.floor(Math.random() * 1337);
  let random = false;
  if (rndInt == 420) {
    random = true;
  }
  return random;
}

app.post("/setup", async function (req, res) {
  const { url, secure } = req.body;
  if (secure) {
    process.env.SECURE = true;
  }
  process.env.BANKAPIURL = url;
  fs.writeFileSync(
    ".env",
    "BANKAPIURL=" +
      process.env.BANKAPIURL +
      "\n" +
      "SECURE=" +
      process.env.SECURE +
      "\nSETUP=true"
  );
  fs.mkdirSync("tmp");
  fs.writeFileSync("tmp/restart.txt");
});

app.get("/", async function (req, res) {
  if (setup == false || !setup) {
    res.render("setup");
  }
  let checkalive;
  try {
    checkalive = await client.help();
  } catch (err) {
    console.log(err);
  }
  let alive = false;
  try {
    if (checkalive) {
      alive = true;
    }
  } catch (err) {
    console.log(err);
  }

  res.render("index", {
    user: req.session.user,
    admin: req.session.admin,
    alive: alive,
    random: papy(),
  });
});
app.get("/BankF", ensureAuthenticated, async function (req, res) {
  let successes = req.session.successes;
  let errors = req.session.errors;
  req.session.errors = [];
  let admin;
  try {
    admin = req.session.admin;
  } catch (err) {
    console.log(err);
  }
  let balance = 0;
  try {
    balance = await client.balance(req.session.user);
  } catch (err) {
    console.log(err);
  }
  let logsent;
  console.log("start " + Date.now());
  try {
    const { user, password } = req.session;
    logsent = await client.log(user, password);
  } catch (e) {
    console.log(e);
  }
  console.log(logsent);
  let logrec = logsent;
  let graphlog = logsent;
  if (graphlog != null) {
    graphlog = graphlog.reverse();
  }
  let graphdata = "";
  let currentbal = balance;
  if (graphlog) {
    for (i = graphlog.length - 1; i > -1; i--) {
      if (graphlog[i].from == req.session.user) {
        currentbal = parseInt(currentbal) + parseInt(graphlog[i].amount);
        graphdata = graphdata + ", [" + parseInt(i) + "," + currentbal + "]";
      } else {
        currentbal = parseInt(currentbal) - parseInt(graphlog[i].amount);
        graphdata = graphdata + ", [" + parseInt(i) + "," + currentbal + "]";
      }
    }
  } else {
    graphlog = undefined;
  }
  if (graphdata != "") {
    graphdata =
      ", [" + parseInt(graphlog.length) + "," + balance + "]" + graphdata;
    graphdata = '["transaction", "balance"]' + graphdata;
  }
  if (logsent == null) {
    logsent = undefined;
  } else {
    logsent = await logsent.filter(({ from }) => from === req.session.user);
  }
  if (logrec == null) {
    logrec = undefined;
  } else {
    logrec = await logrec.filter(({ to }) => to === req.session.user);
  }
  if (logsent) {
    for (i in logrec) {
      logrec[i].time = new Date(logrec[i].time);
    }
  }
  if (logrec) {
    for (i in logsent) {
      logsent[i].time = new Date(logsent[i].time);
    }
  }
  if (logrec != null) {
    logrec.reverse();
  }
  if (logsent != null) {
    logsent.reverse();
  }
  let maxgraph = balance + 1000;
  console.log("begin render " + Date.now());
  res.render("bankf", {
    maxgraph: maxgraph,
    graphdata: graphdata,
    logrec: logrec,
    logsent: logsent,
    user: req.session.user,
    balance: balance,
    user: req.session.user,
    admin: req.session.admin,
    sucesses: successes,
    errors: errors,
    random: papy(),
  });
});

app.post("/sendfunds", async function (req, res) {
  let { amount, name, senderpass } = req.body;
  req.session.errors = [];
  req.session.successes = [];
  let a_name = req.session.user;
  let result;
  result = await client.sendFunds(a_name, senderpass, name, amount);
  console.log(result);
  if (result == 1) {
    req.session.successes.push({ msg: "Transfer successful" });
    //post details
    res.redirect("/BankF");
  } else if (result == -1) {
    req.session.errors.push({ msg: "Transfer Unsuccessful: User not Found" });
    res.redirect("/Bankf");
  } else if (result == -2) {
    req.session.errors.push({ msg: "Transfer Unsuccessful: Wrong Password" });
    res.redirect("/Bankf");
  }
});

app.post("/register", async function (req, res) {
  var { name, password, password2 } = req.body;
  req.session.errors = [];
  req.session.successes = [];
  if (!name || !password || !password2) {
    req.session.errors.push({ msg: "please fill in all fields" });
  } else if (password !== password2) {
    req.session.errors.push({ msg: "Passwords don't match" });
  } else if (password.length < 6) {
    req.session.errors.push({
      msg: "Password must be at least 6 characters",
    });
  } else {
    let checkuser = await postUser(name, password);
    console.log(checkuser);
    if (checkuser == -4) {
      req.session.errors.push({ msg: "Error: Name too long" });
      res.redirect("/register");
    } else if (checkuser == -5) {
      req.session.errors.push({ msg: "Error: User Already Exists" });
      res.redirect("/register");
    } else {
      req.session.successes.push({ msg: "Account Created! please Log in" });
      res.redirect("/login");
    }
  }
});

app.post("/login", async function (req, res) {
  if (req.session.user) {
    res.redirect("/");
  }
  req.session.regenerate(function (err) {});
  const { name, password } = req.body;
  let adminTest;
  try {
    adminTest = await client.adminVerifyPassword(password);
  } catch (err) {
    console.log(err);
  }
  console.log(adminTest);
  if (adminTest != -2) {
    req.session.admin = adminTest;
    req.session.adminp = password;
    req.session.user = name;
    req.session.password = password;
    res.redirect("/BankF");
  } else {
    let verified;
    verified = await client.verifyPassword(name, password);
    console.log(verified);
    if (verified == 1) {
      req.session.user = name;
      req.session.password = password;
      res.redirect("/BankF");
    } else {
      req.session.errors = [];
      req.session.errors.push({ msg: "Password wrong" });
      res.redirect("/login");
    }
  }
});

let admin = require("./routes/admin");
app.use("/admin", admin);

let settings = require("./routes/settings");
app.use("/settings", settings);

app.get("/logout", function (req, res) {
  req.session.regenerate(function (err) {
    res.render("login", {
      random: papy(),
    });
  });
});

app.get("/login", function (req, res) {
  let successes = req.session.successes;
  let errors = req.session.errors;
  req.session.regenerate(function (err) {
    res.render("login", {
      successes: successes,
      errors: errors,
      user: req.session.user,
      random: papy(),
    });
  });
});

app.get("/register", function (req, res) {
  let successes = req.session.successes;
  req.session.successes = [];
  let errors = req.session.errors;
  req.session.errors = [];
  res.render("register", {
    errors: errors,
    successes: successes,
    user: req.session.user,
    admin: req.session.admin,
    random: papy(),
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000...");
});

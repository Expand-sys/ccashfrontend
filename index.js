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
const client = new CCashClient(process.env.BANKAPIURL);

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
let secure = false;
if (
  process.env.SECURE == "true" ||
  process.env.SECURE == "True" ||
  process.env.SECURE == "TRUE"
) {
  secure = true;
}
let setup = false;
if (
  process.env.SETUP == "true" ||
  process.env.SETUP == "True" ||
  process.env.SETUP == "TRUE"
) {
  setup = true;
}
app.use(
  session({
    secret: "fuck shit cunt",
    resave: true,
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    saveUninitialized: true,
    cookie: { secure: secure, maxAge: 86400000 },
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
app.post("/setup", async function (req, res) {
  console.log(req.body);
  let { mongo, url, banksecure, marketplace } = req.body;
  process.env.MONGO = mongo;
  process.env.MARKETPLACE = false;
  if (marketplace) {
    process.env.MARKETPLACE = true;
  }
  if (!url.endsWith("/")) {
    url = url + "/";
  }
  process.env.BANKAPIURL = url;
  process.env.SECURE = false;
  if (!banksecure) {
    banksecure = false;
    process.env.SECURE = false;
  }
  process.env.SETUP = true;
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
  dotenv.config();
  if (process.env.MARKETPLACE) {
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
  res.redirect("/");
});

function papy() {
  const rndInt = Math.floor(Math.random() * 1337);
  let random = false;
  if (rndInt == 420) {
    random = true;
  }
  return random;
}

app.get("/", async function (req, res) {
  if (!process.env.SETUP) {
    res.render("setup");
  } else {
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
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  }
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
    marketplace: process.env.MARKETPLACE,
    random: papy(),
  });
});

app.post("/sendfunds", async function (req, res) {
  let { amount, name, senderpass } = req.body;
  req.session.errors = [];
  req.session.successes = [];
  let a_name = req.session.user;
  let result;
  try {
    result = await got.post(
      `${process.env.BANKAPIURL}/${a_name}/send/${name}?amount=${amount}`,
      {
        headers: {
          Password: senderpass,
        },
      }
    );
    //client.sendFunds(a_name, senderpass, name, amount);
  } catch (e) {
    console.log(e);
  }
  console.log(result);
  if (result == true || result) {
    req.session.successes.push({ msg: "Transfer successful" });
    //post details
    res.redirect("/BankF");
  } else {
    req.session.errors.push({ msg: "Transfer Unsuccessful" });
    res.redirect("/Bankf");
  }
});

app.post("/register", async function (req, res) {
  var { name, password, password2 } = req.body;
  let checkuser;
  try {
    checkuser = await client.contains(name);
  } catch (e) {
    console.log(e);
  }

  req.session.errors = [];
  req.session.successes = [];
  if (!checkuser) {
    if (!name || !password || !password2) {
      req.session.errors.push({ msg: "please fill in all fields" });
    }
    if (password !== password2) {
      req.session.errors.push({ msg: "Passwords don't match" });
    }
    if (password.length < 6) {
      req.session.errors.push({
        msg: "Password must be at least 6 characters",
      });
    }
    if (req.session.errors[0]) {
      res.redirect("/register");
    } else {
      if (postUser(name, password)) {
        req.session.successes.push({ msg: "User Registered Please Log In" });
        res.redirect("/login");
      }
    }
  } else {
    req.session.errors.push({ msg: "User already exists" });
    res.redirect("/register");
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
    adminTest = await client.adminVerifyPass(password);
  } catch (err) {
    console.log(err);
  }
  if (adminTest) {
    req.session.admin = adminTest;
    req.session.adminp = password;
    req.session.user = name;
    req.session.password = password;
    res.redirect("/BankF");
  } else {
    let verified;
    try {
      verified = await client.verifyPassword(name, password);
    } catch (err) {
      console.log(err);
    } finally {
      if (!verified) {
        req.session.errors = [];
        req.session.errors.push({ msg: "Password wrong" });
        res.redirect("/login");
      } else {
        req.session.user = name;
        req.session.password = password;
        res.redirect("/BankF");
      }
    }
  }
});

let admin = require("./routes/admin");
app.use("/admin", admin);

let settings = require("./routes/settings");
app.use("/settings", settings);

let marketplace = require("./routes/marketplace");
app.use("/marketplace", marketplace);

app.get("/logout", function (req, res) {
  req.session.regenerate(function (err) {
    res.render("login", {
      marketplace: process.env.MARKETPLACE,
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
      marketplace: process.env.MARKETPLACE,
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
    marketplace: process.env.MARKETPLACE,
    random: papy(),
  });
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000...");
});

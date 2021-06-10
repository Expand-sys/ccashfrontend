const express = require("express");
const path = require("path");
const https = require("https");
const got = require("got");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const flash = require("connect-flash");
const session = require("express-session");
const { postUser } = require("./helpers/functions.js");
const { ensureAuthenticated } = require("./config/auth.js");
const app = express();
const MemoryStore = require("memorystore")(session);
const url = require("url");
const dotenv = require("dotenv");
const fs = require("fs");
let Log = require("./schemas/log.js");
const mongoose = require("mongoose");
dotenv.config();

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
      checkalive = await got(process.env.BANKAPIURL + "BankF/help");
    } catch (err) {
      console.log(err);
    }
    let alive = false;
    try {
      if (checkalive.body) {
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
  let successes = [];
  if (req.session.sucess == true) {
    successes.push({ msg: "Transfer successful" });
  }
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
    balance = await got(
      process.env.BANKAPIURL + "BankF/" + req.session.user + "/bal"
    );
    balance = JSON.parse(balance.body);
  } catch (err) {
    console.log(err);
  }
  let logsent;
  console.log("start " + Date.now());
  try {
    logsent = await got.post(
      process.env.BANKAPIURL + "BankF/" + req.session.user + "/log",
      {
        json: {
          attempt: req.session.password,
        },
        responseType: "json",
      }
    );
  } catch (e) {
    console.log(e);
  }
  console.log("query finished " + Date.now());
  logsent = logsent.body.value;
  let logrec = logsent;
  let graphlog = logsent;
  if (graphlog != null) {
    graphlog = graphlog.reverse();
  }
  let graphdata = "";
  let currentbal = balance.value;
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
      ", [" + parseInt(graphlog.length) + "," + balance.value + "]" + graphdata;
    graphdata = '["transaction", "balance"]' + graphdata;
  }

  console.log(balance);

  console.log(JSON.stringify(graphdata));
  if (logsent == 1 || logsent == -1 || logsent == null) {
    logsent = undefined;
  } else {
    logsent = await logsent.filter(({ from }) => from === req.session.user);
  }
  if (logrec === 1 || logrec === -1 || logrec === null) {
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
    logrec: logrec.reverse(),
    logsent: logsent.reverse(),
    user: req.session.user,
    balance: balance.value,
    user: req.session.user,
    admin: req.session.admin,
    sucesses: successes,
    errors: errors,
    marketplace: process.env.MARKETPLACE,
    random: papy(),
  });
});

app.post("/sendfunds", async function (req, res) {
  let balance = 0;
  try {
    balance = await got(
      process.env.BANKAPIURL + "BankF/" + req.session.user + "/bal"
    );
    balance = JSON.parse(balance.body);
  } catch (err) {
    console.log(err);
  }
  let { amount, name, senderpass } = req.body;
  let a_name = req.session.user;
  let successes = [];
  req.session.errors = [];
  let result = {};
  result = await got.post(process.env.BANKAPIURL + "BankF/sendfunds", {
    json: {
      a_name: a_name,
      b_name: name,
      amount: parseInt(amount),
      attempt: senderpass,
    },
    responseType: "json",
  });

  if (result.body.value == true || result.body.value) {
    req.session.success = true;
    //post details
    res.redirect("/BankF");
  } else {
    req.session.errors.push({ msg: "Transfer Unsuccessful" });
    res.redirect("/Bankf");
  }
});

app.post("/register", async function (req, res) {
  var { name, password, password2 } = req.body;

  let checkuser = await got(process.env.BANKAPIURL + "BankF/contains/" + name);
  checkuser = JSON.parse(checkuser.body).value;
  req.session.errors = [];
  req.session.successes = [];
  if (checkuser == false) {
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
  let { name, password } = req.body;
  let adminTest;
  let errors = [];
  try {
    adminTest = await got.post(process.env.BANKAPIURL + "BankF/admin/vpass", {
      json: {
        attempt: password,
      },
      responseType: "json",
    });
  } catch (err) {
    console.log(err);
  }
  req.session.password = password;
  if (adminTest.body.value == undefined) {
    res.redirect("/");
  } else {
    req.session.admin = adminTest.body.value;
    req.session.adminp = password;
    let verified;
    try {
      verified = await got.post(process.env.BANKAPIURL + "BankF/vpass", {
        json: {
          name: name,
          attempt: password,
        },
        responseType: "json",
      });
    } catch (err) {
      console.log(err);
    } finally {
      console.log(verified.body.value);
      if (verified.body.value == 0) {
        errors.push({ msg: "Password wrong" });
        res.render("login", {
          errors: errors,
          marketplace: process.env.MARKETPLACE,
          random: papy(),
        });
      } else if (verified.body.value == 1) {
        req.session.user = name;
        req.session.password = password;
        res.redirect("/BankF");
      } else {
        errors.push({ msg: "User not found" });
        res.render("login", {
          errors: errors,
          marketplace: process.env.MARKETPLACE,
          random: papy(),
        });
      }
    }
  }

  //res.redirect('/login')
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

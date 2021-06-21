const root = process.env.PWD;
const express = require("express");
const fastify = require("fastify")({
  logger: true,
});
const fastifyFlash = require("fastify-flash");

const path = require("path");

const got = require("got");
const bodyParser = require("body-parser");
const { ensureAuthenticated } = require(`${root}/config/auth.js`);
const app = express();
const url = require("url");
const dotenv = require("dotenv");
const fs = require("fs");
const mongoose = require("mongoose");
const { CCashClient } = require("ccash-client-js");
dotenv.config({ path: ".env" });
const { postUser } = require(`${root}/helpers/functions.js`);

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});
fastify.register(require("fastify-secure-session"), {
  // the name of the session cookie, defaults to 'session'
  cookieName: "fuckineedalongasscookieandthiswilldo",
  // adapt this to point to the directory where secret-key is located
  key: fs.readFileSync(path.join(__dirname, "secret-key")),
  cookie: {
    path: "/",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
  },
});
fastify.register(require("point-of-view"), {
  engine: {
    pug: require("pug"),
  },
  defaultContext: {
    random: papy(),
  },
  root: path.join(__dirname, "views"),
});

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
  console.log(process.env.BANKAPIURL);
  fs.rmSync(`/app/config/.env`);
  fs.writeFileSync(
    `/app/config/.env`,
    "BANKAPIURL=" +
      process.env.BANKAPIURL +
      "\n" +
      "SECURE=" +
      process.env.SECURE +
      "\nSETUP=true"
  );

  fs.writeFileSync(`${root}/tmp/restart.txt`, "");
  res.redirect("/");
});

fastify.get("/", async function (req, reply) {
  if (process.env.SETUP == false || !process.env.SETUP) {
    reply.view("setup");
  } else {
    const client = new CCashClient(process.env.BANKAPIURL);
    let checkalive;
    try {
      checkalive = await client.ping();
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

    reply.view("index", {
      user: req.session.get("user"),
      admin: req.session.get("admin"),
      alive: alive,
      url: process.env.BANKAPIURL,
    });
  }
});
fastify.get(
  "/BankF",
  {
    preValidation: function (req, res, done) {
      if (req.session.user != undefined) {
        return done();
      }
      req.session.errors = [];
      req.session.errors.push({ msg: "please login to view this resource" });
      reply.redirect("/login");
    },
  },
  async function (req, res) {
    const client = new CCashClient(process.env.BANKAPIURL);
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
    balance = await client.balance(req.session.user);
    console.log(balance);
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
    res.view("bankf", {
      maxgraph: maxgraph,
      graphdata: graphdata,
      logrec: logrec,
      logsent: logsent,
      user: req.session.get("user"),
      balance: balance,
      admin: req.session.get("admin"),
      sucesses: successes,
      errors: errors,
    });
  }
);

fastify.post("/sendfunds", async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
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

fastify.post("/register", async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  var { name, password, password2 } = req.body;
  req.session.errors = [];
  req.session.successes = [];
  if (!name || !password || !password2) {
    req.session.errors.push({ msg: "please fill in all fields" });
  } else if (password != password2) {
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

fastify.post("/login", async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  if (req.session.user) {
    res.redirect("/");
  }
  req.session.destroySession(function (err) {});
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
fastify.all("/admin", admin);

let settings = require("./routes/settings");
fastify.all("/settings", settings);

fastify.get("/logout", function (req, res) {
  req.destroySession(function (err) {
    res.view("login", {
      random: papy(),
    });
  });
});

fastify.get("/login", function (req, res) {
  let successes = req.session.successes;
  let errors = req.session.errors;
  req.session.destroySession(function (err) {
    res.view("login", {
      successes: successes,
      errors: errors,
      user: req.session.user,
      random: papy(),
    });
  });
});

fastify.get("/register", function (req, res) {
  let successes = req.session.successes;
  req.session.successes = [];
  let errors = req.session.errors;
  req.session.errors = [];
  res.view("register", {
    errors: errors,
    successes: successes,
    user: req.session.user,
    admin: req.session.admin,
    random: papy(),
  });
});
process.on("SIGINT", function () {
  process.exit();
});

fastify.listen(process.env.PORT || 3000, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});

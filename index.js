const root = process.env.PWD;
require("pino-pretty");
const fastify = require("fastify")({
  //logger: { prettyPrint: true },
});
const fastifyFlash = require("fastify-flash");

const path = require("path");
const got = require("got");
const url = require("url");
const dotenv = require("dotenv");

const fs = require("fs");
const { CCashClient } = require("ccash-client-js");
dotenv.config({ path: ".env" });
fastify.register(require("fastify-formbody"));
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

fastify.register(require("fastify-secure-session"), {
  // the name of the session cookie, defaults to 'session'
  cookieName: "session",
  // adapt this to point to the directory where secret-key is located
  key: fs.readFileSync(path.join(__dirname, "secret-key")),
  cookie: {
    path: "/",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
    secure: false,
    httpOnly: true,
  },
});
fastify.register(fastifyFlash);
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
function validate(req, res, next) {
  if (!req.session.get("user")) {
    res.redirect("/login");
  } else {
    next();
  }
}
fastify.post("/setup", async function (req, res) {
  const { url, secure } = req.body;
  if (secure) {
    process.env.SECURE = true;
  }
  process.env.BANKAPIURL = url;
  console.log(process.env.BANKAPIURL);
  fs.rmSync(`${root}/.env`);
  fs.writeFileSync(
    `${root}/.env`,
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

fastify.get("/", async function (req, res) {
  if (process.env.SETUP == false || !process.env.SETUP) {
    res.view("setup");
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

    res.view("index", {
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
    preValidation: [validate],
  },
  async function (req, res) {
    const client = new CCashClient(process.env.BANKAPIURL);
    let successes = req.session.get("successes");
    req.session.set("successes", "");
    let errors = req.session.get("errors");
    req.session.set("errors", "");
    let admin;
    try {
      admin = req.session.get("admin");
    } catch (err) {
      console.log(err);
    }
    let balance = 0;
    balance = await client.balance(req.session.get("user"));
    console.log(balance);
    let logsent;
    console.log("start " + Date.now());
    try {
      const user = req.session.get("user");
      const password = req.session.get("password");
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
        if (graphlog[i].from == req.session.get("user")) {
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
      logsent = await logsent.filter(
        ({ from }) => from === req.session.get("user")
      );
    }
    if (logrec == null) {
      logrec = undefined;
    } else {
      logrec = await logrec.filter(({ to }) => to === req.session.get("user"));
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

fastify.post(
  "/sendfunds",
  {
    preValidation: [validate],
  },
  async function (req, res) {
    const client = new CCashClient(process.env.BANKAPIURL);
    let { amount, name, senderpass } = req.body;
    req.session.set("errors", "");
    req.session.set("successes", "");
    let a_name = req.session.get("user");
    let result;
    result = await client.sendFunds(a_name, senderpass, name, amount);
    console.log(result);
    if (result == 1) {
      req.session.set("successes", "Transfer successful");
      //post details
      res.redirect("/BankF");
    } else if (result == -1) {
      req.session.set("errors", "Transfer Unsuccessful: User not Found");
      res.redirect("/BankF");
    } else if (result == -2) {
      req.session.set("errors", "Transfer Unsuccessful: Wrong Password");
      res.redirect("/BankF");
    }
  }
);

fastify.post("/register", async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  var { name, password, password2 } = req.body;
  req.session.set("successes", "");
  req.session.set("errors", "");
  if (!name || !password || !password2) {
    req.session.set("errors", "please fill in all fields");
    res.redirect("/register");
  } else if (password != password2) {
    req.session.set("errors", "Passwords don't match");
    res.redirect("/register");
  } else if (password.length < 6) {
    req.session.set("errors", "Password must be at least 6 characters");
    res.redirect("/register");
  } else {
    let checkuser = await client.addUser(name, password);
    console.log(await checkuser);
    if (checkuser == -4) {
      req.session.set("errors", "Error: Name too long");
      res.redirect("/register");
    } else if (checkuser == -5) {
      req.session.set("errors", "Error: User Already Exists");
      res.redirect("/register");
    } else {
      req.session.set("successes", "Account Created! please Log in");
      res.redirect("/login");
    }
  }
});

fastify.post("/login", async function (req, res) {
  const client = new CCashClient(process.env.BANKAPIURL);
  if (req.session.get("user")) {
    res.redirect("/");
  }
  const { name, password } = req.body;
  let adminTest;
  try {
    adminTest = await client.adminVerifyPassword(password);
  } catch (err) {
    console.log(err);
  }
  console.log(adminTest);
  if (adminTest != -2) {
    req.session.set("admin", adminTest);
    req.session.set("adminp", password);
    req.session.set("user", name);
    req.session.set("password", password);
    res.redirect("/BankF");
  } else {
    let verified;
    verified = await client.verifyPassword(name, password);
    console.log(verified);
    if (verified == 1) {
      req.session.set("user", name);
      req.session.set("password", password);
      res.redirect("/BankF");
    } else {
      req.session.set("errors", ["Password wrong"]);
      res.redirect("/login");
    }
  }
});

fastify.register(require("./routes/admin"), { prefix: "/admin" });

fastify.register(require("./routes/settings"), { prefix: "/settings" });

fastify.get("/logout", function (req, res) {
  let successes = req.session.get("successes");
  let errors = req.session.get("errors");
  req.session.delete();

  req.session.delete();
  res.view("login", {
    random: papy(),
    successes: successes,
    errors: errors,
  });
});

fastify.get("/login", function (req, res) {
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  res.view("login", {
    successes: successes,
    errors: errors,
    user: req.session.get("user"),
    random: papy(),
  });
});

fastify.get("/register", function (req, res) {
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  res.view("register", {
    successes: successes,
    errors: errors,
    user: req.session.get("user"),
    admin: req.session.get("admin"),
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

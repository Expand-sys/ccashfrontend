const root = process.env.PWD;
require("pino-pretty");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });
const fastify = require("fastify")({
  logger: false,
});

const fastifyFlash = require("fastify-flash");

const path = require("path");
const got = require("got");
const url = require("url");

const fs = require("fs");
const { CCashClient } = require("ccash-client-js");

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
    secure: true,
    httpOnly: true,
    overwrite: true,
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

const api = process.env.BANKAPIURL;

function papy() {
  const rndInt = Math.floor(Math.random() * 1337);
  let random = false;
  if (rndInt == 420) {
    random = true;
  }
  return random;
}
function validate(req, res, next) {
  if (req.session.get("user")) {
    next();
  } else {
    res.redirect("/login");
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
    //const client = new CCashClient(process.env.BANKAPIURL);
    //let checkalive = await client.ping();
    let checkalive = await got(`${api}/ping`, {
      headers: {
        Accept: "application/json",
      },
    });
    if (checkalive) {
      alive = true;
    } else {
      alive = false;
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
    //const client = new CCashClient(process.env.BANKAPIURL);
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
    const user = req.session.get("user");
    const password = req.session.get("password");
    const auth = req.session.get("b64");
    //balance = await client.balance(req.session.get("user"));
    balance = await got(`${api}/user/balance`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
      query: {
        name: user,
      },
    });
    balance = parseInt(balance.body);
    console.log(balance);
    console.log("start " + Date.now());

    //let logsent = await client.log(user, password);
    let logsent = await got(`${api}/user/log`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    logsent = JSON.parse(logsent.body);
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
    console.log(logrec);
    console.log(logsent);
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
      alive: true,
    });
  }
);

fastify.post(
  "/sendfunds",
  {
    preValidation: [validate],
  },
  async function (req, res) {
    //const client = new CCashClient(process.env.BANKAPIURL);
    let { amount, name, senderpass } = req.body;
    req.session.set("errors", "");
    req.session.set("successes", "");
    let result;
    //result = await client.sendFunds(a_name, senderpass, name, amount);
    result = await got.post(`${api}/user/transfer`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
      json: {
        to: name,
        amount: amount,
      },
    });
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
  //const client = new CCashClient(process.env.BANKAPIURL);
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
    //let checkuser = await client.addUser(name, password);
    let checkuser = await got.post(`${api}/user/register`, {
      headers: {
        Accept: "application/json",
      },
      json: {
        name: `${name}`,
        pass: `${password}`,
      },
    });
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
  //const client = new CCashClient(process.env.BANKAPIURL);

  if (req.session.get("user")) {
    res.redirect("/");
  }
  const { name, password } = req.body;
  let adminTest;
  /*try {
    adminTest = await client.adminVerifyPassword(password);
  } catch (err) {
    console.log(err);
  }*/
  let auth = btoa(`${name}:${password}`);
  auth = `Basic ${auth}`;
  console.log(auth);
  try {
    adminTest = await got.post(`${api}/admin/verify_account`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
  } catch (e) {
    console.log(e);
  }
  adminTest = JSON.parse(adminTest.body);
  console.log(adminTest);
  if (adminTest != -2) {
    req.session.set("b64", auth);
    req.session.set("admin", adminTest);
    req.session.set("user", name);
    req.session.set("password", password);
    res.redirect("/BankF");
  } else {
    let verified;
    //verified = await client.verifyPassword(name, password);
    verified = await got.post(`${api}/user/verify_password`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    console.log(verified);
    if (verified == 1) {
      req.session.set("b64", auth);
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

fastify.get("/logout", async function (req, res) {
  //const client = new CCashClient(process.env.BANKAPIURL);
  //let checkalive = await client.ping();
  let checkalive = await got(`${api}/ping`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive) {
    alive = true;
  } else {
    alive = false;
  }
  let successes = req.session.get("successes");
  let errors = req.session.get("errors");
  req.session.delete();
  res.view("login", {
    random: papy(),
    successes: successes,
    errors: errors,
    alive: alive,
  });
});

fastify.get("/login", async function (req, res) {
  //const client = new CCashClient(process.env.BANKAPIURL);
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  //let checkalive = await client.ping();
  let checkalive = await got(`${api}/ping`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive) {
    alive = true;
  } else {
    alive = false;
  }
  res.view("login", {
    successes: successes,
    errors: errors,
    user: req.session.get("user"),
    random: papy(),
    alive: alive,
  });
});

fastify.get("/register", async function (req, res) {
  //const client = new CCashClient(process.env.BANKAPIURL);
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  //let checkalive = await client.ping();
  let checkalive = await got(`${api}/ping`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive) {
    alive = true;
  } else {
    alive = false;
  }
  res.view("register", {
    successes: successes,
    errors: errors,
    user: req.session.get("user"),
    admin: req.session.get("admin"),
    random: papy(),
    alive: alive,
  });
});
process.on("SIGINT", function () {
  process.exit();
});

fastify.listen(process.env.PORT || 3000, "0.0.0.0", function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
  console.log(`server running on ${address}`);
});

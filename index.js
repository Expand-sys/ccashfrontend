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
  Cookie: {
    path: "/",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
    signed: true,
    secure: "auto",
    httpOnly: true,
    overwrite: true,
    sameSite: "none",
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

const api = `${process.env.BANKAPIURL}`;

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
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  if (process.env.SETUP == false || !process.env.SETUP) {
    res.view("setup");
  } else {
    console.log(`${api}/api/properties`);
    let checkalive = await got(`${api}/api/properties`, {
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
      errors: errors,
      successes: successes,
    });
  }
});
fastify.get(
  "/BankF",
  {
    preValidation: [validate],
  },
  async function (req, res) {
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
    balance = await got(`${api}/api/v1/user/balance`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
      searchParams: {
        name: user,
      },
    });
    balance = parseInt(balance.body);
    console.log(balance);
    console.log("start " + Date.now());

    let log = await got(`${api}/api/v2/user/log`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    let transactionlog = []
    let currentbal = balance;
    log = JSON.parse(log.body);
    let final = []
    let final2 = [];

    /*if(log != null){
      let graphlog = log.reverse();

      
      console.log(graphlog)
      console.log(`the previous thing should be a array`)
      final.push(parseInt(balance))
      console.log(final)
      for(let i = 0; i < 16; i++) {
        console.log(`itshiptobeesfuck`)
        console.log(graphlog[i].amount)
        let thingy
        if(graphlog[i].amount >0 ){
          thingy = parseInt(final[i]) + parseInt(graphlog[i].amount) 
        } else {
          thingy = parseInt(final[i]) - parseInt(graphlog[i].amount) 
  
        }
  
        final.push(Math.abs(thingy))
      }
      console.log(`here`)
      console.log(`${final}`)
      final = final.reverse()
      final.unshift(balance)
      for(let i=0;i<final.length;i++){
        final2.push([i, final[i]])
      }
      final2.unshift(["Transaction", "Amount"])
  
    
     
    }*/
    if(log){
      log.reverse()
    
    
      for(i = 0; i < log.length; i++){
    
        
        if(log[i].amount > 0){
          let absol = Math.abs(log[i].amount)
          let date = new Date(log[i].time * 1000)
          transactionlog.push(`${log[i].counterparty} sent you ${absol} at ${date}`);

        } else {
          let date = new Date(log[i].time * 1000)
          let absol = Math.abs(log[i].amount)
          transactionlog.push(`You sent ${log[i].counterparty} ${absol} at ${date}`);

        }
      }
    }
    console.log("begin render " + Date.now());
  
    //let maxgraph = balance + 1000;
    //let stringgraphdata = JSON.stringify(final2)
    //console.log(stringgraphdata)
    //let graphdata = stringgraphdata.slice(1,stringgraphdata.length-1)
    res.view("bankf", {
      transactionlog: transactionlog,
      //maxgraph: maxgraph,
      //graphdata: graphdata,
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
    let { amount, name, senderpass } = req.body;
    req.session.set("errors", "");
    req.session.set("successes", "");
    let result;
    let auth = req.session.get("b64");
    try {
      result = await got.post(`${api}/api/v1/user/transfer`, {
        headers: {
          Authorization: auth,
          Accept: "application/json",
        },
        json: {
          name: name,
          amount: parseInt(amount),
        },
      });
    } catch (e) {
      req.session.set("errors", `${e}`);
    }
    if (result) {
      req.session.set("successes", "Transfer successful");
      //post details
    }
    res.redirect("/BankF");
  }
);

fastify.post("/register", async function (req, res) {
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

    try {
      let checkuser = await got.post(`${api}/api/v1/user/register`, {
        headers: {
          Accept: "application/json",
        },
        json: {
          name: `${name}`,
          pass: `${password}`,
        },
      });
      if (checkuser) {
        req.session.set("successes", "Account Created! please Log in");
      }
    } catch (e) {
      console.log(e);
      req.session.set("errors", `${e.response.body}`);
      console.log(e.response.body);
    }

    res.redirect("/register");
  }
});

fastify.post("/login", async function (req, res) {
  if (req.session.get("user")) {
    res.redirect("/");
  }
  const { name, password, score, success } = req.body;
  console.log(success, score)
  if( score <= 0.2 && success == true){
    req.session.set("errors", "failed captcha")
    res.redirect("/login")
  }

  let auth = Buffer.from(`${name}:${password}`).toString('base64');
  auth = `Basic ${auth}`;
  let adminTest;
  try {
    adminTest = await got.post(`${api}/api/v1/admin/verify_account`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });

    adminTest = JSON.parse(adminTest.statusCode);
  } catch (e) {
    console.log(e.response.body);
    console.log("yeet")
  }
  console.log(adminTest);
  if (adminTest == 204) {
    req.session.set("b64", auth);
    req.session.set("admin", adminTest);
    req.session.set("user", name);
    req.session.set("password", password);
  } else {
    let verified;
    try {
      verified = await got.post(`${api}/api/v1/user/verify_password`, {
        headers: {
          Authorization: auth,
          Accept: "application/json",
        },
      });
      verified = JSON.parse(verified.statusCode);
    } catch (e) {
      req.session.set("errors", `${e.response.body}`);
      console.log(e.response.body);
    }
    if (verified) {
      req.session.set("b64", auth);
      req.session.set("user", name);
      req.session.set("password", password);
    }
  }
  res.redirect("/BankF");
});

fastify.register(require("./routes/admin"), { prefix: "/admin" });

fastify.register(require("./routes/settings"), { prefix: "/settings" });

fastify.get("/logout", async function (req, res) {
  let checkalive = await got(`${api}/api/properties`, {
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
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  //let checkalive = await client.ping();
  let checkalive = await got(`${api}/api/properties`, {
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
  let successes = req.session.get("successes");
  req.session.set("successes", "");
  let errors = req.session.get("errors");
  req.session.set("errors", "");
  //let checkalive = await client.ping();
  let checkalive = await got(`${api}/api/properties`, {
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

const root = process.env.PWD;
require("pino-pretty");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });
const fastify = require("fastify")({
  logger: false,
});

const fastifyFlash = require("@fastify/flash");

const path = require("path");
const url = require("url");

const fs = require("fs");
fastify.register(require("@fastify/cookie"));
fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

fastify.register(require("@fastify/session"), {
  // the name of the session cookie, defaults to 'session'
  cookieName: "session",
  // adapt this to point to the directory where secret-key is located
  secret: "iohadwjbnfwadjuobufwhaiojnwfiklndlioaknsiohiuhr2890u4902u94u219j4oip12jiopj",
  cookie: {
    path: "/",
    // options for setCookie, see https://github.com/fastify/fastify-cookie
    secure: "auto",
    httpOnly: true,
    sameSite: "none",
  },
});
fastify.register(fastifyFlash);
fastify.register(require("@fastify/view"), {
  engine: {
    pug: require("pug"),
  },
  defaultContext: {
  },
  root: path.join(__dirname, "views"),
});

const api = `${process.env.BANKAPIURL}`;

function validate(req, res, next) {
  if (req.session.get("user") != null) {
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
  let successes = req.session.successes;
  req.session.successes =  "";
  let errors = req.session.errors;
  req.session.errors = "";
  console.log(`${api}/api/properties`);
  try{
    let checkalive = await fetch(`${api}/api/properties`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (e){
    console.log(e)
  }
  
  let alive = false
  if (checkalive.ok) {
    alive = true;
  }

  return res.view("index", {
    user: req.session.user,
    admin: req.session.admin,
    alive: alive,
    url: process.env.BANKAPIURL,
    errors: errors,
    successes: successes,
  });

});
fastify.get(
  "/BankF",
  {
    preValidation: [validate],
  },
  async function (req, res) {
    let successes = req.session.successes;
    req.session.successes = "";
    let errors = req.session.errors;
    req.session.errors = "";
    let admin;
    try {
      admin = req.session.admin;
    } catch (err) {
      console.log(err);
    }
    let balance = 0;
    const user = req.session.user;
    const password = req.session.password;
    const auth = req.session.b64;
    balance = await fetch(`${api}/api/v1/user/balance?name=${user}`, {
      headers: {
        Authorization: auth,
        Accept: "*/*",
      },
    });
    balance = await parseInt(await balance.text());
    //console.log(balance);
    console.log("start " + Date.now());

    let log = await fetch(`${api}/api/v2/user/log`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "Content-Type": "application/json"

      },
    });
    let transactionlog = []
    log = await log.json()

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
    return res.view("bankf", {
      transactionlog: transactionlog,
      //maxgraph: maxgraph,
      //graphdata: graphdata,
      user: req.session.user,
      balance: balance,
      admin: req.session.admin,
      successes: successes,
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
    let { amount, name } = req.body;
    req.session.errors = "";
    req.session.successes = "";
    let result;
    let auth = req.session.b64;

    try {
      result = await fetch(`${api}/api/v1/user/transfer`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: auth,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "name": name,
          "amount": parseInt(amount),
        }),
      });
    } catch (e) {
      console.log(e)
      req.session.errors = `${e}`;
    }
    console.log(result)
    console.log(await result.text())
    if (result.ok) {
      req.session.successes = "Transfer successful";
      //post details
    }
    return res.redirect("/BankF");
  }
);



fastify.post("/register", async function (req, res) {
  var { name, password, password2 } = req.body;
  req.session.successes = "";
  req.session.errors = "";
  if (!name || !password || !password2) {
    req.session.errors = "please fill in all fields";
    return res.redirect("/register");
  } else if (password != password2) {
    req.session.errors = "Passwords don't match";
    return res.redirect("/register");
  } else if (password.length < 6) {
    req.session.errors = "Password must be at least 6 characters";
    return res.redirect("/register");
  } else {
    //let checkuser = await client.addUser(name, password);

    try {
      let checkuser = await fetch(`${api}/api/v1/user/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "name": `${name}`,
          "pass": `${password}`,
        }),
      });
      if (checkuser.ok) {
        req.session.successes = "Account Created! please Log in";
      }
      console.log(checkuser)
    } catch (e) {
      console.log(e);
      req.session.errors = `${await e.text()}`;
      console.log(e);
      return res.redirect("/register")
    }

    return res.redirect("/login");
  }
});

fastify.post("/login", async function (req, res) {
  if (req.session.get("user")) {
    return res.redirect("/");
  }
  const { name, password } = req.body;
  console.log(name,password)
  /*if( score <= 0.2 && success == true){
    req.session.set("errors", "failed captcha")
    return res.redirect("/login")
  }*/

  let auth = Buffer.from(`${name}:${password}`).toString('base64');
  auth = `Basic ${auth}`;
  console.log(auth)
  let adminTest;
  try {
    adminTest = await fetch(`${api}/api/v1/admin/verify_account`, {
      method: "POST",
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });

    adminTest = JSON.parse(adminTest.ok);
  } catch (e) {
    console.log(`${e.text()}`);
    console.log("yeet")
  }
  console.log(adminTest);
  if (adminTest) {
    req.session.b64 = auth;
    req.session.admin = adminTest;
    req.session.user =  name;
    req.session.password =  password;
    return res.redirect("/BankF");

  } else {
    let verified;
    try {
      verified = await fetch(`${api}/api/v1/user/verify_password`, {
        method: "POST",
        headers: {
          Authorization: auth,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
      });
      console.log(verified)
    } catch (e) {
      console.log(e);
    }
    if (verified.ok == true) {
      req.session.b64 = auth;
      req.session.user = name;
      req.session.password = password;
      return res.redirect("/BankF");

    } else{
      req.session.errors = await verified.text()
      return res.redirect("/login");
    }
    
  }
});

fastify.register(require("./routes/admin"), { prefix: "/admin" });

fastify.register(require("./routes/settings"), { prefix: "/settings" });

fastify.get("/logout", async function (req, res) {
  let checkalive = await fetch(`${api}/api/properties`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive.ok) {
    alive = true;
  } else {
    alive = false;
  }
  let successes = req.session.successes;
  let errors = req.session.errors;
  req.session.destroy();
  return res.view("login", {
    successes: successes,
    errors: errors,
    alive: alive,
  });
});

fastify.get("/login", async function (req, res) {
  let successes = req.session.successes;
  req.session.successes =  "";
  let errors = req.session.errors;
  console.log(req.session.errors)
  req.session.serrors =  "";
  //let checkalive = await client.ping();
  let checkalive = await fetch(`${api}/api/properties`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive.ok) {
    alive = true;
  } else {
    alive = false;
  }
  return res.view("login", {
    successes: successes,
    errors: errors,
    user: req.session.user,
    alive: alive,
  });
});

fastify.get("/register", async function (req, res) {
  let successes = req.session.successes;
  req.session.successes = "";
  let errors = req.session.errors;
  req.session.errors = "";
  //let checkalive = await client.ping();
  let checkalive = await fetch(`${api}/api/properties`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (checkalive.ok) {
    alive = true;
  } else {
    alive = false;
  }
  return res.view("register", {
    successes: successes,
    errors: errors,
    user: req.session.user,
    admin: req.session.admin,
    alive: alive,
  });
});
process.on("SIGINT", function () {
  process.exit();
});

fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
  console.log(`server running on ${address}`);
});

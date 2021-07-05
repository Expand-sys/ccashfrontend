const root = process.env.PWD;
const path = require("path");
const pug = require("pug");
const { postUser } = require(`${root}/helpers/functions.js`);
const got = require("got");

const fs = require("fs");

const { CCashClient } = require("ccash-client-js");
const api = process.env.BANKAPIURL;
console.log("Sen was here");
module.exports = function (fastify, opts, done) {
  fastify.get(
    "/",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
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
      req.session.set("successes", "");
      let errors = req.session.get("errors");
      req.session.set("errors", "");
      res.view("adminsettings", {
        user: req.session.get("user"),
        admin: req.session.get("admin"),
        errors: errors,
        successes: successes,
        random: papy(),
        alive: alive,
      });
    }
  );

  fastify.post(
    "/user",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      //const client = new CCashClient(process.env.BANKAPIURL);
      let { name, init_pass, init_bal, password2 } = req.body;
      if (!name || !init_pass || !init_bal || !password2) {
        req.session.set("errors", "please fill in all fields");
      } else if (init_pass !== password2) {
        req.session.set("errors", "Passwords don't match");
      } else if (init_pass.length < 6) {
        req.session.set("errors", "Password must be at least 6 characters");
      }
      /*let post = await client.adminAddUser(
        name,
        req.session.get("adminp"),
        init_pass,
        parseInt(init_bal)
      );*/

      let post = await got.post(`${api}/admin/user/register`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        json: {
          name: name,
          balance: parseInt(init_bal),
          pass: init_pass,
        },
      });
      console.log(post.body);
      if (post == -3) {
        req.session.set("errors", "Invalid Request");
      } else if (post == -4) {
        req.session.set("errors", "Name too long");
      } else if (post == -5) {
        req.session.set("errors", "User already exists");
      } else {
        req.session.set("successes", "Account Creation Successful");
      }
      res.redirect("/admin");
    }
  );

  fastify.post(
    "/baluser",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      //const client = new CCashClient(process.env.BANKAPIURL);
      let { name } = req.body;
      let balance;
      req.session.set("successes", "");
      req.session.set("errors", "");
      //balance = await client.balance(name);
      balance = await got(`${api}/user/balance`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        query: {
          name: name,
        },
      });
      balance = parseInt(balance.body);
      console.log(balance);
      if (balance < 0) {
        req.session.set("errors", "User not found");
      } else {
        req.session.set(
          "successes",
          "User: " + name + " has " + balance + " monies"
        );
      }
      res.redirect("/admin");
    }
  );

  fastify.post(
    "/setbal",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      const client = new CCashClient(process.env.BANKAPIURL);
      let { name, amount } = req.body;
      let patch;
      req.session.successes = [];
      req.session.errors = [];
      /*patch = await client.setBalance(
        name,
        req.session.get("adminp"),
        parseInt(amount)
      );*/
      patch = await got.patch(`${api}/admin/set_balance`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        json: {
          name: name,
          amount: parseInt(amount),
        },
      });
      console.log(patch);
      if (patch == -1) {
        req.session.set("errors", "User not Found");
      } else if (patch == 1) {
        req.session.set("successes", "Change Funds Successful");
      }
      res.redirect("/admin");
    }
  );
  fastify.post(
    "/subbal",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      const client = new CCashClient(process.env.BANKAPIURL);
      let { name, amount } = req.body;
      let patch;
      req.session.successes = [];
      req.session.errors = [];
      /*patch = await client.setBalance(
        name,
        req.session.get("adminp"),
        parseInt(amount)
      );*/
      patch = await got.post(`${api}/admin/sub_balance`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        json: {
          name: name,
          amount: parseInt(amount),
        },
      });
      console.log(patch);
      if (patch == -1) {
        req.session.set("errors", "User not Found");
      } else if (patch == 1) {
        req.session.set("successes", "Change Funds Successful");
      }
      res.redirect("/admin");
    }
  );
  fastify.post(
    "/addbal",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      //const client = new CCashClient(process.env.BANKAPIURL);
      let { name, amount } = req.body;
      let patch;
      req.session.successes = [];
      req.session.errors = [];
      /*patch = await client.setBalance(
        name,
        req.session.get("adminp"),
        parseInt(amount)
      );*/
      patch = await got.post(`${api}/admin/add_balance`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        json: {
          name: name,
          amount: parseInt(amount),
        },
      });
      console.log(patch);
      if (patch == -1) {
        req.session.set("errors", "User not Found");
      } else if (patch == 1) {
        req.session.set("successes", "Change Funds Successful");
      }
      res.redirect("/admin");
    }
  );

  fastify.post(
    "/admpass",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      //const client = new CCashClient(process.env.BANKAPIURL);
      let { name, new_pass, password2 } = req.body;
      let patch;
      if (!new_pass || !password2) {
        req.session.set("errors", "please fill in all fields");
        res.redirect("/settings");
      } else if (new_pass != password2) {
        req.session.set("errors", "Passwords don't match");
        res.redirect("/settings");
      } else if (new_pass.length < 6) {
        req.session.set("errors", "Password must be at least 6 characters");
        res.redirect("/settings");
      } else {
        /*patch = await client.changePassword(
          req.session.get("user"),
          attempt,
          new_pass
        );*/
        patch = await got.patch(`${api}/user/change_password`, {
          headers: {
            Authorization: req.session.get("b64"),
            Accept: "application/json",
          },
          json: {
            name: name,
            new_pass: new_pass,
          },
        });
        console.log(patch);
        if (patch == -2) {
          req.session.set("errors", "Password Wrong");
          res.redirect("/");
        } else {
          req.session.set(
            "successes",
            "Change Password Successful, Please Login Again"
          );
          res.redirect("/");
        }
      }
    }
  );

  fastify.post(
    "/userdelete",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      //const client = new CCashClient(process.env.BANKAPIURL);
      let { name, attempt } = req.body;

      //let deleteUser = client.adminDeleteUser(name, attempt);
      let deleteUser = await got.delete(`${api}/admin/delete`, {
        headers: {
          Authorization: req.session.get("b64"),
          Accept: "application/json",
        },
        json: {
          name: name,
        },
      });

      if (deleteUser == -1) {
        req.session.errors.push({
          msg: "User Deletion Failed, User Not Found",
        });
        res.redirect("/admin");
      } else {
        req.session.set("successes", "User Deletion Successful");
        res.redirect("/admin");
      }
    }
  );

  fastify.post(
    "/changebackend",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      let { url } = req.body;
      if (!url.endsWith("/")) {
        url = url + "/";
      }
      process.env.BANKAPIURL = url;
      fs.writeFileSync(
        `${root}/.env`,
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
      fs.mkdirSync(`${root}/tmp`);
      fs.writeFileSync(`${root}tmp/restart.txt`, "");
      res.redirect("../");
    }
  );

  fastify.post(
    "/close",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      const client = new CCashClient(process.env.BANKAPIURL);
      let { attempt } = req.body;
      let close;
      close = client.close();
      res.redirect("../");
    }
  );

  function validateAdmin(req, res, next) {
    if (!req.session.get("admin")) {
      res.redirect("/login");
    } else {
      next();
    }
  }
  function papy() {
    const rndInt = Math.floor(Math.random() * 1337);
    let random = false;
    if (rndInt == 420) {
      random = true;
    }
    return random;
  }
  done();
};

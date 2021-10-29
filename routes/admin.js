const root = process.env.PWD;
const path = require("path");
const pug = require("pug");
const got = require("got");

const fs = require("fs");

const api = process.env.BANKAPIURL;
console.log("Sen was here");
module.exports = function (fastify, opts, done) {
  fastify.get(
    "/",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      let checkalive = await got(`${api}../properties`, {
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
      let { name, init_pass, init_bal, password2 } = req.body;
      if (!name || !init_pass || !init_bal || !password2) {
        req.session.set("errors", "please fill in all fields");
      } else if (init_pass !== password2) {
        req.session.set("errors", "Passwords don't match");
      }
      let post;
      try {
        post = await got.post(`${api}admin/user/register`, {
          headers: {
            Authorization: req.session.get("b64"),
            Accept: "application/json",
          },
          json: {
            name: name,
            amount: parseInt(init_bal),
            pass: init_pass,
          },
        });
        post = post.statusCode;
      } catch (e) {
        req.session.set("errors", `${e.response.body}`);
        console.log(e.response.body);
      }
      if (post) {
        req.session.set("successes", `User ${name} registered.`);
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
      let { name } = req.body;
      let balance;
      req.session.set("successes", "");
      req.session.set("errors", "");
      let responsecode;
      try {
        balance = await got(`${api}user/balance`, {
          headers: {
            Authorization: req.session.get("b64"),
            Accept: "application/json",
          },
          searchParams: {
            name: name,
          },
        });
        balance = parseInt(balance.body);
      } catch (e) {
        req.session.set("errors", `${e.response.body}`);
        console.log(e.response.body);
      }

      console.log(balance);
      if (balance || balance == 0) {
        req.session.set(
          "successes",
          "User: " + name + " has " + balance + " truckstop shitter simoleons"
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
      let { name, amount } = req.body;
      let patch;
      req.session.successes = [];
      req.session.errors = [];
      try {
        patch = await got.patch(`${api}admin/set_balance`, {
          headers: {
            Authorization: req.session.get("b64"),
            Accept: "application/json",
          },
          json: {
            name: name,
            amount: parseInt(amount),
          },
        });
        patch = patch.statusCode;
      } catch (e) {
        req.session.set("errors", `${e.response.body}`);
        console.log(e.response.body);
      }

      console.log(patch);
      if (patch) {
        req.session.set("successes", "Change Funds Successful");
      }
      res.redirect("/admin");
    }
  );
  fastify.post(
    "/impbal",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      let { name, amount } = req.body;
      let patch;
      req.session.successes = [];
      req.session.errors = [];

      try {
        patch = await got.post(`${api}admin/impact_balance`, {
          headers: {
            Authorization: req.session.get("b64"),
            Accept: "application/json",
          },
          json: {
            name: name,
            amount: parseInt(amount),
          },
        });
      } catch (e) {
        req.session.set("errors", `${e.response.body}`);
        console.log(e.response.body);
      }
      if (patch) {
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
      let { name, new_pass, password2 } = req.body;
      let patch;

      if (new_pass == password2) {
        try {
          patch = await got.patch(`${api}admin/user/change_password`, {
            headers: {
              Authorization: req.session.get("b64"),
              Accept: "application/json",
            },
            json: {
              name: name,
              pass: new_pass,
            },
          });
        } catch (e) {
          req.session.set("errors", `${e.response.body}`);
          console.log(e.response.body);
        }
        if (patch) {
          req.session.set("successes", "Change Password Successful");
        }
      } else {
        req.session.set("errors", `Passwords dont match`);
      }

      res.redirect("/admin");
    }
  );

  fastify.post(
    "/userdelete",
    {
      preValidation: [validateAdmin],
    },
    async function (req, res) {
      let { name, attempt } = req.body;

      if (attempt != req.session.get("adminp"))
        try {
          let deleteUser = await got.delete(`${api}admin/user/delete`, {
            headers: {
              Authorization: req.session.get("b64"),
              Accept: "application/json",
            },
            json: {
              name: name,
            },
          });
          deleteUser = deleteUser.statusCode;
          console.log(deleteUser);
          if (deleteUser) {
            req.session.set("successes", "User Deletion Successful");
          }
        } catch (e) {
          req.session.set("errors", `${e.response.body}`);
          console.log(e.response.body);
        }

      res.redirect("/admin");
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
      let { attempt } = req.body;
      let name = req.session.get("user");
      let close;
      //close = client.close();
      let auth = btoa(`${name}:${attempt}`);
      auth = `Basic ${auth}`;
      try {
        close = got.post(`${api}/admin/shutdown`, {
          headers: {
            Authorization: auth,
            Accept: "application/json",
          },
        });
      } catch (e) {
        req.session.set("errors", `${e.response.body}`);
        console.log(e.response.body);
      }
      if (close) {
        req.session.set("successes", "Closed instance");
      }
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

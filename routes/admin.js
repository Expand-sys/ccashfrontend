const root = process.env.PWD;
const path = require("path");
const pug = require("pug");

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
      let checkalive = await fetch(`${api}/api/properties`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (checkalive) {
        alive = true;
      } else {
        alive = false;
      }
      let successes = req.session.successes;
      req.session.successes = "";
      let errors = req.session.errors;
      req.session.errors = "";
      return res.view("adminsettings", {
        user: req.session.user,
        admin: req.session.admin,
        errors: errors,
        successes: successes,
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
        req.session.errors = "please fill in all fields";
      } else if (init_pass !== password2) {
        req.session.errors = "Passwords don't match";
      }
      let post;
      try {
        post = await fetch(`${api}/api/v1/admin/user/register`, {
          method: 'POST',
          headers: {
            Authorization: req.session.b64,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "name": name,
            "amount": parseInt(init_bal),
            "pass": init_pass,
          }),
        });
        post = post.ok;
      } catch (e) {
        req.session.errors = `${e.text()}`;
        console.log(e.text());
      }
      if (post) {
        req.session.successes = `User ${name} registered.`;
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
      req.session.successes = "";
      req.session.errors = "";
      let responsecode;
      try {
        balance = await fetch(`${api}/api/v1/user/balance`, {
          headers: {
            Authorization: req.session.b64,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          searchParams: {
            "name": name,
          },
        });
        balance = parseInt(balance.body);
      } catch (e) {
        req.session.errors = `${e}`;
        console.log(e);
      }

      console.log(balance);
      if (balance || balance == 0) {
        req.session.successes = "User: " + name + " has " + balance + " CCash";
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
      req.session.successes = ""
      req.session.errors = ""
      console.log(name, amount)
      try {
        patch = await fetch(`${api}/api/v1/admin/set_balance`, {
          method: 'PATCH',
          headers: {
            Authorization: `${req.session.b64}`,
            Accept: "*/*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "name": `${name}`,
            "amount": parseInt(amount),
          }),
        });
        console.log(patch, patch.blob())
        patch = patch.ok;
      } catch (e) {
        req.session.errors = e;
        console.log(e);
      }

      console.log(patch);
      if (patch) {
        req.session.successes = "Change Funds Successful";
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
      console.log(amount)
      amount = parseInt(amount, 10)
      console.log(amount)
      try {
        patch = await fetch(`${api}/api/v1/admin/impact_balance`, {
          method: 'POST',
          headers: {
            Authorization: req.session.b64,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "name": name,
            "amount": amount,
          }),
        });
      } catch (e) {
        req.session.errors = `${e}`;
        console.log(e);
      }
      if (patch) {
        req.session.errors = ""
        req.session.successes = "Change Funds Successful";
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
          patch = await fetch(`${api}/api/v1/admin/user/change_password`, {
            method: 'PATCH',
            headers: {
              Authorization: req.session.b64,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              "name": name,
              "pass": new_pass,
            }),
          });
        } catch (e) {
          req.session.errors = `${e}`;
          console.log(e);
        }
        if (patch) {
          req.session.successes = "Change Password Successful";
        }
      } else {
        req.session.errors = `Passwords dont match`;
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

      if (attempt != req.session.adminp)
        try {
          let deleteUser = await fetch(`${api}/api/v1/admin/user/delete`, {
            method: 'DELETE',
            headers: {
              Authorization: req.session.b64,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              "name": name,
            }),
          });
          deleteUser = deleteUser.statusCode;
          console.log(deleteUser);
          if (deleteUser) {
            req.session.successes = "User Deletion Successful";
          }
        } catch (e) {
          req.session.errors = `${e}`;
          console.log(e);
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
      let name = req.session.user;
      let close;
      //close = client.close();
      let auth = btoa(`${name}:${attempt}`);
      auth = `Basic ${auth}`;
      try {
        close = fetch(`${api}/api/v1/admin/shutdown`, {
          method: 'POST',
          headers: {
            Authorization: auth,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        req.session.errors = `${e}`;
        console.log(e);
      }
      if (close) {
        req.session.successes = "Closed instance";
      }
      res.redirect("../");
    }
  );

  function validateAdmin(req, res, next) {
    if (!req.session.admin) {
      res.redirect("/login");
    } else {
      next();
    }
  }
  done();
};

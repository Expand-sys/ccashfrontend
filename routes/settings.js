const root = process.env.PWD;
const path = require("path");
var pug = require("pug");
const { postUser } = require(`${root}/helpers/functions.js`);
const { CCashClient } = require("ccash-client-js");

function validate(req, res, next) {
  if (!req.session.get("user")) {
    res.redirect("/login");
  } else {
    next();
  }
}

module.exports = function (fastify, opts, done) {
  fastify.get(
    "/",
    {
      preValidation: [validate],
    },
    function (req, res) {
      let successes = req.session.get("successes");
      req.session.set("successes", "");
      let errors = req.session.get("errors");
      req.session.set("errors", "");
      res.view("settings", {
        errors: errors,
        successes: successes,
        user: req.session.get("user"),
        admin: req.session.get("admin"),
      });
    }
  );

  fastify.post(
    "/pass",
    {
      preValidation: [validate],
    },
    async function (req, res) {
      const client = new CCashClient(process.env.BANKAPIURL);
      let { attempt, new_pass, password2 } = req.body;
      let patch;
      if (attempt == undefined) {
        attempt = "";
      } else if (!new_pass || !password2) {
        req.session.set("errors", "please fill in all fields");
        res.redirect("/settings");
      } else if (new_pass != password2) {
        req.session.set("errors", "Passwords don't match");
        res.redirect("/settings");
      } else if (new_pass.length < 6) {
        req.session.set("errors", "Password must be at least 6 characters");
        res.redirect("/settings");
      } else {
        patch = await client.changePassword(
          req.session.user,
          attempt,
          new_pass
        );
        console.log(patch);
        if (patch == -2) {
          req.session.set("errors", "Password Wrong");
          res.redirect("/settings");
        } else {
          req.destroySession(function (err) {
            req.session.set(
              "successes",
              "Change Password Successful, Please Login Again"
            );
            res.redirect("/login");
          });
        }
      }
    }
  );

  fastify.post(
    "/delete",
    {
      preValidation: [validate],
    },
    async function (req, res) {
      const client = new CCashClient(process.env.BANKAPIURL);
      let { password, password2 } = req.body;
      let del;
      if (!password || !password2) {
        req.session.set("errors", "please fill in all fields");
        res.redirect("/settings");
      } else if (password != password2) {
        req.session.set("errors", "Passwords don't match");
        res.redirect("/settings");
      } else {
        del = await client.deleteUser(req.session.user, password);
        console.log(del);
        if (del == -2) {
          req.session.set("errors", "Password Wrong");
          res.redirect("/settings");
        } else {
          req.session.delete();
          req.session.set(
            "successes",
            "Account Deleted, pls dont come back to complain"
          );
          res.redirect("/login");
        }
      }
    }
  );

  done();
};

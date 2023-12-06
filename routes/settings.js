const root = process.env.PWD;
const path = require("path");
var pug = require("pug");

function validate(req, res, next) {
  if (!req.session.get("user")) {
    res.redirect("/login");
  } else {
    next();
  }
}
const api = process.env.BANKAPIURL;

module.exports = function (fastify, opts, done) {
  fastify.get(
    "/",
    {
      preValidation: [validate],
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
      return res.view("settings", {
        errors: errors,
        successes: successes,
        user: req.session.user,
        admin: req.session.admin,
        alive: true,
      });
    }
  );

  fastify.post(
    "/pass",
    {
      preValidation: [validate],
    },
    async function (req, res) {

      let { attempt, new_pass, password2 } = req.body;
      let patch;


      if (attempt == undefined) {
        attempt = "";
      } else if (!new_pass || !password2) {
        req.session.errors = "please fill in all fields";
        res.redirect("/settings");
      } else if (new_pass != password2) {
        req.session.errors = "Passwords don't match";
        res.redirect("/settings");
      } else if (new_pass.length < 6) {
        req.session.errors = "Password must be at least 6 characters";
        res.redirect("/settings");
      } else {
        try {
          let name = req.session.user;
          let auth = btoa(`${name}:${attempt}`);
          auth = `Basic ${auth}`;
          patch = await fetch(`${api}/api/v1/user/change_password`, {
            method: 'PATCH',
            headers: {
              Authorization: auth,
              Accept: "application/json",
              "Content-Type": "application/json"

            },
            body: JSON.stringify({
              "pass": new_pass,
            }),
          });
        } catch (e) {
          //req.session.set("errors", `${e.response.body}`);
          console.log(e);
        }

        if (patch.ok) {
          req.session.user = null
          req.session.password = null;
          req.session.successes = "Change Password Successful, Please Login Again";
          return res.redirect("/login");
          
        } else {
          req.session.errors = `${await patch.text()}`;
          return res.redirect("/settings");
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

      let { password, password2 } = req.body;
      let del;
      if (!password || !password2) {
        req.session.errors = "please fill in all fields";
        res.redirect("/settings");
      } else if (
        password != password2 &&
        password != req.session.password
      ) {
        req.session.errors = "Passwords don't match";
        res.redirect("/settings");
      } else {
        let name = req.session.user;
        let auth = btoa(`${name}:${password}`);
        auth = `Basic ${auth}`;
        try {
          del = await fetch(`${api}/api/v1/user/delete`, {
            method: 'DELETE',
            headers: {
              Authorization: auth,
              Accept: "application/json",
              "Content-Type": "application/json"
            },
          });
        } catch (e) {
          //req.session.set("errors", `${e}`);
          console.log(e);
        }

        console.log(del);
        if (del.ok) {
          req.session.user = null
          req.session.password = null;
          req.session.successes = "User Deletion Successful, This is IRREVERSIBLE please do not complain";
        } else{
          req.session.errors = `${await del.text()}`
        }
        res.redirect("/");
      }
    }
  );

  done();
};

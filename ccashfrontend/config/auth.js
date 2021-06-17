module.exports = {
  ensureAuthenticated: function (req, res, next) {
    if (req.session.user != undefined) {
      return next();
    }
    req.session.errors = [];
    req.session.errors.push({ msg: "please login to view this resource" });
    res.redirect("/login");
  },
};

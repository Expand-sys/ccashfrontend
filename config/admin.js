module.exports = {
  checkAdmin: function (req, res, next) {
    if (req.session.admin != false) {
      if (req.session.admin != undefined) {
        return next();
      }
    }

    req.flash("error_msg", "admins only");
    res.redirect("/");
  },
};

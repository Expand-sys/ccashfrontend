module.exports = {
  ensureAuthenticated : function(req,res,next) {
    if(req.session.user != undefined) {
      return next();
    }
  req.flash('error_msg' , 'please login to view this resource');
  res.redirect('/login');
}
}

module.exports = (req, res, next) => {

  if (req.session && req.session.user) {
    return next();

  } else {

    req.flash("error_msg", "Please login first!");
    return res.redirect("/auth/login");
  }
};

// middleware to verify (user loggedin or not
module.exports = function (req, res, next) {
  
    if (req.session.user && req.session.user.role === "admin") {
        next(); 

    } else {
        
        req.flash('error_msg', 'Access denied. Admin privileges required.');
        return res.redirect("/auth/login"); 
    }
};

// middleware to check if the loggedin user is an admin or not
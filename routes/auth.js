const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// helper: sending verification 
const sendVerificationEmail = async (user, req) => {
  const verificationLink = `${req.protocol}://${req.get("host")}/auth/verify-email/${user.verificationToken}`;

  await sendEmail({
    email: user.email,
    subject: "Verify Your Email - Sana Safinaaz",
    message: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Email Verification</h2>
        <p>Hello ${user.name},</p>
        <p>Thank you for creating your account.</p>
        <p>Please click the button below to verify your email address:</p>

        <p style="margin: 25px 0;">
          <a href="${verificationLink}" 
             style="background:#0d6efd; color:#fff; text-decoration:none; padding:12px 22px; border-radius:6px; display:inline-block;">
             Verify Email
          </a>
        </p>

        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>

        <p>This verification link will expire in 1 hour.</p>
      </div>
    `,
  });
};



// Login Page
router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login",
  });
});



// Login POST
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validator.isEmail(email || "")) {
      req.flash("error_msg", "Please enter a valid email address.");
      return res.redirect("/auth/login");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      req.flash("error_msg", "This email does not exist. Please create an account.");
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.flash("error_msg", "Invalid email or password.");
      return res.redirect("/auth/login");
    }

    if (!user.isVerified) {
      req.flash("error_msg", "Please verify your email first before logging in.");
      return res.redirect(`/auth/login?email=${encodeURIComponent(user.email)}`);
    }

    req.session.user = user;
    req.flash("success_msg", "Logged in successfully!");
    return res.redirect("/");
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error_msg", "An error occurred. Please try again.");
    return res.redirect("/auth/login");
  }
});



// Signup Page
router.get("/signup", (req, res) => {
  res.render("auth/signup", {
    title: "Signup",
    errors: [],
  });
});



// Signup POST
router.post("/signup", async (req, res) => {
  const { name, email, password, confirm_password } = req.body;
  let errors = [];

  if (!name || !email || !password || !confirm_password) {
    errors.push({ msg: "Please enter all fields" });
  }

  if (email && !validator.isEmail(email)) {
    errors.push({ msg: "Please enter a valid email address" });
  }

  const bannedDomains = [
    "mailinator.com",
    "tempmail.com",
    "10minutemail.com",
    "yopmail.com",
  ];

  let emailDomain = "";

  if (email && email.includes("@")) {
    emailDomain = email.split("@")[1].toLowerCase();
  }

  if (bannedDomains.includes(emailDomain)) {
    errors.push({ msg: "Temporary email addresses are not allowed." });
  }

  if (password !== confirm_password) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (!password || password.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }

  if (errors.length > 0) {
    return res.render("auth/signup", {
      errors,
      name,
      email,
      password,
      confirm_password,
      title: "Signup",
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (!existingUser.isVerified) {
        req.flash("error_msg", "This email is already registered but not verified. Please verify your email or resend the verification link.");
        return res.redirect(`/auth/login?email=${encodeURIComponent(normalizedEmail)}`);
      }

      errors.push({ msg: "Email already exists" });
      return res.render("auth/signup", {
        errors,
        name,
        email,
        password,
        confirm_password,
        title: "Signup",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email: normalizedEmail,
      password,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 3600000, // 1 hour
    });

    await newUser.save();

    await sendVerificationEmail(newUser, req);

    req.flash("success_msg", "Account created successfully! Please check your email and verify your account before login.");
    return res.redirect(`/auth/login?email=${encodeURIComponent(normalizedEmail)}`);
  } catch (err) {
    console.error("Signup error:", err);
    req.flash("error_msg", "Server error during signup");
    return res.redirect("/auth/signup");
  }
});





// Verify Email
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error_msg", "Verification link is invalid or has expired.");
      return res.redirect("/auth/login");
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await user.save();

    req.flash("success_msg", "Email verified successfully! You can now login.");
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Email verification error:", err);
    req.flash("error_msg", "Something went wrong during email verification.");
    return res.redirect("/auth/login");
  }
});




// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email || "")) {
      req.flash("error_msg", "Please enter a valid email address.");
      return res.redirect("/auth/login");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      req.flash("error_msg", "No account found with this email.");
      return res.redirect("/auth/login");
    }

    if (user.isVerified) {
      req.flash("success_msg", "This account is already verified. Please login.");
      return res.redirect("/auth/login");
    }

    user.verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationTokenExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendVerificationEmail(user, req);

    req.flash("success_msg", "A new verification email has been sent.");
    return res.redirect(`/auth/login?email=${encodeURIComponent(user.email)}`);
  } catch (err) {
    console.error("Resend verification error:", err);
    req.flash("error_msg", "Could not resend verification email. Please try again.");
    return res.redirect("/auth/login");
  }
});




// Logout
router.get("/logout", (req, res) => {
  req.flash("success_msg", "You are logged out");
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/");
    }
    res.clearCookie("connect.sid");
    return res.redirect("/auth/login");
  });
});




// Forgot Password Step 1
router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password", { title: "Forgot Password" });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.flash("error_msg", "No account found with that email.");
      return res.redirect("/auth/forgot-password");
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetLink = `${req.protocol}://${req.get("host")}/auth/reset-password/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message: `
        <p>You requested a password reset for Sana Safinaaz Login.</p>
        <p>Click here to reset: <a href="${resetLink}">${resetLink}</a></p>
      `,
    });

    req.flash("success_msg", "Password reset link has been sent to your email!");
    return res.redirect("/auth/forgot-password");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong. Try again.");
    return res.redirect("/auth/forgot-password");
  }
});




// Reset Password Step 2
router.get("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error_msg", "Password reset link is invalid or has expired.");
      return res.redirect("/auth/forgot-password");
    }

    return res.render("auth/reset-password", {
      title: "Reset Password",
      token: req.params.token,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong. Try again.");
    return res.redirect("/auth/forgot-password");
  }
});

router.post("/reset-password/:token", async (req, res) => {
  const { password, confirm_password } = req.body;

  if (!password || !confirm_password) {
    req.flash("error_msg", "Please fill in all fields.");
    return res.redirect(`/auth/reset-password/${req.params.token}`);
  }

  if (password !== confirm_password) {
    req.flash("error_msg", "New Password and Confirm Password do not match.");
    return res.redirect(`/auth/reset-password/${req.params.token}`);
  }

  if (password.length < 6) {
    req.flash("error_msg", "Password must be at least 6 characters long.");
    return res.redirect(`/auth/reset-password/${req.params.token}`);
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash("error_msg", "Password reset link is invalid or has expired.");
      return res.redirect("/auth/forgot-password");
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      req.flash("error_msg", "New password cannot be the same as your old password.");
      return res.redirect(`/auth/reset-password/${req.params.token}`);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    req.flash("success_msg", "Your password has been reset successfully! Please login.");
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Reset Password Error:", err);
    req.flash("error_msg", "Something went wrong. Try again.");
    return res.redirect("/auth/forgot-password");
  }
});

module.exports = router;
//  Required Modules
const express = require("express");
const mongoose = require("mongoose");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
require("dotenv").config();


//  Custom Middlewares
const authMiddleware = require("./middleware/auth");
const adminMiddleware = require("./middleware/admin");


//  Route Imports

const authRouter = require("./routes/auth");
const productRoutes = require("./routes/product");
const indexRouter = require("./routes/index");
const adminRouter = require("./routes/admin");
const cartRouter = require("./routes/cart");
const wishRouter = require("./routes/wishlist");
const adminProductsRoutes = require("./routes/adminProducts");


// App initialization
const app = express();


// Middleware Configuration


// 1. Cookie Parser
app.use(cookieParser());

// 2. Session Setup (required before flash)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, 
    },
  })
);

// 3. Flash Messages
app.use(flash());



// 4. Global Variables for Flash Messages + User + Cart Count
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.user = req.session.user || null;
  res.locals.req = req;

  const cart = req.session.cart || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  res.locals.cartCount = cartCount;

  next();
});



// 5. user form submissin/ json middleware read/ data ready req.body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 6. Static Files
app.use(express.static("public"));

// 7. EJS Setup
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main-layout");


//  Database Connection

// Database Connection
(async () => {
  try {
    // Localhost hata kar process.env wala link use karein
    const dbURI = process.env.MONGODB_URI || "mongodb://localhost/sana_safinaz";
    await mongoose.connect(dbURI);
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
})();


//  global function
app.locals.priceFormat = (price) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
  }).format(price);
};


//routes

app.use("/", indexRouter);
app.use("/product", productRoutes);
app.use("/admin", [authMiddleware, adminMiddleware], adminRouter);
app.use("/cart", authMiddleware, cartRouter);
app.use("/admin/products", adminProductsRoutes);
app.use("/wishlist", authMiddleware, wishRouter);
app.use("/auth", authRouter);

// Shortcut for logout
app.get("/logout", (req, res) => res.redirect("/auth/logout"));


//  Server Start

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});

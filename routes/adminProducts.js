const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");

// Image Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });



// Manage Products Page with Pagination
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.render("admin/manage-products", {
      layout: "admin/admin-layout",
      title: "Manage Products",
      currentUrl: req.originalUrl,
      products,
      page,
      totalPages,
      totalProducts,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load products");
    res.redirect("/admin");
  }
});

// Add Product Form
router.get("/add", (req, res) => {
  res.render("admin/add-product", {
    layout: "admin/admin-layout",
    title: "Add Product",
  });
});

// Add Product Submit
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;

    if (Number(stock) < 0) {
      req.flash("error_msg", "Stock cannot be less than 0");
      return res.redirect("/admin/products/add");
    }

    const product = new Product({
      name,
      price: Number(price),
      stock: Number(stock),
      category,
      description,
      image: req.file ? "/uploads/" + req.file.filename : "",
    });

    await product.save();

    req.flash("success_msg", "Product added successfully!");
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to add product!");
    res.redirect("/admin/products/add");
  }
});






// Edit Product Form
router.get("/edit/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      req.flash("error_msg", "Product not found");
      return res.redirect("/admin/products");
    }

    res.render("admin/editProduct", {
      layout: "admin/admin-layout",
      title: "Edit Product",
      product,
      categories: [],
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load edit page");
    res.redirect("/admin/products");
  }
});







// Update Product
router.post("/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, price, stock, category, description } = req.body;

    if (Number(stock) < 0) {
      req.flash("error_msg", "Stock cannot be less than 0");
      return res.redirect(`/admin/products/edit/${req.params.id}`);
    }
    if (Number(price) < 0) {
          req.flash("error_msg", "Price cannot be less than 0");
          return res.redirect("/admin/products/add");
    }

    const updateData = {
      name,
      price: Number(price),
      stock: Number(stock),
      category,
      description,
    };

    if (req.file) {
      updateData.image = "/uploads/" + req.file.filename;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    req.flash("success_msg", "Product updated successfully!");
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to update product!");
    res.redirect(`/admin/products/edit/${req.params.id}`);
  }
});







// Delete Product
router.get("/delete/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash("success_msg", "Product deleted successfully!");
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to delete product!");
    res.redirect("/admin/products");
  }
});

module.exports = router;
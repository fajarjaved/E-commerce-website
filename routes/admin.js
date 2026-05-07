const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const multer = require("multer");


// Multer setup for file uploads 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });






// Admin Dashboard
router.get("/", async (req, res) => {
  try {
    const lowStockLimit = 5;

    const totalProducts = await Product.countDocuments();

    const deliveredOrders = await Order.countDocuments({
  status: "Delivered",
});

    const pendingOrders = await Order.countDocuments({
      status: "Pending",
    });

    const lowStockCount = await Product.countDocuments({
      stock: { $lte: lowStockLimit },
    });

    const lowStockProducts = await Product.find({
      stock: { $lte: lowStockLimit },
    })
      .sort({ stock: 1, createdAt: -1 })
      .limit(3)
      .lean();

    const recentOrders = await Order.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.render("admin/index", {
      layout: "admin/admin-layout",
      title: "Admin Panel",
      currentUrl: req.originalUrl,
      totalProducts,
      deliveredOrders,
      pendingOrders,
      lowStockCount,
      lowStockProducts,
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Something went wrong while loading dashboard.");
  }
});






//add new product page 
router.get("/products/add", async (req, res) => {
    try {
        const categories = await Category.find().lean();
        res.render("admin/add-Product", {
            layout: "admin/admin-layout",
            title: "Add Product",
            categories
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).send("Server error");
    }
});




//delete product in manage product
router.get("/products/delete/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect("/admin/products"); 
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});





// Orders listing (with pagination)
router.get('/orders', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = 10; // per page (change if you want)
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({});
    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

    const orders = await Order.find()
      .populate('user')              // name/email etc
      .populate('items.productId')   // product reference
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.render('admin/orders', {
      layout: "admin/admin-layout",
      orders,
      page,
      totalPages,
      totalOrders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Server Error');
  }
});




// Update order status (FORM POST)
router.post('/orders/update/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['Pending', 'Processing', 'Delivered', 'Cancelled'];

  try {
    if (!allowed.includes(status)) {
      req.flash('error_msg', 'Invalid status selected.');
      return res.redirect('/admin/orders');
    }

    const updated = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!updated) {
      req.flash('error_msg', 'Order not found.');
      return res.redirect('/admin/orders');
    }

    req.flash('success_msg', 'Order status updated successfully!');
    res.redirect('/admin/orders');
  } catch (err) {
    console.error('Error updating order status:', err);
    req.flash('error_msg', 'Failed to update order status.');
    res.redirect('/admin/orders');
  }
});




module.exports = router;

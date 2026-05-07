const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");

// Add to Cart
router.get("/add/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      req.flash("error_msg", "Product not found");
      return res.redirect("/");
    }

    // Stock check
    if (product.stock <= 0) {
      req.flash("error_msg", "This product is out of stock");
      return res.redirect(req.get("Referrer") || "/");
    }

    if (!req.session.cart) req.session.cart = [];

    // already in cart?
    const existingProduct = req.session.cart.find(
      (item) => item.productId.toString() === productId.toString()
    );

    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      req.session.cart.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }

    req.flash("success_msg", "Product added to cart!");
res.redirect(req.get("Referrer") || "/");
  } catch (error) {
    console.error(" Add to cart error:", error);
    req.flash("error_msg", "Something went wrong");
    res.redirect("/");
  }
});




// Render Cart Page
router.get("/", (req, res) => {
  const cart = req.session.cart || [];
  const totalPrice = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  res.render("cart/cart", { cart, totalPrice });
});


//  Render Checkout Page
router.get("/checkout", (req, res) => {
  res.render("cart/checkout", { user: req.session.user });
});



//  Checkout
router.post("/checkout", async (req, res) => {
  try {
    const { shippingAddress, phone } = req.body;
    const cart = req.session.cart || [];
    const userId = req.session.user._id;

    if (cart.length === 0) {
      req.flash("error_msg", "Your cart is empty");
      return res.redirect("/cart");
    }

    //  Stock check for each product
    for (let item of cart) {
      const product = await Product.findById(item.productId);
      if (!product) {
        req.flash("error_msg", `Product not found: ${item.name}`);
        return res.redirect("/cart");
      }
      if (product.stock < item.quantity) {
        req.flash("error_msg", `${product.name} is out of stock!`);
        return res.redirect("/cart");
      }
    }

    // Create Order
    const orderItems = cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    }));

    const orderTotal = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const newOrder = new Order({
      user: userId,
      items: orderItems,
      shippingAddress,
      phone,
      orderTotal: orderTotal + 220, 
    });

    await newOrder.save();

    // Reduce stock
    for (let item of cart) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Clear cart
    req.session.cart = [];
    req.flash("success_msg", "Order placed successfully!");
    res.redirect("/cart/confirm");
  } catch (err) {
    console.error("Error during checkout:", err);
    req.flash("error_msg", "Failed to place order!");
    res.redirect("/cart/checkout");
  }
});

//  Order Confirmation
router.get("/confirm", (req, res) => {
  res.render("cart/confirm", {
    message: "Your order has been placed successfully!",
  });
});



//  Delete Product From Cart
router.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const cart = req.session.cart || [];

  const itemIndex = cart.findIndex(
    (item) => item.productId.toString() === id.toString()
  );
  if (itemIndex > -1) {
    cart.splice(itemIndex, 1);
    req.session.cart = cart;

    const newTotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return res.json({ success: true, newTotal });
  }

  res.json({ success: false, message: "Item not found in the cart" });
});



// Update Quantity
router.post("/update/:id/:action", (req, res) => {
  const { id, action } = req.params;
  if (!req.session.cart) return res.json({ success: false });

  const product = req.session.cart.find(
    (item) => item.productId.toString() === id.toString()
  );
  if (!product) return res.json({ success: false });

  if (action === "increase") {
    product.quantity += 1;
  } else if (action === "decrease") {
    product.quantity -= 1;
    if (product.quantity <= 0) {
      req.session.cart = req.session.cart.filter(
        (item) => item.productId.toString() !== id.toString()
      );
    }
  }

  res.json({ success: true });
});

module.exports = router;

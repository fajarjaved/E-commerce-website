const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");

// Wishlist Page Route
router.get("/", async (req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error_msg', 'Please log in to view your wishlist.');
            return res.redirect('/auth/login');
        }

        const user = await User.findById(req.session.user._id).populate("wishlist");

        if (!user) {
            return res.status(404).render("wishlist", {
                message: "User not found.",
                products: [],
                title: "Wishlist"
            });
        }

        const products = user.wishlist;

        res.render("wishlist", {
            message: products.length > 0 ? null : "Your wishlist is empty.",
            products,
            title: "Wishlist"
        });
    } catch (error) {
        res.status(500).render("wishlist", {
            message: "Server error.",
            products: [],
            title: "Wishlist"
        });
    }
});



// Add to Wishlist Route
router.get("/add/:productId", async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            req.flash('error_msg', 'Please log in to add items to your wishlist.');
            return res.redirect('/auth/login');
        }

        const { productId } = req.params;
        const user = await User.findById(req.session.user._id);
        const product = await Product.findById(productId);

        if (!user || !product) {
            req.flash('error_msg', 'User or product not found.');
            return res.redirect('/');
        }

        //  Stock check
        if (product.stock <= 0) {
            req.flash('error_msg', 'This product is out of stock and cannot be added to wishlist.');
            return res.redirect("back"); 
        }

        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();

            req.flash('success_msg', 'Product added to wishlist successfully!');
        } else {
            req.flash('error_msg', 'Product already in wishlist.');
        }

        res.redirect("/wishlist");
    } catch (error) {
        console.error("Wishlist add error:", error);
        req.flash('error_msg', 'Server error while adding to wishlist.');
        res.status(500).redirect('/');
    }
});



// Delete from Wishlist Route
router.get('/delete/:productId', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            req.flash('error_msg', 'Please log in to remove items from your wishlist.');
            return res.redirect('/auth/login');
        }

        const { productId } = req.params;
        const user = await User.findById(req.session.user._id);

        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/wishlist');
        }

        const initialLength = user.wishlist.length;
        user.wishlist = user.wishlist.filter(item => item.toString() !== productId);

        if (user.wishlist.length < initialLength) {
            req.flash('success_msg', 'Product removed from wishlist successfully!');
        } else {
            req.flash('error_msg', 'Product not found in wishlist.');
        }

        await user.save();
        
        res.redirect('/wishlist');
    } catch (error) {
        console.error("Wishlist delete error:", error);
        req.flash('error_msg', 'Server error while removing product from wishlist.');
        res.redirect('/wishlist');
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Product = require("../models/Product");   
const Category = require("../models/Category"); 


// Homepage pagination

router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  
        const pageSize = 8;  

        // Count total products in db
        const totalProducts = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProducts / pageSize);

        // Fetch products only with pagination
        const products = await Product.find({})
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .exec();

        // rendering data to ejs file
        res.render("index", {
            products,
            page,
            totalPages,
            title: "Shop Now"
        });

    } catch (err) {
        console.error("Error fetching products for home page:", err);
        res.status(500).send("Error loading products.");
    }
});




// showing Product Detail Page
router.get("/product/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render("product_detail", { product, title: product.name });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;

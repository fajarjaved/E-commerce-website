
// admin pannel form validation 

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  image: {
    type: String, 
  },
  price: {
    type: Number,
    required: true,
  },
 stock: {
    type: Number,
    required: true,
    default: 0,
    min: [0, "Stock cannot be negative"]
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);

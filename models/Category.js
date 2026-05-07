const mongoose = require('mongoose');

const Product = require('./Product'); 

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        minlength: 3,
        maxlength: 100
    },
});



categorySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    
    try {
       
        const result = await Product.deleteMany({ category: this._id });

        next();

    } catch (error) {

        next(error); 
    }
});



module.exports = mongoose.model('Category', categorySchema);
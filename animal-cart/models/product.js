const mongoose = require('mongoose');

const Schema = mongoose.Schema;



const productSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adopted:{
        type: Boolean,
        default: false
    },
    comments: [{

        data : String,
        id : String,
            
        required: false,
        replies:[{
            data_reply: String,
            id_reply : String,
            
        }]
    }]
});

module.exports = mongoose.model('Product', productSchema);

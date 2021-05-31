const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')('sk_test_51IviiFH8Rg3z634cD7yv52St4qfzyrtaj9eGxbv3LLyYmdt3dEk7hIgjYYvTuX7r7dXa8pliIHYQnQwsmvIvkQjE00mxOwIQYV');

const Product = require('../models/product');
const Order = require('../models/order');

var ObjectId = require('mongodb').ObjectID;

const ITEMS_PER_PAGE = 10;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1; // (|| 1) handles the default value when there isn't query parameters
    let totalItems;

    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'All Products',
                path: '/products',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    // findById() can accept a string and Mongoose will
    // automatically convert it to an Object Id
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', { 
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1; // (|| 1) handles the default value when there isn't query parameters
    let totalItems;
    //console.log("Inside default page" + req.session.user.email);
    Product.find()
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
           // console.log(products);
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
                //email: req.session.user.email
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate() // populate itself does not return a promise
        .then(user => {
            const products = user.cart.items;
           /// console.log('inside /cart' + products);
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckout = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate() // populate itself does not return a promise
    .then(user => {
        const products = user.cart.items;
        //let total = 0;
        //console.log('cart items' + products)
        // products.forEach(p => {
        //     total += p.quantity * p.productId.price;
        // });
        res.render('shop/checkout', {
            path: '/checkout',
            pageTitle: 'Checkout',
            products: products,
            //totalSum: total
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    // Get the payment token ID submitted by the form
    var product_id;
    const token = req.body.stripeToken;
    let totalSum = 0;
    console.log('req.user ' + req.user);
    console.log("req.body.name "+ req.body.name);
    req.user
        .populate('cart.items.productId')
        .execPopulate() // populate itself does not return a promise
        .then(user => {
            user.cart.items.forEach(p => {
                totalSum += p.quantity * p.productId.price;
            });
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
           // console.log('products '+ user.cart.items.productId);
           user.cart.items.forEach(p => {
            console.log('product' + p.productId._id ); 
            product_id = p.productId._id.toString();
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user    // Mongoose will pick the id
                },
                products: products,
                name : req.body.name,
                place: req.body.place,
                address:req.body.address,
            });
            return order.save();
        })
        .then(result => {
            
            




            const charge = stripe.charges.create({
                amount: totalSum * 100,
                currency: 'usd',
                description: 'Your Order',
                source: token,
                metadata: { order_id: result._id.toString() }
            });
            return req.user.clearCart();
        })
        .then(() => {
            console.log('product id ' + ObjectId(product_id) );
            Product.update({ _id: ObjectId(product_id) },{"$set":{"adopted":true}})
            
             .catch(err => res.status(422).json(err));
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ "user.userId": req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('No order found'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }
            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);
            let title_name = '';
            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); // replace inline with attachment for download
            // pipe into a writable stream
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text('Adoption Receipt', {
                underline: true
            });
            pdfDoc.text('--------------------------');
            //let totalPrice = 0;
            order.products.forEach(prod => {
                title_name = prod.product.title;
                //totalPrice += prod.quantity * prod.product.price;
                pdfDoc.fontSize(20).text(
                    prod.product.title ,{underline: true, oblique: true }
                
                );
                pdfDoc.image(prod.product.imageUrl, {fit: [150, 150], align: 'bottom'});
   

            });
            pdfDoc.text('--------------------------');
            pdfDoc.fontSize(14).text('Name : ' + order.name,{ oblique: true });
            pdfDoc.fontSize(14).text('Place : ' + order.place,{ oblique: true });
            pdfDoc.fontSize(14).text('Address : ' + order.address,{ oblique: true });
            pdfDoc.fontSize(14).text(' ');
            pdfDoc.fontSize(14).text(' ');
            pdfDoc.fontSize(14).text(' ');
            pdfDoc.fontSize(14).font('Times-Italic').text('Thanks...');
            pdfDoc.fontSize(14).text(' ');
            pdfDoc.fontSize(10).font('Times-Italic').text('Thanks giving to you that you actually adopted me. I am so very much lucky that you actually made my life so very colorful as well as much more happy by just adopting me as your very pet. Thanks fullness not only for adopting me but also for so much more of your love and your care.');
            pdfDoc.fontSize(14).text(' ');
            pdfDoc.fontSize(10).text('Yours lovingly ,');
            pdfDoc.fontSize(10).text(title_name);
           // pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

            pdfDoc.end();

            // reads the entire content into memory and returns it into the response
            // (for bigger files) may take long time to send a response + may overflow in memory
            /*
            fs.readFile(invoicePath, (err, data) => {
                if (err) {
                    return next(err);
                }
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
                res.send(data);
            });
            */
           
            // const file = fs.createReadStream(invoicePath);
            // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            // pipe forwards the data that is read in with that stream to the response
            // the response object is actually a writable stream
            // no need to preload the whole data into the memory as before
            // file.pipe(res);
        })
        .catch(err => next(err));
};
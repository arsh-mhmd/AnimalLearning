const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator/check');

var ObjectId = require('mongodb').ObjectID;

const Product = require('../models/product');
const product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    console.log('price'+price);
    //const comm = ['comment1','comment2','comment3'];
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image',
            validationErrors: []
        }); 
    }

    const errors = validationResult(req);
    console.log('errors '+ JSON.stringify(errors));
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                // imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user,
        //comments:comm
        // req.user._id is great, but req.user is sufficient:
        // Mongoose will pick the id by itself!
    });
    product
        .save()
        .then(result => {
            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            // return res.status(500).render('admin/edit-product', {
            //     pageTitle: 'Add Product',
            //     path: '/admin/add-product',
            //     editing: false,
            //     hasError: true,
            //     product: {
            //         title: title,
            //         imageUrl: imageUrl,
            //         price: price,
            //         description: description
            //     },
            //     errorMessage: 'Database operation failed. Please try again!',
            //     validationErrors: []
            // });
            // res.redirect('/500');
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    console.log('edit mode' + editMode);
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                validationErrors: [],
                email: req.session.user.email
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.getSearchProduct = (req, res, next) => {
    const ITEMS_PER_PAGE = 10;
    const title = req.query.title;
    console.log('title' + title);
    if (!title) {
        return res.redirect('/');
    }
    const search_title = req.query.search;
   // const search_title = 'vijay';
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

    console.log('title' + search_title);
    Product.find({ title: {$regex : ".*"+search_title+".*"} })
    // .select('title price')           // only titles and prices are selected from the products
    // .select('title price -_id')      // ids from returned products are explicitly excluded!
    // .populate('userId')              // returned products will have all users' info
    // .populate('userId', 'name')      // returned products will have the users' names
    .then(products => {
        console.log("Arjun");
        console.log(products);
        res.render('shop/index', {
            prods: products,
            pageTitle: 'Search' + search_title,
            path: '/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            email: req.session.user.email
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
    
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    // const updatedImageUrl = req.body.imageUrl;
    const image = req.file;
    const updatedPrice = req.body.price;
    const updatedDescription = req.body.description;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        //console.log('This is edit product' + req.body);
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                // imageUrl: updatedImageUrl,
                price: updatedPrice,
                description: updatedDescription,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
    
    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDescription;
           // product.comments = ['comment 4,comment 3, comment 2'];
            if (image) {
                fileHelper.deleteFile(product.imageUrl);
                product.imageUrl = image.path;
            }
            return product.save().then(result => {
                console.log('Updated Product');
                res.redirect('/admin/products');
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        // .select('title price')           // only titles and prices are selected from the products
        // .select('title price -_id')      // ids from returned products are explicitly excluded!
        // .populate('userId')              // returned products will have all users' info
        // .populate('userId', 'name')      // returned products will have the users' names
        .then(products => {
            console.log(products);
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return next(new Error('Product not found'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne({ _id: prodId, userId: req.user._id })
        })
        .then(() => {
            res.status(200).json({ message: 'Success!' });
        })
        .catch(err => {
            res.status(500).json({ message: 'Failure!' });
        });
};


exports.postEditComment = (req, res, next) => {
    const prodId = req.body.productId;   
    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            })
           Product.findOneAndUpdate({
               _id : prodId
            },{
                $push : {
                    comments : 
                        {
                        data : req.body.new_comment.toString(),
                        id : req.session.user.email.toString()
                        }
                    
                }
            }
                          )
        .then(result =>{
            console.log(result + 'its executed');
            res.redirect('/');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postAddReply = (req, res, next) => {
    const prodId = req.body.productId;   
    var index_value;
    Product.findById(prodId)
        .then(product => {
            //console.log(product);
            for(var i=0;i<product.comments.length;i++){
                if(product.comments[i]._id == req.body.comment_id){
                    console.log(i);
                    index_value = i;
                }
            }
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            })

          //  findDocuments();
    // console.log('comment id' + req.body.comment_id.toString());
    // console.log('current comment ' + req.body.current_comment);
    // console.log('into postaddreply ' + req.body.reply + ' '+ req.session.user.email);
          //  if(!req.body.reply.toString().isEmpty()){
           Product.updateOne({
              
               "comments._id" : ObjectId(req.body.comment_id.toString()),
               
            },{
                "$push" : {

                    "comments.$.replies" : {
                            data_reply : req.body.reply.toString(),
                            id_reply : req.session.user.email.toString()
                    }                    
                }
            })
            .then(result =>{
            console.log('Reply inserted');
            res.redirect('/');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

       
   // }
        
};

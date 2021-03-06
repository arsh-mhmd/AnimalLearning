const path = require('path');

const express = require('express');
const { body } = require('express-validator/check');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.post(
    '/add-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        
        body('price')
            .isString(),
        
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.get('/search-product', isAuth, adminController.getSearchProduct);

router.post(
    '/edit-product',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        
        body('price')
            .isString(),
        
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postEditProduct
);


router.post(
    '/edit-comment',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        
        body('price')
            .isString(),
        
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postEditComment
);

router.post(
    '/add-reply',
    [
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        
        body('price')
            .isString(),
        
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth,
    adminController.postAddReply
);



router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
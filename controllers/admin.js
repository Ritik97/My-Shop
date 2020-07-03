const Product = require('../models/product');
const getDb = require('../util/database').getDb;

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
    // isAuthenticated: req.session.isLoggedIn
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log(image);

  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      errorMessage: 'Attached file is not an image',
      product: {
        title: title,
        price: price,
        description: description
      },
      validationErrors: []
      //isAuthenticated: req.session.isLoggedIn
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: false,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description
      },
      validationErrors: errors.array()
      //isAuthenticated: req.session.isLoggedIn
    });
  }

  const imageUrl = image.path;
  const product = new Product(title, price, description, imageUrl, null, req.user._id);
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product
    .findById(prodId)
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
        validationErrors: []
        //isAuthenticated: req.session.isLoggedIn
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
  const updatedPrice = req.body.price;
  const updatedImage = req.file;
  const updatedDesc = req.body.description;
  const userid = req.body.userid;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
        userid: userid
      },
      validationErrors: errors.array()
      //isAuthenticated: req.session.isLoggedIn
    });
  }
  if (userid.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }

  let product = null;
  if (updatedImage) {
    fileHelper.deleteFile(updatedImage);

    product = new Product(
      updatedTitle,
      updatedPrice,
      updatedDesc,
      updatedImage.path,
      prodId,
      userid
    );
  } else {
    product = new Product(
      updatedTitle,
      updatedPrice,
      updatedDesc,
      null,
      prodId,
      userid
    );
  }
  console.log(product);
  product
    .save()
    .then(result => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const db = getDb();
  return db
    .collection('products')
    .find({ userid: req.user._id })
    .toArray()
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        //isAuthenticated: req.session.isLoggedIn
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

  //const userid = req.body.userid;

  /*if (userid.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }*/

  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return next(new Error('Product not found'));
      }
      fileHelper.deleteFile(product.imageUrl);

      return Product.deleteById(prodId, req.session.user._id);
    })
    .then(result => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({
        message: 'Success!'
      });
      //res.redirect('/admin/products');

    }).catch(err => {
      /*const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);*/
      res.status(500).json({
        message: 'Deleting product failed!'
      });
    });

};

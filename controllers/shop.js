const Product = require('../models/product');

const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');

const Items_Per_Page = 3;

exports.getProducts = (req, res, next) => {

  const page = +req.query.page ? +req.query.page : 1;
  const skipItem = ((page - 1) * Items_Per_Page);
  let totalItems;

  Product
    .getItemCount()
    .then(totalProducts => {
      totalItems = totalProducts;
      return Product
        .fetchAll(skipItem)
        .then(products => {
          res.render('shop/product-list', {
            prods: products,
            pageTitle: 'Products',
            path: '/products',
            currentPage: page,
            hasNextPage: page * Items_Per_Page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / Items_Per_Page)
            //isAuthenticated: req.session.isLoggedIn,
            //csrfToken: req.csrfToken()
          });
        })
    }).catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
  };

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
        //isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  /**Here, the req.query will give us a string. So, prefixing it with '+' to make it a no. type so that
   * operations could be performed on that..
   */
  const page = +req.query.page ? +req.query.page : 1;
  const skipItem = ((page - 1) * Items_Per_Page);
  let totalItems;

  Product
    .getItemCount()
    .then(totalProducts => {
      totalItems = totalProducts;
      return Product
        .fetchAll(skipItem)
        .then(products => {
          res.render('shop/index', {
            prods: products,
            pageTitle: 'Shop',
            path: '/',
            currentPage: page,
            hasNextPage: page * Items_Per_Page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / Items_Per_Page)
            //isAuthenticated: req.session.isLoggedIn,
            //csrfToken: req.csrfToken()
          });
        })
    }).catch(err => {
      console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .getCart()
    .then(products => {
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
        //isAuthenticated: req.session.isLoggedIn
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
      //console.log(result);
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteFromCart(prodId)
    .then(result => {
      console.log('deleted from cart');
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .addOrder()
    .then(result => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  req.user
    .getOrders()
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
        //isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let cartItems;
  req.user
    .getCart()
    .then(products => {
      let total = 0;
      console.log(products);
      products.forEach(p => {
        total = total + p.price * p.quantity;
      });
      res.render('shop/checkout', {
        path: 'checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum: total
      });
    });
  
};

exports.getInvoice = (req, res, next) => {


  const orderId = req.params.orderId;
  const invoiceName = 'invoice-' + orderId + '.pdf';
  const invoicePath = path.join('data', 'invoices', invoiceName);
  /*fs.readFile(invoicePath, (err, data) => {
    if(err){
      console.log(err);
     return next(err);
    }
    res.setHeader('Content-Type' , 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(data);
  });*/
  /***In Reading a file using readFile(), node will access the file, load it into the memory and then return it.
   * For smaller files, this might be ok to preload the data before returning. However, for bigger files, it would be more 
   * feasible to stream the response data.
   * Note that the res obj is a writable stream, and we can use the readable stream to pipe their output into the writable stream
   * Now, the res obj will contain the data and the data would be downloaded step by step. This could be a huge advantage for 
   * large data.
   */

  /**Here, using 3rd party package i.e. pdfkit to generate the pdf on the server dynamically*/
  const pdfDoc = new pdfDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename ="' + invoiceName + '"');

  pdfDoc.pipe(fs.createWriteStream(invoicePath)); //Setting the path where data needed to be written and also writing the data 
  pdfDoc.pipe(res);//writing the data into the res obj

  pdfDoc.fontSize(26).text('Invoice', { underline: true });

  pdfDoc.text('-----------------------');

  let totalPrice = 0;

  return req.user
    .getInvoiceData(orderId)
    .then(products => {
      products.forEach(product => {
        console.log(product.items);
        product.items.forEach(prods => {
          totalPrice += prods.quantity * prods.price;
          console.log(prods.title + ' - ' + prods.description);
          pdfDoc.fontSize(14).text(prods.title + '-' + prods.quantity + ' x ' + '$' + prods.price);

        });
      });
      pdfDoc.text('-------');
      pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);
      pdfDoc.end();
      //console.log(products);  
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });




  /*const file = fs.createReadStream(invoicePath);
  file.pipe(res);*/



};

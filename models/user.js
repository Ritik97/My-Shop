const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class User {
    constructor(email, password, cart, id, resetToken, resetTokenExpiration) {
        this.email = email;
        this.password = password;
        this.cart = cart; /** cart: { items: [ { product, quantity } ]  } */
        this._id = id ? new mongodb.ObjectID(id) : null;
        this.resetToken = resetToken;
        this.resetTokenExpiration = resetTokenExpiration;
    }

    save() {
        const db = getDb();
        let dbOp;
        if (this._id) {
            dbOp = db
                .collection('users')
                .updateOne({ _id: this._id }, { $set: this });
        }
        else {
            dbOp = db
                .collection('users')
                .insertOne(this);
        }
        return dbOp
            .then(result => {
                console.log(result);
            }).catch(err => {
                console.log(err);
            });
    };

    addToCart(product) {
        const cartItemIndex = this.cart.items.findIndex(cp => {
            return cp.productId.toString() === product._id.toString(); /** matching the productId of the current product to be
            added in the cart, with all the productIds in items array*/
        });
        let newQuantity = 1;
        const updatedCartItems = [...this.cart.items]; /**fetch all the elements of items array into new array */

        if (cartItemIndex >= 0) {  /**if the product is already present in the cart, simply increase the quantity */
            newQuantity = this.cart.items[cartItemIndex].quantity + 1;
            updatedCartItems[cartItemIndex].quantity = newQuantity;
        }

        else {
            updatedCartItems.push({ /**else add the respective productId and quantity in the items array  */
                productId: new mongodb.ObjectID(product._id),
                quantity: newQuantity
            });
        }
        const updatedCart = {
            items: updatedCartItems
        };
        const db = getDb();
        return db.collection('users')
            .updateOne(
                { _id: new mongodb.ObjectID(this._id) },
                { $set: { cart: updatedCart } }
            );

    };

    deleteFromCart(prodId) {
        const updatedCartItems = this.cart.items.filter(item => {
            return item.productId.toString() !== prodId.toString();
        });
        const db = getDb();
        return db
            .collection('users')
            .updateOne(
                { _id: new mongodb.ObjectID(this._id) },
                { $set: { cart: { items: updatedCartItems } } }
            );

    }

    getCart() {
        const db = getDb();
        const productIds = this.cart.items.map(i => { /**map all the productIds in the items array, into a new array(productIds) */
            return i.productId;
        });

        return db
            .collection('products')
            .find({ _id: { $in: productIds } }) /**matching all the product ids in the products collection with the ids in productIds array */
            .toArray()
            .then(products => { /**here, products contain all the products from products collection which is present in the user's cart*/
                return products.map(p => {
                    return {  /**creating new product object with the respective quantity field */
                        ...p,
                        quantity: this.cart.items.find(i => {
                            return i.productId.toString() === p._id.toString();
                        }).quantity
                    }
                });
            });


    }

    addOrder() {
        const db = getDb();
        return this.getCart()
            .then(products => {
                const order = {
                    items: products,
                    user: {
                        _id: new mongodb.ObjectID(this._id),
                        email: this.email
                    }
                };

                return db
                    .collection('orders')
                    .insertOne(order)
            })
            .then(result => {
                this.cart = { items: [] };
                return db
                    .collection('users')
                    .updateOne({ _id: new mongodb.ObjectID(this._id) }, { $set: { cart: { items: [] } } })
            })
            .catch(err => {
                console.log(err);
            });
    };

    getOrders() {
        const db = getDb();
        return db
            .collection('orders')
            .find({'user._id': new mongodb.ObjectID(this._id)})
            .toArray()
            .then(orders => {
                return orders;
            })
            .catch(err => {
                console.log(err);
            });
    };

    getInvoiceData(orderId){
        const db = getDb();
        return db
        .collection('orders')
        .find({_id : new mongodb.ObjectID(orderId)}, {items: 1})
        .toArray()
        .then(products => {
            return products;
        })
        .catch(err => {
            console.log(err);
        });
    };

    static findById(userId) {
        const db = getDb();
        const userid = userId;
        return db.collection('users')
            .find({ _id: new mongodb.ObjectID(userid) }).next()
            .then(user => {
                console.log(user);
                return user;
            })
            .catch(err => {
                console.log(err);
            });

    };

}

module.exports = User;
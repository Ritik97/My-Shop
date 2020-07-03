const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

class Product {

    constructor(title, price, description, imageUrl, id, userid) {
        this.title = title;
        this.price = price;
        this.description = description;
        this.imageUrl = imageUrl;
        this._id = id ? new mongodb.ObjectID(id) : null;
        this.userid = userid ? new mongodb.ObjectID(userid) : null;
    }

    save() {
        const db = getDb();
        let dbOp;
        if (this._id) {
            /* Update Product*/
            if(!this.imageUrl){
                dbOp = db.collection('products')
                .updateOne({ _id: this._id },
                     { $set: {title: this.title, price: this.price, description: this.description, userid: this.userid}});
            }
          else{
              dbOp = db.collection('products')
              .updateOne({_id: this._id} , {$set: this});
          }  
        }
        else {
            /** Add new product */
            dbOp = db.collection('products')
                .insertOne(this);
        }
        return dbOp
            .then(result => {
                console.log(result);
            })
            .catch(err => {
                console.log(err);
            });
    };

    static fetchAll(skipItem) {
        const db = getDb();
        return db.collection('products')
            .find()
            .skip(skipItem)
            .limit(3)
            .toArray()
            .then(products => {
                return products;
            })
            .catch(err => {
                console.log(err);
            });
    };

    static getItemCount() {
        const db = getDb();
        return db.collection('products')
        .find()
        .count()
        .then(totalProduct => {
            console.log(totalProduct);
            return totalProduct;
        }).catch(err => {
            console.log(err);
        });
    };

    static findById(prodId) {
        const db = getDb();
        return db.collection('products')
            .find({ _id: new mongodb.ObjectID(prodId.trim()) })
            .next()
            .then(product => {
                return product;
            })
            .catch(err => {
                console.log(err);
            });
    };

    static deleteById(prodId, userId) {
        const db = getDb();
        return db.collection('products')
            .deleteOne({ _id: new mongodb.ObjectID(prodId.trim()), userid: userId })
            .then(result => {
                console.log('Product Deleted');
            })
            .catch(err => {
                console.log(err);
            });
    };


}

module.exports = Product;
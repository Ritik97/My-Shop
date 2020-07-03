const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let _db;

const mongoConnect = (callBack) => {

    MongoClient.connect('mongodb+srv://ritik:JvH5BXDdB5cgE6hF@cluster0-925sp.mongodb.net/shop?retryWrites=true&w=majority')
        .then(client => {

            _db = client.db();
            callBack();

        })
        .catch(err => {

            console.log(err);

        });
};

const getDb = () => {

    if (_db) {
        return _db;
    }

    throw 'No Database Found';

};

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
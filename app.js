const path = require('path');

const express = require('express');
const app = express();
require('dotenv').config();
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');

const MONGODB_URI = 
`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-925sp.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;

const mongoConnect = require('./util/database').mongoConnect;

const store = new mongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'images');
    },
    filename: (req, file, callback) => {
        callback(null, new Date().getSeconds() + '-' + file.originalname);
    }
});

const filter = (req, file, callback) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        callback(null, true);
    } else {
        callback(null, false);
    }
};

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');
app.use(helmet());
app.use(compression());

const User = require('./models/user');

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: filter }).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
    session({ secret: 'my secret', resave: false, saveUninitialized: false, store: store })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => { /**here, the then block could fire even if no user is found in the db */
            if (!user) {        /**So its a good practice to check the existence of the user prior */
                return next();
            }
            req.user = new User(user.email, user.password, user.cart, user._id, user.resetToken, user.resetTokenExpiration);
            next();
        })
        .catch(err => { /**catch block will be fired only if the db operation fails ex-db server down or no read access etc. */
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

});



app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
//app.get('/500', errorController.get500);

app.use((error, req, res, next) => {
    // res.redirect('/500');
    res.status(500).render('500', {
        pageTitle: 'Error!',
        path: '/500'
    });
});

app.use(errorController.get404);



mongoConnect(() => {

    app.listen(process.env.PORT || 3000);
    console.log('Connected');
});
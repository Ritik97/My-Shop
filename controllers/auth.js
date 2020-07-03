const User = require('../models/user');
const getDb = require('../util/database').getDb;
const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); /**A library helps in creation of secure random values */
const { validationResult } = require('express-validator'); /**validationResult is a method, helps in gathering all the 
errors which the check middleware might have thrown in the routes file. */

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');


exports.getLogin = (req, res, next) => {
    //console.log(req.session.isLoggedIn);
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: " ", 
            password: " "
        },
        validationErrors: []
        //isAuthenticated: req.session.isLoggedIn,
        //csrfToken: req.csrfToken()
    });
};


exports.postLogin = (req, res, next) => {
    const db = getDb();
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'User Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email, password: password
            },
            validationErrors: errors.array()
        });
    }
    db
        .collection('users')
        .findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'User Login',
                    errorMessage: 'Invalid Email or Password',
                    oldInput: {
                        email: email, password: password
                    },
                    validationErrors: []
                });
            }
            bcrypt
                .compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.user = user;
                        req.session.isLoggedIn = true;
                        return req.session.save(err => {
                            res.redirect('/');
                        });
                        //return res.redirect('/');
                    }
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'User Login',
                        errorMessage: 'Invalid Email or Password',
                        oldInput: {
                            email: email, password: password
                        },
                        validationErrors: []
                    });
                })

        })
        .catch(err => {
            const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/');
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
            confirmPassword: ""
        },
        validationErrors: []
        //isAuthenticated: false,
        //csrfToken: req.csrfToken()
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email.trim();
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);/**the check middleware will store the errors in the error obj of that req, in routes file, 
    which could be extracted here */
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword
            },
            validationErrors: errors.array()
        });
    }
    return bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User(email, hashedPassword, { items: [] });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
            return sgMail.send({
                to: email,
                from: 'shop@node-complete.com',
                subject: 'Signup Succeeded!',
                html: '<h3>You successfully signed up!</h3>'
            });

        })
        .catch(err => {
            const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
        });


};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }

    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset',
        errorMessage: message
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, Buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = Buffer.toString('hex');
        const db = getDb();
        return db
            .collection('users')
            .findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'Invalid Email');
                    return res.redirect('/reset');
                }
                const resetTokenExpiration = Date.now() + 3600000;
                const updatedUser = new User(user.email, user.password, user.cart, user._id, token, resetTokenExpiration);
                return updatedUser
                    .save()
                    .then(result => {
                        res.redirect('/');
                        return sgMail.send({
                            to: req.body.email,
                            from: 'shop@node-complete.com',
                            subject: 'Password Reset',
                            html: `
            <p>You requseted a password reset </p>
            <p>Click this <a href ="http://localhost:3000/reset/${token}">link</a> to set a new password. </p> 
        `
                        });
                    });

            })
            .catch(err => {
                const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
            });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    const db = getDb();
    return db
        .collection('users')
        .findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
        .then(user => {
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            }
            else {
                message = null;
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token
                //isAuthenticated: false,
                //csrfToken: req.csrfToken()
            });

        })
        .catch(err => {
            const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
        });


};

exports.postNewPassword = (req, res, next) => {
    const updatedPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    const db = getDb();
    return db
        .collection('users')
        .findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() }, _id: new mongodb.ObjectID(userId) })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(updatedPassword, 12);
        })
        .then(hashedPassword => {
            const db = getDb();
            const user = new User(resetUser.email, hashedPassword, resetUser.cart, resetUser._id, undefined, undefined);
            return user.save()
                .then(result => {
                    res.redirect('/login');
                    console.log('Password Updated');
                });
        })
        .catch(err => {
            const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
        });

};
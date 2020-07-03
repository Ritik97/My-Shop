const express = require('express');
const getDb = require('../util/database').getDb;
const router = express.Router();
const authController = require('../controllers/auth');
const { check, body } = require('express-validator'); /**here, using obj destructuring to pull out some specific properties
of express-validator obj, i.e. the check() method here. */

router.get('/login', authController.getLogin);

router.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid Email.')
            .normalizeEmail(),
        body('password', 'Please enter a valid password.')
            .isAlphanumeric()
            .isLength({ min: 6 })
            .trim()
    ],
    authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post('/signup',
    [ /**rapping all the checks into an array */
        check('email') /**the check here will check the value in the req body, header, params, cookies etc */
            .isEmail()
            .withMessage('Please enter a valid Email.')
            .custom((value, { req }) => {
                // if (value === 'test@test.com') {
                //     throw new Error('This E-mail is Forbidden.');
                // }
                // return true;
                const db = getDb();
                return db
                    .collection('users')
                    .findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject('Email already exists');
                        }
                    });

            })
            .normalizeEmail(),
        body('password', /**here, only the password present in the req body will be checked */
            'Please enter a password with only numbers and text and atleast 6 characters.'/**common error msg for both the checks below */
        )
            .isLength({ min: 6 })
            .isAlphanumeric()
            .trim(),
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match!');/**for the custom checks where the express will not throw
                                an error by itself, we have to explicitly check the data and throw the error.Here, the thrown*/
                }
                return true; /**If condition is false, return true */
            })
            .trim()
    ],
    authController.postSignup);/**adding a middleware before the controller action,
to check weather the entered email is a valid email or not. */

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;
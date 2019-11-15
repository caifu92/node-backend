// routes/auth.js

const express = require('express');

const router = express.Router();
const passport = require('passport');
const dotenv = require('dotenv');
const util = require('util');
const url = require('url');
const querystring = require('querystring');

dotenv.config();

// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile',
}), (req, res) => {
  req.session.isAuthenticated = true;
  res.redirect('/connected');
});

// Perform session logout and redirect to homepage
router.get('/logout', (req, res) => {
  req.logout();

  let returnTo = `${req.protocol}://${req.hostname}`;
  const port = req.connection.localPort;
  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo += `:${port}`;
  }
  const logoutURL = new URL(
    util.format('https://%s/logout', process.env.AUTH0_DOMAIN),
  );
  const searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENT_ID,
    //res.redirect(returnTo || '/login');
  });
  logoutURL.search = searchString;

  // res.redirect('/login');
  // res.redirect(logoutURL);
});

module.exports = router;

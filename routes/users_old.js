import { Quickbook } from '../db';

const https = require('https');
const url = require('url');
const express = require('express');
const tools = require('../tools/tools.js');
const auth = require('../tools/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const quickBooks = (await Quickbook.findAll()).map(quickBook => ({
    realmID: quickBook.realmID,
    token: !!quickBook.token,
    info: {
      name: JSON.parse(quickBook.info || '{}').CompanyName,
    },
  }));

  res.locals.quickBooks = quickBooks;
  // Don't call OpenID if we didn't request OpenID scopes

  if (!tools.containsOpenId()) return res.json(quickBooks);
  // Call OpenID endpoint
  // (this example uses the raw `https` npm module)
  // (see api_call.js for example using helper `request` npm module)
  const options = token.sign(url.parse(tools.openid_uri));
  const request = https.request(options, (response) => {
    response.setEncoding('utf8');
    let rawData = '';
    response.on('data', chunk => rawData += chunk);
    response.on('end', () => {
      console.log(`OpenID response: ${rawData}`);
      try {
        const parsedData = JSON.parse(rawData);
        res.json(quickBooks);
      } catch (e) {
        console.log(e.message);
        res.json(quickBooks);
      }
    });
  });
  request.end();

  request.on('error', (e) => {
    console.error(e);
    res.send(e);
  });
});
/* GET user profile. */
router.get('/user', auth.required, (req, res, next) => {
  const { _raw, _json, ...userProfile } = req.user;
  // res.render('user', {
  //   userProfile: JSON.stringify(userProfile, null, 2),
  //   title: 'Profile page'
  // });
});

module.exports = router;

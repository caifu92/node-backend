import { startRefreshCompanyJob } from '../queues';

const express = require('express');
const tools = require('../tools/tools.js');
const jwt = require('../tools/jwt.js');

const router = express.Router();
// const runJobs = require('../jobs/runJobs');

/** /callback * */
router.get('/', (req, res) => {
  // Verify anti-forgery
  if (!tools.verifyAntiForgery(req.session, req.query.state)) {
    return res.send('Error - invalid anti-forgery CSRF response!');
  }


  // Exchange auth code for access token
  tools.intuitAuth.code.getToken(req.originalUrl).then(async (token) => {
    console.log('QuickBook_Callback Handler.Token: ', token);
    try {
      await tools.saveToken(token, req.query.realmId, true);

      startRefreshCompanyJob({
        realmId: req.query.realmId,
      });

      const errorFn = function (e) {
        console.log('Invalid JWT token!');
        console.log(e);
        res.redirect('/');
      };

      console.log(process.env.FRONTENDURL);
      if (token.data.id_token) {
        try {
          // We should decode and validate the ID token
          jwt.validate(token.data.id_token, () => {
            // Callback function - redirect to /connected
            res.redirect(`${process.env.FRONTENDURL}/redirect`);
          }, errorFn);
        } catch (e) {
          errorFn(e);
        }
      } else {
        res.redirect(`${process.env.FRONTENDURL}/redirect`);
      }

      res.status(200);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }, (err) => {
    console.log(err);
    res.send(err);
  });
});

module.exports = router;

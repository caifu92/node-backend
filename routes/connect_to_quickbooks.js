const express = require('express');
const tools = require('../tools/tools.js');

const router = express.Router();

/** /connect_to_quickbooks * */
router.get('/', (req, res) => {
  console.error(req);

  // Set the Accounting + Payment scopes
  tools.setScopes('connect_to_quickbooks');

  // Constructs the authorization URI.
  const uri = tools.intuitAuth.code.getUri({
    // Add CSRF protection
    state: tools.generateAntiForgery(req.session),
  });

  // Redirect
  console.log(`Redirecting to authorization uri: ${uri}`);
  res.redirect(uri);
});

module.exports = router;

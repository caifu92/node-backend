const atob = require('atob');
const expect = require('expect');
const request = require('request');
const tools = require('./tools');
const config = require('../config.json');

const JWT = function () {
  const jwt = this;

  // Performs the correct JWT validation steps
  this.validate = function (id_token, callback, errorFn) {
    // https://developer.api.intuit.com/.well-known/openid_configuration/
    const { openid_configuration } = tools;

    // Decode ID Token
    const token_parts = id_token.split('.');
    const idTokenHeader = JSON.parse(atob(token_parts[0]));
    const idTokenPayload = JSON.parse(atob(token_parts[1]));
    const idTokenSignature = atob(token_parts[2]);

    // Step 1 : First check if the issuer is as mentioned in "issuer" in the discovery doc
    expect(idTokenPayload.iss).toEqual(openid_configuration.issuer);

    // Step 2 : check if the aud field in idToken is same as application's clientId
    expect(idTokenPayload.aud).toEqual(config.clientId);

    // Step 3 : ensure the timestamp has not elapsed
    expect(idTokenPayload.exp).toBeGreaterThan(Date.now() / 1000);

    // Step 4: Verify that the ID token is properly signed by the issuer
    jwt.getKeyFromJWKsURI(idTokenHeader.kid, (key) => {
      const cert = jwt.getPublicKey(key.n, key.e);
      // Validate the RSA encryption
      require('jsonwebtoken').verify(id_token, cert, (err) => {
        if (err) errorFn(err);
        else callback();
      });
    });
  };

  // Loads the correct key from JWKs URI:
  // https://oauth.platform.intuit.com/op/v1/jwks
  this.getKeyFromJWKsURI = function (kid, callback) {
    const { openid_configuration } = tools;

    request({
      url: openid_configuration.jwks_uri,
      json: true,
    }, (error, response, body) => {
      if (error || response.statusCode != 200) {
        throw new Error('Could not reach JWK endpoint');
      }
      // Find the key by KID
      const key = body.keys.find(el => (el.kid == kid));
      callback(key);
    });
  };

  // Creates a PEM style RSA public key, using the modulus (n) and exponent (e)
  this.getPublicKey = function (modulus, exponent) {
    const getPem = require('rsa-pem-from-mod-exp');
    const pem = getPem(modulus, exponent);
    return pem;
  };
};

module.exports = new JWT();

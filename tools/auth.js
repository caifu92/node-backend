import { UserColumn, UserColumnValue } from '../db';

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const issuer = `https://${process.env.AUTH0_DOMAIN}/`;
const jwtConfig = {
  secret: jwksRsa.expressJwtSecret({ jwksUri: `${issuer}.well-known/jwks.json` }),
  audience: 'https://www.smartreportz.com',
  issuer,
  algorithms: ['RS256'],
};

const checkAccessForUser = async (userId, realmId) => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const accessColumn = await UserColumn.findOne({
    where: { name: 'Access' },
    raw: true,
  });

  if (!accessColumn) {
    return true;
  }

  const cell = await UserColumnValue.findOne({
    where: { columnId: accessColumn.id, userId },
    raw: true,
  });

  if (!cell || !cell.value || !cell.value.length || cell.value.toLowerCase() === 'all') {
    return true;
  }

  const parts = cell.value.split(',').map(x => x.trim());
  return parts.includes(realmId);
};

module.exports = {
  checkAccessForUser,
  required: (req, res, next) => {
    if (req.session.isAuthenticated) {
      return next();
    }

    jwt(jwtConfig)(req, res, (err) => {
      if (!err) {
        req.session.isAuthenticated = true;
        return next();
      }

      res.sendStatus(403);
    });
  },
  checkAccess: async (req, res, next) => {
    console.log(req.user);
    if (await checkAccessForUser(req.query.user_id, req.params.realmId || req.params.realmID
      || req.query.realmID || req.query.realmId)) {
      next();
    } else {
      res.sendStatus(403);
    }
  },
  optional: (req, res, next) => jwt({ ...jwtConfig, credentialsRequired: true })(req, res, next),
};

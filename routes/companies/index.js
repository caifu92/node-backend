import express from 'express';
import getCompanies from './getCompanies';
import getCompany from './getCompany';
import refreshCompany from './refreshCompany';
import revokeCompany from './revokeCompany';

const auth = require('../../tools/auth');

const router = express.Router();

// router.use(passport.authenticate('auth0', {}));
router.get('/', auth.required, getCompanies);
router.get('/:realmID', auth.required, getCompany);
router.post('/:realmID/refresh', auth.required, refreshCompany);
router.post('/:realmID/revoke', auth.required, revokeCompany);

export default router;

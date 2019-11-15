import express from 'express';
import getReport from './getReport';

const auth = require('../../tools/auth');

const router = express.Router();
// router.use(checkJwt);
router.get('/', auth.required, getReport);

export default router;

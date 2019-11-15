import express from 'express';
import getAccounts from './getAccounts';

const auth = require('../../tools/auth');

const router = express.Router();

router.get('/', auth.required, getAccounts);

export default router;

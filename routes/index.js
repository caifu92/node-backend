import express from 'express';
import cors from 'cors';

import report from './report';
import attachment from './attachment';
import companies from './companies';
import users from './users';

const auth = require('../tools/auth');

const router = express.Router();

router.use('/attachment', attachment);
router.use(auth.required);
router.use('/report', report);
router.use('/companies', companies);
router.use('/users', users);

export default router;

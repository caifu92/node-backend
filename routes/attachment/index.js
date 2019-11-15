import express from 'express';
import getAttachment from './getAttachment';

const auth = require('../../tools/auth');

const router = express.Router();

router.get('/', auth.required, getAttachment);

export default router;

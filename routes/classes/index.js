import express from 'express';
// import bodyParser from 'body-parser';
import getClasses from './getClasses';
import getDetails from './getDetails';

const auth = require('../../tools/auth');

const router = express.Router();

router.get('/', auth.required, getClasses);
router.get('/:classId/details', auth.required, getDetails);


export default router;

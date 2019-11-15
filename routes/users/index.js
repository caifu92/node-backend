import passport from 'passport';

// import bodyParser from 'body-parser';
import express from 'express';
import getUsers from './getUsers';
import createColumn from './createColumn';
import editColumn from './editColumn';
import deleteColumn from './deleteColumn';
import editRow from './editRow';
import getUserSetting from './getUserSetting'
import addUserSetting from './addUserSetting'

const router = express.Router();
// app.use(checkJwt);
router.get('/', getUsers);
router.post('/columns', createColumn);
router.put('/columns', editColumn);
router.post('/columns/:id', deleteColumn);
router.post('/rows', editRow);

// user setting
router.get('/setting', getUserSetting);
router.post('/setting', addUserSetting);

export default router;

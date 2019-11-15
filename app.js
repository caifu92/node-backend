/* eslint-disable no-await-in-loop */
import './dotenv';
import Umzug from 'umzug';
import Sequelize from 'sequelize';
import path from 'path';
import express from 'express';
import cors from 'cors';
import session from 'cookie-session';
import Auth0Strategy from 'passport-auth0';
import passport from 'passport';
import bodyParser from 'body-parser';
import compression from 'compression';
import { db } from './db';
import routes from './routes';

const app = express();

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }

  // fallback to standard filter function
  return compression.filter(req, res);
}

app.use(compression({ filter: shouldCompress }));
app.use(cors());

const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 4000;

const runJobs = require('./jobs/runJobs');
const cronJobs = require('./jobs/cron-jobs');

const runCronJobs = () => {
  Object.values(cronJobs).forEach((job) => {
    job.start();
  });
};

require('./tools/socket')(io);

const sessionConfig = {
  secret: 'Tn5hTd6sL',
  cookie: {
    secure: app.get('env') === 'production',
  },
  resave: false,
  saveUninitialized: true,
};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.use(session(sessionConfig));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const strategy = new Auth0Strategy({
  domain: 'smartreportz.eu.auth0.com',
  clientID: 'T02IIKCXJHb2v50ylYOo3IhfHSDgsCyG',
  clientSecret: 'emmxm5itezCYDSYBICHOYQMDchhxNk9aE8ZdILF5PlPa3cJ6MgVcYIDULKRcI5wW',
  callbackURL: '/authcallback',
}, ((accessToken, refreshToken, extraParams, profile, done) => done(null, profile)));

const umzug = new Umzug({
  storage: 'sequelize',
  storageOptions: { sequelize: db },
  migrations: {
    params: [
      db.getQueryInterface(),
      Sequelize,
    ],
    path: path.join(__dirname, 'db', 'migrations'),
  },
});

passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

/*
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
  next();
});
*/

const userInViews = require('./lib/middleware/userInViews');
const authRouter = require('./routes/auth');

app.use(userInViews());
app.use('/', authRouter);

app.use('/api/qbocallback', require('./routes/qbocallback.js'));
app.use('/api/connect_to_quickbooks', require('./routes/connect_to_quickbooks.js'));
app.use('/api/connect_handler', require('./routes/connect_handler.js'));
app.use('/api/update-notification', require('./routes/updateQuickbooksNotification.js'));
app.use('/api_call', require('./routes/api_call.js'));

app.use('/api/', routes);

http.listen(port, async () => {
  await umzug.up();
  await runJobs(false, null, true);
  runCronJobs();
  console.log(`Listening on Port ${port}`);
});
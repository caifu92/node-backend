const appRoot = require('app-root-path');
const winston = require('winston');

require('winston-daily-rotate-file');

// define the custom settings for each transport (file, console)
const options = {
  file: {
    level: 'info',
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const transport = new (winston.transports.DailyRotateFile)({
  filename: `${appRoot}/logs/app-%DATE%.log`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

// instantiate a new Winston Logger with the settings defined above
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(options.console),
    transport
  ],
  exitOnError: false, // do not exit on handled exceptions
});

module.exports = logger;

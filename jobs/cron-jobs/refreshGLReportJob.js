const { CronJob } = require('cron');
const { refreshGLReportJob: cronTime } = require('./config');
const refreshGLReportJob = require('../refreshGLReportJob').job;


const job = new CronJob(cronTime, async () => {
  try {
    console.log('GL_REPORT_JOB is starting');
    await refreshGLReportJob(null);
    console.log('GL_REPORT_JOB stopped');
  } catch (err) {
    console.log('GL_REPORT_JOB failed', err.message);
  }
}, null);

module.exports = job;

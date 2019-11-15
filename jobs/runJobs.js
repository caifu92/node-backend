const refreshAccountsJob = require('./refreshAccountsJob');
const refreshClassesJob = require('./refreshClassesJob');
const refreshCompaniesJob = require('./refreshCompaniesJob');
const refreshTokensJob = require('./refreshTokensJob');
const refreshGLReportJob = require('./refreshGLReportJob');
const refreshGLReportJobModifiedDates = require('./refreshGLReportJobModifiedDates');

module.exports = async (once, realmID, isInitial) => {
  if (realmID) {
    await refreshAccountsJob.job(realmID);
    await refreshClassesJob.job(realmID);
    await refreshCompaniesJob.job(realmID);
    await refreshTokensJob.job(realmID);
    await refreshGLReportJob.job(realmID);
  }

  if (!once) {
    refreshAccountsJob.start();
    refreshClassesJob.start();
    refreshCompaniesJob.start();
    refreshTokensJob.start();
    refreshGLReportJobModifiedDates.start();
    // refreshGLReportJob.start();
  }
};

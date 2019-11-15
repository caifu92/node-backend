const appCache = require('../tools/appCache');

const tools = require('../tools/tools.js');
const { Quickbook } = require('../db');

const {
  TOKEN_JOB_KEY: JOB_KEY,
  INITIAL_TOKEN_JOB: INITIAL_JOB,
} = require('../constants/cache.constants');

const setJobStatus = (status) => {
  if (appCache) {
    appCache.set(JOB_KEY, {
      ...appCache.get(JOB_KEY) || INITIAL_JOB,
      jobStatus: status,
    });
  }
};

const job = async (realmID) => {
  try {
    setJobStatus('starting');

    const quickBooks = await Quickbook.findAll({
      where: realmID ? { realmID } : {},
    });

    await Promise.all(quickBooks
      .filter(quickBook => !!quickBook)
      .map(async (quickBook) => {
        try {
          const newToken = await tools.refreshTokens(quickBook.realmID);

          quickBook.accessToken = newToken.accessToken;
          quickBook.refreshToken = newToken.refreshToken;
          quickBook.data = JSON.stringify(newToken.data);

          return quickBook.save();
        } catch (err) {
          console.log(err);
        }
      }));

    console.log(JOB_KEY, ' done');
    setJobStatus('stopped');
  } catch (err) {
    console.log(JOB_KEY, ' ERROR: ', err);
    setJobStatus('stopped');
  }
};

module.exports = ({
  job,
  start: () => setInterval(() => {
    if (
      appCache.get(JOB_KEY)
      && appCache.get(JOB_KEY).jobStatus !== 'stopped'
    ) {
      console.log(JOB_KEY, 'is running');
      return;
    }
    job(null);
  }, 20 * 60 * 1000),
});

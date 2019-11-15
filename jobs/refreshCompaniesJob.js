const request = require('request-promise');
const appCache = require('../tools/appCache');

const config = require('../config.json');
const { Quickbook } = require('../db');

const {
  COMPANY_JOB_KEY: JOB_KEY,
  INITIAL_COMPANY_JOB: INITIAL_JOB,
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
  const options = (quickBook, query) => ({
    headers: {
      'User-Agent': 'Request-Promise',
    },
    auth: {
      bearer: quickBook.accessToken,
    },
    json: true,
    url: `${config.qboapi_uri}${quickBook.realmID}/${query}?minorVersion=38`,
  });

  try {
    setJobStatus('starting');

    const quickBooks = await Quickbook.findAll({
      where: realmID ? { realmID } : {},
    });

    await Promise.all(quickBooks
      .filter(quickBook => !!quickBook)
      .map(async (quickBook) => {
        const { Preferences: preferences } = await request(options(quickBook, 'preferences'));
        const { CompanyInfo: companyInfo } = await request(options(quickBook, `companyinfo/${quickBook.realmID}`));

        quickBook.info = JSON.stringify(companyInfo);
        quickBook.preferences = JSON.stringify(preferences);
        return quickBook.save();
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
  }, 5 * 60 * 1000),
});

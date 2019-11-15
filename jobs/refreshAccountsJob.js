const request = require('request-promise');
const appCache = require('../tools/appCache');
/* eslint-disable no-await-in-loop */
const config = require('../config.json');
const { Quickbook, QuickbookAccount } = require('../db');

const {
  ACCOUNT_JOB_KEY: JOB_KEY,
  INITIAL_ACCOUNT_JOB: INITIAL_JOB,
} = require('../constants/cache.constants');

const setJobStatus = (status) => {
  if (appCache) {
    console.log(JOB_KEY, status);

    appCache.set(JOB_KEY, {
      ...appCache.get(JOB_KEY) || INITIAL_JOB,
      jobStatus: status,
    });
  }
};

const job = async (realmID) => {
  try {
    setJobStatus('starting');
    const options = (quickBook, query) => ({
      headers: {
        'User-Agent': 'Request-Promise',
      },
      auth: {
        bearer: quickBook.accessToken,
      },
      json: true,
      url: `${config.qboapi_uri}${quickBook.realmID}/query?query=${query}&minorVersion=38`,
    });

    const quickBooks = await Quickbook.findAll({
      where: realmID ? { realmID } : {},
    });

    const realmIDs = quickBooks
      .filter(quickBook => !!quickBook)
      .map(quickBook => quickBook.realmID)
      .reduce((acc, cur) => [...acc, ...[acc.indexOf(cur) > -1 ? [] : [cur]]], []);

    await Promise.all([
      ...realmIDs.map(_realmID => QuickbookAccount.destroy({
        where: { realmID: _realmID },
      })),
    ]);

    await Promise.all([
      ...quickBooks.filter(quickBook => !!quickBook)
        .map(quickBook => new Promise(async (resolve, reject) => {
          try {
            const { QueryResponse: { totalCount } } = await request(options(quickBook, 'Select Count(*) from Account'));
            const size = 1000;
            const startPositions = [...Array(Math.ceil(totalCount / size)).keys()]
              .map(i => i * size + 1);

            const chunks = await Promise.all(
              startPositions.map(
                start => request(options(quickBook, `Select * from Account STARTPOSITION ${start} MAXRESULTS ${size} `)),
              ),
            );
            const allAccounts = [].concat(
              ...chunks.map(({ QueryResponse: { Account: accounts } }) => accounts),
            );

            // await QuickbookAccount.destroy({
            //   where: { realmID: quickBook.realmID },
            // });

            const quickbookAccounts = await QuickbookAccount.bulkCreate(allAccounts.map(x => ({
              ...x,
              name: x.Name,
              subAccount: x.SubAccount,
              fullyQualifiedName: x.FullyQualifiedName,
              active: x.Active,
              classification: x.Classification,
              accountType: x.AccountType,
              accountSubType: x.AccountSubType,
              currentBalance: x.CurrentBalance,
              currentBalanceWithSubAccounts: x.CurrentBalanceWithSubAccounts,
              currencyRefName: (x.CurrencyRef || {}).name,
              currencyRefValue: (x.CurrencyRef || {}).value,
              accId: x.Id,
              syncToken: x.SyncToken,
              metaCreateTime: (x.MetaData || {}).CreateTime,
              metaLastUpdatedTime: (x.MetaData || {}).LastUpdatedTime,
              realmID: quickBook.realmID,
            })));

            resolve(quickbookAccounts);
          } catch (err) {
            reject(err);
          }
        })),
    ])
      .then(() => {
        // done
        setJobStatus('stopped');
      })
      .catch((err) => {
        console.log(JOB_KEY, ' ERROR ', err);
        setJobStatus('stopped');
      });
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
  }, 10 * 60 * 1000),
});

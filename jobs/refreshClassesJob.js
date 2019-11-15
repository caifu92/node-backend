const request = require('request-promise');
const appCache = require('../tools/appCache');
/* eslint-disable no-await-in-loop */
const config = require('../config.json');
const { Quickbook, QuickbookClass } = require('../db');

const {
  CLASS_JOB_KEY: JOB_KEY,
  INITIAL_CLASS_JOB: INITIAL_JOB,
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
    // setJobStatus('starting');
    console.log(JOB_KEY, ' run with realmID: ', realmID);

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

    // await Promise.all([
    //   ...realmIDs.map(_realmID => QuickbookClass.destroy({
    //     where: { realmID: _realmID },
    //   })),
    // ]);

    await Promise.all([
      ...quickBooks.filter(quickBook => !!quickBook).map(quickBook => new Promise(async (resolve, reject) => {
        try {
          const { QueryResponse: { totalCount } } = await request(options(quickBook, 'Select Count(*) from Class'));
          const size = 1000;
          const startPositions = [...Array(Math.ceil(totalCount / size)).keys()]
            .map(i => i * size + 1);
          const chunks = await Promise.all(
            startPositions.map(
              start => request(options(quickBook, `Select * from Class STARTPOSITION ${start} MAXRESULTS ${size} `)),
            ),
          );

          const allClasses = [].concat(
            ...chunks.map(({ QueryResponse: { Class: classes } }) => classes),
          ).map(x => ({
            ...x,
            name: x.Name,
            subAccount: x.SubAccount,
            parentRef: (x.ParentRef || {}).value,
            fullyQualifiedName: x.FullyQualifiedName,
            active: x.Active,
            classification: x.Classification,
            accountType: x.AccountType,
            accountSubType: x.AccountSubType,
            accId: x.Id,
            syncToken: x.SyncToken,
            metaCreateTime: (x.MetaData || {}).CreateTime,
            metaLastUpdatedTime: (x.MetaData || {}).LastUpdatedTime,
            realmID: quickBook.realmID,
          }));

          // await QuickbookClass.destroy({
          //   where: { realmID: quickBook.realmID },
          // });

          // await QuickbookClass.bulkCreate(allClasses);

          resolve(allClasses);
        } catch (err) {
          reject(err);
        }
      })),
    ])
      .then(async (data) => {
        try {
          setJobStatus('starting');

          const allClasses = data.reduce((acc, cur) => [...acc, ...cur], []);

          await Promise.all([
            ...realmIDs.map(_realmID => QuickbookClass.destroy({
              where: { realmID: _realmID },
            })),
          ]);

          console.log(JOB_KEY, ' destroyed');

          await QuickbookClass.bulkCreate(allClasses);

          console.log(JOB_KEY, ' bulkCreated');

          setJobStatus('stopped');
        } catch (err) {
          throw new Error(err)
        }
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
  }, 1 * 60 * 1000),
});

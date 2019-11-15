
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const request = require('request-promise');
const appCache = require('../tools/appCache');
const config = require('../config.json');
const {
  Quickbook, QuickbookAccount, QuickbookGLReportRow,
} = require('../db');

const ACC_ID_POSITION = process.env.ACC_ID_POSITION || 11;
const {
  GL_REPORT_JOB_KEY: JOB_KEY,
  INITIAL_GL_REPORT_JOB: INITIAL_JOB,
} = require('../constants/cache.constants');

function findColData(row) {
  if (row.ColData) {
    return [row.ColData];
  } if (row.Rows) {
    return [].concat(...(row.Rows.Row || []).map(findColData));
  }
  return [];
}

const wrapNumber = number => parseFloat(number || '0');

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
    const options = (quickBook, year) => ({
      headers: {
        'User-Agent': 'Request-Promise',
      },
      auth: {
        bearer: quickBook.accessToken,
      },
      json: true,
      url: `${config.qboapi_uri}${quickBook.realmID}/reports/GeneralLedger?start_date=${moment().add(year, 'year').add(1, 'day').format('YYYY-MM-DD')}&end_date=${moment().add(year + 1, 'year').format('YYYY-MM-DD')}&columns=tx_date,account_type,txn_type,doc_num,cust_name,name,emp_name,vend_name,item_name,memo,account_name,klass_name,net_amount,subt_nat_home_amount,debt_home_amt,credit_home_amt,credit_amt,debt_amt,currency,is_adj,tax_code&account_type=Income,CostOfGoodsSold,Expense,OtherIncome&minorVersion=38`,
    });

    const quickBooks = await Quickbook.findAll({
      where: realmID ? { realmID } : {},
    });

    console.log("Check quick bools realmIDs")
    console.log(quickBooks)

    const realmIDs = quickBooks
      .filter(quickBook => !!quickBook)
      .map(quickBook => quickBook.realmID)
      .reduce((acc, cur) => [...acc, ...[acc.indexOf(cur) > -1 ? [] : [cur]]], []);

    await Promise.all([
      ...quickBooks.filter(quickBook => !!quickBook).map(quickBook => new Promise(async (resolve, reject) => {
        try {
          const [accounts, attachments, chunks] = await Promise.all([
            // accounts
            QuickbookAccount.findAll({
              where: { realmID: quickBook.realmID },
              raw: true,
            }).then(items => items.reduce((acc, item) => {
              acc[item.accId] = item;
              return acc;
            }, {})),
            // attachments
            request({
              ...options(quickBook, 0),
              url: `${config.qboapi_uri}${quickBook.realmID}/query?query=select * from attachable STARTPOSITION 1 MAXRESULTS 1000&minorversion=38`,
            })
              .then(({ QueryResponse: { Attachable: items } }) => items.reduce((acc, item) => {
                if (item.AttachableRef) {
                  item.AttachableRef.forEach((attachableRef) => {
                    if (attachableRef.EntityRef) {
                      acc[attachableRef.EntityRef.value] = acc[attachableRef.EntityRef.value] || [];
                      acc[attachableRef.EntityRef.value].push(item);
                    }
                  });
                }
                return acc;
              }, {})),
            // chunks
            Promise.all(
              [...[...Array(3).keys()].map(i => -i - 1), 0, 1, 2, 3].map(
                year => request(options(quickBook, year)),
              ),
            ),
          ]);

          const allReports = [].concat(
            ...chunks.map(
              reportData => findColData(reportData)
                .filter(row => row && row[0].value !== 'Beginning Balance')
                .map((row) => {
                  const tranId = wrapNumber(row[1].id);
                  const accId = wrapNumber(row[ACC_ID_POSITION].id);

                  const debit = Math.abs(wrapNumber(row[12].value));
                  const credit = Math.abs(wrapNumber(row[13].value)) * (-1);

                  const foreignDebit = Math.abs(wrapNumber(row[17].value));
                  const foreignCredit = Math.abs(wrapNumber(row[18].value)) * (-1);

                  return {
                    date: row[0] && row[0] ? moment(row[0].value, 'YYYY-MM-DD').toISOString() : '',
                    tranID: tranId,
                    transactionType: row[1].value,
                    no: row[2].value,
                    adj: row[3].value,
                    name: row[4].value,
                    customer: row[5].value,
                    supplier: row[6].value,
                    accID: accId,
                    employee: row[7].value,
                    product_service: row[9].value,
                    debit,
                    credit,
                    baseAmount: debit + credit,
                    currency: row[15].value,
                    foreignDebit,
                    foreigncredit: foreignCredit,
                    foreignAmount: foreignDebit + foreignCredit,
                    description: row[10].value,
                    account: row[11].value,
                    accType: (accounts[accId] || {}).accountType,
                    class: row[8].value,
                    vat: row[16].value,
                    attachments: JSON.stringify(attachments[tranId] || []),
                    realmID: quickBook.realmID,
                  };
                }),
            ),
          );
          resolve(allReports);
        } catch (err) {
          reject(err);
        }
      })),
    ])
      .then(async (data) => {
        try {
          setJobStatus('starting');

          const allReports = data.reduce((acc, cur) => [...acc, ...cur], []);

          await Promise.all([
            ...realmIDs.map(_realmID => QuickbookGLReportRow.destroy({
              where: { realmID: _realmID },
            })),
          ]);

          console.log(JOB_KEY, ' destroyed');

          await QuickbookGLReportRow.bulkCreate(allReports);

          console.log(JOB_KEY, ' bulkCreated');

          setJobStatus('stopped');
        } catch (err) {
          throw new Error(err);
        }
      });
    // setJobStatus('stopped');
  } catch (err) {
    console.log(JOB_KEY, ' error', err);
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
      console.log('GL_REPORT_JOB is running');
      return;
    }
    job(null);
  }, 1 * 60 * 1000),
});

import moment from 'moment';
import NodeCache from 'node-cache';
import { promisify } from 'util';
import reqest from 'request-promise';
import { Quickbook, QuickbookAccount } from '../../db';

const config = require('../../config.json');

const accountsCache = new NodeCache({ stdTTL: 30 * 60 });
const getCached = promisify(accountsCache.get);
const setCached = promisify(accountsCache.set);

const ACC_ID_POSITION = process.env.ACC_ID_POSITION || 11;

function findColData(row) {
  if (row.ColData) {
    return [row.ColData];
  }
  if (row.Rows) {
    return [].concat(...(row.Rows.Row || []).map(findColData));
  }
  return [];
}

export default async (req, res) => {
  const quickBook = await Quickbook.findOne({ where: { realmID: req.query.realmID } });

  const reportUrl = `${config.qboapi_uri}${req.query.realmID}/reports/GeneralLedger?start_date=${req.query.start_date}&end_date=${req.query.end_date}&columns=tx_date,account_type,txn_type,doc_num,cust_name,name,emp_name,vend_name,item_name,memo,account_name,klass_name,net_amount,subt_nat_home_amount,debt_home_amt,credit_home_amt,credit_amt,debt_amt,currency,is_adj,tax_code,&minorVersion=38`;
  const attachmentsUrl = `${config.qboapi_uri}${req.query.realmID}/query?query=select * from attachable STARTPOSITION 1 MAXRESULTS 1000&minorversion=38`;

  const options = url => ({
    uri: url,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    auth: {
      bearer: quickBook.accessToken,
    },
    json: true,
  });

  try {
    const [reportData, cachedAccounts, cachedAttachments] = await Promise.all([
      reqest(options(reportUrl)),
      getCached(`accounts_${req.query.realmID}`),
      getCached(`attachments_${req.query.realmID}`),
    ]);

    const [accounts, attachments] = await Promise.all([
      cachedAccounts ? Promise.resolve(cachedAccounts) : QuickbookAccount.findAll({
        where: { realmID: req.query.realmID },
        raw: true,
      }).then(items => items.reduce((acc, item) => {
        acc[item.accId] = item;
        return acc;
      }, {})),
      cachedAttachments ? Promise.resolve(cachedAttachments) : reqest(options(attachmentsUrl))
        .then(({ QueryResponse: { Attachable: items } }) => {
          if (items) {
            return items.reduce((acc, item) => {
              if (item.AttachableRef) {
                for (let i = 0; i < item.AttachableRef.length; i++) {
                  const attachableRef = item.AttachableRef[i];
                  if (attachableRef.EntityRef) {
                    acc[attachableRef.EntityRef.value] = acc[attachableRef.EntityRef.value] || [];
                    acc[attachableRef.EntityRef.value].push(item);
                  }
                }
              }
              return acc;
            }, {});
          }
          return {};
        }),
    ]);

    await Promise.all([
      !cachedAccounts && setCached(`accounts_${req.query.realmID}`, accounts),
      !cachedAttachments && setCached(`attachments_${req.query.realmID}`, attachments),
    ]);

    const columns = [
      { name: 'Date', type: 'date' }, // 0
      { name: 'TranID', type: 'number' }, // 1
      { name: 'Transaction Type', type: 'string' }, // 2
      { name: 'No.', type: 'string' }, // 3
      { name: 'Adj', type: 'string' }, // 4
      { name: 'Name', type: 'string' }, // 5
      { name: 'Customer', type: 'string' }, // 6
      { name: 'Supplier', type: 'string' }, // 7
      { name: 'AccID', type: 'number' }, // 8
      { name: 'Employee', type: 'string' }, // 9
      { name: 'Product/Service', type: 'string' }, // 10
      { name: 'Debit', type: 'number' }, // 11
      { name: 'Credit', type: 'number' }, // 12
      { name: 'Base Amount', type: 'number' }, // 13
      { name: 'Currency', type: 'string' }, // 14
      { name: 'Foreign Debit', type: 'number' }, // 15
      { name: 'Foreign Credit', type: 'number' }, // 16
      { name: 'Foreign Amount', type: 'number' }, // 17
      { name: 'Memo/Description', type: 'string' }, // 18
      { name: 'Account', type: 'string' }, // 19
      { name: 'AccType', type: 'string' }, // 20
      { name: 'Class', type: 'string' }, // 21
      { name: 'VAT Code', type: 'string' }, // 22
      { name: 'Attachments', type: 'string' }, // 23
    ];

    const wrapNumber = number => parseFloat(number || '0');

    const rows = findColData(reportData)
      .filter(row => row && row[0].value !== 'Beginning Balance')
      .map((row) => {
        const tranId = wrapNumber(row[1].id);
        const accId = wrapNumber(row[ACC_ID_POSITION].id);

        const debit = Math.abs(wrapNumber(row[12].value));
        const credit = Math.abs(wrapNumber(row[13].value)) * (-1);

        const foreignDebit = Math.abs(wrapNumber(row[17].value));
        const foreignCredit = Math.abs(wrapNumber(row[18].value)) * (-1);

        return [
          { value: row[0] && row[0] ? moment(row[0].value, 'YYYY-MM-DD').toISOString() : '' },
          { value: tranId },
          { value: row[1].value },
          { value: row[2].value },
          { value: row[3].value },
          { value: row[4].value },
          { value: row[5].value },
          { value: row[6].value },
          { value: accId },
          { value: row[7].value },
          { value: row[9].value },
          { value: debit },
          { value: credit },
          { value: debit + credit },
          { value: row[15].value },
          { value: foreignDebit },
          { value: foreignCredit },
          { value: foreignDebit + foreignCredit },
          { value: row[10].value },
          { value: row[11].value },
          { value: (accounts[accId] || {}).accountType },
          { value: row[8].value },
          { value: row[16].value },
          { value: attachments[tranId] || [] },
        ];
      });

    res.json({
      columns,
      rows,
      header: reportData.Header,
    });
  } catch (error) {
    console.info(error);
    res.status(500).json({ message: error.message });
  }
};

import moment from 'moment';

const request = require('request');
const express = require('express');
const NodeCache = require('node-cache');
const { promisify } = require('util');
const rp = require('request-promise');

const auth = require('../tools/auth');
const tools = require('../tools/tools.js');
const config = require('../config.json');

const {
  Quickbook, QuickbookAccount, QuickbookClass, QuickbookClassColumn, QuickbookClassColumnValue,
  QuickbookGLReportRow, QuickbookAccountColumn, QuickbookAccountColumnValue, db
} = require('../db');

const accountsCache = new NodeCache({ stdTTL: 30 * 60 });
const getCached = promisify(accountsCache.get);
const setCached = promisify(accountsCache.set);

// const appCache = require('../tools/appCache');
// const {
//   GL_REPORT_JOB_KEY,
//   ACCOUNT_JOB_KEY,
//   CLASS_JOB_KEY,
// } = require('../constants/cache.constants');

// const isJobsStarting = () => (appCache.get(GL_REPORT_JOB_KEY) && appCache.get(GL_REPORT_JOB_KEY).jobStatus === 'starting')
//   || (appCache.get(ACCOUNT_JOB_KEY) && appCache.get(ACCOUNT_JOB_KEY).jobStatus === 'starting')
//   || (appCache.get(CLASS_JOB_KEY) && appCache.get(CLASS_JOB_KEY).jobStatus === 'starting');

const isJobsStarting = () => false;

const router = express.Router();

const ACC_ID_POSITION = process.env.ACC_ID_POSITION || 11;

const isEqual = (str, val) => (str || '').toLowerCase() === (val || '').toLowerCase();

function findColData(row) {
  if (row.ColData) {
    return [row.ColData];
  } if (row.Rows) {
    return [].concat(...(row.Rows.Row || []).map(findColData));
  }
  return [];
}
/** /api_call * */
router.get('/', auth.required, async (req, res) => {
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
    json: true, // Automatically parses the JSON string in the response
  });

  try {
    const [reportData, cachedAccounts, cachedAttachments] = await Promise.all([
      rp(options(reportUrl)),
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
      cachedAttachments ? Promise.resolve(cachedAttachments) : rp(options(attachmentsUrl))
        .then(({ QueryResponse: { Attachable: items } }) => items.reduce((acc, item) => {
          if (item.AttachableRef && item.AttachableRef.length && item.AttachableRef[0].EntityRef) {
            acc[item.AttachableRef[0].EntityRef.value] = acc[item.AttachableRef[0].EntityRef.value] || [];
            acc[item.AttachableRef[0].EntityRef.value].push(item);
          }
          return acc;
        }, {})),
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
});

router.get('/attachment', async (req, res) => {
  const quickBook = await Quickbook.findOne({ where: { realmID: req.query.realmID } });

  const options = url => ({
    uri: url,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    auth: {
      bearer: quickBook.accessToken,
    },
    json: true, // Automatically parses the JSON string in the response
  });

  const id = req.query.id || 0;

  const attachmentsUrl = `${config.qboapi_uri}${req.query.realmID}/query?query=select * from attachable where AttachableRef.EntityRef.value = '${req.query.tranID}'&minorversion=38`;

  const { QueryResponse: { Attachable: attachment } } = await rp(options(attachmentsUrl));

  res.redirect(attachment[id].TempDownloadUri);
});

router.post('/columns', async (req, res) => {
  await QuickbookClassColumn.create(req.body);
  res.status(200).send();
});

router.post('/accounts/columns', async (req, res) => {
  await QuickbookAccountColumn.create(req.body);
  res.status(200).send();
});

router.post('/rows', async (req, res) => {
  const rows = req.body;
  await Promise.all(rows.map(row => QuickbookClassColumnValue.upsert({
    id: row.id,
    columnId: row.columnId,
    classId: row.classId,
    value: row.value,
  })));

  res.status(200).send();
});

router.post('/accounts/rows', async (req, res) => {
  const rows = req.body;
  await Promise.all(rows.map(row => QuickbookAccountColumnValue.upsert({
    id: row.id,
    columnId: row.columnId,
    accountId: row.accountId,
    value: row.value,
  })));

  res.status(200).send();
});

router.put('/columns', async (req, res) => {
  const { id, ...newBody } = req.body;
  await QuickbookClassColumn.update(
    newBody,
    { where: { id } },
  );

  res.status(200).send();
});

router.put('/accounts/columns', async (req, res) => {
  const { id, ...newBody } = req.body;
  await QuickbookAccountColumn.update(
    newBody,
    { where: { id } },
  );

  res.status(200).send();
});

router.delete('/columns/:id', async (req, res) => {
  const { id } = req.params;

  await QuickbookClassColumn.update({
    isRemoved: true,
  }, { where: { id } });

  res.status(200).send();
});

router.delete('/accounts/columns/:id', async (req, res) => {
  const { id } = req.params;

  await QuickbookAccountColumn.update({
    isRemoved: true,
  }, { where: { id } });

  res.status(200).send();
});

// app.use(checkJwt);

router.get('/classes', async (req, res) => {
  try {
    const [classes, columns] = await Promise.all([
      QuickbookClass.findAll({
        where: { realmID: req.query.realmID },
      }),
      QuickbookClassColumn.findAll({
        where: { realmID: req.query.realmID, isRemoved: false },
      }),
    ]);

    const totalColumns = [{
      name: 'name',
      type: 'string',
    }, {
      name: 'fullyQualifiedName',
      type: 'string',
    }, {
      name: 'active',
      type: 'boolean',
    },
    ...columns.map(({ id, name, type }) => ({
      id,
      name,
      type,
    }))];

    const additionalColumnsValues = await Promise.all(
      columns.map(x => QuickbookClassColumnValue.findAll({
        where: { columnId: x.id, classId: classes.map(c => c.accId), isRemoved: false },
      }).then(items => items.reduce((acc, rowValue) => {
        acc[rowValue.classId] = rowValue;
        return acc;
      }, {}))),
    );

    const parseValue = (value, type) => {
      switch (type) {
        case 'boolean': {
          return value === 'true';
        }
        default: {
          return value;
        }
      }
    };
    const totalRows = classes.map(c => [{
      value: c.name,
    }, {
      value: c.fullyQualifiedName,
    }, {
      value: c.active,
    },
    ...columns.map((col, id) => ({
      value: parseValue((additionalColumnsValues[id][c.accId] || {}).value, col.type),
    }))]);

    const customCellIndexes = Object.assign({}, ...classes.map(
      c => ({
        [c.accId]: Object.assign({}, ...columns.map((x, id) => ({
          [x.id]: (additionalColumnsValues[id][c.accId] || {}).id,
        }))),
      }),
    ));


    res.json({
      rows: totalRows,
      rowIndexes: classes.map(x => x.accId),
      customCellIndexes,
      columns: totalColumns,
    });
  } catch (err) {
    console.info(err);
    res.status(401).json({ message: 'Authentication Failure' });
  }
});
// app.use(checkJwt);

router.get('/accounts', async (req, res) => {
  try {
    const [accounts, columns] = await Promise.all([
      QuickbookAccount.findAll({
        where: { realmID: req.query.realmID },
        raw: true,
      }),
      QuickbookAccountColumn.findAll({
        where: { realmID: req.query.realmID, isRemoved: false },
        order: [
          ['createdAt', 'ASC'],
        ],
        raw: true,
      }),
    ]);

    const totalColumns = [{
      name: 'name',
      type: 'string',
      hidden: true,
    }, {
      name: 'subAccount',
      type: 'boolean',
      hidden: true,
    }, {
      name: 'fullyQualifiedName',
      type: 'string',
    }, {
      name: 'active',
      type: 'boolean',
      hidden: true,
    }, {
      name: 'classification',
      type: 'string',
      hidden: true,
    }, {
      name: 'accountType',
      type: 'string',
      hidden: false,
    }, {
      name: 'accountSubType',
      type: 'string',
      hidden: true,
    }, {
      name: 'currentBalance',
      type: 'number',
      hidden: true,
    }, {
      name: 'currentBalanceWithSubAccounts',
      type: 'number',
      hidden: true,
    }, {
      name: 'currencyRefName',
      type: 'string',
      hidden: true,
    }, {
      name: 'currencyRefValue',
      type: 'string',
      hidden: true,
    }, {
      name: 'domain',
      type: 'string',
      hidden: true,
    }, {
      name: 'sparse',
      type: 'boolean',
      hidden: true,
    }, {
      name: 'accId',
      type: 'string',
      hidden: true,
    },
    ...columns.map(({
      id, name, type, isNegative,
    }) => ({
      id,
      name,
      type,
      isNegative,
    }))];

    const additionalColumns = await Promise.all(
      columns.map(x => QuickbookAccountColumnValue.findAll({
        where: {
          columnId: x.id, accountId: accounts.map(c => c.accId), value: 'true', isRemoved: false,
        },
        raw: true,
      })),
    );


    const additionalColumnsValues = additionalColumns
      .map((x, index) => ({ index, item: x }))
      .reduce((acc, x) => {
        acc[columns[x.index].id] = x.item.reduce((acc2, rowValue) => {
          acc2[rowValue.accountId] = rowValue;
          return acc2;
        }, {});

        return acc;
      }, {});

    const parseValue = (value, type) => {
      switch (type) {
        case 'boolean': {
          return value === 'true';
        }
        default: {
          return value;
        }
      }
    };

    const totalRows = accounts.map(c => [{
      value: c.name,
    }, {
      value: c.subAccount,
    }, {
      value: c.fullyQualifiedName,
    }, {
      value: c.active,
    }, {
      value: c.classification,
    }, {
      value: c.accountType,
    }, {
      value: c.accountSubType,
    }, {
      value: c.currentBalance,
    }, {
      value: c.currentBalanceWithSubAccounts,
    }, {
      value: c.currencyRefName,
    }, {
      value: c.currencyRefValue,
    }, {
      value: c.domain,
    }, {
      value: c.sparse,
    }, {
      value: c.accId,
    },
    ...columns.map(col => ({
      value: parseValue((additionalColumnsValues[col.id][c.accId] || {}).value, col.type),
    }))]);

    const customCellIndexes = Object.assign({}, ...accounts.map(
      c => ({
        [c.accId]: Object.assign({}, ...columns.map(x => ({
          [x.id]: (additionalColumnsValues[x.id][c.accId] || {}).id,
        }))),
      }),
    ));


    res.json({
      rows: totalRows,
      rowIndexes: accounts.map(x => x.accId),
      customCellIndexes,
      columns: totalColumns,
    });
  } catch (err) {
    console.info(err);
    res.status(401).json({ message: 'Authentication Failure' });
  }
});
// app.use(checkJwt);
router.post('/report/refresh', async (req, res) => {
  res.status(200).send();
});

router.post('/class/details', (req, res) => {
  const getData = async () => {
    try {
      const { className, type } = req.body;

      const [rows, accountColumn, accountNamesMap] = await Promise.all([QuickbookGLReportRow.findAll({
        where: {
          realmID: req.query.realmID,
          class: className,
          adj: ['no', 'No'],
        },
      }), QuickbookAccountColumn.findOne({
        where: { realmID: req.query.realmID, name: type, isRemoved: false },
        raw: true,
      }), QuickbookAccount.findAll({
        where: { realmID: req.query.realmID },
        attributes: ['accId', 'fullyQualifiedName'],
        raw: true,
      }).then(items => items.reduce((acc, item) => {
        acc[item.accId] = item.fullyQualifiedName;
        return acc;
      }, {}))]);

      const accounts = await QuickbookAccountColumnValue.findAll({
        where: {
          columnId: accountColumn.id, isRemoved: false, value: 'true',
        },
        attributes: ['accountId'],
        raw: true,
      }).then(items => [...new Set(items.map(item => item.accountId))].map(item => accountNamesMap[item]));

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

      const totalRows = rows
        .map(x => [
          { value: x.date },
          { value: x.tranID },
          { value: x.transactionType },
          { value: x.no },
          { value: x.adj },
          { value: x.name },
          { value: x.customer },
          { value: x.supplier },
          { value: x.accID },
          { value: x.employee },
          { value: x.product_service },
          { value: x.debit },
          { value: x.credit },
          { value: x.baseAmount },
          { value: x.currency },
          { value: x.foreignDebit },
          { value: x.foreigncredit },
          { value: x.foreignAmount },
          { value: x.description },
          { value: x.account },
          { value: x.accType },
          { value: x.class },
          { value: x.vat },
          { value: JSON.parse(x.attachments) },
        ]);

      res.json({
        rows: totalRows,
        accounts,
        columns,
      });
    } catch (err) {
      console.info(err);
      res.status(401).json({ message: 'Authentication Failure' });
    }
  };

  const run = () => {
    if (isJobsStarting()) {
      setTimeout(run, 2000);
    } else {
      getData();
    }
  };
  run();
});

router.get('/accounts/sum', auth.required, (req, res) => {
  const getData = async () => {
    var query = "select a.\"realmID\", a.\"account\", to_char(a.\"date\"::date, 'YYYY-MM') as date, min(a.\"accType\") as accType, sum(a.\"baseAmount\") as sum "
    + "from \"QuickbookGLReportRows\" a "
    + "group by a.\"realmID\", a.\"account\", a.\"date\" "
    + "order by a.\"account\";"

    await db.query(query)
    .then(function(result){
      res.json(result[0]);
      console.log(result);
    })
    .error(function(err){
      console.info(err);
      res.status(401).json({ message: 'Authentication Failure' });     
    });
  }

  const run = () => {
    if (isJobsStarting()) {
      setTimeout(run, 2000);
    } else {
      getData();
    }
  };

  run();
});

router.get('/margins', auth.required, (req, res) => {
  const getData = async () => {
    try {
      console.time('fetch QuickbookClass, QuickbookClassColumn, QuickbookAccount, QuickbookAccountColumn');
      const [classes, columns, accountNamesMap, accountColumns] = await Promise.all([
        QuickbookClass.findAll({
          where: { realmID: req.query.realmID },
          raw: true,
        }),
        QuickbookClassColumn.findAll({
          where: { realmID: req.query.realmID, isRemoved: false },
          raw: true,
        }),
        QuickbookAccount.findAll({
          where: { realmID: req.query.realmID },
          attributes: ['accId', 'fullyQualifiedName'],
          raw: true,
        }).then(items => items.reduce((acc, item) => {
          acc[item.accId] = item.fullyQualifiedName;
          return acc;
        }, {})),
        QuickbookAccountColumn.findAll({
          where: { realmID: req.query.realmID, isRemoved: false },
          raw: true,
        }),
      ]);
      console.timeEnd('fetch QuickbookClass, QuickbookClassColumn, QuickbookAccount, QuickbookAccountColumn');

      const totalColumns = [{
        name: 'name',
        type: 'string',
      }, {
        name: 'Income',
        type: 'number',
        isUsedInDetails: true,
      }, {
        name: 'Direct costs',
        type: 'number',
        isUsedInDetails: true,
      },
      ...accountColumns.map(x => ({
        name: x.name,
        type: 'number',
        isUsedInDetails: true,
      }))
        .filter(x => !isEqual(x.name, 'Income') && !isEqual(x.name, 'Direct costs')),
      {
        name: 'Gross Margin £',
        type: 'number',
      }, {
        name: 'Gross Margin %',
        type: 'number',
      }, {
        name: 'VAT £',
        type: 'number',
      }, {
        name: 'Net Margin £',
        type: 'number',
      }, {
        name: 'Net Margin %',
        type: 'number',
      },
      ...columns.map(({ id, name, type }) => ({
        id,
        name,
        type,
      }))];

      console.time('fetch additionalClassColumnsValues');
      const additionalClassColumnsValues = await Promise.all(
        columns.map(x => QuickbookClassColumnValue.findAll({
          where: { columnId: x.id, isRemoved: false },
          attributes: ['classId', 'value'],
          raw: true,
        }).then(items => items.reduce((acc, { classId, value }) => {
          acc[classId] = value;
          return acc;
        }, {}))),
      );
      console.timeEnd('fetch additionalClassColumnsValues');

      console.time('fetch accountColumnsValues');
      const accountColumnsValues = await Promise.all(
        accountColumns.map(x => QuickbookAccountColumnValue.findAll({
          where: {
            columnId: x.id, isRemoved: false, value: 'true',
          },
          attributes: ['accountId'],
          raw: true,
        }).then(items => items.map(item => item.accountId))),
      );
      console.timeEnd('fetch accountColumnsValues');

      console.time('reduce accountColumnIdValuesMap');
      const accountColumnIdValuesMap = accountColumnsValues
        .map((items, index) => ({ items, index }))
        .reduce((acc, item) => {
          acc[accountColumns[item.index].id] = item.items;
          return acc;
        }, {});
      console.timeEnd('reduce accountColumnIdValuesMap');

      const parseValue = (value, type) => {
        switch (type) {
          case 'boolean': {
            return value === 'true';
          }
          default: {
            return value;
          }
        }
      };

      console.time('fetch glRows');
      const glRows = await QuickbookGLReportRow.findAll({
        where: { realmID: req.query.realmID, adj: ['No', 'no'] },
        attributes: ['class', 'account', 'baseAmount'],
        raw: true,
      });
      console.timeEnd('fetch glRows');

      const sumReducer = (accumulator, currentValue) => accumulator + currentValue;

      const sum = items => items.reduce(sumReducer, 0);

      const accountsMap = accountColumns
        .filter(x => x.type === 'boolean')
        .reduce((acc, column) => {
          acc[column.name] = accountColumnIdValuesMap[column.id]
            .map(x => (accountNamesMap[x] || '').toLowerCase());

          return acc;
        }, {});

      const otherAccountColumns = Object.keys(accountsMap)
        .filter(x => x !== 'Income' && x !== 'Direct costs');

      const booleanToSign = val => (val ? 1 : -1);

      const totalRows = classes
        .map(c => Object.assign({
          ...c,
          incomeRows: glRows.filter(x => x.class === c.fullyQualifiedName
            && (accountsMap.Income || []).includes((x.account || '').toLowerCase()))
            .map(x => x.baseAmount || 0),

          directCostsRows: glRows.filter(x => x.class === c.fullyQualifiedName
            && (accountsMap['Direct costs'] || []).includes((x.account || '').toLowerCase())).map(x => x.baseAmount || 0),
        },

        ...otherAccountColumns.map(column => ({
          [`${column}rows`]: glRows.filter(x => x.class === c.fullyQualifiedName
              && accountsMap[column].includes((x.account || '').toLowerCase())).map(x => x.baseAmount || 0),
        }))))
        .map(c => Object.assign({
          ...c,
          income: (sum(c.incomeRows)) * booleanToSign(!(accountColumns.find(x => x.name === 'Income') || {}).isNegative),
          directCosts: (sum(c.directCostsRows)) * booleanToSign(!(accountColumns.find(x => x.name === 'Direct costs') || {}).isNegative),
        }, ...otherAccountColumns.map(column => ({
          [`${column}`]: (sum(c[`${column}rows`])) * booleanToSign(!(accountColumns.find(x => x.name === column) || {}).isNegative),
        }))))
        .map(c => ({
          ...c,
          marginE: c.income + c.directCosts,
        }))
        .map(c => ({
          ...c,
          vatE: (c.marginE / 6.0) * (-1),
        }))
        .map(c => [{
          value: c.fullyQualifiedName,
        }, {
          value: c.income,
        }, {
          value: c.directCosts,
        },
        ...otherAccountColumns.map(column => ({
          value: c[`${column}`],
        })),
        {
          value: c.marginE,
        }, {
          value: c.income > 0 ? (c.marginE / c.income) * 100 : 0,
        }, {
          value: c.vatE,
        }, {
          value: c.marginE + c.vatE,
        }, {
          value: c.income > 0 ? ((c.marginE + c.vatE) / c.income) * 100 : 0,
        },
        ...columns.map((col, id) => ({
          value: parseValue(additionalClassColumnsValues[id][c.accId], col.type),
        }))])
        .filter(x => x[1].value !== 0 || x[2].value !== 0);

      res.json({
        rows: totalRows,
        columns: totalColumns,
      });
    } catch (err) {
      console.info(err);
      res.status(401).json({ message: 'Authentication Failure' });
    }
  };

  const run = () => {
    if (isJobsStarting()) {
      setTimeout(run, 2000);
    } else {
      getData();
    }
  };
  run();
});

/** /api_call/revoke * */
router.get('/revoke', auth.checkAccess, async (req, res) => {
  const token = await tools.verifyAuth();
  const url = tools.revoke_uri;
  if (!token) return res.json({ error: 'Not authorized' });

  const quickBook = await Quickbook.findOne({ where: { realmID: req.query.realmID } });

  if (quickBook && quickBook.currentAuth) {
    request({
      url,
      method: 'POST',
      headers: {
        Authorization: `Basic ${tools.basicAuth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.accessToken,
      }),
    }, async () => {
      tools.clearToken(req.query.realmID);

      await Promise.all([
        QuickbookAccount.destroy({ where: { realmID: req.query.realmID } }),
        QuickbookClass.destroy({ where: { realmID: req.query.realmID } }),
      ]);

      res.json({ response: 'Revoke successful' });
    });
  } else {
    tools.clearToken(req.query.realmID);
    res.json({ response: 'Revoke successful' });
  }
});


module.exports = router;

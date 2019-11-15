const appCache = require('./appCache');
const {
  QuickbookAccount, QuickbookClass, QuickbookClassColumn, QuickbookClassColumnValue,
  QuickbookGLReportRow, QuickbookAccountColumn, QuickbookAccountColumnValue,
} = require('../db');

const {
  GL_REPORT_JOB_KEY,
  ACCOUNT_JOB_KEY,
  CLASS_JOB_KEY,
} = require('../constants/cache.constants');

const isEqual = (str, val) => (str || '').toLowerCase() === (val || '').toLowerCase();

const socketConf = function (io) {
  io.on('connection', (socket) => {
    const userEmail = socket.handshake.query && socket.handshake.query.email;
    console.log(`Email has connected: ${userEmail}`);

    socket.on('margin_update_req', async ({ token, realmID, isFirstTimeReq }) => {
      if (
        !isFirstTimeReq
        && (
          (appCache.get(GL_REPORT_JOB_KEY) && appCache.get(GL_REPORT_JOB_KEY).jobStatus === 'starting')
          || (appCache.get(ACCOUNT_JOB_KEY) && appCache.get(ACCOUNT_JOB_KEY).jobStatus === 'starting')
          || (appCache.get(CLASS_JOB_KEY) && appCache.get(CLASS_JOB_KEY).jobStatus === 'starting')
        )
      ) {
        // console.log('JOBS is running');
        return;
      }

      try {
        const [classes, columns, accountNamesMap, accountColumns] = await Promise.all([
          QuickbookClass.findAll({
            where: { realmID },
            raw: true,
          }),
          QuickbookClassColumn.findAll({
            where: {
              realmID,
              isRemoved: false,
            },
            raw: true,
          }),
          QuickbookAccount.findAll({
            where: { realmID },
            attributes: ['accId', 'fullyQualifiedName'],
            raw: true,
          })
            .then(items => items.reduce((acc, item) => {
              acc[item.accId] = item.fullyQualifiedName;
              return acc;
            }, {})),
          QuickbookAccountColumn.findAll({
            where: {
              realmID,
              isRemoved: false,
            },
            raw: true,
          }),
        ]);

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

        const [
          additionalClassColumnsValues,
          accountColumnsValues,
          glRows,
        ] = await Promise.all([
          // additionalClassColumnsValues
          Promise.all(
            columns.map(x => QuickbookClassColumnValue.findAll({
              where: {
                columnId: x.id,
                isRemoved: false,
              },
              attributes: ['classId', 'value'],
              raw: true,
            })
              .then(items => items.reduce((acc, { classId, value }) => {
                acc[classId] = value;
                return acc;
              }, {}))),
          ),
          // accountColumnsValues
          Promise.all(
            accountColumns.map(x => QuickbookAccountColumnValue.findAll({
              where: {
                columnId: x.id,
                isRemoved: false,
                value: 'true',
              },
              attributes: ['accountId'],
              raw: true,
            })
              .then(items => items.map(item => item.accountId))),
          ),
          // glRows
          QuickbookGLReportRow.findAll({
            where: {
              realmID,
              adj: ['No', 'no'],
            },
            attributes: ['class', 'account', 'baseAmount'],
            raw: true,
          }),
        ]);

        const accountColumnIdValuesMap = accountColumnsValues
          .map((items, index) => ({
            items,
            index,
          }))
          .reduce((acc, item) => {
            acc[accountColumns[item.index].id] = item.items;
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
              && (accountsMap['Direct costs'] || []).includes((x.account || '').toLowerCase()))
              .map(x => x.baseAmount || 0),
          }, ...otherAccountColumns.map(column => ({
            [`${column}rows`]: glRows.filter(x => x.class === c.fullyQualifiedName
              && accountsMap[column].includes((x.account || '').toLowerCase()))
              .map(x => x.baseAmount || 0),
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

        socket.emit('margin_update_res', {
          token,
          rows: totalRows,
          columns: totalColumns,
        });
      } catch (err) {
        console.error(err);
      }
    });
  });
};

module.exports = socketConf;

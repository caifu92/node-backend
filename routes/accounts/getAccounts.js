import { QuickbookAccount, QuickbookAccountColumn, QuickbookAccountColumnValue } from '../../db';

export default async (req, res) => {
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
};

import {
  QuickbookAccount,
  QuickbookAccountColumn,
  QuickbookAccountColumnValue,
  QuickbookGLReportRow,
} from '../../db';

export default async (req, res) => {
  try {
    const { className, type } = req.body;

    const [rows, accountColumn, accountNamesMap] = await Promise.all([QuickbookGLReportRow.findAll({
      where: {
        realmID: req.query.realmID,
        class: className,
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
    }).then(items => items.map(item => accountNamesMap[item.accountId]));

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
      .filter(x => x.adj === 'No' || x.adj === 'no')
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

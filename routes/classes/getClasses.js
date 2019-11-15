import { QuickbookClass, QuickbookClassColumn, QuickbookClassColumnValue } from '../../db';

export default async (req, res) => {

  //console.log(req.session);

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
};

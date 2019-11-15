const { UserColumnValue } = require('../../db');

export default async (req, res) => {
  const rows = req.body;
  await Promise.all(rows.map(row => UserColumnValue.upsert({
    id: row.id,
    columnId: row.columnId,
    userId: row.userId,
    value: row.value,
  })));

  res.status(200).send();
};

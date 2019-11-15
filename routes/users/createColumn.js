const { UserColumn } = require('../../db');

export default async (req, res) => {
  await UserColumn.create(req.body);
  res.status(200).send();
};

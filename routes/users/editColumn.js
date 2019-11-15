const { UserColumn } = require('../../db');

export default async (req, res) => {
  const { id, ...newBody } = req.body;

  await UserColumn.update(
    newBody,
    { where: { id } },
  );

  res.status(200).send();
};

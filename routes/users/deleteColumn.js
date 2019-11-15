const { UserColumn } = require('../../db');

export default async (req, res) => {
  const { id } = req.params;

  await UserColumn.update({
    isRemoved: true,
  }, { where: { id } });

  res.status(200).send();
};

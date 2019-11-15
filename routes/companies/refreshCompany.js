import { Quickbook } from '../../db';
import { startRefreshCompanyJob } from '../../queues';

export default async (req, res) => {
  const company = await Quickbook.findOne({
    where: { realmID: req.params.realmID },
  });

  company.status = 'Loading';
  await company.save();

  startRefreshCompanyJob({
    realmId: req.params.realmID,
  });

  res.status(200).send();
};

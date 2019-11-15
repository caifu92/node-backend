import { Quickbook } from '../../db';
import mapCompany from './shared/mapCompany';

export default async (req, res) => {
  const company = await Quickbook.findOne({
    where: { realmID: req.params.realmID },
  });

  res.json(mapCompany(company));
};

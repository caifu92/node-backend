import { Quickbook } from '../../db';
import mapCompany from './shared/mapCompany';

const auth = require('../../tools/auth');

export default async (req, res) => {
  // console.log(req.user);

  const companies = await Quickbook.findAll({
    raw: true,
  });

  const mapComany = async (company) => {
    const isValid = process.env.NODE_ENV === 'development' || await auth.checkAccessForUser(req.query.user_id, company.realmID);
    return {
      ...company,
      isValid,
    };
  };

  const quickBooks = (await Promise.all(companies.map(mapComany)))
    .filter(x => x.isValid)
    .map(mapCompany);

  res.json(quickBooks);
};

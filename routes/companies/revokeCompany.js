import request from 'request';
import { Quickbook, QuickbookAccount, QuickbookClass } from '../../db';

const tools = require('../../tools/tools.js');

export default async (req, res) => {
  const company = await Quickbook.findOne({
    where: { realmID: req.params.realmID },
  });

  if (!company) {
    return res.sendStatus(404);
  }

  await request({
    url: tools.revoke_uri,
    method: 'POST',
    headers: {
      Authorization: `Basic ${tools.basicAuth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: company.accessToken,
    }),
  });

  await Promise.all([
    Quickbook.destroy({ where: { realmID: req.params.realmID } }),
    QuickbookAccount.destroy({ where: { realmID: req.params.realmID } }),
    QuickbookClass.destroy({ where: { realmID: req.params.realmID } }),
  ]);

  res.sendStatus(200);
};

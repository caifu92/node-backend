import reqest from 'request-promise';

const config = require('../../config.json');
const { Quickbook } = require('../../db');

export default async (req, res) => {
  const quickBook = await Quickbook.findOne({ where: { realmID: req.query.realmID } });

  const options = url => ({
    uri: url,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    auth: {
      bearer: quickBook.accessToken,
    },
    json: true,
  });
  const id = req.query.id || 0;

  const attachmentsUrl = `${config.qboapi_uri}${req.query.realmID}/query?query=select * from attachable where AttachableRef.EntityRef.value = '${req.query.tranID}'&minorversion=38`;

  const { QueryResponse: { Attachable: attachment } } = await reqest(options(attachmentsUrl));

  res.redirect(attachment[id].TempDownloadUri);
};

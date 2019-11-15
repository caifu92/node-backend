const request = require('request-promise');

const options = (quickBook, query) => ({
  headers: {
    'User-Agent': 'Request-Promise',
  },
  auth: {
    bearer: quickBook.accessToken,
  },
  json: true,
  url: `${config.qboapi_uri}${quickBook.realmID}/query?query=${query}&minorVersion=38`,
});

export default {
  downloadAllAttachments: async (quickBook) => {
    try {
      const { QueryResponse: { totalCount } } = await request(options(quickBook, 'Select Count(*) from Attachable'));
      const size = 1000;
      const startPositions = [...Array(Math.ceil(totalCount / size)).keys()]
        .map(i => i * size + 1);

      const chunks = await Promise.all(
        startPositions.map(
          start => request(options(quickBook, `Select * from Attachable STARTPOSITION ${start} MAXRESULTS ${size} `)),
        ),
      );

      const allAttachments = [].concat(
        ...chunks.map(({ QueryResponse: { Attachable: items } }) => items),
      );

      return allAttachments;
    } catch (err) {
      console.error(err);
    }
  },
};

export default company => ({
  realmID: company.realmID,
  token: !!company.token,
  status: company.status,
  info: {
    name: JSON.parse(company.info || '{}').CompanyName,
  },
});

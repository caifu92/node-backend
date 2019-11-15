import Sequelize from 'sequelize';
import db from '../db';

const QuickbookAccount = db.define('QuickbookAccounts', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  name: Sequelize.TEXT,
  subAccount: Sequelize.BOOLEAN,
  fullyQualifiedName: Sequelize.TEXT,
  active: Sequelize.BOOLEAN,
  classification: Sequelize.STRING,
  accountType: Sequelize.STRING,
  accountSubType: Sequelize.STRING,
  currentBalance: Sequelize.DOUBLE,
  currentBalanceWithSubAccounts: Sequelize.DOUBLE,
  currencyRefName: Sequelize.STRING,
  currencyRefValue: Sequelize.STRING,
  domain: Sequelize.STRING,
  sparse: Sequelize.BOOLEAN,
  accId: Sequelize.STRING,
  syncToken: Sequelize.TEXT,
  metaCreateTime: Sequelize.STRING,
  metaLastUpdatedTime: Sequelize.STRING,
  realmID: Sequelize.STRING,
}, {});

export default QuickbookAccount;

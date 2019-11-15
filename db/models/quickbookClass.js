import Sequelize from 'sequelize';
import db from '../db';

const QuickbookClass = db.define('QuickbookClasses', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  name: Sequelize.TEXT,
  subAccount: Sequelize.BOOLEAN,
  parentRef: Sequelize.STRING,
  fullyQualifiedName: Sequelize.TEXT,
  active: Sequelize.BOOLEAN,
  domain: Sequelize.STRING,
  sparse: Sequelize.BOOLEAN,
  accId: Sequelize.STRING,
  syncToken: Sequelize.TEXT,
  metaCreateTime: Sequelize.STRING,
  metaLastUpdatedTime: Sequelize.STRING,
  realmID: Sequelize.STRING,
}, {});

export default QuickbookClass;

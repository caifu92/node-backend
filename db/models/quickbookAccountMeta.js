import Sequelize from 'sequelize';
import db from '../db';

const QuickbookAccountsMeta = db.define('QuickbookAccountsMeta', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  name: Sequelize.TEXT,
  value: Sequelize.TEXT,
  accountId: Sequelize.STRING,
  realmID: Sequelize.STRING,
}, {});

export default QuickbookAccountsMeta;

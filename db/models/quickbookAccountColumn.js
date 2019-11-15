import Sequelize from 'sequelize';
import db from '../db';

const QuickbookAccountColumn = db.define('QuickbookAccountColumns', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  realmID: Sequelize.STRING,
  name: Sequelize.TEXT,
  type: Sequelize.TEXT,
  isNegative: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default QuickbookAccountColumn;

import Sequelize from 'sequelize';
import db from '../db';

const QuickbookAccountColumnValue = db.define('QuickbookAccountColumnValues', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  columnId: Sequelize.INTEGER,
  accountId: Sequelize.STRING,
  value: Sequelize.TEXT,
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default QuickbookAccountColumnValue;

import Sequelize from 'sequelize';
import db from '../db';

const QuickbookClassColumnValue = db.define('QuickbookClassColumnValues', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  columnId: Sequelize.INTEGER,
  classId: Sequelize.STRING,
  value: Sequelize.TEXT,
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default QuickbookClassColumnValue;

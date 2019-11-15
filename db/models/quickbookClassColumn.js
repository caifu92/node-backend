import Sequelize from 'sequelize';
import db from '../db';

const QuickbookClass = db.define('QuickbookClassColumns', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  userId: Sequelize.STRING,
  realmID: Sequelize.STRING,
  name: Sequelize.TEXT,
  type: Sequelize.TEXT,
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default QuickbookClass;

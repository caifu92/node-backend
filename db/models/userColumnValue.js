import Sequelize from 'sequelize';
import db from '../db';

const UserColumnValues = db.define('UserColumnValues', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  columnId: Sequelize.INTEGER,
  userId: Sequelize.STRING,
  value: Sequelize.TEXT,
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default UserColumnValues;

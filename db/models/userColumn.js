import Sequelize from 'sequelize';
import db from '../db';

const UserColumn = db.define('UserColumns', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  name: Sequelize.TEXT,
  type: Sequelize.TEXT,
  isRemoved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {});

export default UserColumn;

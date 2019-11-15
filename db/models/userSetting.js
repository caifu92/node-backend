import Sequelize from 'sequelize';
import db from '../db';

const UserSetting = db.define('UserSettings', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  email: Sequelize.STRING,
  key: Sequelize.STRING,
  value: Sequelize.TEXT,
}, {});

export default UserSetting;

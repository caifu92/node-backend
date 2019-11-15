import Sequelize from 'sequelize';
import db from '../db';

const Quickbook = db.define('Quickbooks', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  realmID: Sequelize.STRING,
  accessToken: Sequelize.TEXT,
  refreshToken: Sequelize.TEXT,
  data: Sequelize.TEXT,
  currentAuth: Sequelize.BOOLEAN,
  info: Sequelize.TEXT,
  preferences: Sequelize.TEXT,
  status: Sequelize.STRING,
  statusInfo: Sequelize.TEXT,
}, {});

export default Quickbook;

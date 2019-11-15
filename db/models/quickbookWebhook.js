import Sequelize from 'sequelize';
import db from '../db';

const QuickbookWebhook = db.define('QuickbookWebhooks', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  data: Sequelize.TEXT,
}, {});

export default QuickbookWebhook;

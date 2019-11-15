import Sequelize from 'sequelize';
import db from '../db';

const QuickbookGLReportRow = db.define('QuickbookGLReportRows', {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: Sequelize.INTEGER,
  },
  date: Sequelize.STRING,
  tranID: Sequelize.INTEGER,
  transactionType: Sequelize.STRING,
  no: Sequelize.TEXT,
  adj: Sequelize.TEXT,
  name: Sequelize.TEXT,
  customer: Sequelize.TEXT,
  supplier: Sequelize.TEXT,
  accID: Sequelize.INTEGER,
  employee: Sequelize.TEXT,
  product_service: Sequelize.TEXT,
  debit: Sequelize.DOUBLE,
  credit: Sequelize.DOUBLE,
  baseAmount: Sequelize.DOUBLE,
  currency: Sequelize.STRING,
  foreignDebit: Sequelize.DOUBLE,
  foreigncredit: Sequelize.DOUBLE,
  foreignAmount: Sequelize.DOUBLE,
  description: Sequelize.TEXT,
  account: Sequelize.TEXT,
  accType: Sequelize.STRING,
  class: Sequelize.STRING,
  vat: Sequelize.TEXT,
  attachments: Sequelize.TEXT,
  realmID: Sequelize.STRING,
}, {
  indexes: [
    {
      unique: false,
      fields: ['realmID', 'tranID'],
    },
  ],
});

export default QuickbookGLReportRow;

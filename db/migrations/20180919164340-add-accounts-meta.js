module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('QuickbookAccountsMeta', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    name: Sequelize.TEXT,
    value: Sequelize.TEXT,
    accountId: Sequelize.STRING,
    realmID: Sequelize.STRING,
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('QuickbookAccountsMeta'),
};

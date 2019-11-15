module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('QuickbookWebhooks', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    data: Sequelize.TEXT,
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('QuickbookWebhooks'),
};

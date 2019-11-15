module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('QuickbookClassColumns', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    userId: {
      type: Sequelize.STRING,
    },
    realmID: {
      type: Sequelize.STRING,
    },
    name: {
      type: Sequelize.TEXT,
    },
    type: {
      type: Sequelize.TEXT,
    },
    isRemoved: {
      allowNull: false,
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('QuickbookClassColumns'),
};

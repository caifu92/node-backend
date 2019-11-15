module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('Quickbooks', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    realmID: {
      type: Sequelize.STRING,
    },
    accessToken: {
      type: Sequelize.TEXT,
    },
    refreshToken: {
      type: Sequelize.TEXT,
    },
    data: {
      type: Sequelize.TEXT,
    },
    currentAuth: {
      type: Sequelize.BOOLEAN,
    },
    info: {
      type: Sequelize.TEXT,
    },
    preferences: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.STRING,
    },
    statusInfo: {
      type: Sequelize.TEXT,
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

  down: queryInterface => queryInterface.dropTable('Quickbooks'),
};

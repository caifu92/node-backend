module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('UserColumnValues', {
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
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
    },
  }),

  down: queryInterface => queryInterface.dropTable('UserColumnValues'),
};

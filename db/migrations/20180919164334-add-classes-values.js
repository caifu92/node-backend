module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('QuickbookClassColumnValues', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    columnId: {
      type: Sequelize.INTEGER,
    },
    classId: {
      type: Sequelize.STRING,
    },
    value: {
      type: Sequelize.TEXT,
    },
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

  down: queryInterface => queryInterface.dropTable('QuickbookClassColumnValues'),
};

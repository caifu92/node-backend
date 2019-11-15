module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.createTable('QuickbookClasses', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    name: {
      type: Sequelize.TEXT,
    },
    subAccount: {
      type: Sequelize.BOOLEAN,
    },
    parentRef: {
      type: Sequelize.STRING,
    },
    fullyQualifiedName: {
      type: Sequelize.TEXT,
    },
    active: {
      type: Sequelize.BOOLEAN,
    },
    classification: {
      type: Sequelize.STRING,
    },
    accountType: {
      type: Sequelize.STRING,
    },
    accountSubType: {
      type: Sequelize.STRING,
    },
    domain: {
      type: Sequelize.STRING,
    },
    sparse: {
      type: Sequelize.BOOLEAN,
    },
    accId: {
      type: Sequelize.STRING,
    },
    syncToken: {
      type: Sequelize.TEXT,
    },
    metaCreateTime: {
      type: Sequelize.STRING,
    },
    metaLastUpdatedTime: {
      type: Sequelize.STRING,
    },
    realmID: {
      type: Sequelize.STRING,
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

  down: queryInterface => queryInterface.dropTable('QuickbookClasses'),
};

import Sequelize from 'sequelize';

const connection = process.env.HEROKU_POSTGRESQL_BROWN_URL
|| 'postgres://postgres:z9t5TACmPRM794ejEfeW@127.0.0.1:5432/Tn5hTd6sL';

export default new Sequelize(connection, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: true,
  },
  logging: false,
});

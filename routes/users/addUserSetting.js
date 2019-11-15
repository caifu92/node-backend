import { UserSetting } from '../../db';

export default (req, res) => {
  const { email, key, value } = req.body;
  if (email && key && value) {
    Promise.all([
      UserSetting.destroy({
        where: { email, key },
      }),
      UserSetting.create({ email, key, value }),
    ]).then(([isDelete, userSetting]) => {
      res.json({
        status: 1,
      });
    }).catch((err) => {
      res.status(500).json({
        status: 0,
        message: err.message,
      });
    });
  } else {
    res.status(500).json({
      status: 0,
      message: 'email, key and value are required',
    });
  }
};

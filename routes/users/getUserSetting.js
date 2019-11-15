import { UserSetting } from '../../db';

export default (req, res) => {
  const { email, key } = req.query;

  if (email && key) {
    UserSetting.findOne({
      where: {
        email,
        key,
      },
      raw: true,
    }).then((data) => {
      res.json({
        status: 1,
        data,
      });
    }).catch((err) => {
      res.status(500).json({ message: err.message });
    });
  } else {
    res.status(500).json({ message: 'email and key query are required' });
  }
};

/**
 *
 */

const JWTManager = require("../utils/JWTManager");
const UserAuthenticator = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    const { x_auth } = req.cookies;
    console.log(x_auth);
    if (authorization) {
      const rawToken = authorization.split("Bearer ");
      console.log(rawToken);
      const jm = new JWTManager();
      const token = await jm.verify(rawToken[1]);
      const reToken = await jm.verify(x_auth);
      if (token) {
        next();
        return;
      }
      if (reToken) {
        const refreshToken = await jm.decoded(x_auth);
        const token = await jm.createSign(
          {
            email: refreshToken.email,
            name: refreshToken.name,
            company: refreshToken.company,
            depart: refreshToken.depart,
          },
          "60s"
        );
        console.log(reToken);
        next();
        return;
      }
    }
    return res.status(401).json("로그인 해주세요");
  } catch (error) {}
};

module.exports = UserAuthenticator;

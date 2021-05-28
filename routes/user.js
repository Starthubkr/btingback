const exprees = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");

// aws.config.region = "ap-northeast-2"; // 리전
// aws.config.credentials = new aws.CognitoIdentityCredentials({
//   IdentityPoolId: "ap-northeast-2:208b7c23-f490-40ac-b348-c3f6a373245d",
// });
/**
 * S3 연결
 */
const s3 = new aws.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: "ap-northeast-2",
});
// const s3 = new aws.S3();

const { User, ProfileImg } = require("../models/index");
const JWTManager = require("../utils/JWTManager");

let fileName = "";

const route = exprees.Router();

/**
 * nodemailer 설정
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

try {
  fs.accessSync("profileuploads");
} catch (error) {
  fs.mkdirSync("profileuploads");
}

// const upload = multer({
//   storage: multer.diskStorage({
//     destination(req, file, done) {
//       done(null, "profileuploads");
//     },
//     filename(req, file, done) {
//       const ext = path.extname(file.originalname);
//       const basename = path.basename(file.originalname, ext);
//       done(null, basename + "_" + new Date().getTime() + ext);
//     },
//   }),
//   limits: { fileSize: 20 * 1024 * 1024 },
// });

/**
 * 이미지 업로드시 파일 이름 만들기
 */
const fileNameCreate = (file) => {
  fileName =
    "profileimages" +
    "/" +
    Math.floor(Math.random() * 1000).toString() +
    Date.now() +
    "." +
    file.originalname.split(".").pop();
  return fileName;
};

/**
 * S3에 이미지 업로드
 */
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "bting-images",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, fileNameCreate(file));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});
/**
 * 유저 회원가입
 */
route.post("/create", upload.none(), async (req, res, next) => {
  try {
    console.log(req.body);
    const user = await User.findOne({ where: { email: req.body.email } });
    if (user) {
      res.status(404).json("아이디가 존재합니다.");
      return;
    }
    const hashPassword = await bcrypt.hash(req.body.password, 11);
    const userCreate = await User.create({
      email: req.body.email,
      password: hashPassword,
      name: req.body.name,
      phone: req.body.phone,
      company: req.body.company,
      depart: req.body.depart,
    });
    if (req.body.src) {
      await ProfileImg.create({
        src: req.body.src,
        userId: userCreate.dataValues.id,
      });
    }
    /**
     * 인증메일
     */
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: req.body.email,
      subject: "Starting 인증 메일입니다.",
      text: "mail!!!",
      html: `<a href=http://bting-f.s3-website.ap-northeast-2.amazonaws.com/certification/${req.body.email}>인증링크<a>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    res.status(200).json("success");
  } catch (error) {
    next(error);
  }
});

/**
 * 프로필 이미지 업로드
 */
route.post(
  "/profileimage",
  upload.single("profileImage"),
  async (req, res, next) => {
    try {
      const result = req.file.key;
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 유저 로그인
 */
route.post("/login", async (req, res, next) => {
  try {
    console.log(req.body);
    const user = await User.findOne({
      where: {
        email: req.body.email,
      },
    });
    console.log(user);
    if (!user) {
      return res.status(403).json("아이디가 존재하지 않습니다.");
    }

    const isPassword = await bcrypt.compare(
      req.body.password,
      user.dataValues.password
    );
    if (!isPassword) {
      return res.status(403).json("비밀번호가 맞지 않습니다.");
    }

    if (user.dataValues.mailCert === 0) {
      return res.status(403).json("인증하지않았습니다.");
    }

    const fullUserInfo = await User.findOne({
      where: {
        id: user.dataValues.id,
      },
      attributes: { exclude: ["password"] },
      include: [
        {
          model: ProfileImg,
        },
      ],
    });
    const JM = new JWTManager();
    const token = await JM.createSign(
      {
        email: fullUserInfo.dataValues.email,
        name: fullUserInfo.dataValues.name,
        company: fullUserInfo.dataValues.company,
        depart: fullUserInfo.dataValues.depart,
      },
      "60s"
    );
    const reToken = await JM.createSign(
      {
        email: fullUserInfo.dataValues.email,
        name: fullUserInfo.dataValues.name,
        company: fullUserInfo.dataValues.company,
        depart: fullUserInfo.dataValues.depart,
      },
      "24h"
    );

    console.log(fullUserInfo);
    res.cookie("x_auth", reToken, {
      httpOnly: true,
      secure: true,
      domain: "starting.link",
    });
    console.log(reToken);

    return res.status(200).json({
      fullUserInfo: fullUserInfo,
      accessToken: token,
      refreshToken: reToken,
    });
  } catch (error) {
    next(error);
  }
});
/**
 * 인증메일 클릭시 인증여부
 */
route.post("/certification", async (req, res, next) => {
  try {
    console.log(req.body);
    const userCetied = await User.findOne({
      where: { email: req.body.email },
      attributes: ["mailCert"],
    });
    if (userCetied.dataValues.mailCert === 1) {
      return res.status(403).json("이미 인증 되었습니다.");
    }
    const user = await User.update(
      { mailCert: 1 },
      { where: { email: req.body.email } }
    );
    console.log(user);
    return res.status(200).json("인증완료");
  } catch (error) {
    next(error);
  }
});

/**
 * 프로필 이미지 수정
 */
route.post("/updateimage", upload.single("image"), async (req, res, next) => {
  try {
    const result = fileName;
    console.log(result);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 프로필 수정
 */
route.post("/update", upload.single("image"), async (req, res, next) => {
  try {
    console.log(req.body);
    const { prevSrc } = req.body;
    const userUpdate = await User.update(
      {
        name: req.body.name,
        company: req.body.company,
        depart: req.body.depart,
      },
      {
        where: {
          id: req.body.id,
        },
      }
    );
    if (!(req.body.prevSrc == "null" && req.body.src == "null")) {
      if (req.body.prevSrc == "null") {
        await ProfileImg.create({
          src: req.body.src,
          userId: req.body.id,
        });
      } else {
        // AWS S3 내에 파일 삭제
        s3.deleteObject(
          {
            Bucket: "bting-image",
            Key: prevSrc.substring(0, prevSrc.indexOf(".")),
          },
          (err, data) => {
            if (err) {
              throw err;
            }
          }
        );

        await ProfileImg.update(
          {
            src: req.body.src,
          },
          {
            where: {
              userId: req.body.id,
            },
          }
        );
      }
    }

    const fullUserInfo = await User.findOne({
      where: {
        id: req.body.id,
      },
      attributes: { exclude: ["password"] },
      include: [
        {
          model: ProfileImg,
        },
      ],
    });

    return res.status(200).json(fullUserInfo);
  } catch (error) {
    next(error);
  }
});

route.get("/authentication", async (req, res, next) => {
  try {
    const { x_auth } = req.cookies;
    const JWT = new JWTManager();
    const decoded = await JWT.decoded(x_auth);
    console.log(decoded);
    const fullUserInfo = await User.findOne({
      where: {
        email: decoded.email,
      },
      attributes: { exclude: ["password"] },
      include: [
        {
          model: ProfileImg,
        },
      ],
    });
    const token = await JWT.createSign(
      {
        email: fullUserInfo.dataValues.email,
        name: fullUserInfo.dataValues.name,
        company: fullUserInfo.dataValues.company,
        depart: fullUserInfo.dataValues.depart,
      },
      "60s"
    );
    return res.status(200).json({
      fullUserInfo: fullUserInfo,
      accessToken: token,
    });
  } catch (error) {
    next(error);
  }
});

route.get("/logout", async (req, res, next) => {
  try {
    res.clearCookie("x_auth", { domain: "starting.link" });
    return res.status(200).json("로그아웃");
  } catch (error) {
    next(error);
  }
});

route.get("/s3check", async (req, res, next) => {
  try {
    s3.listObjects(
      {
        Bucket: "bting-image",
      },
      (err, data) => {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data);
        }
      }
    );
  } catch (error) {
    res.status(401).json(error);
  }
});
module.exports = route;

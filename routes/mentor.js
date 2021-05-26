const exprees = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");
const { Mentor, MentorImg, User } = require("../models");
const userAuthenticator = require("../middlewares/Authenticator");
const s3 = new aws.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: "ap-northeast-2",
});

const route = exprees.Router();

let fileName = "";
try {
  fs.accessSync("mentoruploads");
} catch (error) {
  fs.mkdirSync("mentoruploads");
}

const fileNameCreate = (file) => {
  fileName =
    "mentorimage" +
    "/" +
    Math.floor(Math.random() * 1000).toString() +
    Date.now() +
    "." +
    file.originalname.split(".").pop();
  return fileName;
};

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

route.post("/create", upload.none(), async (req, res, next) => {
  try {
    console.log(req.body);
    const userCreate = await Mentor.create({
      name: req.body.name,
      company: req.body.company,
      depart: req.body.depart,
      intro: req.body.intro,
      carrer: req.body.carrer,
      field: req.body.field,
      content: req.body.content,
      userId: req.body.userId,
    });

    await MentorImg.create({
      src: req.body.src,
      mentorId: userCreate.dataValues.id,
    });

    res.status(200).json("success");
  } catch (error) {
    next(error);
  }
});
route.post("/image", upload.single("mentorImg"), async (req, res, next) => {
  try {
    const result = fileName;
    console.log(result);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

route.get("/", async (req, res, next) => {
  try {
    const fullMentorList = await Mentor.findAll({
      order: [["id", "desc"]],
      include: [
        {
          model: MentorImg,
        },
        {
          model: User,
          attributes: {
            exclude: ["password"],
          },
        },
      ],
    });

    res.status(200).json(fullMentorList);
  } catch (error) {
    next(error);
  }
});

route.get("/:mentorId", async (req, res, next) => {
  try {
    const oneMentor = await Mentor.findOne({
      where: Number(req.params.mentorId),
      include: [
        {
          model: User,
          attributes: {
            exclude: ["password"],
          },
        },
        {
          model: MentorImg,
        },
      ],
    });
    if (!oneMentor) {
      res.status(403).json("존재하지 않는 글입니다.");
    }
    res.status(200).json(oneMentor);
  } catch (error) {
    next(error);
  }
});

route.delete("/:mentorId", async (req, res, next) => {
  try {
    const oneMentor = await Mentor.destroy({
      where: { id: req.params.mentorId },
    });
    if (!oneMentor) {
      res.status(403).json("존재하지 않는 글입니다.");
    }
    res.status(200).json(oneMentor);
  } catch (error) {
    next(error);
  }
});

route.post("/update", upload.none(), async (req, res, next) => {
  try {
    console.log("req", req.body);
    const { prevSrc } = req.body;
    const mentorUpdate = await Mentor.update(
      {
        name: req.body.name,
        company: req.body.company,
        depart: req.body.depart,
        intro: req.body.intro,
        carrer: req.body.carrer,
        field: req.body.field,
        content: req.body.content,
      },
      {
        where: {
          id: req.body.id,
        },
      }
    );
    if (!(req.body.prevSrc === "null" && req.body.src === "null")) {
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

      await MentorImg.update(
        {
          src: req.body.src,
        },
        {
          where: {
            mentorId: req.body.id,
          },
        }
      );
    }
    res.status(200).json("수정 완료");
  } catch (error) {
    next(error);
  }
});

route.post(
  "/updateimage",
  upload.single("mentorImg"),
  async (req, res, next) => {
    try {
      const result = fileName;
      console.log(result);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = route;

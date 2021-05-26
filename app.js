const express = require("express");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const cookieSession = require("cookie-session");
const hpp = require("hpp");
const helmet = require("helmet");
const morgan = require("morgan");

const db = require("./models");
const userRouter = require("./routes/user");
const mentorRouter = require("./routes/mentor");

dotenv.config();
const app = express();

db.sequelize
  .sync()
  .then(() => {
    console.log("db connected");
  })
  .catch(console.error);

if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
  app.use(hpp());
  app.use(helmet());
} else {
  app.use(morgan("dev"));
}

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://bting-f.s3-website.ap-northeast-2.amazonaws.com",
    ],
    credentials: true,
  })
);

const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"],
    cookie: {
      secure: true,
      httpOnly: true,
      expires: expiryDate,
    },
  })
);
app.use("/mentorimage", express.static(path.join(__dirname, "mentoruploads")));
// app.use(
//   "/profileimage",
//   express.static(path.join(__dirname, "profileuploads"))
// );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.COOKIE_SECRET,
  })
);

app.get("/", (req, res) => {
  res.send("hello express");
});

app.use("/user", userRouter);

app.use("/mentor", mentorRouter);

app.listen(3006, () => {
  console.log("서버 실행");
});

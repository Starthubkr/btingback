module.exports = (sequelize, DataTypes) => {
  const MentorImg = sequelize.define(
    "mentorImg",
    {
      src: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
    },
    {
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci", // 이모티콘 저장
    }
  );

  MentorImg.associate = (db) => {};

  return MentorImg;
};

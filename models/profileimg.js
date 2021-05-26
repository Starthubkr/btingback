module.exports = (sequelize, DataTypes) => {
  const ProfileImg = sequelize.define(
    "profileimg",
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
  ProfileImg.associate = (db) => {
    // db.ProfileImg.hasOne(db.User);
  };
  return ProfileImg;
};

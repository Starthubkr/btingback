module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "user",
    {
      email: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      phone: {
        type: DataTypes.INTEGER(15),
        allowNull: false,
      },
      company: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      depart: {
        type: DataTypes.STRING(20),
      },
      mailCert: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci", // 이모티콘 저장
    }
  );
  User.associate = (db) => {
    db.User.hasOne(db.ProfileImg);
    db.User.hasMany(db.Mentor);
  };

  return User;
};

module.exports = (sequelize, DataTypes) => {
  const Mentor = sequelize.define(
    "mentor",
    {
      name: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      company: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      depart: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      intro: {
        type: DataTypes.STRING(1000),
        allowNull: false,
      },
      carrer: {
        type: DataTypes.STRING(1000),
        allowNull: false,
      },
      field: {
        type: DataTypes.STRING(1000),
        allowNull: false,
      },
      content: {
        type: DataTypes.STRING(2000),
        allowNull: false,
      },
    },
    {
      charset: "utf8mb4",
      collate: "utf8mb4_general_ci", // 이모티콘 저장
    }
  );
  Mentor.associate = (db) => {
    db.Mentor.belongsTo(db.User);
    db.Mentor.hasOne(db.MentorImg);
  };

  return Mentor;
};

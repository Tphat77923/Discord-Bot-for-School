const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

module.exports = async (filePath, guildID) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const teachers = [];
  const students = [];

  const teacherSheet = workbook.getWorksheet("Teacher");
  if (teacherSheet) {
    teacherSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const teacherName = row.getCell(1).text.trim();
      const classList = row.values.slice(2).filter(v => typeof v === "string").map(v => v.trim());

      const userId = uuidv4().slice(0, 8);
      const rawPass = Math.random().toString(36).slice(-8);
      const hashedPassword = bcrypt.hashSync(rawPass, 10);

      Teacher.create({
        name: teacherName,
        userId,
        password: hashedPassword,
        schoolID: guildID,
        classList,
      });

      teachers.push({ name: teacherName, userId, password: rawPass, classList });
    });
  }

  workbook.eachSheet((sheet) => {
    if (sheet.name === "Teacher") return;
    const className = sheet.name;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const studentName = row.getCell(1).text.trim();
      if (!studentName) return;

      const userId = uuidv4().slice(0, 8);
      const rawPass = Math.random().toString(36).slice(-8);
      const hashedPassword = bcrypt.hashSync(rawPass, 10);

      Student.create({
        name: studentName,
        userId,
        classID:0,
        schoolID: guildID,
        password: hashedPassword,
        className
      });

      students.push({ name: studentName, userId, password: rawPass, className });
    });
  });

  fs.unlinkSync(filePath);

  return { teachers, students };
}


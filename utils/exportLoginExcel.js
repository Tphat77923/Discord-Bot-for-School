const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

module.exports = async (data) => {
  const { teachers, students } = data;

  const workbook = new ExcelJS.Workbook();

  // === Teachers Sheet ===
  const teacherSheet = workbook.addWorksheet("Teachers_ID");
  teacherSheet.addRow(["Name", "User ID", "Password", "Classes"]);
  for (const teacher of teachers) {
    teacherSheet.addRow([
      teacher.name,
      teacher.userId,
      teacher.password,
      teacher.classList.join(", ")
    ]);
  }

  // === Students Sheet ===
  const studentSheet = workbook.addWorksheet("Students_ID");
  studentSheet.addRow(["Name", "User ID", "Password", "Class"]);
  for (const student of students) {
    studentSheet.addRow([
      student.name,
      student.userId,
      student.password,
      student.className
    ]);
  }

  const filePath = path.join(__dirname, "../temp/logins.xlsx");
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}



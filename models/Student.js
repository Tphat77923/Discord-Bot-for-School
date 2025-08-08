const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  password: String,
  className: String,
  classId: String,
  schoolID: String,
  authId: { type: String, default: "0" }
});

module.exports = mongoose.models.Student || mongoose.model("Student", studentSchema);

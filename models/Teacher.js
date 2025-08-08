const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  password: String,
  classList: [String],
  classIds: { type: Map, of: String },
  schoolID: String,
  authId: { type: String, default: 0 }
});

module.exports = mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

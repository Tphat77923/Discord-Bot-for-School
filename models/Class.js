const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  classId: String,
  className: { type: String, required: true },
  schoolID: String,
});

module.exports = mongoose.models.Class || mongoose.model("Class", classSchema);
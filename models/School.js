const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  schoolID: String,
  verID: String,
  vermsgID: String,
});

module.exports = mongoose.models.School || mongoose.model("School", schoolSchema);
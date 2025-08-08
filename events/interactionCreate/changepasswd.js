const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js")
 const Student = require("../../models/Student")
 const Teacher = require("../../models/Teacher")
const bcrypt = require("bcryptjs");


module.exports = async (client, interaction) => {
    if (interaction.isModalSubmit() && interaction.customId === "password_change_modal") {
  const currentPassword = interaction.fields.getTextInputValue("current_password");
  const newPassword = interaction.fields.getTextInputValue("new_password");
  const confirmPassword = interaction.fields.getTextInputValue("confirm_password");
  const memberID = interaction.user.id;
  const schoolID = interaction.guild.id;

  if (newPassword !== confirmPassword)
    return interaction.reply({ content: "❌ Passwords do not match.", ephemeral: true });

  const user = await Student.findOne({ authId: memberID, schoolID }) || await Teacher.findOne({ authId: memberID, schoolID });

  if (!user)
    return interaction.reply({ content: "❌ Could not find your account.", ephemeral: true });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid)
    return interaction.reply({ content: "❌ Current password is incorrect.", ephemeral: true });

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (user instanceof Student)
    await Student.updateOne({ authId: memberID, schoolID }, { password: hashedPassword });
  else
    await Teacher.updateOne({ authId: memberID, schoolID }, { password: hashedPassword });

  return interaction.reply({ content: "✅ Your password has been successfully changed.", ephemeral: true });
}

}
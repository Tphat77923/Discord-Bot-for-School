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
  const schoolID = interaction.guild.id

  if (interaction.isButton() && interaction.customId === "verify_me") {
    // if (interaction.user.id == interaction.guild.ownerId) return await interaction.reply({
    //     content: `✅ There is no need for you to verify.`,
    //     flags: 1 << 6 // ephemeral
    //   });
    const modal = new ModalBuilder()
      .setCustomId("login_modal")
      .setTitle("🔐 Login to Your Class")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("login_id")
            .setLabel("User ID")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("login_password")
            .setLabel("Password")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "login_modal") {
    const userId = interaction.fields.getTextInputValue("login_id");
    const password = interaction.fields.getTextInputValue("login_password");
    const memberID = interaction.user.id;

    let user = await Student.findOne({ userId, schoolID });
    let name = user?.name;


    if (user && await bcrypt.compare(password, user.password)) {
      if (user.authId !== memberID && user.authId !== "0") return interaction.reply({ content: `❌ There are another active sessions for this account. Contact an admin if this is a mistake.`, flags: 1 << 6 });
      Student.updateOne({ userId, schoolID }, { authId: memberID }).catch(console.error);
      if (user.classId) {
        const category = interaction.guild.channels.cache.get(user.classId);
        if (category && category.type === ChannelType.GuildCategory) {
          await category.permissionOverwrites.edit(memberID, {
            ViewChannel: true,
            SendMessages: true,
            Connect: true
          });
        }
      }
      return await interaction.reply({
        content: `✅ Welcome ${name}! You have been verified and added to your class.`,
        flags: 1 << 6 // ephemeral
      });
    }

    user = await Teacher.findOne({ userId, schoolID });
    name = user?.name;

    if (user && await bcrypt.compare(password, user.password)) {
      if (user.authId !== memberID && user.authId !== "0") return interaction.reply({ content: `❌ There are another active sessions for this account. Contact an admin if this is a mistake.`, flags: 1 << 6 });
      Teacher.updateOne({ userId, schoolID }, { authId: memberID }).catch(console.error);
      if (user.classIds && typeof user.classIds === "object") {
        for (const [_, categoryId] of user.classIds.entries()) {
          const category = interaction.guild.channels.cache.get(categoryId);
          if (category && category.type === ChannelType.GuildCategory) {
            await category.permissionOverwrites.edit(memberID, {
              ViewChannel: true,
              SendMessages: true,
              Connect: true
            });
          }
        }
        
      }
      
      return await interaction.reply({
        content: `✅ Welcome ${name}! You have been verified as a teacher.`,
        flags: 1 << 6
      });
    }

    return await interaction.reply({
      content: "❌ Invalid ID or Password. Please try again.",
      flags: 1 << 6
    });
  }
};

const { ChannelType, ApplicationCommandOptionType, PermissionsBitField } = require("discord.js");
const Student = require("../../models/Student");
const Teacher = require("../../models/Teacher");

module.exports = {
  name: "logout",
  description: "Logout yourself or another user from the class system.",
  options: [
    {
      name: "user",
      description: "The user to logout (admin only)",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  callback: async (client, interaction) => {
    const schoolID = interaction.guild.id;
    const callerID = interaction.user.id;

    const target = interaction.options.getUser("user") || interaction.user;
    const targetID = target.id;

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isSelf = targetID === callerID;

    if (!isSelf && !isAdmin) {
      return interaction.reply({
        content: "❌ You don't have permission to log out other users.",
        ephemeral: true,
      });
    }

    let updated = false;

    const student = await Student.findOne({ authId: targetID, schoolID });
    if (student) {
      await Student.updateOne({ _id: student._id }, { authId: "0" }).catch(console.error);
      const category = interaction.guild.channels.cache.get(student.classId);
      if (category && category.type === ChannelType.GuildCategory) {
        await category.permissionOverwrites.edit(targetID, {
          ViewChannel: false,
          SendMessages: false,
          Connect: false
        }).catch(console.error);
      }
      updated = true;
    }

    const teacher = await Teacher.findOne({ authId: targetID, schoolID });
    if (teacher) {
      await Teacher.updateOne({ _id: teacher._id }, { authId: "0" }).catch(console.error);
      if (teacher.classIds && typeof teacher.classIds === "object") {
        for (const [_, categoryId] of teacher.classIds.entries()) {
          const category = interaction.guild.channels.cache.get(categoryId);
          if (category && category.type === ChannelType.GuildCategory) {
            await category.permissionOverwrites.edit(targetID, {
              ViewChannel: false,
              SendMessages: false,
              Connect: false
            }).catch(console.error);
          }
        }
      }
      updated = true;
    }

    if (updated) {
      const msg = isSelf
        ? `✅ You have been successfully logged out and removed from your class(es).`
        : `✅ ${target.tag} has been successfully logged out.`;
      await interaction.reply({
        content: msg,
        ephemeral: true,
      });
    } else {
      const msg = isSelf
        ? `ℹ️ You are not currently logged in.`
        : `ℹ️ ${target.tag} is not currently logged in.`;
      await interaction.reply({
        content: msg,
        ephemeral: true,
      });
    }
  },
};

const {
  ApplicationCommandOptionType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");
const bcrypt = require("bcryptjs");
const Student = require("../../models/Student");
const Teacher = require("../../models/Teacher");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  name: "password",
  description: "Manage passwords",
  options: [
    {
      name: "change",
      description: "Change password for you",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "reset",
      description: "Reset password for a user",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "Name of the teacher or student",
          type: ApplicationCommandOptionType.String,
          required: true,
        }
      ]
    },
  ],

  callback: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();
    const schoolID = interaction.guild.id;

    switch (sub) {
      case "change": {
        const user = await Student.findOne({ authId: interaction.user.id, schoolID }) || await Teacher.findOne({ authId: interaction.user.id, schoolID });
        if(!user) return interaction.reply({ content: "❌ You are not login as a student or teacher.", ephemeral: true });
        const modal = new ModalBuilder()
          .setCustomId("password_change_modal")
          .setTitle("🔒 Change Password")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("current_password")
                .setLabel("Current Password")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("new_password")
                .setLabel("New Password")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("confirm_password")
                .setLabel("Confirm New Password")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );

        await interaction.showModal(modal);
        break;
      }

      case "reset": {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({
            content: "❌ You don’t have permission to use this command.",
            ephemeral: true,
          });
        }

        const targetName = interaction.options.getString("name");
        let user = await Student.findOne({ name: targetName, schoolID });
        let model = Student;
        let role = "Student";

        if (!user) {
          user = await Teacher.findOne({ name: targetName, schoolID });
          model = Teacher;
          role = "Teacher";
        }

        if (!user) {
          return interaction.reply({
            content: `❌ No ${role.toLowerCase()} found with the name **${targetName}**.`,
            ephemeral: true,
          });
        }

        // Tạo mật khẩu mới (ngẫu nhiên)
        const newPassword = Math.random().toString(36).slice(-8); // ví dụ: "a3f8d2e1"
        const hashed = await bcrypt.hash(newPassword, 10);
        await model.updateOne({ _id: user._id }, { password: hashed });

        await interaction.user.send({
            content: `🔑 Your password for **${targetName}** (${role}) has been reset to: \`${newPassword}\``,
        })

        await interaction.reply({
          content: `✅ Password for **${targetName}** (${role}) has been reset. New password is sent to your DM.`,
          ephemeral: true,
        });
        break;
      }
    }
  },
};

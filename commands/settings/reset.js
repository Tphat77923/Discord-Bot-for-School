const { PermissionFlagsBits, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const Student = require("../../models/Student.js");
const Teacher = require("../../models/Teacher.js");
const Class = require("../../models/Class.js");
const School = require("../../models/school.js");

function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = {
  name: "reset",
  description: "Destroy all classes and school system",
  options: [
    {
      name: "confirm",
      description: "Confirm the reset of the school system",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Yes",
          value: "yes",
        },
        {
          name: "No",
          value: "no",
        },
      ],
    },
  ],

  callback: async (client, interaction) => {
    const { options } = interaction;

    await interaction.deferReply({
      content: "please wait...",
      flags: 1 << 6,
    });

    const userId = interaction.user.id;
    const ownerId = interaction.guild.ownerId;

    if (userId !== ownerId) {
      return await interaction.followUp({
        content: "⛔ Only the server owner can run this command.",
        ephemeral: true,
      });
    }

    const choice = options.getString("confirm");
    if (choice !== "yes") {
      return await interaction.editReply({
        content: "❗️ Please confirm the reset by using `/reset confirm:yes`.",
        ephemeral: true,
      });
    }

    const existingClass = await Class.findOne({ schoolID: interaction.guild.id });
    const existingSchool = await School.findOne({ schoolID: interaction.guild.id });
        if (!existingClass && !existingSchool) {
          return await interaction.followUp({
            content: "⛔ School system is not set up. Please use /setup to create one.",
            ephemeral: true
          });
        }
    const classDocs = await Class.find({ schoolID: interaction.guild.id });

    for (const cls of classDocs) {
      const categoryId = cls.classId;
      const category = interaction.guild.channels.cache.get(categoryId);

      if (category && category.type === ChannelType.GuildCategory) {
        const children = interaction.guild.channels.cache.filter(
          ch => ch.parentId === category.id
        );

        for (const ch of children.values()) {
          await ch.delete().catch(err =>
            console.error(`❌ Cannot delete child channel ${ch.name}:`, err)
          );
        }

        // Xóa category
        await category.delete().catch(err =>
          console.error(`❌ Cannot delete category ${category.name}:`, err)
        );
      }
    }

    // xoa tin nhan xac minh
    const schoolData = await School.findOne({ schoolID: interaction.guild.id });
    if (schoolData) {
      const verifyChannel = interaction.guild.channels.cache.get(schoolData.verID);
      const verifyMessage = await verifyChannel.messages.fetch(schoolData.vermsgID).catch(err => console.error("❌ Cannot fetch verify message:", err));
      if (verifyMessage) {
        await verifyMessage.delete().catch(err => console.error("❌ Cannot delete verify message:", err));
      }
    }

    // Xoá dữ liệu trong DB
    await Class.deleteMany({ schoolID: interaction.guild.id });
    await Student.deleteMany({ schoolID: interaction.guild.id });
    await Teacher.deleteMany({ schoolID: interaction.guild.id });
    await School.deleteOne({ schoolID: interaction.guild.id });

    await interaction.editReply("✅ All classes and related channels have been destroyed.");
  },
};

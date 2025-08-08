const { PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");
const Student = require("../../models/Student.js");
const Teacher = require("../../models/Teacher.js");
const Class = require("../../models/Class.js");
const { developerID } = require("../../config.json");

// Hàm normalize tên lớp để đồng bộ so sánh
function normalizeClassName(name) {
  return name.trim().toLowerCase().replace(/[\s_-]/g, "");
}

module.exports = {
    name: "wipping_school",
    description: "destroy all classes and school system for developers",
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
                }
            ]
        }
    ],

    callback: async (client, interaction) => {
        const { options } = interaction;

        await interaction.deferReply({
            content: "please wait...",
            flags: 1 << 6
        });
        const userId = interaction.user.id;

        if (userId !== developerID) {
        return await interaction.followUp({
            content: "⛔ Only the dev can run this command.",
            ephemeral: true
        });
        }
        //check if the issue command confirmation reset
        const choice = options.getString("confirm");
        if (choice !== "yes") {
            return await interaction.editReply({
                content: "❗️ Please confirm the reset by using /reset confirm:yes.",
                ephemeral: true
            });
        }
        const existingClass = await Class.findOne({ schoolID: interaction.guild.id });

        const categories = interaction.guild.channels.cache.filter(c => c.type === 4);
        const channels = interaction.guild.channels.cache.filter(c => c.type === 0);
        const voiceChannels = interaction.guild.channels.cache.filter(c => c.type === 2);

        await Promise.all([
            ...categories.map(c => c.delete()),
            ...channels.map(c => c.delete()),
            ...voiceChannels.map(c => c.delete())
        ]);

        await Class.deleteMany({ schoolID: interaction.guild.id });
        await Student.deleteMany({ schoolID: interaction.guild.id });
        await Teacher.deleteMany({ schoolID: interaction.guild.id });
    }
};
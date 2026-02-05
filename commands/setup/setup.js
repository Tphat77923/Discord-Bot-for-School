  // File: commands/setup.js
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { PermissionsBitField, ChannelType, ComponentType, ApplicationCommandOptionType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const parseExcel = require("../../utils/parseExcel.js");
const exportLoginExcel = require("../../utils/exportLoginExcel.js");
const createClassChannels = require("../../utils/createClassChannels.js");
const Class = require("../../models/Class.js");
const School = require("../../models/School.js");

module.exports = {
    name: "setup",
    description: "🛠️ Setup school system with Excel file",
    options: [
        {
        name: "verify_channel",
        description: "Channel to post verify message",
        type: ApplicationCommandOptionType.Channel,
        required: true,
        },
        {
          name: "type",
          description: "Type of setup",
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: "tutorial",
              value: "tutorial"
            }
          ]
        }
    ],

  callback: async (client, interaction) => {
    try {
        await interaction.deferReply({
  //content: "please wait...",
  //flags: 1 << 6
});

    const userId = interaction.user.id;
    const ownerId = interaction.guild.ownerId;
    const type = interaction.options.getString("type");

    if (type === "tutorial") {
      return await interaction.followUp({
        content: "📚 **Tutorial**\n1. Create a new Excel file with two or more sheets: `Teacher` and your `Class` name up next to it.\n2. In the `Teacher` sheet, list teacher names in column A and their classes in columns B to Z.\n3. In each `Class` sheet, list student names in column A and their class in column B.\n4. Then restart the command /setup without type. Finally upload the file then."
      });
    }


    if (userId !== ownerId) {
      return await interaction.followUp({
        content: "⛔ Only the server owner can run this command.",
        ephemeral: true
      });
    }
    //check if school exists
    const existingClass = await Class.findOne({ schoolID: interaction.guild.id });
    const existingSchool = await School.findOne({ schoolID: interaction.guild.id });
    if (existingClass || existingSchool) {
      return await interaction.followUp({
        content: "⛔ School system is already set up. Please use /reset to start over.",
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel("verify_channel");

    await interaction.followUp({
      content:
        "📥 Please upload the Excel file here.\nFormat required:\n- Sheet `Teacher`: name in column A, classes in B→Z\n- Each sheet = class name, column A = students",
    });

    const collector = interaction.channel.createMessageCollector({
      filter: (msg) => msg.author.id === interaction.user.id && msg.attachments.size > 0,
      max: 1,
      time: 60000
    });

    collector.on("collect", async (msg) => {
      const file = msg.attachments.first();
      if (!file.name.endsWith(".xlsx")) {
        return msg.reply("⚠️ File must be in .xlsx format");      }

      //const filePath = path.join(__dirname, `../../tmp/${Date.now()}.xlsx`);
      const filePath = `/tmp/${Date.now()}.xlsx`;

      const response = await fetch(file.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      await msg.reply("📊 Processing your file, please wait...");
    const guildID= interaction.guild.id
      const { teachers, students } = await parseExcel(filePath, guildID)
      
      const allClasses = [
        ...new Set([
          ...teachers.flatMap((t) => t.classList),
          ...students.map((s) => s.className)
        ])
      ];

      await createClassChannels(interaction.guild, allClasses, students, teachers);

      const excelPath = await exportLoginExcel({ teachers, students });

      const verify = await channel.send({
        content: `🎓 Welcome!\nPlease verify yourself to join your class.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("verify_me")
              .setLabel("✅ Verify me!")
              .setStyle(ButtonStyle.Success)
          )
        ]
      });

      await School.create({
        schoolID: interaction.guild.id,
        verID: verify.channelId,
        vermsgID: verify.id
      });

      await interaction.member.send({
        content: "📄 Here is the login information:",
        files: [excelPath]
      });

      await interaction.followUp({
        content: "✅ Setup complete and login sheet sent to your DMs.",
        ephemeral: true
      });
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: "⌛ Time expired. Please run /setup again to continue.",
          flags: 1 << 6
        });
      }
    });
    } catch(err){
        console.log(err)
    }
}
};

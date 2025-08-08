const {
  ApplicationCommandOptionType,
  PermissionsBitField
} = require("discord.js");
const Student = require("../../models/Student");
const Teacher = require("../../models/Teacher");

module.exports = {
  name: "whois",
  description: "🔎 View information about a student or teacher by name.",
  options: [
    {
      name: "name",
      description: "The full name of the student or teacher to search.",
      type: ApplicationCommandOptionType.String,
      required: false
    },
    {
        name: "tag",
        description: "The Discord tag of the student or teacher to search.",
        type: ApplicationCommandOptionType.Mentionable,
        required: false
    }
  ],

  callback: async (client, interaction) => {
    const schoolID = interaction.guild.id;
    const name = interaction.options.getString("name");
    const tag = interaction.options.getUser("tag")

    let user = null;
    let role = null;

    // Tìm theo name
    if (name){
        user = await Student.findOne({ name, schoolID });
        if (user) role = "Student";
        else {
        user = await Teacher.findOne({ name, schoolID });
        if (user) role = "Teacher";
    }
    }
    if (tag) {
        user = await Student.findOne({ authId: tag.id, schoolID });
        if (user) role = "Student";
        else {
          user = await Teacher.findOne({ authId: tag.id, schoolID });
          if (user) role = "Teacher";
        }
    }

    if (!user) {
      return interaction.reply({
        content: "❌ No user found with that name.",
        ephemeral: true
      });
    }

    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    const embedFields = [
      { name: "Name", value: user.name || "Unknown", inline: true },
      { name: "Role", value: role, inline: true },
      { name: "Status", value: user.authId !== "0" ? "✅ Logged In" : "❌ Logged Out", inline: true }
    ];

    // Nếu đã đăng nhập → hiển thị Discord Tag & ID
    if (user.authId !== "0") {
      try {
        const discordUser = await client.users.fetch(user.authId);
        embedFields.push({ name: "Discord Tag", value: discordUser.tag, inline: true });
        embedFields.push({ name: "Discord ID", value: discordUser.id, inline: true });
      } catch (err) {
        embedFields.push({ name: "Discord", value: `⚠️ Unknown (Left server or can't fetch)` });
      }
    }

    // Thêm thông tin lớp
    if (role === "Student") {
      embedFields.push({
        name: "Class",
        value: user.className || "Unknown",
        inline: true
      });
    } else if (role === "Teacher") {
      const classLists = user.classList?.join(", ") || "Unknown";
      embedFields.push({
        name: "Classes",
        value: classLists,
        inline: true
      });
    }

    await interaction.reply({
      embeds: [
        {
          title: `📄 User Info`,
          fields: embedFields,
          color: role === "Teacher" ? 0x3498db : 0x2ecc71
        }
      ],
      ephemeral: true
    });
  }
};

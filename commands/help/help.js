const getLocalCommands = require('../../utils/getLocalCommands');
const { Client, Interaction, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Give you a help',
  options: [
    {
      name: 'command',
      description: 'The command you want to see help for',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    const localCommands = getLocalCommands();
    const cmdName = interaction.options.get('command');

    if (cmdName) {
      const commandName = cmdName.value.toLowerCase();
      const command = localCommands.find((cmd) => cmd.name.toLowerCase() === commandName);

      if (!command || command.devOnly === true) {
        await interaction.reply(`❌ Command \`${commandName}\` not found.`);
        return;
      }

      const usage = command.usage ? `\n**Usage:** \`${command.usage}\`` : '';
      await interaction.reply(`**/${command.name}** – ${command.description || 'No description'}${usage}`);
      return;
    }

    // 🔽 Tạo object chứa các category và command trong đó
    const categories = {};
    localCommands.forEach((command) => {
      if (command.devOnly === true) return;
      const category = command.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(`**/${command.name}**`);
    });

    // 🔽 Emojis cho các thư mục
    const categoryEmojis = {
        help: '❓',
        general: '📌',
        settings: '🛠️',
        setup: '⚙️',
        account: '😀',
        dev: '👨‍💻',
    };

    // 🔽 Tạo embed fancy
    const embed = new EmbedBuilder()
      .setTitle('📖 Teleport Bot Command List')
      .setColor('#2ecc71')
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({
        text: 'Use /help [command] to get detailed usage.',
        iconURL: 'https://i.imgur.com/Dqz0j0F.png',
      });

    Object.entries(categories).forEach(([category, commands]) => {
      const emoji = categoryEmojis[category.toLowerCase()] || '📂';
      embed.addFields({
        name: `${emoji} ${category}`,
        value: commands.map((cmd) => `• ${cmd}`).join('\n'),
        inline: false,
      });
    });

    embed.addFields({
      name: '🔗 Need more help?',
      value: '[📘 Support Server](https://tphat77923.github.io/teleport/endercity.html) | [➕ Invite me](https://discord.com/oauth2/authorize?client_id=1390542494168518686)',
    });

    await interaction.reply({ embeds: [embed] });
  },
};

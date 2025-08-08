const { EmbedBuilder } = require('discord.js')
const config = require('../../config.json');

module.exports = async (client, guild) => {
    const Embed = new EmbedBuilder()
        .setTitle("Thank you for adding me to your server!")
        .setDescription("To get started, please use the `/setup` command to configure the school settings.")
        .addFields([{ name: "Need help?", value: "If you need assistance, feel free to reach out to the support team or check the documentation." }])
    console.log(`Guild ${guild.name} has been added to the client.`);
    const channelId = config.logID
    const channel = client.channels.cache.get(channelId)

    if (!channel) return;
    const embed = new EmbedBuilder()
        .setTitle('Guild Joined')
        .setDescription(`I have joined a new guild called ${guild.name} with ${guild.memberCount} members!`)
        .setColor('#90EE90')
        .setTimestamp()
    channel.send({ embeds: [embed] })
};
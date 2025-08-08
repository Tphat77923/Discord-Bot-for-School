const { ActivityType } = require('discord.js');

module.exports = (client) => {

let status = [
  {
    name: "with friends! /help",
    type: ActivityType.Playing,
  },
  {
    name: "for more fun in school! /help",
    type: ActivityType.Watching,
  },
  {
    name: "for more hard questions! /help",
    type: ActivityType.Watching,
  },
  {
    name: "for more suggestions! /help",
    type: ActivityType.Watching,
  }
]

    console.log(`✔ ${client.user.tag} is online.`);
    setInterval(() => {
      let random = Math.floor(Math.random() * status.length);
      client.user.setActivity(status[random]);
    }, 10000);
};
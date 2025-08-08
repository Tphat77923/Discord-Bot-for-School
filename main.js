const  { Client, Events, GatewayIntentBits, IntentsBitField } = require("discord.js")
const config = require("./config.json")
const express = require("express")
const eventHandler = require('./handlers/eventHandler')
const { default: mongoose } = require("mongoose");

require('dotenv').config()
const dbkey = process.env.DBKEY
const token = process.env.TOKEN;


const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildPresences,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.GuildEmojisAndStickers,
  ] 
});

(async ( ) => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(dbkey);
    console.log('✔ Connected to DB.')

    eventHandler(client);
    client.login(token);

    const app = express();
    const port = 20380;
    app.get('/', (req, res) => res.send('200 OK'));
    app.listen(port, () => console.log(`Started the status web.`)
    );
    
  } catch (error) {
    console.log(`There was an error connecting to the database or run bot: ${error}`);
  }
  
}) ( );
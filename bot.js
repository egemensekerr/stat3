const express = require("express");
const app = express();
const http = require("http");

const pingDiscord = require("discord.js");
const client = new pingDiscord.Client();
const chalk = require("chalk");
const fs = require("fs");
const db = require("quick.db");
const moment = require("moment");
require("./util/eventLoader")(client);

client.ayarlar = {
  durum: "online", //online , idle , dnd
  prefix: "-",
  sahip: "352036341153923072",
  renk: "36393F",
  token: "ODEyMzk2MzgzMjE4MDQwOTMz.YDAJFw.MnMxbqYjZhy0xdyQHuZJz1mAH7"
};

client.ayar = db;
client.on("ready", async () => {
  client.appInfo = await client.fetchApplication();
  setInterval(async () => {
    client.appInfo = await client.fetchApplication();
  }, 60000);
  require("./index.js")(client);
  console.log("Konrol paneli aktif edildi! DarkCode Yaptı Sen Kullandın Çakal");
});

const kurulum = message => {
  console.log(`${message} yüklendi.`);
};
//DarkCode
client.commands = new pingDiscord.Collection();
client.aliases = new pingDiscord.Collection();
fs.readdir("./komutlar/", (err, files) => {
  if (err) console.error(err);
  kurulum(`${files.length} komut kurulacak.`);
//DarkCode
  files.forEach(f => {
    let pingKodları = require(`./komutlar/${f}`);

    kurulum(`Kurulan komut ~ ${pingKodları.help.name}.`);
    client.commands.set(pingKodları.help.name, pingKodları);

    client.commands.set(pingKodları.help.name, pingKodları);
    pingKodları.conf.aliases.forEach(alias => {
      client.aliases.set(alias, pingKodları.help.name);
    });
  });
});
//DarkCode
client.reload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let pingDosya = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      client.commands.set(command, pingDosya);
      pingDosya.conf.aliases.forEach(alias => {
        client.aliases.set(alias, pingDosya.help.name);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
//DarkCode
client.load = command => {
  return new Promise((resolve, reject) => {
    try {
      let cmd = require(`./komutlar/${command}`);
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
//DarkCode
client.unload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
//DarkCode
client.elevation = message => {
  let permlvl = 0;
  if (message.member.hasPermission("MANAGE_CHANNELS")) permlvl = 1;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === client.ayarlar.sahip) permlvl = 4;
  return permlvl;
};

setInterval(() => {
  client.guilds.forEach(guild => {
    const totalm = db.fetch(`üyekanal_${guild.id}`);
    const memberss = db.fetch(`kulkanal_${guild.id}`);
    const botscont = db.fetch(`neblmkanal_${guild.id}`);
    // GEREKLİ YERLER
    const serverStats = {
      guildID: guild.id,
      totalUsersID: totalm,
      memberCountID: memberss,
      botCountID: botscont
    };
//DarkCode
    const voiceChannels = guild.channels.filter(c => c.type === "voice");
    let count = 0;

    for (const [id, voiceChannel] of voiceChannels)
      count += voiceChannel.members.size;

    if (db.fetch(`supanel_${guild.id}`) == "aktif") {
      if (guild.id !== serverStats.guildID) return;
      if (!guild.channels.get(totalm))
        return console.log("Hata: Kanal ismi değişmiyor.");
      let aktif = guild.members.filter(m => m.presence.status !== "offline")
        .size;
      let rekoronline = db.fetch(`rekoronlineS_${guild.id}`);
      guild.channels
        .get(serverStats.totalUsersID)
        .setName(
          `${client.ayar.fetch(`üyekanalN_${guild.id}`) || "Toplam Üye •"} ${
            guild.memberCount
          } `
        );
      guild.channels
        .get(db.fetch(`rekoronlineK_${guild.id}`))
        .setName(
          `${client.ayar.fetch(`rekoronlineN_${guild.id}`) ||
            "Rekor Online •"} ${db.fetch(`rekoronlineS_${guild.id}`)}`
        );
      guild.channels
        .get(serverStats.memberCountID)
        .setName(
          `${client.ayar.fetch(`kulkanalN_${guild.id}`) || "Çevrimiçi Üye •"} ${
            guild.members.filter(m => m.presence.status !== "offline").size
          }`
        );
      guild.channels
        .get(serverStats.botCountID)
        .setName(
          `${client.ayar.fetch(`neblmkanalN_${guild.id}`) || "Botlar •"} ${
            guild.members.filter(m => m.user.bot).size
          }`
        );
      guild.channels
        .get(db.fetch(`sesliK_${guild.id}`))
        .setName(
          `${client.ayar.fetch(`sesliN_${guild.id}`) || "Sesli •"} ${count}`
        );

      if (aktif > rekoronline) {
        db.set(`rekoronlineS_${guild.id}`, aktif);
        guild.channels
          .get(serverStats.onlineUsers)
          .setName(
            `${client.ayar.fetch(`rekoronlineN_${guild.id}`) ||
              "Rekor Online •"} ${
              guild.members.filter(m => m.presence.status !== "offline").size
            }`
          );
      }
    } else {
      return;
    }
  });
}, 3000);

client.login(client.ayarlar.token);

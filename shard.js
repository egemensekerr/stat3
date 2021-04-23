const Discord = require("discord.js");
const bot = new Discord.Client();
const ayarlar = require("./bot.js");
const express = require("express");
const app = express();
const http = require("http");
const shard = new Discord.ShardingManager("./bot.js", {
  totalShards: 2,
  token: ayarlar.token
});
shard.spawn();

setTimeout(() => {
  shard.broadcastEval("process.exit()");
}, 21600000);

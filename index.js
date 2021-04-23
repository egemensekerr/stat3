const url = require("url");
const path = require("path");

const Discord = require("discord.js");

var express = require('express');
var app = express();

const passport = require("passport");
const session = require("express-session");
const LevelStore = require("level-session-store")(session);
const Strategy = require("passport-discord").Strategy;

const helmet = require("helmet");

const md = require("marked");
const db = require('quick.db');

module.exports = (client) => {
  
  const bilgiler = {
    oauthSecret: "CdsHxt7Vv6ilfw600rrJunmD78HVsYSV",
    callbackURL: `https://paneldash.glitch.me/callback`,
    domain: `https://paneldash.glitch.me/`
  };
  
  console.log('BAŞARILI')
  
  const dataDir = path.resolve(`${process.cwd()}${path.sep}webpanel`);

  const templateDir = path.resolve(`${dataDir}${path.sep}html${path.sep}`);

  app.use("/css", express.static(path.resolve(`${dataDir}${path.sep}css`)));
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  passport.use(new Strategy({
    clientID: client.user.id,
    clientSecret: bilgiler.oauthSecret,
    callbackURL: bilgiler.callbackURL,
    scope: ["identify", "guilds" , "email"]
  },
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
  }));

  app.use(session({
    secret: 'Heratix',
    resave: false,
    saveUninitialized: false,
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(helmet());

  app.locals.domain = bilgiler.domain;
  
  app.engine("html", require("ejs").renderFile);
  app.set("view engine", "html");

  var bodyParser = require("body-parser");
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  })); 
  
  function girisGerekli(req, res, next) {
    if (req.isAuthenticated()) return next();
    req.session.backURL = req.url;
    res.redirect("/giris");
  }
  
  const yukle = (res, req, template, data = {}) => {
    const baseData = {
      bot: client,
      path: req.path,
      user: req.isAuthenticated() ? req.user : null
    };
    res.render(path.resolve(`${templateDir}${path.sep}${template}`), Object.assign(baseData, data));
  };
  
  let dil = ""
  
  app.get("/", (req, res) => {
res.redirect("/anasayfa");
  });
 

  app.get("/giris", (req, res, next) => {
    if (req.session.backURL) {
      req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
      const parsed = url.parse(req.headers.referer);
      if (parsed.hostname === app.locals.domain) {
        req.session.backURL = parsed.path;
      }
    } else {
      req.session.backURL = "";
    }
    next();
    

  },
  passport.authenticate("discord"));

  app.get("/giris", (req, res, next) => {
    if (req.session.backURL) {
      req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
      const parsed = url.parse(req.headers.referer);
      if (parsed.hostname === app.locals.domain) {
        req.session.backURL = parsed.path;
      }
    } else {
      req.session.backURL = "/en";
    }
    next();
  },
  passport.authenticate("discord"));
  
  app.get("/autherror", (req, res) => {
    res.json({"hata":"Bir hata sonucunda Discord'da bağlanamadım! Lütfen tekrar deneyiniz."})
  });
  
  app.get("/callback", passport.authenticate("discord", { failureRedirect: "/autherror" }), async (req, res) => {
    if (client.ayarlar.sahip.includes(req.user.id)) {
      req.session.isAdmin = true;
    } else {
      req.session.isAdmin = false;
    }
    if (req.session.backURL) {
      const url = req.session.backURL;
      req.session.backURL = null;
      res.redirect(url);

    } else {
      res.redirect(`anasayfa`);
    }
});
  
  app.all("*", async function(req, res, next) {
    
      if(req.path.startsWith("/yonet")) {
        if(!req.query.sunucu) {
          var hata = "Geçersiz sayfa!";
          return yukle(res, req, "404.ejs", {hata})
          
      } 
        var hata = "Geçersiz sayfa!";
        if (isNaN(req.query.sunucu)) return yukle(res, req, "404.ejs", {hata})
        next()
        
      } else {
        next()
      }    
  })
  
  app.get("/cikis", function(req, res) {
    req.session.destroy(() => {
      req.logout();
      res.redirect("/anasayfa");
    });
  });
  


  app.get("/anasayfa", (req, res) => {
    
    yukle(res, req, "anasayfa.ejs");
  });
  
  app.get("/panel", girisGerekli, (req, res) => {
    const perms = Discord.Permissions;
    yukle(res, req, "panel.ejs", {perms});
  });
  
  app.get("/yonet", girisGerekli, async(req, res) => {
      const guild = client.guilds.get(req.query.sunucu);
      const sunucu = client.guilds.get(req.query.sunucu);
      if (!guild) return res.json({"hata":"Bot "+req.query.sunucu+" ID adresine sahip bir sunucuda bulunmuyor."});
      const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
      if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Yönet iznin bulunmuyor. Bu yüzden bu sayfaya erişim sağlayamazsın."});
      yukle(res, req, "ayarlar.ejs", {sunucu, guild});
  });
  
  app.post("/yonet", girisGerekli, async(req, res) => {
const guild = client.guilds.get(req.query.sunucu);
      const sunucu = client.guilds.get(req.query.sunucu);
     let ayar = req.body      
    if (!guild) return res.json({"hata":"Bot "+req.query.sunucu+" ID adresine sahip bir sunucuda bulunmuyor."});
    const isManaged = guild && !!guild.member(req.user.id) ? guild.member(req.user.id).permissions.has("MANAGE_GUILD") : false;
    if (!isManaged && !req.session.isAdmin) return res.json({"hata":"Bu sunucuda Sunucuyu Yönet iznin bulunmuyor. Bu yüzden bu sayfaya erişim sağlayamazsın."});
     if (!db.has(`supanel_${guild.id}`)) {
    const voiceChannels = guild.channels.filter(c => c.type === 'voice');
    let count = 0;
  
    for (const [id, voiceChannel] of voiceChannels) count += voiceChannel.members.size;
  
    let kategori = await guild.createChannel("Sunucu İstatistik", "category", [{
      id: guild.id,
      deny: ["CONNECT"]
    }])
    guild.createChannel(`Toplam Üye • ${guild.memberCount}`, "voice").then(üye => {
    guild.createChannel(`Çevrimiçi Üye • ${guild.members.filter(m => m.presence.status !== "offline").size}`, 'voice').then(aktif => {
    guild.createChannel(`Botlar • ${guild.members.filter(m => m.user.bot).size}`, 'voice').then(neblm => {
    guild.createChannel(`Rekor Online • ${guild.members.filter(m => m.presence.status !== "offline").size}`, 'voice').then(kul => {
    guild.createChannel(`Sesli • (${count})`, 'voice').then(kul22 => {

    üye.overwritePermissions(guild.id, {
    'CONNECT': false
    })
      
    aktif.overwritePermissions(guild.id,{
    'CONNECT': false
    })
      
    kul.overwritePermissions(guild.id,{
    'CONNECT': false
    })
      
      kul22.overwritePermissions(guild.id,{
    'CONNECT': false
    })
      
      
    neblm.overwritePermissions(guild.id,{
    'CONNECT': false
    })

      üye.setParent(kategori.id)  
    kul.setParent(kategori.id)  
    neblm.setParent(kategori.id)
         kul22.setParent(kategori.id)
 
          aktif.setParent(kategori.id)

    
    db.set(`sesliK_${guild.id}`, kul22.id)
    db.set(`üyekanal_${guild.id}`, üye.id)
    db.set(`rekoronlineK_${guild.id}`, kul.id)
    db.set(`rekoronlineS_${guild.id}`, guild.members.filter(m => m.presence.status !== "offline").size)
    db.set(`kulkanal_${guild.id}`, aktif.id)
    db.set(`neblmkanal_${guild.id}`, neblm.id)
    db.set(`supanel_${guild.id}`, "aktif")  
    db.set(`suKategori_${guild.id}`, kategori.id)

    res.redirect("/yonet?sunucu="+req.query.sunucu);
  })
  })
      })
        })
  })
  
     } else {
       
       if (ayar["uye"]) {
          client.ayar.set(`üyekanalN_${guild.id}`, ayar["uye"])     
       }
       if (ayar["sesli"]) {
          client.ayar.set(`sesliN_${guild.id}`, ayar["sesli"])     
       }
       if (ayar["rekor"]) {
          client.ayar.set(`rekoronlineN_${guild.id}`, ayar["rekor"])     
       }
       if (ayar["neblm"]) {
          client.ayar.set(`neblmkanalN_${guild.id}`, ayar["neblm"])     
       }
       
       if (ayar["cevrim"]) {
          client.ayar.set(`kulkanalN_${guild.id}`, ayar["cevrim"])     
       }
       
       res.redirect("/yonet?sunucu="+req.query.sunucu);
     }
  });
  

  app.get("/ekle", (req, res) => {
    res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8`);
  });

  app.listen(3000);
};
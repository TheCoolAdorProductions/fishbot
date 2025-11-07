// 🐟 FISH BOT v4.0-CLEAN
// Made simple, stable, and readable 🎣

const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ✅ CONFIG
const TOKEN = process.env.TOKEN;
const OWNER_ID = process.env.OWNER_ID;
const DEFAULT_PREFIX = "f!";

if (!TOKEN) {
    console.error("❌ Missing TOKEN in .env file!");
    process.exit(1);
}

// ✅ CLIENT
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ✅ FOLDERS
const dataDir = './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync('./images')) fs.mkdirSync('./images');

// ✅ JSON LOAD/SAVE
function loadData(name, def = {}) {
    try { return JSON.parse(fs.readFileSync(`${dataDir}/${name}`, 'utf8')); }
    catch { return def; }
}
function saveData(name, data) {
    fs.writeFileSync(`${dataDir}/${name}`, JSON.stringify(data, null, 2));
}

let users = loadData('users.json', {});
let servers = loadData('servers.json', {});
let activeFish = loadData('activeFish.json', {});

// ✅ FISH TYPES
const FISH_TYPES = [
    { name: "Red Fish", rarity: "common", value: 10 },
    { name: "Blue Fish", rarity: "uncommon", value: 15 },
    { name: "Golden Fish", rarity: "rare", value: 25 },
    { name: "Ghost Fish", rarity: "epic", value: 40 },
    { name: "Crown Fish", rarity: "legendary", value: 75 }
];

// ✅ EMOJIS
const FISH_EMOJI = '🐟';
const DANCING_FISH = '<a:dancingfish:1436036204150788259>';

// ✅ COMMANDS
const commands = [
    { name: 'help', description: 'Show all commands' },
    { name: 'profile', description: 'Show your fish stats' },
    { name: 'shop', description: 'View the fish shop' },
    { name: 'buy', description: 'Buy from the shop', options: [{ name: 'item', type: 3, description: 'Item name', required: true }] },
    { name: 'inventory', description: 'View your inventory' },
    { name: 'leaderboard', description: 'Top fish catchers' },
    { name: 'setup', description: 'Set a fish channel', options: [{ name: 'channel', type: 7, description: 'Select channel', required: true }] },
    { name: 'stats', description: 'View bot stats' },
    { name: 'test', description: 'Owner only test command' }
];

// ✅ UTILITIES
function getFishImages() {
    const files = fs.readdirSync('./images');
    return files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
}

function getUser(id) {
    if (!users[id]) {
        users[id] = { coins: 100, xp: 0, level: 1, total: 0, fishCollection: {}, inventory: [] };
        saveData('users.json', users);
    }
    return users[id];
}

function getServer(id) {
    if (!servers[id]) {
        servers[id] = { channel: null, enabled: false, prefix: DEFAULT_PREFIX };
        saveData('servers.json', servers);
    }
    return servers[id];
}

// ✅ SPAWN FISH
function spawnFish(guildId, channelId) {
    const fishImages = getFishImages();
    if (!fishImages.length) return console.warn("⚠️ No images found in ./images!");

    const id = `${guildId}_${Date.now()}`;
    const type = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
    const image = fishImages[Math.floor(Math.random() * fishImages.length)];

    activeFish[id] = { id, guildId, channelId, type, image, spawnTime: Date.now(), caught: false };
    saveData('activeFish.json', activeFish);

    setTimeout(() => {
        if (activeFish[id] && !activeFish[id].caught) {
            delete activeFish[id];
            saveData('activeFish.json', activeFish);
        }
    }, 300000);
    return activeFish[id];
}

// ✅ SEND FISH
async function sendFish(channel, fish) {
    const embed = new EmbedBuilder()
        .setTitle(`${DANCING_FISH} ${fish.type.name} appeared!`)
        .setDescription('Type **fish** to catch it!')
        .setColor(0x4FC3F7)
        .setImage(`attachment://${fish.image}`)
        .addFields(
            { name: 'Rarity', value: fish.type.rarity, inline: true },
            { name: 'Value', value: `${fish.type.value} coins`, inline: true }
        );

    await channel.send({ embeds: [embed], files: [`./images/${fish.image}`] });
}

// ✅ HANDLE FISH CATCH
client.on('messageCreate', async msg => {
    if (msg.author.bot || !msg.guild) return;
    const content = msg.content.toLowerCase().trim();

    if (content !== 'fish') return;

    const found = Object.values(activeFish).find(f => f.channelId === msg.channel.id && !f.caught);
    if (!found) return msg.reply('No fish here yet! 🐠');

    found.caught = true;
    found.caughtBy = msg.author.id;
    saveData('activeFish.json', activeFish);

    const user = getUser(msg.author.id);
    user.coins += found.type.value;
    user.total++;
    user.xp += Math.floor(Math.random() * 10) + 5;
    if (user.xp >= user.level * 100) { user.level++; user.xp = 0; }

    user.fishCollection[found.type.name] = (user.fishCollection[found.type.name] || 0) + 1;
    saveData('users.json', users);

    const embed = new EmbedBuilder()
        .setTitle('🎣 You caught a fish!')
        .setDescription(`${msg.author.username} caught ${FISH_EMOJI} **${found.type.name}**!`)
        .setColor(0x00FF00)
        .setImage(`attachment://${found.image}`)
        .addFields(
            { name: 'Coins Earned', value: `${found.type.value}`, inline: true },
            { name: 'Level', value: `${user.level}`, inline: true },
            { name: 'Total Fish', value: `${user.total}`, inline: true }
        );

    await msg.reply({ embeds: [embed], files: [`./images/${found.image}`] });
});

// ✅ SLASH COMMAND HANDLER
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    const cmd = i.commandName;
    const user = getUser(i.user.id);
    const server = getServer(i.guild.id);

    switch (cmd) {
        case 'help':
            return i.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🐟 Fish Bot Commands')
                    .setDescription('Type "fish" to catch appearing fish!')
                    .addFields(
                        { name: '🎣 Gameplay', value: '/profile, /inventory, /leaderboard' },
                        { name: '🛍️ Shop', value: '/shop, /buy' },
                        { name: '⚙️ Admin', value: '/setup, /stats' })
                    .setColor(0x00AEEF)
                ]
            });
        case 'profile':
            return i.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`${i.user.username}'s Profile`)
                    .addFields(
                        { name: 'Level', value: user.level.toString(), inline: true },
                        { name: 'XP', value: `${user.xp}/${user.level * 100}`, inline: true },
                        { name: 'Coins', value: user.coins.toString(), inline: true },
                        { name: 'Total Fish', value: user.total.toString(), inline: true })
                    .setColor(0x4FC3F7)]
            });
        case 'shop':
            return i.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎣 Fish Shop')
                    .addFields(
                        { name: '🎣 Golden Rod', value: '100 coins' },
                        { name: '🏠 Fish Tank', value: '200 coins' },
                        { name: '👑 Fish Crown', value: '500 coins' })
                    .setFooter({ text: 'Use /buy [item]' })
                    .setColor(0xFFD700)]
            });
        case 'buy':
            const item = i.options.getString('item');
            const prices = { "golden rod": 100, "fish tank": 200, "fish crown": 500 };
            if (!prices[item.toLowerCase()]) return i.reply({ content: 'Item not found.', ephemeral: true });
            if (user.coins < prices[item.toLowerCase()]) return i.reply({ content: 'Not enough coins.', ephemeral: true });
            user.coins -= prices[item.toLowerCase()];
            user.inventory.push(item);
            saveData('users.json', users);
            return i.reply(`✅ You bought **${item}** for ${prices[item.toLowerCase()]} coins!`);
        case 'inventory':
            if (!user.inventory.length) return i.reply('🎒 Your inventory is empty.');
            const counts = {};
            user.inventory.forEach(it => counts[it] = (counts[it] || 0) + 1);
            return i.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎒 Inventory')
                    .setDescription(Object.entries(counts).map(([k, v]) => `**${k}** ×${v}`).join('\n'))
                    .setColor(0x964B00)]
            });
        case 'leaderboard':
            const sorted = Object.entries(users).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
            const embed = new EmbedBuilder().setTitle('🏆 Top Fish Catchers').setColor(0xFFD700);
            for (const [id, data] of sorted) {
                const u = await client.users.fetch(id).catch(() => null);
                if (u) embed.addFields({ name: `${u.username}`, value: `🐟 ${data.total} | Lvl ${data.level}` });
            }
            return i.reply({ embeds: [embed] });
        case 'setup':
            if (!i.member.permissions.has(PermissionFlagsBits.Administrator))
                return i.reply({ content: 'Admin only.', ephemeral: true });
            const channel = i.options.getChannel('channel');
            server.channel = channel.id;
            server.enabled = true;
            saveData('servers.json', servers);
            return i.reply(`✅ Fish will spawn in ${channel}!`);
        case 'stats':
            const totalFish = Object.values(users).reduce((a, b) => a + b.total, 0);
            return i.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('📈 Fish Bot Stats')
                    .addFields(
                        { name: 'Total Fish', value: totalFish.toString(), inline: true },
                        { name: 'Users', value: Object.keys(users).length.toString(), inline: true },
                        { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true })
                    .setColor(0x4FC3F7)]
            });
        case 'test':
            if (i.user.id !== OWNER_ID) return i.reply({ content: 'Owner only.', ephemeral: true });
            return i.reply('✅ All systems running fine!');
    }
});

// ✅ BOT READY
client.once('ready', async () => {
    console.log(`🐟 Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered.');

    client.user.setActivity('Type "fish" to catch!', { type: ActivityType.Watching });

    // Spawn loop every 3 minutes
    setInterval(() => {
        Object.values(servers).forEach(s => {
            if (!s.enabled || !s.channel) return;
            const ch = client.channels.cache.get(s.channel);
            if (ch && Math.random() < 0.8) {
                const fish = spawnFish(ch.guild.id, ch.id);
                if (fish) sendFish(ch, fish);
            }
        });
    }, 180000);
});

// ✅ START
client.login(TOKEN);
console.log('🎣 Fish Bot starting...');

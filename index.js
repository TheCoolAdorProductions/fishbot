const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Bot configuration
const config = {
    prefix: '!',
    token: process.env.TOKEN,
    ownerId: process.env.OWNER_ID || 'YOUR_USER_ID_HERE'
};

if (!config.token) {
    console.error('❌ ERROR: TOKEN not found in environment variables!');
    process.exit(1);
}

// Initialize client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Slash commands collection
client.commands = new Collection();

// Define slash commands
const slashCommands = [
    {
        name: 'help',
        description: 'Show all available commands'
    },
    {
        name: 'crab',
        description: 'Get a random crab image'
    },
    {
        name: 'profile',
        description: 'Check your crab profile',
        options: [
            {
                name: 'user',
                description: 'The user to check profile of',
                type: 6, // USER type
                required: false
            }
        ]
    },
    {
        name: 'shop',
        description: 'Browse the crab shop'
    },
    {
        name: 'buy',
        description: 'Buy an item from the shop',
        options: [
            {
                name: 'item',
                description: 'The item you want to buy',
                type: 3, // STRING type
                required: true,
                choices: [
                    { name: '🦀 Rare Crab', value: 'rare crab' },
                    { name: '🏠 Crab House', value: 'crab house' },
                    { name: '🎣 Golden Net', value: 'golden net' },
                    { name: '👑 Crab Crown', value: 'crab crown' },
                    { name: '💎 Crystal Crab', value: 'crystal crab' }
                ]
            }
        ]
    },
    {
        name: 'inventory',
        description: 'Check your inventory'
    },
    {
        name: 'leaderboard',
        description: 'Check the crab catching leaderboard'
    },
    {
        name: 'setup',
        description: 'Set up crab bot in this server',
        options: [
            {
                name: 'channel',
                description: 'Channel where crabs will appear',
                type: 7, // CHANNEL type
                required: true
            }
        ]
    },
    {
        name: 'prefix',
        description: 'Change the bot prefix for this server',
        options: [
            {
                name: 'new_prefix',
                description: 'The new prefix (1-3 characters)',
                type: 3, // STRING type
                required: true
            }
        ]
    },
    {
        name: 'ping',
        description: 'Check the bot\'s latency'
    },
    {
        name: 'about',
        description: 'Learn about Crab Bot'
    }
];

// Register commands to collection
slashCommands.forEach(command => {
    client.commands.set(command.name, command);
});

// Data storage and other existing code remains the same...
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

function loadJSON(filename, defaultData = {}) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    } catch {
        return defaultData;
    }
}

function saveJSON(filename, data) {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

let guildData = loadJSON('guilds.json', {});
let userData = loadJSON('users.json', {});
let serverConfigs = loadJSON('server_configs.json', {});

const CRAB_IMAGES = [
    "https://media.istockphoto.com/id/544453032/photo/crab-close-up-cuba.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Sally_Lightfoot_Crab_2019.jpg/1200px-Sally_Lightfoot_Crab_2019.jpg",
    "https://plus.unsplash.com/premium_photo-1667864262393-b5319164c532",
    "https://images.unsplash.com/photo-1580841129862-bc2a2d113c45",
    "https://images.unsplash.com/photo-1527681192512-bca34fd580bb"
];

const APPEARANCE_MESSAGES = [
    "🦀 A crab just scuttled into the server! Click the button to catch it!",
    "🦀 Look! A crab appeared! Quick, catch it!",
    "🦀 Crab alert! A crab has been spotted!",
    "🦀 Pinch, pinch! A crab is here! Catch it before it runs away!",
    "🦀 Sideways walking friend appeared! Catch it!"
];

const activeCrabs = new Map();

function spawnCrab(guildId, channelId) {
    const crabId = `crab_${guildId}_${Date.now()}`;
    const crab = {
        id: crabId,
        guildId,
        channelId,
        spawnTime: Date.now(),
        caught: false,
        value: Math.floor(Math.random() * 15) + 5
    };
    
    activeCrabs.set(crabId, crab);
    
    setTimeout(() => {
        if (activeCrabs.has(crabId) && !activeCrabs.get(crabId).caught) {
            activeCrabs.delete(crabId);
        }
    }, 5 * 60 * 1000);
    
    return crab;
}

function getUserData(userId) {
    const id = userId.toString();
    if (!userData[id]) {
        userData[id] = {
            crabs: 0,
            coins: 0,
            level: 1,
            xp: 0,
            inventory: [],
            totalCaught: 0
        };
        saveJSON('users.json', userData);
    }
    return userData[id];
}

function saveUserData(userId, data) {
    userData[userId.toString()] = data;
    saveJSON('users.json', userData);
}

function addCatch(userId, coins = 0, xp = 0) {
    const user = getUserData(userId);
    user.crabs++;
    user.totalCaught++;
    user.coins += coins;
    user.xp += xp;
    
    const xpNeeded = user.level * 100;
    if (user.xp >= xpNeeded) {
        user.level++;
        user.xp = 0;
        saveUserData(userId, user);
        return { user, leveledUp: true };
    }
    
    saveUserData(userId, user);
    return { user, leveledUp: false };
}

function getServerConfig(guildId) {
    const id = guildId.toString();
    if (!serverConfigs[id]) {
        serverConfigs[id] = {
            prefix: '!',
            crabChannel: null,
            enabled: false
        };
        saveJSON('server_configs.json', serverConfigs);
    }
    return serverConfigs[id];
}

function saveServerConfig(guildId, config) {
    serverConfigs[guildId.toString()] = config;
    saveJSON('server_configs.json', serverConfigs);
}

// Register slash commands on startup
client.once('ready', async () => {
    console.log(`🦀 ${client.user.tag} is ready!`);
    console.log(`🦀 Serving ${client.guilds.cache.size} servers`);
    
    // Register slash commands globally
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        console.log('🦀 Registering slash commands...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
    
    client.user.setActivity('for crabs 🦀', { type: ActivityType.Watching });
    
    setInterval(() => {
        for (const [guildId, config] of Object.entries(serverConfigs)) {
            if (config.enabled && config.crabChannel) {
                const channel = client.channels.cache.get(config.crabChannel);
                if (channel && Math.random() < 0.7) {
                    const crab = spawnCrab(guildId, config.crabChannel);
                    sendCrabAppearance(channel, crab);
                }
            }
        }
    }, 10 * 60 * 1000);
});

async function sendCrabAppearance(channel, crab) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 A Crab Appeared!')
        .setDescription(APPEARANCE_MESSAGES[Math.floor(Math.random() * APPEARANCE_MESSAGES.length)])
        .setImage(CRAB_IMAGES[Math.floor(Math.random() * CRAB_IMAGES.length)])
        .setColor(0xFF6B6B)
        .setFooter({ text: 'Click the button below to catch it!' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`catch_${crab.id}`)
                .setLabel('🎣 Catch Crab!')
                .setStyle(ButtonStyle.Success)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
});

async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;
    
    try {
        switch (commandName) {
            case 'help':
                await slashHelp(interaction);
                break;
            case 'crab':
                await slashCrab(interaction);
                break;
            case 'profile':
                await slashProfile(interaction, options);
                break;
            case 'shop':
                await slashShop(interaction);
                break;
            case 'buy':
                await slashBuy(interaction, options);
                break;
            case 'inventory':
                await slashInventory(interaction);
                break;
            case 'leaderboard':
                await slashLeaderboard(interaction);
                break;
            case 'setup':
                await slashSetup(interaction, options);
                break;
            case 'prefix':
                await slashPrefix(interaction, options);
                break;
            case 'ping':
                await slashPing(interaction);
                break;
            case 'about':
                await slashAbout(interaction);
                break;
        }
    } catch (error) {
        console.error('Slash command error:', error);
        await interaction.reply({ content: '🦀 An error occurred while executing that command.', ephemeral: true });
    }
}

// Slash command implementations
async function slashHelp(interaction) {
    const serverConfig = getServerConfig(interaction.guild.id);
    const prefix = serverConfig.prefix;
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Help')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Prefix:** \`${prefix}\``)
        .setColor(0x7289DA)
        .addFields(
            { 
                name: '🔧 Slash Commands', 
                value: 'Use `/` for all commands!\n`/setup`, `/crab`, `/shop`, `/profile`, etc.',
                inline: false 
            },
            { 
                name: '⚙️ Server Commands', 
                value: `\`/setup #channel\` - Set up crab channel (Admin)\n\`/prefix <new>\` - Change prefix (Admin)`,
                inline: true 
            },
            { 
                name: '🎮 Core Commands', 
                value: '`/crab` - Get crab image\n`/profile` - Check profile\n`/shop` - Browse shop\n`/buy` - Buy items\n`/inventory` - Check inventory\n`/leaderboard` - View leaderboard',
                inline: true 
            }
        )
        .setFooter({ text: 'Inspired by cat-bot | AGPL-3.0 License' });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashCrab(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab!')
        .setImage(CRAB_IMAGES[Math.floor(Math.random() * CRAB_IMAGES.length)])
        .setColor(0xFF6B6B)
        .setFooter({ text: 'Use /help for all commands' });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashProfile(interaction, options) {
    const target = options.getUser('user') || interaction.user;
    const user = getUserData(target.id);
    const serverConfig = getServerConfig(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${target.displayName}'s Crab Profile`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Level', value: user.level.toString(), inline: true },
            { name: '⭐ XP', value: `${user.xp}/${user.level * 100}`, inline: true },
            { name: '🦀 Crabs Caught', value: user.totalCaught.toString(), inline: true },
            { name: '🪙 Crab Coins', value: user.coins.toString(), inline: true },
            { name: '🎒 Inventory', value: `${user.inventory.length} items`, inline: true },
            { name: '🔤 Server Prefix', value: serverConfig.prefix, inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function slashShop(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Shop')
        .setDescription('Spend your Crab Coins here!')
        .setColor(0xFFD700)
        .addFields(
            { name: '🦀 Rare Crab', value: 'A special rare crab for your collection - 50 coins', inline: false },
            { name: '🏠 Crab House', value: 'A cozy home for your crabs - 100 coins', inline: false },
            { name: '🎣 Golden Net', value: 'Increases catch chance - 200 coins', inline: false },
            { name: '👑 Crab Crown', value: 'Become the crab king/queen - 500 coins', inline: false },
            { name: '💎 Crystal Crab', value: 'Legendary shiny crab - 1000 coins', inline: false }
        )
        .setFooter({ text: 'Use /buy [item] to purchase items' });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashBuy(interaction, options) {
    const item = options.getString('item');
    const user = getUserData(interaction.user.id);
    
    const prices = {
        'rare crab': 50,
        'crab house': 100,
        'golden net': 200,
        'crab crown': 500,
        'crystal crab': 1000
    };
    
    const price = prices[item];
    
    if (user.coins < price) {
        await interaction.reply({ content: `🦀 You need ${price} Crab Coins to buy that! You have ${user.coins}.`, ephemeral: true });
        return;
    }
    
    user.coins -= price;
    user.inventory.push(item);
    saveUserData(interaction.user.id, user);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Purchase Successful!')
        .setDescription(`You bought **${item}** for ${price} Crab Coins!`)
        .setColor(0x00FF00)
        .setFooter({ text: `You have ${user.coins} Crab Coins remaining` });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashInventory(interaction) {
    const user = getUserData(interaction.user.id);
    
    if (!user.inventory.length) {
        await interaction.reply({ content: '🦀 Your inventory is empty! Catch some crabs and buy items from the shop.', ephemeral: true });
        return;
    }
    
    const itemCounts = {};
    user.inventory.forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎒 Your Inventory')
        .setColor(0x964B00);
    
    for (const [item, count] of Object.entries(itemCounts)) {
        embed.addFields({ 
            name: item.charAt(0).toUpperCase() + item.slice(1), 
            value: `Quantity: ${count}`, 
            inline: true 
        });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashLeaderboard(interaction) {
    const topUsers = Object.entries(userData)
        .filter(([_, data]) => data.totalCaught > 0)
        .sort((a, b) => b[1].totalCaught - a[1].totalCaught)
        .slice(0, 10);
    
    const embed = new EmbedBuilder()
        .setTitle('🏆 Crab Leaderboard')
        .setColor(0xFFD700);
    
    if (!topUsers.length) {
        embed.setDescription('No crabs caught yet! Be the first to catch one!');
    } else {
        for (let i = 0; i < topUsers.length; i++) {
            const [userId, data] = topUsers[i];
            try {
                const user = await client.users.fetch(userId);
                const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
                embed.addFields({
                    name: `${medal} ${user.displayName}`,
                    value: `🦀 ${data.totalCaught} crabs | ⭐ Lvl ${data.level}`,
                    inline: false
                });
            } catch {
                // Skip if user not found
            }
        }
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashSetup(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 You need **Administrator** permissions to set up the bot.', ephemeral: true });
        return;
    }
    
    const channel = options.getChannel('channel');
    const serverConfig = getServerConfig(interaction.guild.id);
    serverConfig.crabChannel = channel.id;
    serverConfig.enabled = true;
    saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Setup Complete!')
        .setDescription(`Crab appearances enabled in ${channel}`)
        .setColor(0x00FF00)
        .addFields(
            { name: 'Crab Frequency', value: 'Every 10 minutes', inline: true },
            { name: 'Server Prefix', value: serverConfig.prefix, inline: true }
        )
        .setFooter({ text: 'Use /help for all commands' });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashPrefix(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 You need **Administrator** permissions to change the prefix.', ephemeral: true });
        return;
    }
    
    const newPrefix = options.getString('new_prefix');
    if (newPrefix.length > 3 || newPrefix.length < 1) {
        await interaction.reply({ content: '🦀 Prefix must be between 1 and 3 characters long.', ephemeral: true });
        return;
    }
    
    const serverConfig = getServerConfig(interaction.guild.id);
    const oldPrefix = serverConfig.prefix;
    serverConfig.prefix = newPrefix;
    saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Prefix Updated!')
        .setDescription(`Server prefix changed from \`${oldPrefix}\` to \`${newPrefix}\``)
        .setColor(0x00FF00)
        .addFields({ name: 'Example', value: `Now use \`${newPrefix}crab\` instead of \`${oldPrefix}crab\`` })
        .setFooter({ text: 'This change only affects this server!' });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashPing(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`Latency: ${Date.now() - interaction.createdTimestamp}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
        .setColor(0x00FF00);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashAbout(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 About Crab Bot')
        .setDescription('A fun Discord bot where crabs randomly appear and users can catch them to earn coins, level up, and buy items from the shop!')
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: '👥 Users', value: Object.keys(userData).length.toString(), inline: true },
            { name: '⚡ Version', value: '2.1.0', inline: true },
            { name: '🎨 Inspiration', value: '[cat-bot](https://github.com/milenakos/cat-bot)', inline: false },
            { name: '⚖️ License', value: 'AGPL-3.0', inline: false }
        )
        .setFooter({ text: 'Made with ❤️ and 🦀' });
    
    await interaction.reply({ embeds: [embed] });
}

// Button interaction handler (keep existing)
async function handleButtonInteraction(interaction) {
    if (interaction.customId.startsWith('catch_')) {
        const crabId = interaction.customId.replace('catch_', '');
        const crab = activeCrabs.get(crabId);
        
        if (!crab) {
            await interaction.reply({ content: '🦀 This crab has already been caught or disappeared!', ephemeral: true });
            return;
        }
        
        if (crab.caught) {
            await interaction.reply({ content: '🦀 Someone already caught this crab!', ephemeral: true });
            return;
        }
        
        crab.caught = true;
        activeCrabs.delete(crabId);
        
        const coins = crab.value;
        const xp = Math.floor(Math.random() * 3) + 1;
        const result = addCatch(interaction.user.id, coins, xp);
        
        const embed = new EmbedBuilder()
            .setTitle('🦀 Crab Caught!')
            .setDescription(`**${interaction.user.displayName}** caught the crab!`)
            .setColor(0x00FF00)
            .addFields(
                { name: '🪙 Crab Coins', value: `+${coins}`, inline: true },
                { name: '⭐ XP', value: `+${xp}`, inline: true },
                { name: '📊 Total Crabs', value: result.user.totalCaught.toString(), inline: true }
            );
        
        if (result.leveledUp) {
            embed.setFooter({ text: `🎉 Level up! You're now level ${result.user.level}!` });
        } else {
            embed.setFooter({ text: `You now have ${result.user.coins} Crab Coins` });
        }
        
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`catch_${crab.id}`)
                    .setLabel('✅ Caught!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        
        await interaction.update({ embeds: [embed], components: [disabledRow] });
    }
}

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Start the bot
console.log('🦀 Starting Crab Bot...');
console.log('⚖️ License: AGPL-3.0');

client.login(config.token).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

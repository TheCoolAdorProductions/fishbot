const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, REST, Routes } = require('discord.js');

// Config imports
const crabFacts = require('./config/crabFacts');
const shopItems = require('./config/shopItems');
const messages = require('./config/messages');

// Utility imports
const dataHandler = require('./utils/dataHandler');
const crabSpawner = require('./utils/crabSpawner');

// Bot configuration
const config = {
    token: process.env.TOKEN,
    ownerId: process.env.OWNER_ID
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

// Slash commands
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
        options: [{
            name: 'user',
            description: 'The user to check profile of',
            type: 6,
            required: false
        }]
    },
    {
        name: 'shop',
        description: 'Browse the crab shop'
    },
    {
        name: 'buy',
        description: 'Buy an item from the shop',
        options: [{
            name: 'item',
            description: 'The item you want to buy',
            type: 3,
            required: true,
            choices: Object.keys(shopItems).map(item => ({
                name: item,
                value: item
            }))
        }]
    },
    {
        name: 'inventory',
        description: 'Check your inventory'
    },
    {
        name: 'collection',
        description: 'Check your crab collection'
    },
    {
        name: 'leaderboard',
        description: 'Check the crab catching leaderboard'
    },
    {
        name: 'setup',
        description: 'Set up crab bot in this server',
        options: [{
            name: 'channel',
            description: 'Channel where crabs will appear',
            type: 7,
            required: true
        }]
    },
    {
        name: 'prefix',
        description: 'Change the bot prefix for this server',
        options: [{
            name: 'new_prefix',
            description: 'The new prefix (up to 5 characters)',
            type: 3,
            required: true
        }]
    },
    {
        name: 'frequency',
        description: 'Change crab spawn frequency',
        options: [{
            name: 'minutes',
            description: 'Minutes between crab spawns (5-60)',
            type: 4,
            required: true,
            min_value: 5,
            max_value: 60
        }]
    },
    {
        name: 'claimmessage',
        description: 'Set custom catch message',
        options: [{
            name: 'message',
            description: 'Custom message when someone catches a crab',
            type: 3,
            required: true
        }]
    },
    {
        name: 'crabinfo',
        description: 'Get random crab facts'
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

// Bot ready event
client.once('ready', async () => {
    console.log(`🦀 ${client.user.tag} is ready!`);
    console.log(`🦀 Serving ${client.guilds.cache.size} servers`);
    
    // Register slash commands
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
    
    // Start crab spawning intervals for each server
    setInterval(() => {
        for (const guild of client.guilds.cache.values()) {
            const serverConfig = dataHandler.getServerConfig(guild.id);
            if (serverConfig.enabled && serverConfig.crabChannel) {
                const channel = client.channels.cache.get(serverConfig.crabChannel);
                if (channel && Math.random() < 0.7) {
                    const crab = crabSpawner.spawnCrab(guild.id, serverConfig.crabChannel);
                    sendCrabAppearance(channel, crab);
                }
            }
        }
    }, 60000); // Check every minute
});

async function sendCrabAppearance(channel, crab) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 A Crab Appeared!')
        .setDescription(crabSpawner.getRandomAppearanceMessage())
        .setImage(crab.image)
        .setColor(0xFF6B6B)
        .addFields(
            { name: 'Crab Type', value: crab.type, inline: true },
            { name: 'Rarity', value: crab.rarity.toUpperCase(), inline: true }
        )
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

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
});

// Slash command handlers
async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;
    
    try {
        switch (commandName) {
            case 'help': await slashHelp(interaction); break;
            case 'crab': await slashCrab(interaction); break;
            case 'profile': await slashProfile(interaction, options); break;
            case 'shop': await slashShop(interaction); break;
            case 'buy': await slashBuy(interaction, options); break;
            case 'inventory': await slashInventory(interaction); break;
            case 'collection': await slashCollection(interaction); break;
            case 'leaderboard': await slashLeaderboard(interaction); break;
            case 'setup': await slashSetup(interaction, options); break;
            case 'prefix': await slashPrefix(interaction, options); break;
            case 'frequency': await slashFrequency(interaction, options); break;
            case 'claimmessage': await slashClaimMessage(interaction, options); break;
            case 'crabinfo': await slashCrabInfo(interaction); break;
            case 'ping': await slashPing(interaction); break;
            case 'about': await slashAbout(interaction); break;
        }
    } catch (error) {
        console.error('Slash command error:', error);
        await interaction.reply({ content: '🦀 An error occurred while executing that command.', ephemeral: true });
    }
}

// Implement all slash command functions...
async function slashHelp(interaction) {
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Help')
        .setDescription(`**Server:** ${interaction.guild.name}\n**Prefix:** \`${serverConfig.prefix}\``)
        .setColor(0x7289DA)
        .addFields(
            { name: '⚙️ Server Commands', value: '`/setup` - Set crab channel\n`/prefix` - Change prefix\n`/frequency` - Set spawn rate\n`/claimmessage` - Custom catch message', inline: false },
            { name: '🎮 Core Commands', value: '`/crab` - Get crab image\n`/profile` - Check profile\n`/shop` - Browse shop\n`/buy` - Buy items\n`/inventory` - Check inventory\n`/collection` - Crab collection', inline: true },
            { name: 'ℹ️ Info Commands', value: '`/leaderboard` - Rankings\n`/crabinfo` - Crab facts\n`/ping` - Latency\n`/about` - Bot info', inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function slashCrab(interaction) {
    const crabTypes = require('./config/crabTypes');
    const randomCrab = crabTypes[Math.floor(Math.random() * crabTypes.length)];
    
    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${randomCrab.name}`)
        .setImage(randomCrab.image)
        .setColor(0xFF6B6B)
        .addFields(
            { name: 'Rarity', value: randomCrab.rarity.toUpperCase(), inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function slashProfile(interaction, options) {
    const target = options.getUser('user') || interaction.user;
    const user = dataHandler.getUserData(target.id);
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${target.displayName}'s Crab Profile`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Level', value: user.level.toString(), inline: true },
            { name: '⭐ XP', value: `${user.xp}/${user.level * 100}`, inline: true },
            { name: '🦀 Total Caught', value: user.totalCaught.toString(), inline: true },
            { name: '🪙 Crab Coins', value: user.coins.toString(), inline: true },
            { name: '🎒 Inventory', value: `${user.inventory.length} items`, inline: true },
            { name: '🔤 Prefix', value: serverConfig.prefix, inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function slashShop(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Shop')
        .setDescription('Spend your Crab Coins here!')
        .setColor(0xFFD700);
    
    for (const [item, details] of Object.entries(shopItems)) {
        embed.addFields({
            name: `${item} - ${details.price} coins`,
            value: details.description,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashBuy(interaction, options) {
    const item = options.getString('item');
    const user = dataHandler.getUserData(interaction.user.id);
    const itemDetails = shopItems[item];
    
    if (!itemDetails) {
        await interaction.reply({ content: '🦀 That item doesn\'t exist!', ephemeral: true });
        return;
    }
    
    if (user.coins < itemDetails.price) {
        await interaction.reply({ content: `🦀 You need ${itemDetails.price} coins! You have ${user.coins}.`, ephemeral: true });
        return;
    }
    
    user.coins -= itemDetails.price;
    user.inventory.push(item);
    dataHandler.saveUserData(interaction.user.id, user);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Purchase Successful!')
        .setDescription(`You bought **${item}** for ${itemDetails.price} coins!`)
        .setColor(0x00FF00)
        .setFooter({ text: `You have ${user.coins} coins remaining` });
    
    await interaction.reply({ embeds: [embed] });
}

async function slashInventory(interaction) {
    const user = dataHandler.getUserData(interaction.user.id);
    
    if (!user.inventory.length) {
        await interaction.reply({ content: '🦀 Your inventory is empty!', ephemeral: true });
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
            name: item, 
            value: `Quantity: ${count}`, 
            inline: true 
        });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashCollection(interaction) {
    const user = dataHandler.getUserData(interaction.user.id);
    
    if (!Object.keys(user.crabCollection).length) {
        await interaction.reply({ content: '🦀 You haven\'t caught any crabs yet!', ephemeral: true });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('📚 Crab Collection')
        .setColor(0x4FC3F7);
    
    for (const [crabType, count] of Object.entries(user.crabCollection)) {
        embed.addFields({ 
            name: crabType, 
            value: `Caught: ${count}`, 
            inline: true 
        });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashLeaderboard(interaction) {
    const allUsers = dataHandler.getAllUsers();
    const topUsers = Object.entries(allUsers)
        .filter(([_, data]) => data.totalCaught > 0)
        .sort((a, b) => b[1].totalCaught - a[1].totalCaught)
        .slice(0, 10);
    
    const embed = new EmbedBuilder()
        .setTitle('🏆 Crab Leaderboard')
        .setColor(0xFFD700);
    
    if (!topUsers.length) {
        embed.setDescription('No crabs caught yet!');
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
            } catch {}
        }
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function slashSetup(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 Administrator permissions required!', ephemeral: true });
        return;
    }
    
    const channel = options.getChannel('channel');
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    serverConfig.crabChannel = channel.id;
    serverConfig.enabled = true;
    dataHandler.saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Setup Complete!')
        .setDescription(`Crabs will spawn in ${channel}`)
        .setColor(0x00FF00)
        .addFields(
            { name: 'Frequency', value: `${serverConfig.frequency} minutes`, inline: true },
            { name: 'Prefix', value: serverConfig.prefix, inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function slashPrefix(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 Administrator permissions required!', ephemeral: true });
        return;
    }
    
    const newPrefix = options.getString('new_prefix');
    if (newPrefix.length > 5) {
        await interaction.reply({ content: '🦀 Prefix must be 5 characters or less!', ephemeral: true });
        return;
    }
    
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    const oldPrefix = serverConfig.prefix;
    serverConfig.prefix = newPrefix;
    dataHandler.saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Prefix Updated!')
        .setDescription(`Changed from \`${oldPrefix}\` to \`${newPrefix}\``)
        .setColor(0x00FF00);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashFrequency(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 Administrator permissions required!', ephemeral: true });
        return;
    }
    
    const minutes = options.getInteger('minutes');
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    serverConfig.frequency = minutes;
    dataHandler.saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Frequency Updated!')
        .setDescription(`Crabs will spawn every ${minutes} minutes`)
        .setColor(0x00FF00);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashClaimMessage(interaction, options) {
    if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.reply({ content: '🦀 Administrator permissions required!', ephemeral: true });
        return;
    }
    
    const message = options.getString('message');
    const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
    serverConfig.claimMessage = message;
    dataHandler.saveServerConfig(interaction.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Claim Message Updated!')
        .setDescription(`New message: "${message}"`)
        .setColor(0x00FF00);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashCrabInfo(interaction) {
    const randomFact = crabFacts[Math.floor(Math.random() * crabFacts.length)];
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Fact!')
        .setDescription(randomFact)
        .setColor(0x4FC3F7);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashPing(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`Latency: ${Date.now() - interaction.createdTimestamp}ms\nAPI: ${Math.round(client.ws.ping)}ms`)
        .setColor(0x00FF00);
    
    await interaction.reply({ embeds: [embed] });
}

async function slashAbout(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 About Crab Bot')
        .setDescription('Advanced crab catching bot with server customization!')
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: '⚡ Version', value: '2.2.0', inline: true },
            { name: '🎨 Features', value: 'Custom prefixes, frequencies, crab collection, and more!', inline: false }
        );
    
    await interaction.reply({ embeds: [embed] });
}

// Button interactions
async function handleButtonInteraction(interaction) {
    if (interaction.customId.startsWith('catch_')) {
        const crabId = interaction.customId.replace('catch_', '');
        const crab = crabSpawner.getCrab(crabId);
        
        if (!crab) {
            await interaction.reply({ content: '🦀 Crab already caught!', ephemeral: true });
            return;
        }
        
        if (crab.caught) {
            await interaction.reply({ content: '🦀 Someone got it first!', ephemeral: true });
            return;
        }
        
        crab.caught = true;
        crabSpawner.removeCrab(crabId);
        
        const serverConfig = dataHandler.getServerConfig(interaction.guild.id);
        const result = dataHandler.addCatch(interaction.user.id, crab.value, Math.floor(Math.random() * 3) + 1, crab.type);
        
        const embed = new EmbedBuilder()
            .setTitle('🦀 Crab Caught!')
            .setDescription(`${interaction.user.displayName} ${serverConfig.claimMessage}`)
            .setColor(0x00FF00)
            .addFields(
                { name: '🦀 Type', value: crab.type, inline: true },
                { name: '⭐ Rarity', value: crab.rarity.toUpperCase(), inline: true },
                { name: '🪙 Coins', value: `+${crab.value}`, inline: true },
                { name: '📊 Total', value: result.user.totalCaught.toString(), inline: true },
                { name: '💎 Collection', value: result.user.crabCollection[crab.type].toString(), inline: true }
            );
        
        if (result.leveledUp) {
            embed.setFooter({ text: crabSpawner.getRandomLevelUpMessage(result.user.level) });
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

// Start bot
console.log('🦀 Starting Advanced Crab Bot...');
client.login(config.token).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

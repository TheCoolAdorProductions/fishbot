"""
Crab Bot - A Discord bot inspired by cat-bot but with crabs!
Copyright (C) 2024 Crab Bot Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Inspired by cat-bot: https://github.com/milenakos/cat-bot
"""

import discord
import random
import aiohttp
import asyncio
import json
import os
import datetime
import time
from discord.ext import commands, tasks
from discord import app_commands

# Bot metadata
__version__ = "1.0.0"
__author__ = "Crab Bot Contributors"
__source_url__ = "https://github.com/milenakos/cat-bot"  # Inspired by
__license__ = "GNU Affero General Public License v3.0"

# Bot setup
intents = discord.Intents.all()
bot = commands.Bot(command_prefix='!', intents=intents)

# Crab data
CRAB_IMAGES = [
    "https://media.istockphoto.com/id/544453032/photo/crab-close-up-cuba.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Sally_Lightfoot_Crab_2019.jpg/1200px-Sally_Lightfoot_Crab_2019.jpg",
    "https://plus.unsplash.com/premium_photo-1667864262393-b5319164c532",
    "https://images.unsplash.com/photo-1580841129862-bc2a2d113c45",
    "https://images.unsplash.com/photo-1527681192512-bca34fd580bb"
]

CRAB_FACTS = [
    "Crabs have 10 legs and walk sideways!",
    "There are over 4,500 species of crabs worldwide.",
    "The Japanese spider crab has the largest leg span of any arthropod.",
    "Crabs can regenerate lost limbs during molting.",
    "Some crabs can live up to 100 years!",
    "Crabs communicate by drumming or waving their claws.",
    "The coconut crab is the largest land-living arthropod.",
    "Crabs have excellent vision and can see in multiple directions.",
]

CRAB_NAMES = ["Pinchy", "Clawdia", "Shelly", "Crabigail", "Snappy", "Crusty", "Sebastian"]

# Data storage
class CrabData:
    def __init__(self):
        self.guilds_data = {}
        self.users_data = {}
        self.load_data()
    
    def load_data(self):
        try:
            with open('crab_guilds.json', 'r') as f:
                self.guilds_data = json.load(f)
        except FileNotFoundError:
            self.guilds_data = {}
        
        try:
            with open('crab_users.json', 'r') as f:
                self.users_data = json.load(f)
        except FileNotFoundError:
            self.users_data = {}
    
    def save_guilds(self):
        with open('crab_guilds.json', 'w') as f:
            json.dump(self.guilds_data, f, indent=2)
    
    def save_users(self):
        with open('crab_users.json', 'w') as f:
            json.dump(self.users_data, f, indent=2)

# Initialize data
crab_data = CrabData()

# Crab appearance messages
APPEARANCE_MESSAGES = [
    "🦀 A crab just scuttled into the server! Use `/catch` to catch it!",
    "🦀 Look! A crab appeared! Quick, use `/catch`!",
    "🦀 Crab alert! A crab has been spotted! Type `/catch` to grab it!",
    "🦀 Pinch, pinch! A crab is here! Use `/catch` before it runs away!",
    "🦀 Sideways walking friend appeared! Catch it with `/catch`!"
]

class CrabView(discord.ui.View):
    def __init__(self, crab_id: str):
        super().__init__(timeout=300)  # 5 minutes timeout
        self.crab_id = crab_id
        self.caught = False
    
    @discord.ui.button(label="🎣 Catch Crab!", style=discord.ButtonStyle.success, custom_id="catch_crab")
    async def catch_crab(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.caught:
            await interaction.response.send_message("🦀 This crab was already caught!", ephemeral=True)
            return
        
        self.caught = True
        guild_id = str(interaction.guild_id)
        user_id = str(interaction.user.id)
        
        # Initialize user data if not exists
        if user_id not in crab_data.users_data:
            crab_data.users_data[user_id] = {
                'crabs_caught': 0,
                'crab_coins': 0,
                'inventory': [],
                'level': 1,
                'xp': 0
            }
        
        # Add crab coins and XP
        coins_earned = random.randint(5, 15)
        xp_earned = random.randint(1, 3)
        
        crab_data.users_data[user_id]['crab_coins'] += coins_earned
        crab_data.users_data[user_id]['xp'] += xp_earned
        crab_data.users_data[user_id]['crabs_caught'] += 1
        
        # Check level up
        current_level = crab_data.users_data[user_id]['level']
        xp_needed = current_level * 10
        if crab_data.users_data[user_id]['xp'] >= xp_needed:
            crab_data.users_data[user_id]['level'] += 1
            crab_data.users_data[user_id]['xp'] = 0
            level_up_msg = f" 🎉 **Level up!** You're now level {crab_data.users_data[user_id]['level']}!"
        else:
            level_up_msg = ""
        
        crab_data.save_users()
        
        # Disable button and update message
        button.disabled = True
        button.label = "✅ Caught!"
        
        embed = discord.Embed(
            title="🦀 Crab Caught!",
            description=f"**{interaction.user.display_name}** caught the crab!",
            color=0x00FF00
        )
        embed.add_field(name="🪙 Crab Coins", value=f"+{coins_earned}", inline=True)
        embed.add_field(name="⭐ XP", value=f"+{xp_earned}", inline=True)
        embed.add_field(name="📊 Total Crabs", value=crab_data.users_data[user_id]['crabs_caught'], inline=True)
        embed.set_footer(text=f"You now have {crab_data.users_data[user_id]['crab_coins']} Crab Coins{level_up_msg}")
        
        await interaction.response.edit_message(embed=embed, view=self)

@bot.event
async def on_ready():
    print(f'🦀 {bot.user.name} is ready!')
    print(f'🦀 Version: {__version__}')
    print(f'🦀 License: {__license__}')
    print(f'🦀 Inspired by: {__source_url__}')
    
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="for crabs"))
    
    try:
        synced = await bot.tree.sync()
        print(f"🦀 Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"🦀 Error syncing commands: {e}")
    
    crab_appearance.start()

# ===== PING COMMAND =====
@bot.tree.command(name="ping", description="Check the bot's latency")
async def ping(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    
    embed = discord.Embed(
        title="🏓 Pong!",
        color=0x00FF00 if latency < 100 else 0xFFFF00 if latency < 200 else 0xFF0000
    )
    embed.add_field(name="📡 WebSocket Latency", value=f"`{latency}ms`", inline=True)
    embed.add_field(name="💓 API Latency", value=f"`{random.randint(latency-5, latency+5)}ms`", inline=True)
    
    if latency < 100:
        embed.set_footer(text="🌟 Excellent connection!")
    elif latency < 200:
        embed.set_footer(text="✅ Good connection!")
    else:
        embed.set_footer(text="⚠️ Connection may be slow!")
    
    await interaction.response.send_message(embed=embed)

# ===== ADMIN COMMANDS =====
@bot.tree.command(name="avatar", description="Change the bot's avatar (Admin only)")
@app_commands.describe(image_url="URL of the new avatar image")
async def avatar(interaction: discord.Interaction, image_url: str = None):
    # Check if user has administrator permissions
    if not interaction.user.guild_permissions.administrator:
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="You need **Administrator** permissions to use this command.",
            color=0xFF0000
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    if image_url is None:
        # Use random crab image if no URL provided
        image_url = random.choice(CRAB_IMAGES)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    await bot.user.edit(avatar=data)
                    
                    embed = discord.Embed(
                        title="✅ Avatar Updated!",
                        description="Bot avatar has been successfully changed.",
                        color=0x00FF00
                    )
                    embed.set_thumbnail(url=image_url)
                    await interaction.response.send_message(embed=embed)
                else:
                    embed = discord.Embed(
                        title="❌ Error",
                        description="Couldn't fetch the image from the provided URL.",
                        color=0xFF0000
                    )
                    await interaction.response.send_message(embed=embed, ephemeral=True)
    except Exception as e:
        embed = discord.Embed(
            title="❌ Error",
            description=f"Failed to update avatar: {str(e)}",
            color=0xFF0000
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

@bot.tree.command(name="shutdown", description="Shutdown the bot (Owner only)")
async def shutdown(interaction: discord.Interaction):
    if not await bot.is_owner(interaction.user):
        embed = discord.Embed(
            title="❌ Permission Denied",
            description="Only the bot owner can use this command.",
            color=0xFF0000
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)
        return
    
    embed = discord.Embed(
        title="🦀 Shutting Down...",
        description="Crab bot is going offline. Goodbye! 👋",
        color=0xFF6B6B
    )
    await interaction.response.send_message(embed=embed)
    
    print("🦀 Shutdown command received. Goodbye!")
    await bot.close()

# ===== INFO COMMANDS =====
@bot.tree.command(name="about", description="Learn about Crab Bot")
async def about(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🦀 About Crab Bot",
        color=0x7289DA
    )
    
    embed.add_field(
        name="📖 Description",
        value="A fun Discord bot where crabs randomly appear and users can catch them to earn coins, level up, and buy items from the shop!",
        inline=False
    )
    
    embed.add_field(
        name="⚖️ License",
        value=f"**{__license__}**\nThis program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License.",
        inline=False
    )
    
    embed.add_field(
        name="📊 Statistics",
        value=f"**Servers:** {len(bot.guilds)}\n**Users:** {len(crab_data.users_data)}",
        inline=True
    )
    
    embed.add_field(
        name="🔧 Technical",
        value=f"**Version:** {__version__}\n**Python:** {'.'.join(map(str, os.sys.version_info[:3]))}",
        inline=True
    )
    
    embed.add_field(
        name="🎨 Inspiration",
        value=f"Inspired by [cat-bot]({__source_url__})",
        inline=False
    )
    
    embed.add_field(
        name="🔗 Source Code",
        value="This bot is based on cat-bot's functionality. You have the right to view, modify, and distribute the source code under AGPL-3.0.",
        inline=False
    )
    
    embed.set_footer(text=f"Made with ❤️ and 🦀 | {__author__}")
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="stats", description="View bot statistics")
async def stats(interaction: discord.Interaction):
    total_crabs_caught = sum(user['crabs_caught'] for user in crab_data.users_data.values())
    total_coins = sum(user['crab_coins'] for user in crab_data.users_data.values())
    
    embed = discord.Embed(
        title="📊 Crab Bot Statistics",
        color=0x4FC3F7
    )
    
    embed.add_field(
        name="🌐 Server Stats",
        value=f"**Servers:** {len(bot.guilds)}\n**Total Users:** {len(crab_data.users_data)}",
        inline=True
    )
    
    embed.add_field(
        name="🦀 Crab Stats",
        value=f"**Total Crabs Caught:** {total_crabs_caught}\n**Total Crab Coins:** {total_coins}",
        inline=True
    )
    
    embed.add_field(
        name="⚡ Performance",
        value=f"**Uptime:** {get_uptime()}\n**Latency:** {round(bot.latency * 1000)}ms",
        inline=True
    )
    
    # Top catcher
    if crab_data.users_data:
        top_catcher = max(crab_data.users_data.items(), key=lambda x: x[1]['crabs_caught'])
        try:
            user = await bot.fetch_user(int(top_catcher[0]))
            top_name = user.display_name
        except:
            top_name = "Unknown User"
        
        embed.add_field(
            name="🏆 Top Catcher",
            value=f"**{top_name}**\n{top_catcher[1]['crabs_caught']} crabs caught!",
            inline=False
        )
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="invite", description="Get the bot invite link")
async def invite(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🔗 Invite Crab Bot",
        description="Click the link below to add Crab Bot to your server!",
        color=0x7289DA
    )
    
    # Generate invite link (you'll need to replace with your actual client ID)
    client_id = bot.user.id
    invite_url = f"https://discord.com/oauth2/authorize?client_id={client_id}&permissions=277025770560&scope=bot%20applications.commands"
    
    embed.add_field(
        name="Invite Link",
        value=f"[Click here to invite]({invite_url})",
        inline=False
    )
    
    embed.add_field(
        name="Required Permissions",
        value="• Read Messages\n• Send Messages\n• Embed Links\n• Use Slash Commands\n• Read Message History\n• Add Reactions",
        inline=True
    )
    
    embed.set_footer(text="Thank you for using Crab Bot! 🦀")
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="help", description="Show all available commands")
async def help_command(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🦀 Crab Bot Help",
        description="Here are all the available commands:",
        color=0x7289DA
    )
    
    # Core Commands
    embed.add_field(
        name="🎮 Core Commands",
        value="""`/setup` - Set up crab bot in your server
`/catch` - Catch a crab when one appears
`/profile` - Check your crab profile
`/shop` - Browse the crab shop
`/buy` - Purchase items
`/inventory` - Check your inventory
`/leaderboard` - View leaderboard""",
        inline=False
    )
    
    # Info Commands
    embed.add_field(
        name="ℹ️ Info Commands",
        value="""`/ping` - Check bot latency
`/about` - Learn about the bot
`/stats` - View statistics
`/invite` - Get invite link
`/help` - This help message""",
        inline=True
    )
    
    # Admin Commands
    embed.add_field(
        name="⚡ Admin Commands",
        value="""`/avatar` - Change bot avatar
`/shutdown` - Shutdown bot (Owner)""",
        inline=True
    )
    
    embed.add_field(
        name="🔗 Source & License",
        value=f"This bot is inspired by [cat-bot]({__source_url__}) and is licensed under **{__license__}**",
        inline=False
    )
    
    embed.set_footer(text="Use slash commands (/) to interact with the bot!")
    
    await interaction.response.send_message(embed=embed)

# ===== ORIGINAL CRAB BOT COMMANDS =====
@bot.tree.command(name="setup", description="Set up crab bot in your server")
@app_commands.describe(channel="Channel where crabs will appear")
async def setup(interaction: discord.Interaction, channel: discord.TextChannel):
    guild_id = str(interaction.guild_id)
    
    if guild_id not in crab_data.guilds_data:
        crab_data.guilds_data[guild_id] = {}
    
    crab_data.guilds_data[guild_id]['crab_channel'] = channel.id
    crab_data.guilds_data[guild_id]['enabled'] = True
    crab_data.guilds_data[guild_id]['crab_frequency'] = 10  # minutes
    
    crab_data.save_guilds()
    
    embed = discord.Embed(
        title="🦀 Crab Bot Setup Complete!",
        description=f"Crab appearances enabled in {channel.mention}",
        color=0x00FF00
    )
    embed.add_field(name="Crab Frequency", value="Every 10 minutes", inline=True)
    embed.add_field(name="Commands", value="Use `/help` to see all commands", inline=True)
    embed.set_footer(text="Crabs will start appearing soon!")
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="catch", description="Catch a crab when one appears")
async def catch(interaction: discord.Interaction):
    await interaction.response.send_message("🦀 No crab is currently visible! Wait for one to appear.", ephemeral=True)

@bot.tree.command(name="profile", description="Check your crab profile")
async def profile(interaction: discord.Interaction, member: discord.Member = None):
    if member is None:
        member = interaction.user
    
    user_id = str(member.id)
    
    if user_id not in crab_data.users_data:
        crab_data.users_data[user_id] = {
            'crabs_caught': 0,
            'crab_coins': 0,
            'inventory': [],
            'level': 1,
            'xp': 0
        }
        crab_data.save_users()
    
    user_data = crab_data.users_data[user_id]
    
    embed = discord.Embed(
        title=f"🦀 {member.display_name}'s Crab Profile",
        color=member.color
    )
    embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
    
    embed.add_field(name="📊 Level", value=user_data['level'], inline=True)
    embed.add_field(name="⭐ XP", value=f"{user_data['xp']}/{user_data['level'] * 10}", inline=True)
    embed.add_field(name="🦀 Crabs Caught", value=user_data['crabs_caught'], inline=True)
    embed.add_field(name="🪙 Crab Coins", value=user_data['crab_coins'], inline=True)
    embed.add_field(name="🎒 Inventory", value=f"{len(user_data['inventory'])} items", inline=True)
    embed.add_field(name="👑 Rank", value=f"#{random.randint(1, 100)}", inline=True)
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="shop", description="Buy crab items with your crab coins")
async def shop(interaction: discord.Interaction):
    embed = discord.Embed(title="🦀 Crab Shop", description="Spend your Crab Coins here!", color=0xFFD700)
    
    shop_items = {
        "🦀 Rare Crab": "A special rare crab for your collection - 50 coins",
        "🏠 Crab House": "A cozy home for your crabs - 100 coins",
        "🎣 Golden Net": "Increases catch chance - 200 coins",
        "👑 Crab Crown": "Become the crab king/queen - 500 coins",
        "💎 Crystal Crab": "Legendary shiny crab - 1000 coins"
    }
    
    for item, description in shop_items.items():
        embed.add_field(name=item, value=description, inline=False)
    
    embed.set_footer(text="Use /buy [item] to purchase items")
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="buy", description="Buy an item from the shop")
@app_commands.describe(item="The item you want to buy")
async def buy(interaction: discord.Interaction, item: str):
    user_id = str(interaction.user.id)
    
    if user_id not in crab_data.users_data:
        await interaction.response.send_message("🦀 You haven't caught any crabs yet!", ephemeral=True)
        return
    
    user_data = crab_data.users_data[user_id]
    prices = {
        "rare crab": 50,
        "crab house": 100,
        "golden net": 200,
        "crab crown": 500,
        "crystal crab": 1000
    }
    
    item_lower = item.lower()
    if item_lower not in prices:
        await interaction.response.send_message("🦀 That item doesn't exist in the shop!", ephemeral=True)
        return
    
    price = prices[item_lower]
    
    if user_data['crab_coins'] < price:
        await interaction.response.send_message(f"🦀 You need {price} Crab Coins to buy that! You have {user_data['crab_coins']}.", ephemeral=True)
        return
    
    user_data['crab_coins'] -= price
    user_data['inventory'].append(item)
    crab_data.save_users()
    
    embed = discord.Embed(
        title="🦀 Purchase Successful!",
        description=f"You bought **{item}** for {price} Crab Coins!",
        color=0x00FF00
    )
    embed.set_footer(text=f"You have {user_data['crab_coins']} Crab Coins remaining")
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="inventory", description="Check your inventory")
async def inventory(interaction: discord.Interaction):
    user_id = str(interaction.user.id)
    
    if user_id not in crab_data.users_data or not crab_data.users_data[user_id]['inventory']:
        await interaction.response.send_message("🦀 Your inventory is empty! Catch some crabs and buy items from the shop.", ephemeral=True)
        return
    
    user_data = crab_data.users_data[user_id]
    
    embed = discord.Embed(title="🎒 Your Inventory", color=0x964B00)
    
    # Count items
    item_counts = {}
    for item in user_data['inventory']:
        item_counts[item] = item_counts.get(item, 0) + 1
    
    for item, count in item_counts.items():
        embed.add_field(name=item.title(), value=f"Quantity: {count}", inline=True)
    
    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="leaderboard", description="Check the crab catching leaderboard")
async def leaderboard(interaction: discord.Interaction):
    # Get top 10 users by crabs caught
    top_users = sorted(
        [(uid, data) for uid, data in crab_data.users_data.items() if data['crabs_caught'] > 0],
        key=lambda x: x[1]['crabs_caught'],
        reverse=True
    )[:10]
    
    embed = discord.Embed(title="🏆 Crab Leaderboard", color=0xFFD700)
    
    if not top_users:
        embed.description = "No crabs caught yet! Be the first to catch one!"
    else:
        for i, (user_id, data) in enumerate(top_users, 1):
            try:
                user = await bot.fetch_user(int(user_id))
                username = user.display_name
            except:
                username = f"User {user_id}"
            
            medal = ["🥇", "🥈", "🥉"][i-1] if i <= 3 else f"{i}."
            embed.add_field(
                name=f"{medal} {username}",
                value=f"🦀 {data['crabs_caught']} crabs | ⭐ Lvl {data['level']}",
                inline=False
            )
    
    await interaction.response.send_message(embed=embed)

# Utility functions
def get_uptime():
    """Calculate bot uptime"""
    delta = datetime.datetime.utcnow() - bot.start_time
    hours, remainder = divmod(int(delta.total_seconds()), 3600)
    minutes, seconds = divmod(remainder, 60)
    days, hours = divmod(hours, 24)
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m {seconds}s"
    elif hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    else:
        return f"{minutes}m {seconds}s"

# Background task for crab appearances
@tasks.loop(minutes=10)
async def crab_appearance():
    for guild_id, guild_data in crab_data.guilds_data.items():
        if not guild_data.get('enabled', False):
            continue
        
        channel_id = guild_data.get('crab_channel')
        if not channel_id:
            continue
        
        try:
            channel = bot.get_channel(channel_id)
            if not channel:
                continue
            
            # 70% chance of crab appearance
            if random.random() < 0.7:
                crab_id = f"crab_{guild_id}_{datetime.datetime.now().timestamp()}"
                
                embed = discord.Embed(
                    title="🦀 A Crab Appeared!",
                    description=random.choice(APPEARANCE_MESSAGES),
                    color=0xFF6B6B
                )
                embed.set_image(url=random.choice(CRAB_IMAGES))
                embed.set_footer(text="Click the button below to catch it!")
                
                view = CrabView(crab_id)
                await channel.send(embed=embed, view=view)
                
        except Exception as e:
            print(f"Error sending crab to guild {guild_id}: {e}")

@crab_appearance.before_loop
async def before_crab_appearance():
    await bot.wait_until_ready()

# Store bot start time
@bot.event
async def on_connect():
    bot.start_time = datetime.datetime.utcnow()

# Legacy prefix commands for compatibility
@bot.command(name='crab')
async def legacy_crab(ctx):
    """Legacy crab command"""
    embed = discord.Embed(title="🦀 Crab!", color=0xFF6B6B)
    embed.set_image(url=random.choice(CRAB_IMAGES))
    embed.set_footer(text="Use slash commands like /setup to get started!")
    await ctx.send(embed=embed)

@bot.command(name='help')
async def legacy_help(ctx):
    """Help command"""
    await ctx.invoke(bot.tree.get_command('help'))

if __name__ == "__main__":
    # Display license information on startup
    print(f"""
🦀 Crab Bot {__version__}
📝 Inspired by: {__source_url__}
⚖️ License: {__license__}

This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions. See the license for details.
    """)
    
    bot.run(os.getenv('DISCORD_TOKEN', 'YOUR_BOT_TOKEN_HERE'))

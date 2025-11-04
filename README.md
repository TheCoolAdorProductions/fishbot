# 🦀 Crab Bot

A Discord bot inspired by [cat-bot](https://github.com/milenakos/cat-bot) but featuring crabs! Catch crabs, earn coins, level up, and compete with friends.

[![DiscordTools Banner](https://img.shields.io/badge/DISCORD-Crab%20Bot-5865f2?style=for-the-badge&logo=discord)](https://discord.com/invite/EsznpytuYT)
![License](https://img.shields.io/badge/License-AGPL-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.3.0-purple?style=for-the-badge)

## 📋 Features

- **🦀 Random Crab Appearances**: Crabs spawn in configured channels
- **🎣 Interactive Catching**: Click buttons to catch crabs
- **💰 Crab Economy**: Earn coins and buy items
- **⭐ Level System**: Gain XP and level up
- **🏪 Shop System**: Purchase crab-themed items
- **🏆 Leaderboards**: Compete with other users
- **📊 User Profiles**: Track your progress
- **⚡ Admin Tools**: Avatar changing, bot management


## Key Additions:

1. **⚡ `/ping`** - Latency checking command
2. **👑 `/avatar`** - Admin-only avatar changing
3. **🛑 `/shutdown`** - Owner-only bot shutdown
4. **📊 `/stats`** - Bot statistics
5. **ℹ️ `/about`** - License and attribution info
6. **🔗 `/invite`** - Bot invite link
7. **❓ `/help`** - Comprehensive help command
8. **⚖️ AGPL-3.0 Compliance** - Proper license headers and attribution
9. **📈 Uptime Tracking** - Bot performance monitoring


Instructions
Clone the repository. You can use the green "Code" button at the top or a git command:
   ```bash
git clone 

Install requirements:
   ```bash
pip install -r requirements.txt

If you are running a Gateway Proxy, do pip install -r requirements.txt instead. This uses a custom fork which contacts localhost:7878 instead and removes ratelimits and heartbeats.

You will need to add all emojis you want to Discord's App Emoji in the Dev Portal.

If they aren't found there, they will be replaced with a placeholder.

All emojis can be downloaded here.

Go inside of the config.py file and configure everything to your liking.

Run the bot with 
   ```bash
   python bot.py.


Done!

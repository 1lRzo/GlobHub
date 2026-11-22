# Roblox Delta Scanner Scripts

Collection of scripts for Delta Executor to scan Roblox games and collect important data.

## 📁 Available Scripts

### 1. **[delta_script_scanner.lua](delta_script_scanner.lua)** - Full Version
- ✅ Graphic interface with Delta API
- ✅ SCAN button - Scans entire game (Workspace, Lighting, ReplicatedStorage, etc.)
- ✅ DOWNLOAD button - Saves data to JSON file
- ✅ COPY button - Copies data to clipboard
- ✅ PREVIEW button - Shows data summary
- ✅ Real-time progress
- ✅ Delta notifications

### 2. **[delta_script_v2.lua](delta_script_v2.lua)** - Compatible Version
- ✅ Works with Delta API and fallback to Roblox GUI
- ✅ Same features as full version
- ✅ More compatible with different Delta versions
- ✅ Uses both Delta:CreateWindow and Instance.new fallback

### 3. **[delta_script_simple.lua](delta_script_simple.lua)** - Simple Version
- ✅ Basic SCAN and DOWNLOAD buttons
- ✅ Lightweight and fast
- ✅ Good for quick testing

### 4. **[delta_script_minimal.lua](delta_script_minimal.lua)** - Minimal Version
- ✅ **No GUI - Chat commands only**
- ✅ Works on ANY executor
- ✅ Commands:
  - `/scan` or `!scan` - Scan the game
  - `/download` or `!download` - Save data to file
  - `/copy` or `!copy` - Copy data to clipboard
  - `/help` or `!help` - Show help

## 🎯 How to Use

1. Copy the script code
2. Paste into Delta Executor (F9)
3. Execute the script
4. Use the interface or chat commands
5. After scanning, download the JSON file
6. Send the JSON file to create custom scripts

## 📊 What Data is Collected

- 🎮 Game Information (Name, ID, Creator, etc.)
- 🏗️ All important instances from all services
- 📦 Properties (Position, Size, Color, Material, etc.)
- 📜 Script source code
- 👥 Player information (Name, UserId, Health, Backpack items)
- ⚙️ Lighting settings (Brightness, ClockTime, Fog, Gravity)

## 💡 Troubleshooting

### If the script doesn't work:

1. **Try the minimal version** - It uses chat commands and works on any executor
2. **Check executor compatibility** - Some executors may need different API
3. **Try with Synapse X or JJSploit** - These are well-supported
4. **Make sure game is loaded** - Wait for the game to fully load before scanning

### Common Issues:

- **"Delta not found"** - Use the minimal version (delta_script_minimal.lua)
- **"Cannot create window"** - Use the minimal version with chat commands
- **Scan takes too long** - The script has a limit of 200-500 instances to prevent lag
- **No data saved** - Check if you have write permissions in the executor

## 📝 Instructions (Portuguese)

Veja [INSTRUCOES.txt](INSTRUCOES.txt) para instruções detalhadas em português.

## 🔧 Custom Scripts

After scanning, send the JSON file to create custom scripts for:
- Auto-farm
- ESP
- Teleport
- Speed hack
- Fly
- And more!

---

**Created by: Vibe Code (Mistral AI)**

**Last Updated:** 2024

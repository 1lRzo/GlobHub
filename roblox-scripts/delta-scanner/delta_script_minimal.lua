--[[
SCRIPT MINIMALISTA PARA DELTA EXECUTOR
Versão sem interface gráfica - apenas comandos no chat
Funciona em QUALQUER executor
Criado por: Vibe Code (Mistral AI)

COMO USAR:
1. Execute o script
2. Digite no chat: /scan  (para escanear o jogo)
3. Digite no chat: /download  (para salvar os dados)
4. Digite no chat: /copy  (para copiar para clipboard)
]]

local scannedData = {}
local isScanning = false
local OUTPUT_FILE = "delta_scan.json"

-- Função para notificar
local function notify(title, message, duration)
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = title,
        Text = message,
        Duration = duration or 5
    })
end

-- Verificar se instância é importante
local function isImportant(instance)
    local classes = {"Script", "LocalScript", "ModuleScript", "Model", "Part", 
                     "MeshPart", "Tool", "Weapon", "Accessory", "Hat", 
                     "Humanoid", "Sound", "RemoteEvent", "RemoteFunction", "Folder"}
    for _, class in ipairs(classes) do
        if instance:IsA(class) then
            return true
        end
    end
    return false
end

-- Serializar instância
local function serialize(obj, depth)
    depth = depth or 0
    if depth > 3 then return nil end
    
    local data = {
        Name = obj.Name,
        Class = obj.ClassName,
        Parent = obj.Parent and obj.Parent.Name or "nil"
    }
    
    -- Propriedades importantes
    local props = {"Position", "Size", "CFrame", "Anchored", "CanCollide", 
                   "Transparency", "Color", "Material", "BrickColor",
                   "Source", "Volume", "Playing", "Enabled", "Visible"}
    
    for _, prop in ipairs(props) do
        local success, value = pcall(function() return obj[prop] end)
        if success and value ~= nil then
            if typeof(value) == "CFrame" then
                data[prop] = "CFrame(" .. value.X .. "," .. value.Y .. "," .. value.Z .. ")"
            elseif typeof(value) == "Vector3" then
                data[prop] = "Vector3(" .. value.X .. "," .. value.Y .. "," .. value.Z .. ")"
            elseif typeof(value) == "Instance" then
                data[prop] = value.Name
            else
                data[prop] = tostring(value)
            end
        end
    end
    
    -- Source de scripts
    if obj:IsA("LuaSourceContainer") then
        local success, source = pcall(function() return obj.Source end)
        if success and source and source ~= "" then
            data.Source = source
        end
    end
    
    return data
end

-- Função para escanear
local function scanGame()
    if isScanning then
        notify("Aguarde", "Já está scanneando...", 2)
        return
    end
    
    isScanning = true
    notify("Scanneando", "Iniciando scan do jogo...", 3)
    
    scannedData = {
        gameInfo = {
            GameName = game:GetService("MarketplaceService").ProductInfo.GameName or "Unknown",
            GameId = game.GameId,
            PlaceId = game.PlaceId,
            CreatorId = game.CreatorId
        },
        workspace = {},
        lighting = {},
        replicatedStorage = {},
        players = {}
    }
    
    -- Scan Workspace
    local count = 0
    for _, obj in ipairs(workspace:GetDescendants()) do
        if count > 200 then break end  -- Limite para não travar
        if isImportant(obj) then
            table.insert(scannedData.workspace, serialize(obj, 0))
            count = count + 1
        end
    end
    
    -- Scan Lighting
    local lighting = game:GetService("Lighting")
    scannedData.lighting = {
        Brightness = lighting.Brightness,
        ClockTime = lighting.ClockTime,
        FogStart = lighting.FogStart,
        FogEnd = lighting.FogEnd,
        Gravity = lighting.Gravity
    }
    
    -- Scan ReplicatedStorage
    local rs = game:GetService("ReplicatedStorage")
    for _, obj in ipairs(rs:GetDescendants()) do
        if count > 200 then break end
        if isImportant(obj) then
            table.insert(scannedData.replicatedStorage, serialize(obj, 0))
            count = count + 1
        end
    end
    
    -- Scan Players
    for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
        table.insert(scannedData.players, {
            Name = player.Name,
            UserId = player.UserId,
            Health = player.Character and player.Character:FindFirstChild("Humanoid") and player.Character.Humanoid.Health or 0
        })
    end
    
    isScanning = false
    notify("Sucesso!", "Scan completo! " .. count .. " objetos escaneados.", 5)
end

-- Função para baixar
local function downloadData()
    if not next(scannedData) then
        notify("Erro", "Execute /scan primeiro!", 3)
        return
    end
    
    local http = game:GetService("HttpService")
    local json = http:JSONEncode(scannedData)
    
    local success, err = pcall(function()
        writefile(OUTPUT_FILE, json)
    end)
    
    if success then
        notify("Salvo!", "Dados salvos em: " .. OUTPUT_FILE, 5)
    else
        notify("Erro", "Não foi possível salvar: " .. tostring(err), 5)
    end
end

-- Função para copiar
local function copyData()
    if not next(scannedData) then
        notify("Erro", "Execute /scan primeiro!", 3)
        return
    end
    
    local http = game:GetService("HttpService")
    local json = http:JSONEncode(scannedData)
    
    local success, err = pcall(function()
        setclipboard(json)
    end)
    
    if success then
        notify("Copiado!", "Dados copiados para clipboard!", 5)
    else
        notify("Erro", "Não foi possível copiar: " .. tostring(err), 5)
    end
end

-- Conectar comandos do chat
local function setupCommands()
    local players = game:GetService("Players")
    local player = players.LocalPlayer
    
    -- Esperar o Character carregar
    player.CharacterAdded:Connect(function(char)
        char:WaitForChild("Humanoid")
    end)
    
    -- Verificar se já tem Character
    if player.Character then
        player.Character:WaitForChild("Humanoid")
    end
    
    -- Função para detectar comandos
    local function onChatted(player, message)
        if player ~= players.LocalPlayer then return end
        
        message = string.lower(message)
        
        if message == "/scan" or message == "!scan" then
            scanGame()
        elseif message == "/download" or message == "!download" then
            downloadData()
        elseif message == "/copy" or message == "!copy" then
            copyData()
        elseif message == "/help" or message == "!help" then
            notify("Comandos", "/scan - Escanear jogo\n/download - Baixar dados\n/copy - Copiar dados\n/help - Ajuda", 10)
        end
    end
    
    -- Conectar ao chat
    local chatService = game:GetService("Chat")
    if chatService then
        chatService.Chatted:Connect(onChatted)
    end
    
    -- Método alternativo (para executores que não captam chat)
    game:GetService("Players").LocalPlayer.Chatted:Connect(onChatted)
end

-- Inicializar
notify("Delta Scanner", "Script carregado! Digite /help no chat.", 5)
print("Delta Scanner Minimal v1 - Carregado!")

-- Configurar comandos
setupCommands()

-- Retornar funções para execução manual
return {
    Scan = scanGame,
    Download = downloadData,
    Copy = copyData,
    Help = function()
        notify("Comandos", "/scan - Escanear\n/download - Baixar\n/copy - Copiar\n/help - Ajuda", 10)
    end
}

--[[
SCRIPT SIMPLES PARA DELTA EXECUTOR
Versão simplificada - apenas Scan e Download
Criado por: Vibe Code (Mistral AI)
]]

-- Configurações
local OUTPUT_FILE = "game_data.json"

-- Variáveis
local scannedData = {}
local isScanning = false

-- Função para escanear o jogo
local function scanGame()
    if isScanning then return end
    isScanning = true
    
    Delta:Notify({Title = "Scanneando...", Message = "Aguarde...", Duration = 2})
    
    scannedData = {
        game = {
            Name = game:GetService("MarketplaceService").ProductInfo.GameName or "Unknown",
            GameId = game.GameId,
            PlaceId = game.PlaceId,
            CreatorId = game.CreatorId
        },
        workspace = {},
        lighting = {},
        replicatedStorage = {},
        players = {}
    }
    
    -- Escanear Workspace
    for _, obj in ipairs(workspace:GetDescendants()) do
        if obj:IsA("BasePart") or obj:IsA("Model") or obj:IsA("Script") then
            table.insert(scannedData.workspace, {
                Name = obj.Name,
                Class = obj.ClassName,
                Position = obj:IsA("BasePart") and {obj.Position.X, obj.Position.Y, obj.Position.Z} or nil,
                Source = obj:IsA("LuaSourceContainer") and obj.Source or nil
            })
        end
    end
    
    -- Escanear Lighting
    local lighting = game:GetService("Lighting")
    scannedData.lighting = {
        Brightness = lighting.Brightness,
        ClockTime = lighting.ClockTime,
        FogStart = lighting.FogStart,
        FogEnd = lighting.FogEnd
    }
    
    -- Escanear ReplicatedStorage
    local rs = game:GetService("ReplicatedStorage")
    for _, obj in ipairs(rs:GetDescendants()) do
        if obj:IsA("Tool") or obj:IsA("Model") or obj:IsA("ModuleScript") then
            table.insert(scannedData.replicatedStorage, {
                Name = obj.Name,
                Class = obj.ClassName,
                Source = obj:IsA("LuaSourceContainer") and obj.Source or nil
            })
        end
    end
    
    -- Escanear Players
    for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
        table.insert(scannedData.players, {
            Name = player.Name,
            UserId = player.UserId,
            Health = player.Character and player.Character:FindFirstChild("Humanoid") and player.Character.Humanoid.Health or 0
        })
    end
    
    isScanning = false
    Delta:Notify({Title = "Completo!", Message = "Scan finalizado!", Duration = 3})
end

-- Função para baixar
local function downloadData()
    if not next(scannedData) then
        Delta:Notify({Title = "Erro", Message = "Execute o scan primeiro!", Duration = 3})
        return
    end
    
    local json = game:GetService("HttpService"):JSONEncode(scannedData)
    writefile(OUTPUT_FILE, json)
    Delta:Notify({Title = "Sucesso!", Message = "Dados salvos em: " .. OUTPUT_FILE, Duration = 5})
end

-- Criar UI
local window = Delta:CreateWindow({
    Title = "Game Scanner - Simples",
    Size = Vector2.new(300, 150)
})

window:AddLabel({Text = "Roblox Game Scanner", Position = Vector2.new(10, 10), Size = Vector2.new(280, 20)})

local scanBtn = window:AddButton({
    Text = "SCAN",
    Position = Vector2.new(10, 40),
    Size = Vector2.new(135, 30)
})

local downloadBtn = window:AddButton({
    Text = "DOWNLOAD",
    Position = Vector2.new(155, 40),
    Size = Vector2.new(135, 30)
})

scanBtn:Connect(function()
    scanBtn:SetEnabled(false)
    scanBtn:SetText("Scanneando...")
    coroutine.wrap(scanGame)()
    scanBtn:SetEnabled(true)
    scanBtn:SetText("SCAN")
end)

downloadBtn:Connect(function()
    downloadData()
end)

Delta:Notify({Title = "Scanner", Message = "Pronto! Clique em SCAN.", Duration = 3})

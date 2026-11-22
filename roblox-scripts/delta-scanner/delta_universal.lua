--[[
SCRIPT UNIVERSAL PARA QUALQUER EXECUTOR ROBLOX
Funciona em: Delta, Synapse X, JJSploit, Script-Ware, etc.

Criado por: Vibe Code (Mistral AI)

FUNCIONALIDADES:
- Botão SCAN: Escaneia o jogo
- Botão DOWNLOAD: Salva dados em JSON
- Botão COPY: Copia para clipboard
- Interface aparece com CERTEZA
]]

-- ============================================
-- CONFIGURAÇÕES
-- ============================================
local OUTPUT_FILENAME = "universal_scan_data.json"
local MAX_INSTANCES = 300  -- Limite para não travar
local SCAN_DEPTH = 3

-- ============================================
-- VARIÁVEIS GLOBAIS
-- ============================================
local scannedData = {}
local isScanning = false
local mainGui = nil
local scanWindow = nil

-- ============================================
-- FUNÇÕES DE NOTIFICAÇÃO
-- ============================================
local function notify(title, message, duration)
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = title,
        Text = message,
        Duration = duration or 5,
        Button1 = "OK"
    })
end

-- ============================================
-- FUNÇÕES DE UI (100% COMPATÍVEL)
-- ============================================

-- Criar janela principal
local function createMainWindow()
    -- Remover GUI existente
    if mainGui then
        mainGui:Destroy()
        mainGui = nil
    end
    
    mainGui = Instance.new("ScreenGui")
    mainGui.Name = "DeltaUniversalScanner"
    mainGui.ResetOnSpawn = false
    mainGui.IgnoreGuiInset = true
    mainGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    
    -- Frame principal
    local frame = Instance.new("Frame")
    frame.Name = "MainFrame"
    frame.Size = UDim2.new(0, 350, 0, 220)
    frame.Position = UDim2.new(0.5, -175, 0.5, -110)
    frame.AnchorPoint = Vector2.new(0.5, 0.5)
    frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    frame.BorderSizePixel = 0
    frame.Active = true
    frame.Draggable = true
    frame.Parent = mainGui
    
    -- Barra de título
    local titleBar = Instance.new("Frame")
    titleBar.Name = "TitleBar"
    titleBar.Size = UDim2.new(1, 0, 0, 35)
    titleBar.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    titleBar.BorderSizePixel = 0
    titleBar.Parent = frame
    
    -- Título
    local title = Instance.new("TextLabel")
    title.Name = "Title"
    title.Size = UDim2.new(1, 0, 1, 0)
    title.BackgroundTransparency = 1
    title.Text = "🎮 Roblox Game Scanner"
    title.TextColor3 = Color3.fromRGB(0, 170, 255)
    title.TextSize = 16
    title.Font = Enum.Font.GothamBold
    title.TextXAlignment = Enum.TextXAlignment.Left
    title.Padding = UDim.new(0, 15, 0, 0)
    title.Parent = titleBar
    
    -- Botão fechar
    local closeBtn = Instance.new("TextButton")
    closeBtn.Name = "CloseButton"
    closeBtn.Size = UDim2.new(0, 30, 0, 30)
    closeBtn.Position = UDim2.new(1, -30, 0, 0)
    closeBtn.AnchorPoint = Vector2.new(1, 0)
    closeBtn.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
    closeBtn.BorderSizePixel = 0
    closeBtn.Text = "X"
    closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    closeBtn.TextSize = 14
    closeBtn.Font = Enum.Font.GothamBold
    closeBtn.Parent = titleBar
    
    closeBtn.MouseButton1Click:Connect(function()
        mainGui:Destroy()
        mainGui = nil
    end)
    
    -- Conteúdo
    local content = Instance.new("Frame")
    content.Name = "Content"
    content.Size = UDim2.new(1, 0, 1, -35)
    content.Position = UDim2.new(0, 0, 0, 35)
    content.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    content.BorderSizePixel = 0
    content.Parent = frame
    
    -- Descrição
    local desc = Instance.new("TextLabel")
    desc.Name = "Description"
    desc.Size = UDim2.new(1, -20, 0, 40)
    desc.Position = UDim2.new(0, 10, 0, 10)
    desc.BackgroundTransparency = 1
    desc.Text = "Scanneie o jogo e baixe\ntodas as informações importantes"
    desc.TextColor3 = Color3.fromRGB(150, 150, 150)
    desc.TextSize = 12
    desc.Font = Enum.Font.Gotham
    desc.TextWrapped = true
    desc.TextXAlignment = Enum.TextXAlignment.Left
    desc.Parent = content
    
    -- Botão SCAN
    local scanBtn = Instance.new("TextButton")
    scanBtn.Name = "ScanButton"
    scanBtn.Size = UDim2.new(0, 160, 0, 40)
    scanBtn.Position = UDim2.new(0, 10, 0, 60)
    scanBtn.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
    scanBtn.BorderSizePixel = 0
    scanBtn.Text = "🔍 SCAN"
    scanBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    scanBtn.TextSize = 14
    scanBtn.Font = Enum.Font.GothamBold
    scanBtn.Parent = content
    
    -- Botão DOWNLOAD
    local downloadBtn = Instance.new("TextButton")
    downloadBtn.Name = "DownloadButton"
    downloadBtn.Size = UDim2.new(0, 160, 0, 40)
    downloadBtn.Position = UDim2.new(0, 180, 0, 60)
    downloadBtn.BackgroundColor3 = Color3.fromRGB(0, 180, 0)
    downloadBtn.BorderSizePixel = 0
    downloadBtn.Text = "⬇️ DOWNLOAD"
    downloadBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    downloadBtn.TextSize = 14
    downloadBtn.Font = Enum.Font.GothamBold
    downloadBtn.Parent = content
    
    -- Botão COPY
    local copyBtn = Instance.new("TextButton")
    copyBtn.Name = "CopyButton"
    copyBtn.Size = UDim2.new(0, 160, 0, 40)
    copyBtn.Position = UDim2.new(0, 10, 0, 110)
    copyBtn.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
    copyBtn.BorderSizePixel = 0
    copyBtn.Text = "📋 COPY"
    copyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    copyBtn.TextSize = 14
    copyBtn.Font = Enum.Font.GothamBold
    copyBtn.Parent = content
    
    -- Botão CLEAR
    local clearBtn = Instance.new("TextButton")
    clearBtn.Name = "ClearButton"
    clearBtn.Size = UDim2.new(0, 160, 0, 40)
    clearBtn.Position = UDim2.new(0, 180, 0, 110)
    clearBtn.BackgroundColor3 = Color3.fromRGB(150, 150, 150)
    clearBtn.BorderSizePixel = 0
    clearBtn.Text = "🗑️ CLEAR"
    clearBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    clearBtn.TextSize = 14
    clearBtn.Font = Enum.Font.GothamBold
    clearBtn.Parent = content
    
    -- Status
    local status = Instance.new("TextLabel")
    status.Name = "Status"
    status.Size = UDim2.new(1, -20, 0, 20)
    status.Position = UDim2.new(0, 10, 0, 160)
    status.BackgroundTransparency = 1
    status.Text = "✅ Pronto!"
    status.TextColor3 = Color3.fromRGB(0, 255, 0)
    status.TextSize = 12
    status.Font = Enum.Font.Gotham
    status.TextXAlignment = Enum.TextXAlignment.Left
    status.Parent = content
    
    -- Adicionar ao jogo
    mainGui.Parent = game:GetService("CoreGui")
    
    return {
        Frame = frame,
        ScanButton = scanBtn,
        DownloadButton = downloadBtn,
        CopyButton = copyBtn,
        ClearButton = clearBtn,
        StatusLabel = status,
        Destroy = function()
            if mainGui then
                mainGui:Destroy()
                mainGui = nil
            end
        end
    }
end

-- Criar janela de progresso
local function createScanWindow()
    if scanWindow then
        scanWindow:Destroy()
        scanWindow = nil
    end
    
    scanWindow = Instance.new("ScreenGui")
    scanWindow.Name = "ScanWindow"
    scanWindow.ResetOnSpawn = false
    scanWindow.IgnoreGuiInset = true
    scanWindow.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
    
    local frame = Instance.new("Frame")
    frame.Name = "ScanFrame"
    frame.Size = UDim2.new(0, 300, 0, 120)
    frame.Position = UDim2.new(0.5, -150, 0.5, -60)
    frame.AnchorPoint = Vector2.new(0.5, 0.5)
    frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    frame.BorderSizePixel = 0
    frame.Parent = scanWindow
    
    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 0, 30)
    title.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    title.BorderSizePixel = 0
    title.Text = "Scanneando..."
    title.TextColor3 = Color3.fromRGB(255, 255, 255)
    title.TextSize = 16
    title.Font = Enum.Font.GothamBold
    title.Parent = frame
    
    local progressText = Instance.new("TextLabel")
    progressText.Name = "ProgressText"
    progressText.Size = UDim2.new(1, -20, 0, 20)
    progressText.Position = UDim2.new(0, 10, 0, 40)
    progressText.BackgroundTransparency = 1
    progressText.Text = "0 instâncias escaneadas"
    progressText.TextColor3 = Color3.fromRGB(200, 200, 200)
    progressText.TextSize = 12
    progressText.Font = Enum.Font.Gotham
    progressText.TextXAlignment = Enum.TextXAlignment.Left
    progressText.Parent = frame
    
    local progressBar = Instance.new("Frame")
    progressBar.Name = "ProgressBar"
    progressBar.Size = UDim2.new(1, -20, 0, 10)
    progressBar.Position = UDim2.new(0, 10, 0, 70)
    progressBar.BackgroundColor3 = Color3.fromRGB(60, 60, 60)
    progressBar.BorderSizePixel = 0
    progressBar.Parent = frame
    
    local progressFill = Instance.new("Frame")
    progressFill.Name = "ProgressFill"
    progressFill.Size = UDim2.new(0, 0, 1, 0)
    progressFill.BackgroundColor3 = Color3.fromRGB(0, 170, 255)
    progressFill.BorderSizePixel = 0
    progressFill.Parent = progressBar
    
    scanWindow.Parent = game:GetService("CoreGui")
    
    return {
        Frame = frame,
        ProgressText = progressText,
        ProgressFill = progressFill,
        SetProgress = function(self, current, max)
            local percent = (current / max) * 100
            progressFill.Size = UDim2.new(percent / 100, 0, 1, 0)
            progressText.Text = current .. "/" .. max .. " instâncias"
        end,
        Destroy = function()
            if scanWindow then
                scanWindow:Destroy()
                scanWindow = nil
            end
        end
    }
end

-- ============================================
-- FUNÇÕES DE SCAN
-- ============================================

local function isImportantInstance(instance)
    local importantClasses = {
        "Script", "LocalScript", "ModuleScript",
        "Model", "Part", "MeshPart", "TrussPart",
        "SpawnLocation", "Tool", "Weapon", "Accessory",
        "Hat", "Humanoid", "Animation", "Sound",
        "ParticleEmitter", "Fire", "Smoke",
        "Decal", "Texture", "ClickDetector",
        "ProximityPrompt", "RemoteEvent", "RemoteFunction",
        "BindableEvent", "BindableFunction", "Folder"
    }
    
    for _, class in ipairs(importantClasses) do
        if instance:IsA(class) then
            return true
        end
    end
    return false
end

local function serializeInstance(instance, depth)
    depth = depth or 0
    if depth > SCAN_DEPTH then return nil end
    
    local data = {
        Name = instance.Name,
        ClassName = instance.ClassName,
        FullName = instance:GetFullName(),
        Parent = instance.Parent and instance.Parent.Name or "nil"
    }
    
    -- Propriedades importantes
    local props = {"Position", "Size", "CFrame", "Anchored", "CanCollide", 
                   "Transparency", "Color", "Material", "BrickColor",
                   "SoundId", "Volume", "Playing", "Enabled", "Visible",
                   "Health", "MaxHealth", "WalkSpeed", "JumpPower",
                   "Brightness", "ClockTime", "FogStart", "FogEnd", "Gravity"}
    
    for _, prop in ipairs(props) do
        local success, value = pcall(function() return instance[prop] end)
        if success and value ~= nil then
            local propType = typeof(value)
            if propType == "CFrame" then
                data[prop] = "CFrame(" .. value.X .. ", " .. value.Y .. ", " .. value.Z .. ")"
            elseif propType == "Vector3" then
                data[prop] = "Vector3(" .. value.X .. ", " .. value.Y .. ", " .. value.Z .. ")"
            elseif propType == "Color3" then
                data[prop] = "Color3(" .. value.R .. ", " .. value.G .. ", " .. value.B .. ")"
            elseif propType == "BrickColor" then
                data[prop] = tostring(value)
            elseif propType == "Instance" then
                data[prop] = value.Name
            else
                data[prop] = tostring(value)
            end
        end
    end
    
    -- Source de scripts
    if instance:IsA("LuaSourceContainer") then
        local success, source = pcall(function() return instance.Source end)
        if success and source and source ~= "" then
            data.Source = source
        end
    end
    
    return data
end

-- Função principal de scan
local function scanGame()
    if isScanning then return end
    isScanning = true
    
    -- Criar janela de progresso
    local scanGui = createScanWindow()
    
    scannedData = {
        gameInfo = {
            GameName = game:GetService("MarketplaceService").ProductInfo.GameName or "Unknown",
            GameId = game.GameId,
            PlaceId = game.PlaceId,
            PlaceVersion = game.PlaceVersion,
            JobId = game.JobId,
            CreatorId = game.CreatorId,
            CurrentTime = os.time()
        },
        workspace = {},
        lighting = {},
        replicatedStorage = {},
        serverScriptService = {},
        players = {}
    }
    
    -- Contar instâncias
    local totalInstances = 0
    local services = {"Workspace", "Lighting", "ReplicatedStorage", "ServerScriptService"}
    
    for _, serviceName in ipairs(services) do
        local service = game:GetService(serviceName)
        if service then
            for _, instance in ipairs(service:GetDescendants()) do
                if isImportantInstance(instance) then
                    totalInstances = totalInstances + 1
                end
            end
        end
    end
    
    totalInstances = math.min(totalInstances, MAX_INSTANCES)
    local currentProgress = 0
    
    -- Scan Workspace
    local workspace = game:GetService("Workspace")
    for _, instance in ipairs(workspace:GetDescendants()) do
        if currentProgress >= MAX_INSTANCES then break end
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(scannedData.workspace, instanceData)
                currentProgress = currentProgress + 1
                scanGui:SetProgress(currentProgress, totalInstances)
            end
        end
    end
    
    -- Scan Lighting
    local lighting = game:GetService("Lighting")
    scannedData.lighting = {
        Brightness = lighting.Brightness,
        ClockTime = lighting.ClockTime,
        FogStart = lighting.FogStart,
        FogEnd = lighting.FogEnd,
        Ambient = tostring(lighting.Ambient),
        Gravity = lighting.Gravity
    }
    currentProgress = currentProgress + 1
    scanGui:SetProgress(currentProgress, totalInstances)
    
    -- Scan ReplicatedStorage
    local rs = game:GetService("ReplicatedStorage")
    for _, instance in ipairs(rs:GetDescendants()) do
        if currentProgress >= MAX_INSTANCES then break end
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(scannedData.replicatedStorage, instanceData)
                currentProgress = currentProgress + 1
                scanGui:SetProgress(currentProgress, totalInstances)
            end
        end
    end
    
    -- Scan ServerScriptService
    local sss = game:GetService("ServerScriptService")
    for _, instance in ipairs(sss:GetDescendants()) do
        if currentProgress >= MAX_INSTANCES then break end
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(scannedData.serverScriptService, instanceData)
                currentProgress = currentProgress + 1
                scanGui:SetProgress(currentProgress, totalInstances)
            end
        end
    end
    
    -- Scan Players
    for _, player in ipairs(game:GetService("Players"):GetPlayers()) do
        local playerData = {
            Name = player.Name,
            UserId = player.UserId,
            AccountAge = player.AccountAge,
            Character = {},
            Backpack = {}
        }
        
        if player.Character then
            for _, part in ipairs(player.Character:GetDescendants()) do
                if part:IsA("BasePart") or part:IsA("Humanoid") then
                    table.insert(playerData.Character, {
                        Name = part.Name,
                        ClassName = part.ClassName,
                        Position = part:IsA("BasePart") and {part.Position.X, part.Position.Y, part.Position.Z} or nil
                    })
                end
            end
        end
        
        if player:FindFirstChild("Backpack") then
            for _, item in ipairs(player.Backpack:GetChildren()) do
                table.insert(playerData.Backpack, {
                    Name = item.Name,
                    ClassName = item.ClassName
                })
            end
        end
        
        table.insert(scannedData.players, playerData)
        currentProgress = currentProgress + 1
        scanGui:SetProgress(currentProgress, totalInstances)
    end
    
    -- Fechar janela de progresso
    scanGui:Destroy()
    isScanning = false
    
    notify("✅ Scan Completo!", "Jogo escaneado com sucesso!\n" .. currentProgress .. " instâncias encontradas.", 5)
end

-- Função para baixar
local function downloadData()
    if not scannedData or not next(scannedData) then
        notify("❌ Erro", "Nenhum dado para baixar.\nExecute o SCAN primeiro!", 3)
        return
    end
    
    local http = game:GetService("HttpService")
    local jsonData = http:JSONEncode(scannedData)
    
    local success, err = pcall(function()
        writefile(OUTPUT_FILENAME, jsonData)
    end)
    
    if success then
        notify("✅ Download Completo!", "Dados salvos em: " .. OUTPUT_FILENAME .. "\nTamanho: " .. #jsonData .. " bytes", 5)
    else
        notify("❌ Erro ao Salvar", "Não foi possível salvar: " .. tostring(err), 5)
    end
end

-- Função para copiar
local function copyData()
    if not scannedData or not next(scannedData) then
        notify("❌ Erro", "Nenhum dado para copiar.\nExecute o SCAN primeiro!", 3)
        return
    end
    
    local http = game:GetService("HttpService")
    local jsonData = http:JSONEncode(scannedData)
    
    local success, err = pcall(function()
        setclipboard(jsonData)
    end)
    
    if success then
        notify("✅ Copiado!", "Dados copiados para clipboard!\nTamanho: " .. #jsonData .. " bytes", 5)
    else
        notify("❌ Erro ao Copiar", "Não foi possível copiar: " .. tostring(err), 5)
    end
end

-- Função para limpar dados
local function clearData()
    scannedData = {}
    notify("🗑️ Dados Limpos", "Todos os dados foram apagados.", 3)
end

-- ============================================
-- INICIALIZAR
-- ============================================

-- Criar interface
local ui = createMainWindow()

-- Conectar botões
ui.ScanButton.MouseButton1Click:Connect(function()
    ui.ScanButton.Text = "Scanneando..."
    ui.ScanButton.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
    ui.ScanButton.Active = false
    
    coroutine.wrap(function()
        scanGame()
        ui.ScanButton.Text = "🔍 SCAN"
        ui.ScanButton.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
        ui.ScanButton.Active = true
    end)()
end)

ui.DownloadButton.MouseButton1Click:Connect(function()
    downloadData()
end)

ui.CopyButton.MouseButton1Click:Connect(function()
    copyData()
end)

ui.ClearButton.MouseButton1Click:Connect(function()
    clearData()
end)

-- Notificação inicial
notify("🎮 Game Scanner", "Script carregado!\nClique em SCAN para começar.", 5)

print("✅ Universal Scanner carregado com sucesso!")
print("📊 Interface criada - verifique na tela!")

-- Retornar funções para execução manual
return {
    Scan = scanGame,
    Download = downloadData,
    Copy = copyData,
    Clear = clearData
}

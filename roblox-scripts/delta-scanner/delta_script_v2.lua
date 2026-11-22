--[[
SCRIPT PARA EXECUTOR DELTA - ROBLOX (Versão 2 - Compatível)
Scanneia o jogo e permite baixar as informações importantes
Criado por: Vibe Code (Mistral AI)

NOTA: Se o Delta não tiver a API Delta:CreateWindow, 
este script usa a API padrão do Roblox com Synapse X / JJSploit
]]

-- ============================================
-- VERIFICAR API DO DELTA
-- ============================================
local DeltaAPI = nil
local hasDelta = false

-- Tentar detectar Delta Executor
if Delta and type(Delta) == "table" then
    -- Verificar se tem os métodos necessários
    if Delta.CreateWindow or Delta:CreateWindow then
        hasDelta = true
        DeltaAPI = Delta
    end
end

-- ============================================
-- FUNÇÕES DE UI (Compatíveis)
-- ============================================
local UI = {}

-- Criar janela usando Delta API ou Synapse
function UI.CreateWindow(options)
    options = options or {}
    
    if hasDelta then
        -- Usar API do Delta
        if DeltaAPI.CreateWindow then
            return DeltaAPI:CreateWindow(options)
        else
            return DeltaAPI.CreateWindow(options)
        end
    else
        -- Usar Synapse X ou similar
        local window = Instance.new("ScreenGui")
        window.Name = options.Title or "Window"
        window.ResetOnSpawn = false
        window.IgnoreGuiInset = true
        
        local frame = Instance.new("Frame")
        frame.Name = "MainFrame"
        frame.Size = UDim2.new(0, options.Size.X or 400, 0, options.Size.Y or 300)
        frame.Position = UDim2.new(0, options.Position.X or 100, 0, options.Position.Y or 100)
        frame.BackgroundColor3 = Color3.fromRGB(45, 45, 45)
        frame.BorderSizePixel = 0
        frame.Active = true
        frame.Draggable = true
        
        local titleBar = Instance.new("Frame")
        titleBar.Name = "TitleBar"
        titleBar.Size = UDim2.new(1, 0, 0, 30)
        titleBar.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
        titleBar.BorderSizePixel = 0
        titleBar.Parent = frame
        
        local titleLabel = Instance.new("TextLabel")
        titleLabel.Name = "Title"
        titleLabel.Size = UDim2.new(1, 0, 1, 0)
        titleLabel.BackgroundTransparency = 1
        titleLabel.Text = options.Title or "Window"
        titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
        titleLabel.TextSize = 16
        titleLabel.Font = Enum.Font.GothamBold
        titleLabel.TextXAlignment = Enum.TextXAlignment.Left
        titleLabel.Padding = UDim.new(0, 10, 0, 0)
        titleLabel.Parent = titleBar
        
        local contentFrame = Instance.new("Frame")
        contentFrame.Name = "Content"
        contentFrame.Size = UDim2.new(1, 0, 1, -30)
        contentFrame.Position = UDim2.new(0, 0, 0, 30)
        contentFrame.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
        contentFrame.BorderSizePixel = 0
        contentFrame.Parent = frame
        
        window.Parent = game:GetService("CoreGui") or game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
        
        local windowObj = {
            Frame = frame,
            Content = contentFrame,
            Elements = {},
            Destroy = function(self)
                window:Destroy()
            end
        }
        
        return windowObj
    end
end

function UI.AddLabel(window, options)
    options = options or {}
    
    if hasDelta then
        return window:AddLabel(options)
    else
        local label = Instance.new("TextLabel")
        label.Name = "Label"
        label.Size = UDim2.new(0, options.Size.X or 100, 0, options.Size.Y or 20)
        label.Position = UDim2.new(0, options.Position.X or 0, 0, options.Position.Y or 0)
        label.BackgroundTransparency = 1
        label.Text = options.Text or ""
        label.TextColor3 = options.TextColor or Color3.fromRGB(255, 255, 255)
        label.TextSize = options.TextSize or 14
        label.Font = options.Font or Enum.Font.Gotham
        label.TextXAlignment = options.TextXAlignment or Enum.TextXAlignment.Left
        label.TextWrapped = true
        label.Parent = window.Content
        
        return label
    end
end

function UI.AddButton(window, options)
    options = options or {}
    
    if hasDelta then
        local btn = window:AddButton(options)
        return btn
    else
        local button = Instance.new("TextButton")
        button.Name = "Button"
        button.Size = UDim2.new(0, options.Size.X or 100, 0, options.Size.Y or 30)
        button.Position = UDim2.new(0, options.Position.X or 0, 0, options.Position.Y or 0)
        button.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
        button.BorderSizePixel = 0
        button.Text = options.Text or "Button"
        button.TextColor3 = Color3.fromRGB(255, 255, 255)
        button.TextSize = options.TextSize or 14
        button.Font = options.Font or Enum.Font.GothamBold
        button.Parent = window.Content
        
        local buttonObj = {
            Button = button,
            SetText = function(self, text)
                button.Text = text
            end,
            SetEnabled = function(self, enabled)
                button.Active = enabled
                button.TextColor3 = enabled and Color3.fromRGB(255, 255, 255) or Color3.fromRGB(150, 150, 150)
            end,
            Connect = function(self, callback)
                button.MouseButton1Click:Connect(callback)
            end
        }
        
        return buttonObj
    end
end

function UI.Notify(options)
    options = options or {}
    
    if hasDelta then
        DeltaAPI:Notify(options)
    else
        -- Usar notificação do Roblox
        game:GetService("StarterGui"):SetCore("SendNotification", {
            Title = options.Title or "Notification",
            Text = options.Message or "",
            Duration = options.Duration or 5
        })
    end
end

-- ============================================
-- CONFIGURAÇÕES
-- ============================================
local SCAN_DEPTH = 5  -- Profundidade máxima de scan
local MAX_INSTANCES = 500  -- Limite de instâncias para evitar lag
local OUTPUT_FILENAME = "delta_scan_data.json"

-- ============================================
-- VARIÁVEIS GLOBAIS
-- ============================================
local scannedData = {}
local isScanning = false
local scanProgress = 0
local mainWindow = nil
local scanWindow = nil

-- ============================================
-- FUNÇÕES AUXILIARES
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
        Parent = instance.Parent and instance.Parent.Name or "nil",
        Properties = {},
        Children = {}
    }
    
    -- Coletar propriedades importantes
    local importantProperties = {
        "Position", "Size", "Rotation", "CFrame", "Anchored",
        "CanCollide", "Transparency", "Color", "Material",
        "BrickColor", "Texture", "SoundId", "Volume",
        "Pitch", "Playing", "Loop", "Source", "Enabled",
        "Visible", "Health", "MaxHealth", "WalkSpeed",
        "JumpPower", "Brightness", "ClockTime",
        "FogStart", "FogEnd", "Gravity"
    }
    
    for _, prop in ipairs(importantProperties) do
        local success, value = pcall(function() return instance[prop] end)
        if success and value ~= nil then
            local propType = typeof(value)
            if propType == "CFrame" then
                data.Properties[prop] = "CFrame(" .. value.X .. ", " .. value.Y .. ", " .. value.Z .. ")"
            elseif propType == "Vector3" then
                data.Properties[prop] = "Vector3(" .. value.X .. ", " .. value.Y .. ", " .. value.Z .. ")"
            elseif propType == "Color3" then
                data.Properties[prop] = "Color3(" .. value.R .. ", " .. value.G .. ", " .. value.B .. ")"
            elseif propType == "BrickColor" then
                data.Properties[prop] = tostring(value)
            elseif propType == "Instance" then
                data.Properties[prop] = value.Name
            else
                data.Properties[prop] = tostring(value)
            end
        end
    end
    
    -- Coletar scripts (conteúdo)
    if instance:IsA("LuaSourceContainer") then
        local success, source = pcall(function() return instance.Source end)
        if success and source and source ~= "" then
            data.Source = source
        end
    end
    
    -- Coletar filhos importantes
    if depth < SCAN_DEPTH then
        for _, child in ipairs(instance:GetChildren()) do
            if isImportantInstance(child) and #data.Children < 50 then
                local childData = serializeInstance(child, depth + 1)
                if childData then
                    table.insert(data.Children, childData)
                end
            end
        end
    end
    
    return data
end

-- ============================================
-- FUNÇÃO PRINCIPAL DE SCAN
-- ============================================
local function scanGame()
    if isScanning then return end
    isScanning = true
    scanProgress = 0
    scannedData = {
        gameInfo = {},
        workspace = {},
        lighting = {},
        replicatedStorage = {},
        players = {}
    }
    
    -- Criar janela de progresso
    scanWindow = UI.CreateWindow({
        Title = "Scanneando Jogo...",
        Size = Vector2.new(300, 150),
        Position = Vector2.new(100, 100)
    })
    
    UI.AddLabel(scanWindow, {
        Text = "Scanneando o jogo...",
        Position = Vector2.new(10, 10),
        Size = Vector2.new(280, 20)
    })
    
    -- Coletar informações básicas do jogo
    scannedData.gameInfo = {
        GameName = game:GetService("MarketplaceService").ProductInfo.GameName or "Unknown",
        GameId = game.GameId,
        PlaceId = game.PlaceId,
        PlaceVersion = game.PlaceVersion,
        JobId = game.JobId,
        CreatorId = game.CreatorId,
        CurrentTime = os.time()
    }
    
    -- Escanear Workspace
    local workspaceData = {Instances = {}}
    local count = 0
    for _, instance in ipairs(workspace:GetDescendants()) do
        if count >= MAX_INSTANCES then break end
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(workspaceData.Instances, instanceData)
                count = count + 1
                scanProgress = scanProgress + 1
            end
        end
    end
    scannedData.workspace = workspaceData
    
    -- Escanear Lighting
    local lighting = game:GetService("Lighting")
    scannedData.lighting = {
        Brightness = lighting.Brightness,
        ClockTime = lighting.ClockTime,
        FogStart = lighting.FogStart,
        FogEnd = lighting.FogEnd,
        Ambient = tostring(lighting.Ambient),
        Gravity = lighting.Gravity
    }
    scanProgress = scanProgress + 1
    
    -- Escanear ReplicatedStorage
    local rs = game:GetService("ReplicatedStorage")
    local rsData = {Instances = {}}
    for _, instance in ipairs(rs:GetDescendants()) do
        if count >= MAX_INSTANCES then break end
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(rsData.Instances, instanceData)
                count = count + 1
                scanProgress = scanProgress + 1
            end
        end
    end
    scannedData.replicatedStorage = rsData
    
    -- Escanear Players
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
        scanProgress = scanProgress + 1
    end
    
    -- Fechar janela de progresso
    if scanWindow then
        scanWindow:Destroy()
        scanWindow = nil
    end
    
    isScanning = false
    
    UI.Notify({
        Title = "Scan Completo!",
        Message = "Jogo escaneado com sucesso!",
        Duration = 5
    })
end

-- ============================================
-- FUNÇÃO DE DOWNLOAD
-- ============================================
local function downloadData()
    if not scannedData or not next(scannedData) then
        UI.Notify({
            Title = "Erro",
            Message = "Nenhum dado para baixar. Execute o scan primeiro!",
            Duration = 3
        })
        return
    end
    
    -- Converter dados para JSON
    local httpService = game:GetService("HttpService")
    local jsonData = httpService:JSONEncode(scannedData)
    
    -- Salvar em arquivo
    local success, err = pcall(function()
        writefile(OUTPUT_FILENAME, jsonData)
    end)
    
    if success then
        UI.Notify({
            Title = "Download Completo!",
            Message = "Dados salvos em: " .. OUTPUT_FILENAME .. "\nTamanho: " .. #jsonData .. " bytes",
            Duration = 5
        })
    else
        UI.Notify({
            Title = "Erro ao Salvar",
            Message = "Não foi possível salvar: " .. tostring(err),
            Duration = 5
        })
    end
end

-- ============================================
-- FUNÇÃO PARA COPIAR DADOS
-- ============================================
local function copyDataToClipboard()
    if not scannedData or not next(scannedData) then
        UI.Notify({
            Title = "Erro",
            Message = "Nenhum dado para copiar. Execute o scan primeiro!",
            Duration = 3
        })
        return
    end
    
    local httpService = game:GetService("HttpService")
    local jsonData = httpService:JSONEncode(scannedData)
    
    -- Tentar copiar
    local success, err = pcall(function()
        setclipboard(jsonData)
    end)
    
    if success then
        UI.Notify({
            Title = "Copiado!",
            Message = "Dados copiados! Tamanho: " .. #jsonData .. " bytes",
            Duration = 5
        })
    else
        UI.Notify({
            Title = "Erro",
            Message = "Não foi possível copiar: " .. tostring(err),
            Duration = 5
        })
    end
end

-- ============================================
-- CRIAR INTERFACE GRÁFICA
-- ============================================
local function createUI()
    mainWindow = UI.CreateWindow({
        Title = "Game Scanner - Delta Executor",
        Size = Vector2.new(350, 200),
        Position = Vector2.new(100, 100)
    })
    
    UI.AddLabel(mainWindow, {
        Text = "Roblox Game Scanner",
        Position = Vector2.new(10, 10),
        Size = Vector2.new(330, 30),
        TextSize = 18,
        Font = Enum.Font.GothamBold,
        TextColor = Color3.fromRGB(0, 170, 255)
    })
    
    UI.AddLabel(mainWindow, {
        Text = "Scanneie o jogo e baixe as informações",
        Position = Vector2.new(10, 40),
        Size = Vector2.new(330, 20),
        TextSize = 12,
        TextColor = Color3.fromRGB(150, 150, 150)
    })
    
    -- Botão SCAN
    local scanButton = UI.AddButton(mainWindow, {
        Text = "🔍 SCAN",
        Position = Vector2.new(10, 70),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    scanButton:Connect(function()
        scanButton:SetEnabled(false)
        scanButton:SetText("Scanneando...")
        
        coroutine.wrap(function()
            scanGame()
            scanButton:SetEnabled(true)
            scanButton:SetText("🔍 SCAN")
        end)()
    end)
    
    -- Botão DOWNLOAD
    local downloadButton = UI.AddButton(mainWindow, {
        Text = "⬇️ DOWNLOAD",
        Position = Vector2.new(180, 70),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    downloadButton:Connect(function()
        downloadData()
    end)
    
    -- Botão COPY
    local copyButton = UI.AddButton(mainWindow, {
        Text = "📋 COPY",
        Position = Vector2.new(10, 120),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    copyButton:Connect(function()
        copyDataToClipboard()
    end)
    
    -- Label de status
    local statusLabel = UI.AddLabel(mainWindow, {
        Text = "Pronto!",
        Position = Vector2.new(10, 170),
        Size = Vector2.new(330, 20),
        TextSize = 12,
        TextColor = Color3.fromRGB(0, 255, 0)
    })
end

-- ============================================
-- INICIALIZAR
-- ============================================

-- Criar UI
createUI()

-- Notificação inicial
UI.Notify({
    Title = "Game Scanner",
    Message = "Script carregado! Clique em SCAN para começar.",
    Duration = 5
})

print("Delta Scanner v2 carregado com sucesso!")
print("API Delta detectada: " .. tostring(hasDelta))

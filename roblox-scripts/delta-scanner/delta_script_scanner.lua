--[[
SCRIPT PARA EXECUTOR DELTA - ROBLOX
Scanneia o jogo e permite baixar as informações importantes
Criado por: Vibe Code (Mistral AI)
]]

-- ============================================
-- CONFIGURAÇÕES
-- ============================================
local SCAN_DEPTH = 10  -- Profundidade máxima de scan
local MAX_INSTANCES = 1000  -- Limite de instâncias para evitar lag
local OUTPUT_FILENAME = "game_scan_data.json"  -- Nome do arquivo de saída

-- ============================================
-- VARIÁVEIS GLOBAIS
-- ============================================
local scannedData = {
    gameInfo = {},
    workspace = {},
    lighting = {},
    replicationStorage = {},
    serverScriptService = {},
    serverStorage = {},
    starterPack = {},
    starterGui = {},
    starterPlayer = {},
    players = {},
    scripts = {},
    models = {},
    parts = {},
    importantObjects = {}
}

local isScanning = false
local scanProgress = 0
local scanWindow = nil
local mainWindow = nil

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para verificar se uma instância é importante
local function isImportantInstance(instance)
    local importantClasses = {
        "Script", "LocalScript", "ModuleScript",
        "Model", "Part", "MeshPart", "TrussPart",
        "SpawnLocation", "Checkpoint", "Tool",
        "Weapon", "Accessory", "Hat",
        "Humanoid", "Animation", "Sound",
        "ParticleEmitter", "Fire", "Smoke",
        "Decal", "Texture", "ClickDetector",
        "ProximityPrompt", "Tween", "BodyMover",
        "BodyVelocity", "BodyGyro", "BodyForce",
        "RemoteEvent", "RemoteFunction", "BindableEvent",
        "BindableFunction", "ValueBase", "Folder"
    }
    
    for _, class in ipairs(importantClasses) do
        if instance:IsA(class) then
            return true
        end
    end
    return false
end

-- Função para serializar uma instância
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
        "JumpPower", "Gravity", "Brightness", "ClockTime",
        "FogStart", "FogEnd", "Ambient", "ColorShift_Bottom",
        "ColorShift_Top", "Technology", "Distance", "Range",
        "MaxParts", "AutoJumpEnabled", "AutoRotate",
        "RespawnTime", "AllowTeamChangeOnTouch", "NeutralOnTouch"
    }
    
    for _, prop in ipairs(importantProperties) do
        local success, value = pcall(function() return instance[prop] end)
        if success and value ~= nil then
            -- Converter tipos complexos para string
            if typeof(value) == "CFrame" then
                data.Properties[prop] = {value.X, value.Y, value.Z, value:toEulerAnglesXYZ()}
            elseif typeof(value) == "Vector3" then
                data.Properties[prop] = {value.X, value.Y, value.Z}
            elseif typeof(value) == "Color3" then
                data.Properties[prop] = {value.R, value.G, value.B}
            elseif typeof(value) == "BrickColor" then
                data.Properties[prop] = tostring(value)
            elseif typeof(value) == "Instance" then
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
            if isImportantInstance(child) then
                local childData = serializeInstance(child, depth + 1)
                if childData then
                    table.insert(data.Children, childData)
                end
            end
        end
    end
    
    return data
end

-- Função para escanear um serviço
local function scanService(service, serviceName)
    if not service or not service:IsA("Instance") then return end
    
    local serviceData = {
        Name = serviceName,
        ClassName = service.ClassName,
        Instances = {}
    }
    
    local count = 0
    for _, instance in ipairs(service:GetDescendants()) do
        if count >= MAX_INSTANCES then break end
        
        if isImportantInstance(instance) then
            local instanceData = serializeInstance(instance, 0)
            if instanceData then
                table.insert(serviceData.Instances, instanceData)
                count = count + 1
                
                -- Atualizar progresso
                scanProgress = scanProgress + 1
                if scanWindow then
                    scanWindow:SetProgress(scanProgress)
                end
            end
        end
    end
    
    return serviceData
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
        replicationStorage = {},
        serverScriptService = {},
        serverStorage = {},
        starterPack = {},
        starterGui = {},
        starterPlayer = {},
        players = {},
        scripts = {},
        models = {},
        parts = {},
        importantObjects = {}
    }
    
    -- Criar janela de progresso
    scanWindow = Delta:CreateWindow({
        Title = "Scanneando Jogo...",
        Size = Vector2.new(300, 150),
        Position = Vector2.new(100, 100)
    })
    
    scanWindow:AddLabel({
        Text = "Scanneando o jogo...",
        Position = Vector2.new(10, 10),
        Size = Vector2.new(280, 20)
    })
    
    local progressBar = scanWindow:AddProgressBar({
        Position = Vector2.new(10, 40),
        Size = Vector2.new(280, 20),
        Min = 0,
        Max = 100
    })
    
    -- Coletar informações básicas do jogo
    scannedData.gameInfo = {
        GameName = game:GetService("MarketplaceService").ProductInfo.GameName or "Unknown",
        GameId = game.GameId,
        PlaceId = game.PlaceId,
        PlaceVersion = game.PlaceVersion,
        JobId = game.JobId,
        CreatorId = game.CreatorId,
        CreatorType = game.CreatorTypeEnum[game.CreatorType].Name,
        UniverseId = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).UniverseId or "Unknown",
        CurrentTime = os.time(),
        PlayersCount = #game:GetService("Players"):GetPlayers()
    }
    
    -- Contar quantas instâncias vamos escanear
    local totalInstances = 0
    local servicesToScan = {
        "Workspace", "Lighting", "ReplicatedStorage", 
        "ServerScriptService", "ServerStorage", "StarterPack",
        "StarterGui", "StarterPlayer"
    }
    
    for _, serviceName in ipairs(servicesToScan) do
        local service = game:GetService(serviceName)
        if service then
            for _, instance in ipairs(service:GetDescendants()) do
                if isImportantInstance(instance) then
                    totalInstances = totalInstances + 1
                end
            end
        end
    end
    
    -- Limitar o total
    totalInstances = math.min(totalInstances, MAX_INSTANCES)
    progressBar:SetMax(totalInstances)
    
    -- Escanear cada serviço
    for _, serviceName in ipairs(servicesToScan) do
        local service = game:GetService(serviceName)
        if service then
            scannedData[serviceName:lower()] = scanService(service, serviceName)
        end
    end
    
    -- Escanear players
    local playersService = game:GetService("Players")
    for _, player in ipairs(playersService:GetPlayers()) do
        local playerData = {
            Name = player.Name,
            UserId = player.UserId,
            AccountAge = player.AccountAge,
            Character = {},
            Backpack = {}
        }
        
        -- Character
        if player.Character then
            for _, part in ipairs(player.Character:GetDescendants()) do
                if part:IsA("BasePart") or part:IsA("Humanoid") or part:IsA("Accessory") then
                    table.insert(playerData.Character, {
                        Name = part.Name,
                        ClassName = part.ClassName,
                        Position = part:IsA("BasePart") and {part.Position.X, part.Position.Y, part.Position.Z} or nil
                    })
                end
            end
        end
        
        -- Backpack
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
        progressBar:SetProgress(scanProgress)
    end
    
    -- Fechar janela de progresso
    if scanWindow then
        scanWindow:Destroy()
        scanWindow = nil
    end
    
    isScanning = false
    
    -- Mostrar notificação
    Delta:Notify({
        Title = "Scan Completo!",
        Message = "Jogo escaneado com sucesso! " .. totalInstances .. " instâncias encontradas.",
        Duration = 5
    })
end

-- ============================================
-- FUNÇÃO DE DOWNLOAD
-- ============================================
local function downloadData()
    if not scannedData or not next(scannedData) then
        Delta:Notify({
            Title = "Erro",
            Message = "Nenhum dado para baixar. Execute o scan primeiro!",
            Duration = 3
        })
        return
    end
    
    -- Converter dados para JSON
    local jsonData = game:GetService("HttpService"):JSONEncode(scannedData)
    
    -- Salvar em arquivo
    local success, err = pcall(function()
        writefile(OUTPUT_FILENAME, jsonData)
    end)
    
    if success then
        Delta:Notify({
            Title = "Download Completo!",
            Message = "Dados salvos em: " .. OUTPUT_FILENAME .. "\nTamanho: " .. #jsonData .. " bytes",
            Duration = 5
        })
    else
        Delta:Notify({
            Title = "Erro ao Salvar",
            Message = "Não foi possível salvar o arquivo: " .. tostring(err),
            Duration = 5
        })
    end
end

-- ============================================
-- FUNÇÃO PARA COPIAR DADOS (alternativa)
-- ============================================
local function copyDataToClipboard()
    if not scannedData or not next(scannedData) then
        Delta:Notify({
            Title = "Erro",
            Message = "Nenhum dado para copiar. Execute o scan primeiro!",
            Duration = 3
        })
        return
    end
    
    local jsonData = game:GetService("HttpService"):JSONEncode(scannedData)
    
    -- Tentar copiar para clipboard
    local success, err = pcall(function()
        game:GetService("StarterGui"):SetCore("SendNotification", {
            Title = "Dados Copiados",
            Text = "Dados copiados para área de transferência!"
        })
        -- Usar clipboard do Delta se disponível
        if Delta.SetClipboard then
            Delta.SetClipboard(jsonData)
        else
            -- Método alternativo
            setclipboard(jsonData)
        end
    end)
    
    if success then
        Delta:Notify({
            Title = "Copiado!",
            Message = "Dados copiados para área de transferência!\nTamanho: " .. #jsonData .. " bytes",
            Duration = 5
        })
    else
        Delta:Notify({
            Title = "Erro ao Copiar",
            Message = "Não foi possível copiar: " .. tostring(err),
            Duration = 5
        })
    end
end

-- ============================================
-- FUNÇÃO PARA VISUALIZAR DADOS
-- ============================================
local function showDataPreview()
    if not scannedData or not next(scannedData) then
        Delta:Notify({
            Title = "Erro",
            Message = "Nenhum dado para visualizar. Execute o scan primeiro!",
            Duration = 3
        })
        return
    end
    
    local previewWindow = Delta:CreateWindow({
        Title = "Preview dos Dados",
        Size = Vector2.new(600, 400),
        Position = Vector2.new(100, 100)
    })
    
    local textBox = previewWindow:AddTextBox({
        Position = Vector2.new(10, 10),
        Size = Vector2.new(580, 350),
        MultiLine = true,
        ReadOnly = true,
        Text = ""
    })
    
    -- Formatando dados para visualização
    local formattedText = "== INFORMAÇÕES DO JOGO ==\n"
    formattedText = formattedText .. "Nome: " .. (scannedData.gameInfo.GameName or "Unknown") .. "\n"
    formattedText = formattedText .. "GameId: " .. (scannedData.gameInfo.GameId or "Unknown") .. "\n"
    formattedText = formattedText .. "PlaceId: " .. (scannedData.gameInfo.PlaceId or "Unknown") .. "\n"
    formattedText = formattedText .. "Criador: " .. (scannedData.gameInfo.CreatorId or "Unknown") .. "\n\n"
    
    formattedText = formattedText .. "== SERVIÇOS ESCANEADOS ==\n"
    formattedText = formattedText .. "Workspace: " .. #(scannedData.workspace.Instances or {}) .. " instâncias\n"
    formattedText = formattedText .. "Lighting: " .. #(scannedData.lighting.Instances or {}) .. " instâncias\n"
    formattedText = formattedText .. "ReplicatedStorage: " .. #(scannedData.replicationStorage.Instances or {}) .. " instâncias\n"
    formattedText = formattedText .. "ServerScriptService: " .. #(scannedData.serverScriptService.Instances or {}) .. " instâncias\n"
    formattedText = formattedText .. "Players: " .. #scannedData.players .. " jogadores\n"
    
    textBox:SetText(formattedText)
end

-- ============================================
-- CRIAR INTERFACE GRÁFICA
-- ============================================
local function createUI()
    -- Criar janela principal
    mainWindow = Delta:CreateWindow({
        Title = "Game Scanner - Delta Executor",
        Size = Vector2.new(350, 200),
        Position = Vector2.new(100, 100),
        Resizable = false
    })
    
    -- Adicionar label de título
    mainWindow:AddLabel({
        Text = "Roblox Game Scanner",
        Position = Vector2.new(10, 10),
        Size = Vector2.new(330, 30),
        Font = Enum.Font.GothamBold,
        TextSize = 18,
        TextColor = Color3.fromRGB(0, 170, 255)
    })
    
    -- Adicionar descrição
    mainWindow:AddLabel({
        Text = "Scanneie o jogo e baixe todas as informações importantes",
        Position = Vector2.new(10, 40),
        Size = Vector2.new(330, 20),
        TextSize = 12,
        TextColor = Color3.fromRGB(150, 150, 150)
    })
    
    -- Botão SCAN
    local scanButton = mainWindow:AddButton({
        Text = "🔍 SCAN",
        Position = Vector2.new(10, 70),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    scanButton:Connect(function()
        scanButton:SetEnabled(false)
        scanButton:SetText("Scanneando...")
        
        -- Executar scan em uma thread separada
        coroutine.wrap(function()
            scanGame()
            scanButton:SetEnabled(true)
            scanButton:SetText("🔍 SCAN")
        end)()
    end)
    
    -- Botão DOWNLOAD
    local downloadButton = mainWindow:AddButton({
        Text = "⬇️ DOWNLOAD",
        Position = Vector2.new(180, 70),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    downloadButton:Connect(function()
        downloadData()
    end)
    
    -- Botão COPY (alternativa)
    local copyButton = mainWindow:AddButton({
        Text = "📋 COPY",
        Position = Vector2.new(10, 120),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    copyButton:Connect(function()
        copyDataToClipboard()
    end)
    
    -- Botão PREVIEW
    local previewButton = mainWindow:AddButton({
        Text = "👁️ PREVIEW",
        Position = Vector2.new(180, 120),
        Size = Vector2.new(160, 40),
        Font = Enum.Font.GothamBold,
        TextSize = 14
    })
    
    previewButton:Connect(function()
        showDataPreview()
    end)
    
    -- Label de status
    local statusLabel = mainWindow:AddLabel({
        Text = "Pronto!",
        Position = Vector2.new(10, 170),
        Size = Vector2.new(330, 20),
        TextSize = 12,
        TextColor = Color3.fromRGB(0, 255, 0)
    })
    
    -- Atualizar status periodicamente
    coroutine.wrap(function()
        while true do
            if isScanning then
                statusLabel:SetText("Scanneando... " .. scanProgress .. " instâncias")
                statusLabel:SetTextColor(Color3.fromRGB(255, 255, 0))
            else
                statusLabel:SetText("Pronto! Total: " .. (scannedData and #scannedData.gameInfo > 0 and "Dados disponíveis" or "Nenhum scan"))
                statusLabel:SetTextColor(Color3.fromRGB(0, 255, 0))
            end
            wait(0.5)
        end
    end)()
end

-- ============================================
-- INICIALIZAR
-- ============================================

-- Verificar se o Delta está disponível
if not Delta then
    error("Delta Executor não detectado! Este script só funciona no executor Delta.")
end

-- Criar UI
createUI()

-- Notificação inicial
Delta:Notify({
    Title = "Game Scanner",
    Message = "Script carregado! Clique em SCAN para começar.",
    Duration = 5
})

-- Retornar informações para debug
return {
    Scan = scanGame,
    Download = downloadData,
    Copy = copyDataToClipboard,
    Preview = showDataPreview
}

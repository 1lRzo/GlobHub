--[[
SCRIPT COM DEBUG - Para verificar o que está acontecendo
Funciona em QUALQUER executor

Este script mostra mensagens no console e notificações
para você ver o que está acontecendo durante o scan.
]]

-- ============================================
-- CONFIGURAÇÕES
-- ============================================
local OUTPUT_FILENAME = "debug_scan.json"
local MAX_OBJECTS = 50  -- Limite baixo para teste

-- ============================================
-- FUNÇÕES DE NOTIFICAÇÃO
-- ============================================
local function notify(title, message, duration)
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = title,
        Text = message,
        Duration = duration or 5
    })
end

local function debugPrint(msg)
    print("[DEBUG] " .. msg)
end

-- ============================================
-- FUNÇÃO SIMPLES DE SCAN (COM DEBUG)
-- ============================================
local function simpleScan()
    debugPrint("=== INICIANDO SCAN ===")
    
    local data = {
        gameInfo = {},
        workspace = {},
        players = {}
    }
    
    -- Passo 1: Informações do jogo
    debugPrint("Passo 1: Coletando informações do jogo...")
    local marketplace = game:GetService("MarketplaceService")
    if marketplace and marketplace.ProductInfo then
        data.gameInfo = {
            GameName = marketplace.ProductInfo.GameName or "Unknown",
            GameId = game.GameId or "Unknown",
            PlaceId = game.PlaceId or "Unknown",
            CreatorId = game.CreatorId or "Unknown"
        }
        debugPrint("  GameName: " .. tostring(data.gameInfo.GameName))
        debugPrint("  GameId: " .. tostring(data.gameInfo.GameId))
    else
        debugPrint("  AVISO: MarketplaceService não disponível")
    end
    
    -- Passo 2: Workspace
    debugPrint("Passo 2: Scanneando Workspace...")
    local workspace = game:GetService("Workspace")
    if workspace then
        local count = 0
        for _, obj in ipairs(workspace:GetChildren()) do
            if count >= MAX_OBJECTS then break end
            
            -- Apenas partes e modelos
            if obj:IsA("Part") or obj:IsA("Model") then
                table.insert(data.workspace, {
                    Name = obj.Name,
                    Class = obj.ClassName,
                    Position = obj:IsA("BasePart") and {obj.Position.X, obj.Position.Y, obj.Position.Z} or nil
                })
                count = count + 1
                debugPrint("  Encontrado: " .. obj.ClassName .. " - " .. obj.Name)
            end
        end
        debugPrint("  Total em Workspace: " .. count .. " objetos")
    else
        debugPrint("  ERRO: Workspace não encontrado")
    end
    
    -- Passo 3: Players
    debugPrint("Passo 3: Scanneando Players...")
    local playersService = game:GetService("Players")
    if playersService then
        for _, player in ipairs(playersService:GetPlayers()) do
            table.insert(data.players, {
                Name = player.Name,
                UserId = player.UserId
            })
            debugPrint("  Jogador: " .. player.Name .. " (ID: " .. player.UserId .. ")")
        end
        debugPrint("  Total de jogadores: " .. #data.players)
    else
        debugPrint("  ERRO: Players service não encontrado")
    end
    
    debugPrint("=== SCAN COMPLETO ===")
    debugPrint("Total de dados coletados:")
    debugPrint("  Workspace: " .. #data.workspace .. " objetos")
    debugPrint("  Players: " .. #data.players .. " jogadores")
    
    return data
end

-- ============================================
-- FUNÇÃO PARA SALVAR
-- ============================================
local function saveData(data)
    if not data or not next(data) then
        notify("❌ Erro", "Nenhum dado para salvar!", 3)
        return false
    end
    
    local http = game:GetService("HttpService")
    local json = http:JSONEncode(data)
    
    local success, err = pcall(function()
        writefile(OUTPUT_FILENAME, json)
    end)
    
    if success then
        notify("✅ Salvo!", "Dados salvos em: " .. OUTPUT_FILENAME, 5)
        debugPrint("Arquivo salvo com sucesso!")
        return true
    else
        notify("❌ Erro", "Não foi possível salvar: " .. tostring(err), 5)
        debugPrint("Erro ao salvar: " .. tostring(err))
        return false
    end
end

-- ============================================
-- FUNÇÃO PARA COPIAR
-- ============================================
local function copyData(data)
    if not data or not next(data) then
        notify("❌ Erro", "Nenhum dado para copiar!", 3)
        return false
    end
    
    local http = game:GetService("HttpService")
    local json = http:JSONEncode(data)
    
    local success, err = pcall(function()
        setclipboard(json)
    end)
    
    if success then
        notify("✅ Copiado!", "Dados copiados para clipboard!", 5)
        debugPrint("Dados copiados para clipboard!")
        return true
    else
        notify("❌ Erro", "Não foi possível copiar: " .. tostring(err), 5)
        debugPrint("Erro ao copiar: " .. tostring(err))
        return false
    end
end

-- ============================================
-- CRIAR UI SIMPLES
-- ============================================
local function createUI()
    local gui = Instance.new("ScreenGui")
    gui.Name = "DebugScanner"
    gui.ResetOnSpawn = false
    gui.Parent = game:GetService("CoreGui")
    
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(0, 250, 0, 150)
    frame.Position = UDim2.new(0.5, -125, 0.5, -75)
    frame.AnchorPoint = Vector2.new(0.5, 0.5)
    frame.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
    frame.BorderSizePixel = 0
    frame.Active = true
    frame.Draggable = true
    frame.Parent = gui
    
    local title = Instance.new("TextLabel")
    title.Size = UDim2.new(1, 0, 0, 30)
    title.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    title.BorderSizePixel = 0
    title.Text = "DEBUG SCANNER"
    title.TextColor3 = Color3.fromRGB(0, 200, 255)
    title.TextSize = 16
    title.Font = Enum.Font.GothamBold
    title.Parent = frame
    
    local scanBtn = Instance.new("TextButton")
    scanBtn.Size = UDim2.new(0, 230, 0, 35)
    scanBtn.Position = UDim2.new(0, 10, 0, 40)
    scanBtn.BackgroundColor3 = Color3.fromRGB(0, 150, 0)
    scanBtn.BorderSizePixel = 0
    scanBtn.Text = "🔍 SCAN (DEBUG)"
    scanBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    scanBtn.TextSize = 14
    scanBtn.Font = Enum.Font.GothamBold
    scanBtn.Parent = frame
    
    local saveBtn = Instance.new("TextButton")
    saveBtn.Size = UDim2.new(0, 110, 0, 35)
    saveBtn.Position = UDim2.new(0, 10, 0, 85)
    saveBtn.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
    saveBtn.BorderSizePixel = 0
    saveBtn.Text = "⬇️ SAVE"
    saveBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    saveBtn.TextSize = 14
    saveBtn.Font = Enum.Font.GothamBold
    saveBtn.Parent = frame
    
    local copyBtn = Instance.new("TextButton")
    copyBtn.Size = UDim2.new(0, 110, 0, 35)
    copyBtn.Position = UDim2.new(0, 130, 0, 85)
    copyBtn.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
    copyBtn.BorderSizePixel = 0
    copyBtn.Text = "📋 COPY"
    copyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
    copyBtn.TextSize = 14
    copyBtn.Font = Enum.Font.GothamBold
    copyBtn.Parent = frame
    
    local scannedData = nil
    
    scanBtn.MouseButton1Click:Connect(function()
        scanBtn.Text = "Scanneando..."
        scanBtn.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
        
        coroutine.wrap(function()
            scannedData = simpleScan()
            scanBtn.Text = "🔍 SCAN (DEBUG)"
            scanBtn.BackgroundColor3 = Color3.fromRGB(0, 150, 0)
            notify("✅ Scan Completo!", "Verifique o console (F9) para ver os dados!", 5)
        end)()
    end)
    
    saveBtn.MouseButton1Click:Connect(function()
        if scannedData then
            saveData(scannedData)
        else
            notify("❌ Erro", "Execute o SCAN primeiro!", 3)
        end
    end)
    
    copyBtn.MouseButton1Click:Connect(function()
        if scannedData then
            copyData(scannedData)
        else
            notify("❌ Erro", "Execute o SCAN primeiro!", 3)
        end
    end)
end

-- ============================================
-- INICIALIZAR
-- ============================================

-- Criar UI
createUI()

-- Notificação inicial
notify("🔍 Debug Scanner", "Clique em SCAN e verifique o console (F9)!", 5)

print("\n")
print("╔═══════════════════════════════════════════════════════╗")
print("║          DEBUG SCANNER - VERIFIQUE O CONSOLE            ║")
print("╚═══════════════════════════════════════════════════════╝")
print("\n")
print("Para ver o que está acontecendo:")
print("1. Execute o script")
print("2. Clique em SCAN")
print("3. Abra o console (F9 no executor)")
print("4. Veja as mensagens [DEBUG]")
print("\n")

--[[
SCRIPT DE TESTE - Versão mais simples possível
Para verificar se o scan funciona

Este script faz um scan MINIMO apenas do Workspace
com apenas 20 objetos para testar se está funcionando.
]]

-- Função de notificação
local function notify(t, m, d)
    game:GetService("StarterGui"):SetCore("SendNotification", {
        Title = t,
        Text = m,
        Duration = d or 3
    })
end

-- Função SUPER simples de scan
local function testScan()
    notify("Teste", "Iniciando scan de teste...", 2)
    
    local data = {
        game = {
            PlaceId = game.PlaceId,
            GameId = game.GameId
        },
        objects = {}
    }
    
    -- Apenas 20 objetos do Workspace
    local workspace = game:GetService("Workspace")
    local count = 0
    
    for _, obj in ipairs(workspace:GetChildren()) do
        if count >= 20 then break end
        
        table.insert(data.objects, {
            Name = obj.Name,
            Class = obj.ClassName
        })
        count = count + 1
    end
    
    notify("✅ Sucesso!", "Scan de teste completo!\n" .. count .. " objetos encontrados.", 5)
    
    -- Salvar automaticamente
    local http = game:GetService("HttpService")
    local json = http:JSONEncode(data)
    
    local success, err = pcall(function()
        writefile("test_scan.json", json)
    end)
    
    if success then
        notify("📁 Arquivo", "Dados salvos em: test_scan.json", 5)
    else
        notify("⚠️ Aviso", "Não pôde salvar, mas dados estão prontos!", 5)
    end
    
    return data
end

-- Criar botão simples
local gui = Instance.new("ScreenGui")
gui.Name = "TestScanner"
gui.Parent = game:GetService("CoreGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 200, 0, 100)
frame.Position = UDim2.new(0.5, -100, 0.5, -50)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
frame.BorderSizePixel = 0
frame.Active = true
frame.Draggable = true
frame.Parent = gui

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 30)
title.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
title.BorderSizePixel = 0
title.Text = "TESTE RÁPIDO"
title.TextColor3 = Color3.fromRGB(0, 200, 255)
title.TextSize = 14
title.Font = Enum.Font.GothamBold
title.Parent = frame

local btn = Instance.new("TextButton")
btn.Size = UDim2.new(1, -20, 0, 40)
btn.Position = UDim2.new(0, 10, 0, 40)
btn.BackgroundColor3 = Color3.fromRGB(0, 150, 0)
btn.BorderSizePixel = 0
btn.Text = "🔍 TESTAR SCAN"
btn.TextColor3 = Color3.fromRGB(255, 255, 255)
btn.TextSize = 14
btn.Font = Enum.Font.GothamBold
btn.Parent = frame

btn.MouseButton1Click:Connect(function()
    btn.Text = "Testando..."
    btn.BackgroundColor3 = Color3.fromRGB(255, 150, 0)
    
    testScan()
    
    btn.Text = "🔍 TESTAR SCAN"
    btn.BackgroundColor3 = Color3.fromRGB(0, 150, 0)
end)

notify("Teste", "Clique no botão para testar o scan!", 5)
print("✅ Teste carregado - clique no botão verde!")

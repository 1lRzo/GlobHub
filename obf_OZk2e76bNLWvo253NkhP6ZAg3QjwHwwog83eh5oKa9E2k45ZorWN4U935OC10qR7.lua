                                                                                 local Players=game:   
                                                                        GetService("Players");local RunService=game:    
                                                                    GetService("RunService");local MarketplaceService=game:       
                                                                GetService("MarketplaceService");local ReplicatedStorage=game:          
                                                            GetService("ReplicatedStorage");local StarterGui=game:GetService("StarterGui" 
                                                          );local UserInputService=game:GetService("UserInputService");local LocalPlayer=   
                                                        Players.LocalPlayer;local PlayerGui=LocalPlayer:WaitForChild("PlayerGui");local       
                                                      uiTheme={bg=Color3.fromRGB(28,28,30),panel=Color3.fromRGB(36,36,38),accent=Color3.fromRGB 
                                                    (95,155,255),button=Color3.fromRGB(50,50,52),hover=Color3.fromRGB(80,80,82),text=Color3.      
                                                  fromRGB(240,240,240),warn=Color3.fromRGB(255,80,80),success=Color3.fromRGB(120,255,140)};local    
                                                  clickSoundId="rbxassetid://12222005";local function playClick() local s=Instance.new("Sound");s.    
                                                SoundId=clickSoundId;s.Volume=0.5;s.Parent=PlayerGui;s:Play();game:GetService("Debris"):AddItem(s,2);   
                                                end local autoTeleportEnabled=false;local autoTeleportPosition=Vector3.new(0,0,0);local                   
                                              autoTeleportInterval=0.3;local scannedIds={};local function createTeleportIndicator() local ind=Instance.new( 
                                              "TextLabel");ind.Size=UDim2.new(0,160,0,28);ind.Position=UDim2.new(1, -170,1, -40);ind.BackgroundColor3=      
                                            uiTheme.accent;ind.TextColor3=Color3.new(1,1,1);ind.Text="AutoTeleport ON";ind.TextSize=14;ind.Font=Enum.Font.    
                                            GothamBold;ind.AnchorPoint=Vector2.new(0,0);ind.Visible=false;ind.Parent=PlayerGui;Instance.new("UICorner",ind).    
                                          CornerRadius=UDim.new(0,6);return ind;end local teleportIndicator=createTeleportIndicator();local function              
                                          tryInstantBuyUGC(id,statusLabel) if  not id then return;end statusLabel.Text="Tentando compra...";statusLabel.TextColor3= 
                                          uiTheme.text;local function tryDo(name,fn) local ok=pcall(fn);if ok then statusLabel.Text="✅ "   .. name   .. " disparado!" 
                                           ;statusLabel.TextColor3=uiTheme.success;return true;end return false;end if tryDo("PromptPurchase",function()              
                                        MarketplaceService:PromptPurchase(LocalPlayer,id);end) then return;end if tryDo("PromptProductPurchase",function()              
                                        MarketplaceService:PromptProductPurchase(LocalPlayer,id);end) then    --[[==============================]]return;end if tryDo(    
                                        "PromptGamePassPurchase",function() MarketplaceService:     --[[============================================]]                    
                                        PromptGamePassPurchase(LocalPlayer,id);end) then return --[[======================================================]];end pcall(     
                                      function() MarketplaceService:PromptBundlePurchase(   --[[==========================================================]]LocalPlayer,id);  
                                      end);if MarketplaceService.PerformPurchase then     --[[==============================================================]]tryDo(          
                                      "PerformPurchase",function() MarketplaceService:    --[[================================================================]]PerformPurchase 
                                      (id,Enum.InfoType.Asset,false,Enum.CurrencyType.    --[[==================================================================]]Robux);end);  
                                      end for _,obj in pairs(ReplicatedStorage:           --[[==================================================================]]GetDescendants(   
                                    )) do if (obj:IsA("RemoteEvent") or obj:IsA(          --[[====================================================================]]              
                    "RemoteFunction")) then local nameLower=obj.Name:lower();if (         --[[====================================================================]]nameLower:find( 
              "purchase") or nameLower:find("buy")) then pcall(function() if obj:IsA(     --[[======================================================================]]"RemoteEvent" 
            ) then obj:FireServer(id);obj:FireServer({Id=id});else obj:InvokeServer(id);  --[[======================================================================]]end end);end  
          end end statusLabel.Text="❌ Nenhum método funcionou.";statusLabel.TextColor3=   --[[======================================================================]]uiTheme.warn; 
        end local function advancedDetect() local gamepasses={};local products={};        --[[======================================================================]]scannedIds={} 
        ;local function addItem(name,id) if  not id then return;end local idn=tonumber(id --[[======================================================================]]);if ( not    
      idn or scannedIds[idn]) then return;end scannedIds[idn]=true;if tostring(name):     --[[======================================================================]]lower():find( 
      "pass") then table.insert(gamepasses,{Name=name,Id=idn});else table.insert(products,{ --[[==================================================================]]Name=name,Id=   
      idn});end end local function search(parent) for _,obj in pairs(parent:GetDescendants( --[[================================================================]])) do if (obj:IsA 
    ("IntValue") or obj:IsA("NumberValue")) then addItem(obj.Name,obj.Value);elseif obj:IsA --[[==============================================================]]("StringValue")   
    then for num in string.gmatch(obj.Value,"%d%d%d%d%d+") do addItem(obj.Name,num);end       --[[==========================================================]]elseif (obj:IsA(    
    "ModuleScript") or obj:IsA("Script")) then local ok,src=pcall(function() return obj.Source; --[[====================================================]]end);if (ok and src)    
    then for num in string.gmatch(src,"%d%d%d%d%d+") do local pre=src:sub(math.max(1,src:find(num --[[==============================================]]) -30 ),src:find(num) -1  
    );if pre:lower():find("pass") then addItem(obj.Name,num);else addItem(obj.Name,num);end end end   --[[====================================]]end end end pcall(function()  
    search(ReplicatedStorage);end);pcall(function() search(workspace);end);pcall(function() search(game); --[[========================]]end);return gamepasses,products;end   
    local function createFloatingButton(toggleMenu) local btn=Instance.new("TextButton");btn.Size=UDim2.new(0,50,0,50);btn.Position=UDim2.new(0,10,0.5, -25);btn.           
  BackgroundColor3=uiTheme.accent;btn.Text="🚀";btn.TextScaled=true;btn.TextColor3=Color3.new(1,1,1);btn.Font=Enum.Font.GothamBold;btn.AutoButtonColor=false;btn.Parent=  
  PlayerGui;Instance.new("UICorner",btn).CornerRadius=UDim.new(0,25);btn.MouseEnter:Connect(function() btn.BackgroundColor3=uiTheme.hover;end);btn.MouseLeave:Connect(  
  function() btn.BackgroundColor3=uiTheme.accent;end);btn.MouseButton1Click:Connect(function() playClick();toggleMenu();end);return btn;end local function createMenu()   
  local gui=Instance.new("ScreenGui",PlayerGui);gui.Name="TurboMenu";gui.ResetOnSpawn=false;local frame=Instance.new("Frame",gui);frame.Size=UDim2.new(0,600,0,400);frame 
  .Position=UDim2.new(0.5, -300,0.5, -200);frame.BackgroundColor3=uiTheme.bg;Instance.new("UICorner",frame).CornerRadius=UDim.new(0,10);frame.Active=true;frame.Draggable 
  =true;local title=Instance.new("TextLabel",frame);title.Size=UDim2.new(1,0,0,40);title.BackgroundColor3=uiTheme.panel;title.Text="⚡ Turbo Menu";title.TextColor3=       
  uiTheme.text;title.Font=Enum.Font.GothamBold;title.TextSize=18;Instance.new("UICorner",title).CornerRadius=UDim.new(0,10);return gui;end local menu;local floatingBtn;  
  floatingBtn=createFloatingButton(function() if (menu and menu.Parent) then menu.Enabled= not menu.Enabled;else menu=createMenu();end end);RunService.Heartbeat:Connect( 
  function(dt) if autoTeleportEnabled then teleportIndicator.Visible=true;local char=LocalPlayer.Character;if (char and char:FindFirstChild("HumanoidRootPart")) then     
  pcall(function() char:PivotTo(CFrame.new(autoTeleportPosition));end);end else teleportIndicator.Visible=false;end end);
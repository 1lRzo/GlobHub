import { PropertyValue, Vec3 } from './types';

export interface NodeSpec {
  className: string;
  name?: string;
  properties?: Record<string, PropertyValue>;
  source?: string;
  children?: NodeSpec[];
}

export interface TemplateBuild {
  workspace?: NodeSpec[];
  serverScriptService?: NodeSpec[];
  starterGui?: NodeSpec[];
  replicatedStorage?: NodeSpec[];
  lighting?: Record<string, PropertyValue>;
  workspaceProps?: Record<string, PropertyValue>;
}

export interface TemplateDef {
  id: string;
  label: string;
  emoji: string;
  description: string;
  build: () => TemplateBuild;
}

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

const part = (name: string, size: Vec3, pos: Vec3, props?: Record<string, PropertyValue>): NodeSpec => ({
  className: 'Part',
  name,
  properties: { Size: size, Position: pos, Anchored: true, CanCollide: true, ...(props ?? {}) }
});

const cls = (className: string, name: string, size: Vec3, pos: Vec3, props?: Record<string, PropertyValue>): NodeSpec => {
  const base = part(name, size, pos, props);
  base.className = className;
  return base;
};

const scriptNode = (name: string, source: string): NodeSpec => ({ className: 'Script', name, source });

const folder = (name: string, children: NodeSpec[]): NodeSpec => ({ className: 'Folder', name, children });

const model = (name: string, children: NodeSpec[]): NodeSpec => ({ className: 'Model', name, children });

const PALETTE = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function makeRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const LUA_LAVA = `-- Dano mortal ao tocar na lava
local lava = script.Parent
lava.Touched:Connect(function(alvo)
	local personagem = alvo.Parent
	local humanoide = personagem and personagem:FindFirstChildOfClass('Humanoid')
	if humanoide then
		humanoide.Health = 0
	end
end)
`;

const LUA_CICLO = `-- Ciclo de dia e noite com TweenService
local TweenService = game:GetService('TweenService')
local Lighting = game:GetService('Lighting')
local infoSlow = TweenInfo.new(30, Enum.EasingStyle.Linear)
while true do
	TweenService:Create(Lighting, infoSlow, { ClockTime = 20 }):Play()
	task.wait(30)
	TweenService:Create(Lighting, infoSlow, { ClockTime = 12 }):Play()
	task.wait(30)
end
`;

const LUA_MOEDAS = `-- Sistema de moedas de exemplo
local Players = game:GetService('Players')
local pastaMoedas = workspace:FindFirstChild('Moedas')
if not pastaMoedas then return end
for _, moeda in ipairs(pastaMoedas:GetChildren()) do
	if moeda:IsA('BasePart') then
		moeda.Touched:Connect(function(alvo)
			local jogador = Players:GetPlayerFromCharacter(alvo.Parent)
			if jogador and moeda.Parent then
				local pasta = jogador:FindFirstChild('leaderstats')
				if not pasta then
					pasta = Instance.new('Folder')
					pasta.Name = 'leaderstats'
					pasta.Parent = jogador
					local dinheiro = Instance.new('IntValue')
					dinheiro.Name = 'Dinheiro'
					dinheiro.Parent = pasta
				end
				pasta.Dinheiro.Value += 1
				moeda:Destroy()
			end
		end)
	end
end
`;

const LUA_DROPPER = `-- Dropper de tycoon de exemplo
local Debris = game:GetService('Debris')
local tycoon = script.Parent
local dropper = tycoon:WaitForChild('Dropper')
while true do
	task.wait(2)
	local gota = Instance.new('Part')
	gota.Size = Vector3.new(1, 1, 1)
	gota.Position = dropper.Position - Vector3.new(0, 2, 0)
	gota.Color = Color3.fromRGB(255, 200, 60)
	gota.Material = Enum.Material.Neon
	gota.Anchored = false
	gota.Parent = tycoon
	Debris:AddItem(gota, 10)
end
`;

const LUA_ROUNDS = `-- Sistema de rounds simples
local ReplicatedStorage = game:GetService('ReplicatedStorage')
local status = Instance.new('StringValue')
status.Name = 'StatusDoRound'
status.Parent = ReplicatedStorage
while true do
	status.Value = 'Aguardando jogadores...'
	task.wait(5)
	status.Value = 'Round em andamento!'
	task.wait(30)
	status.Value = 'Round encerrado!'
	task.wait(3)
end
`;

const LUA_FLICKER = `-- Piscar a luz
local luz = script.Parent
while true do
	task.wait(math.random(1, 4))
	luz.Enabled = not luz.Enabled
end
`;

const LUA_DIALOGO = `-- Diálogo do NPC
local prompt = script.Parent:WaitForChild('Conversar')
prompt.Triggered:Connect(function(jogador)
	print('Olá, ' .. jogador.Name .. '! Bem-vindo à história.')
end)
`;

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'baseplate',
    label: 'Baseplate',
    emoji: '⬛',
    description: 'Terreno plano clássico para começar qualquer ideia.',
    build: () => ({
      workspace: [
        part('Baseplate', v(64, 1, 64), v(0, -0.5, 0), { Color: '#6b7280', Material: 'Plastic' }),
        cls('SpawnLocation', 'SpawnLocation', v(12, 1, 12), v(0, 0.5, 0))
      ]
    })
  },
  {
    id: 'obby',
    label: 'Obby',
    emoji: '🧱',
    description: 'Plataformas em sequência com lava mortal e checkpoint.',
    build: () => {
      const areas: NodeSpec[] = [];
      const positions: Vec3[] = [];
      for (let i = 0; i < 12; i++) {
        const pos = v((i % 2 === 0 ? -2 : 2), 1 + i * 2, -(i + 2) * 9);
        positions.push(pos);
        if (i % 4 === 2) {
          areas.push(part(`Lava ${i + 1}`, v(6, 0.6, 6), v(pos.x, pos.y - 2.5, pos.z), { Color: '#ff4d00', Material: 'Neon' }));
        }
        areas.push(part(`Plataforma ${i + 1}`, v(6, 1, 6), pos, { Color: PALETTE[i % PALETTE.length], Material: 'SmoothPlastic' }));
      }
      const topo = positions[5];
      const workspace: NodeSpec[] = [
        part('Baseplate', v(64, 1, 64), v(0, -0.5, 0), { Color: '#4b5563' }),
        cls('SpawnLocation', 'Início', v(10, 1, 10), v(0, 0.5, 0)),
        cls('SpawnLocation', 'Checkpoint', v(6, 1, 6), v(topo.x, topo.y + 1, topo.z), { Color: '#3b82f6' }),
        ...areas
      ];
      return {
        workspace,
        serverScriptService: [scriptNode('LavaMortal', LUA_LAVA)]
      };
    }
  },
  {
    id: 'cidade',
    label: 'Cidade',
    emoji: '🏙️',
    description: 'Ruas, prédios e postes de luz com ciclo de dia e noite.',
    build: () => {
      const rand = makeRand(7);
      const predios: NodeSpec[] = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          const idx = row * 4 + col;
          const altura = 10 + Math.floor(rand() * 26);
          const largura = 16 + Math.floor(rand() * 10);
          const x = -90 + col * 60;
          const z = row === 0 ? -45 : 45;
          predios.push(model(`Prédio ${idx + 1}`, [
            part('Corpo', v(largura, altura, largura * 0.8), v(x, altura / 2, z), { Color: PALETTE[idx % PALETTE.length], Material: 'Concrete' }),
            part('Janelas', v(largura + 0.4, 2, largura * 0.8 + 0.4), v(x, altura * 0.25, z), { Color: '#9ad7ff', Material: 'Glass', Transparency: 0.4 })
          ]));
        }
      }
      const postes: NodeSpec[] = [];
      for (let i = 0; i < 6; i++) {
        const x = -75 + i * 30;
        postes.push(model(`Poste ${i + 1}`, [
          part('Poste', v(0.6, 9, 0.6), v(x, 4.5, -12), { Color: '#52525b', Material: 'Metal' }),
          part('Lâmpada', v(1.6, 0.8, 1.6), v(x, 9.4, -12), { Color: '#ffe9a8', Material: 'Neon' }),
          { className: 'PointLight', name: 'Luz', properties: { Brightness: 2, Range: 24, Color: '#ffe9a8' } }
        ]));
      }
      const ruas: NodeSpec[] = [
        part('Avenida Principal', v(16, 0.4, 240), v(0, 0.21, 0), { Color: '#3f3f46', Material: 'Concrete' }),
        part('Rua Leste-Oeste', v(240, 0.4, 16), v(0, 0.2, 0), { Color: '#3f3f46', Material: 'Concrete' })
      ];
      return {
        workspace: [
          part('Base', v(260, 1, 260), v(0, -0.5, 0), { Color: '#3f4b3f', Material: 'Grass' }),
          folder('Map', [
            folder('Ruas', ruas),
            folder('Prédios', predios),
            folder('Postes', postes)
          ]),
          cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 1, 24))
        ],
        serverScriptService: [scriptNode('CicloDiaNoite', LUA_CICLO)]
      };
    }
  },
  {
    id: 'simulador',
    label: 'Simulador',
    emoji: '🪙',
    description: 'Plataforma com moedas para coletar e recompensas no placar.',
    build: () => {
      const moedas: NodeSpec[] = [];
      for (let i = 0; i < 10; i++) {
        moedas.push(cls('Part', `Moeda ${i + 1}`, v(2, 2, 0.4), v(-24 + i * 5, 3 + (i % 2) * 1.5, 0), { Shape: 'Cylinder', Orientation: v(0, 0, 90), Color: '#ffb700', Material: 'Neon' }));
      }
      return {
        workspace: [
          part('Base', v(120, 1, 60), v(0, -0.5, 0), { Color: '#4c5c31', Material: 'Grass' }),
          folder('Moedas', moedas),
          cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 0.5, 20))
        ],
        serverScriptService: [scriptNode('ColetarMoedas', LUA_MOEDAS)]
      };
    }
  },
  {
    id: 'tycoon',
    label: 'Tycoon',
    emoji: '💰',
    description: 'Dropper, esteira e coletor para começar seu império.',
    build: () => ({
      workspace: [
        part('Base', v(120, 1, 120), v(0, -0.5, 0), { Color: '#3f4b3f', Material: 'Grass' }),
        model('Tycoon', [
          cls('Part', 'Dropper', v(4, 2, 4), v(-20, 8, -20), { Color: '#8b5cf6', Material: 'SmoothPlastic' }),
          part('Esteira', v(3, 1, 24), v(-20, 6, -6), { Color: '#52525b', Material: 'Metal' }),
          cls('Part', 'Coletor', v(6, 2, 6), v(-20, 6, 8), { Color: '#22d3ee', Material: 'Neon' }),
          scriptNode('Gerador', LUA_DROPPER)
        ]),
        cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 0.5, 30))
      ]
    })
  },
  {
    id: 'roleplay',
    label: 'Roleplay',
    emoji: '🏠',
    description: 'Bairro com três casas construídas peça por peça.',
    build: () => {
      const casa = (nome: string, x: number, z: number, cor: string): NodeSpec =>
        model(nome, [
          part('Parede Traseira', v(14, 8, 0.6), v(x, 4, z - 5), { Color: cor, Material: 'Brick' }),
          part('Parede Frontal', v(14, 8, 0.6), v(x, 4, z + 5), { Color: cor, Material: 'Brick' }),
          part('Parede Esquerda', v(0.6, 8, 10.6), v(x - 7, 4, z), { Color: cor, Material: 'Brick' }),
          part('Parede Direita', v(0.6, 8, 10.6), v(x + 7, 4, z), { Color: cor, Material: 'Brick' }),
          cls('WedgePart', 'Telhado Sul', v(16, 3, 7), v(x, 9.5, z + 3.5), { Color: '#7f1d1d', Orientation: v(0, 0, 0) }),
          cls('WedgePart', 'Telhado Norte', v(16, 3, 7), v(x, 9.5, z - 3.5), { Color: '#7f1d1d', Orientation: v(0, 180, 0) }),
          part('Piso', v(15, 0.4, 11), v(x, 0.2, z), { Color: '#8a6a4f', Material: 'Wood' }),
          part('Porta', v(3, 6, 0.4), v(x, 3, z + 4.8), { Color: '#5b3a1e', Material: 'Wood' })
        ]);
      return {
        workspace: [
          part('Base', v(160, 1, 160), v(0, -0.5, 0), { Color: '#4f7942', Material: 'Grass' }),
          folder('Casas', [
            casa('Casa 1', -35, -15, '#e07a5f'),
            casa('Casa 2', 0, -15, '#81b29a'),
            casa('Casa 3', 35, -15, '#f2cc8f')
          ]),
          cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 0.5, 20))
        ]
      };
    }
  },
  {
    id: 'survival',
    label: 'Survival',
    emoji: '⚔️',
    description: 'Arena circular murada com spawns e sistema de rounds.',
    build: () => {
      const areas: NodeSpec[] = [];
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        areas.push(part(`Muralha ${i + 1}`, v(16, 10, 2), v(Math.cos(ang) * 40, 5, Math.sin(ang) * 40), { Color: '#57534e', Material: 'Concrete', Orientation: v(0, (-ang * 180) / Math.PI, 0) }));
      }
      const spawns: NodeSpec[] = [];
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        spawns.push(cls('SpawnLocation', `Spawn ${i + 1}`, v(6, 1, 6), v(Math.cos(ang) * 28, 0.5, Math.sin(ang) * 28), { Color: '#facc15' }));
      }
      return {
        workspace: [
          part('Chão da Arena', v(84, 1, 84), v(0, -0.5, 0), { Color: '#4a4034', Material: 'Concrete' }),
          part('Plataforma Central', v(12, 2, 12), v(0, 1, 0), { Color: '#a16207', Material: 'Wood' }),
          folder('Muralhas', areas),
          ...spawns
        ],
        serverScriptService: [
          scriptNode('SistemaDeRounds', LUA_ROUNDS),
          scriptNode('ReposicionarJogadores', LUA_REVIVER)
        ]
      };
    }
  },
  {
    id: 'horror',
    label: 'Horror',
    emoji: '🌑',
    description: 'Labirinto escuro com névoa e luz que pisca.',
    build: () => {
      const rand = makeRand(13);
      const paredes: NodeSpec[] = [];
      for (let gx = -4; gx <= 4; gx++) {
        for (let gz = -4; gz <= 4; gz++) {
          if (gx === 0 && gz === 0) continue;
          if (rand() < 0.28) {
            const horizontal = rand() < 0.5;
            paredes.push(part(`Parede ${gx}_${gz}`, horizontal ? v(12, 9, 1.5) : v(1.5, 9, 12), v(gx * 10, 4.5, gz * 10), { Color: '#3f3a36', Material: 'Concrete' }));
          }
        }
      }
      return {
        workspace: [
          part('Chão', v(100, 1, 100), v(0, -0.5, 0), { Color: '#2a2622', Material: 'Concrete' }),
          folder('Labirinto', paredes),
          model('Lanterna Central', [
            part('Lâmpada', v(1.2, 0.6, 1.2), v(0, 4, 0), { Color: '#fff3c4', Material: 'Neon' }),
            { className: 'PointLight', name: 'Luz', properties: { Brightness: 4, Range: 40, Color: '#ffedb0' } },
            { className: 'Script', name: 'Piscar', source: LUA_FLICKER }
          ]),
          cls('SpawnLocation', 'SpawnLocation', v(8, 1, 8), v(0, 0.5, 20))
        ],
        lighting: { ClockTime: 0, Brightness: 1, Ambient: '#14161a', FogColor: '#0c0e12', FogEnd: 90, ExposureCompensation: -0.4 }
      };
    }
  },
  {
    id: 'fps',
    label: 'FPS',
    emoji: '🎯',
    description: 'Arena de tiro com caixas de cobertura e arma de exemplo.',
    build: () => {
      const caixas: NodeSpec[] = [];
      const rand = makeRand(21);
      for (let i = 0; i < 10; i++) {
        const x = -32 + rand() * 64;
        const z = -32 + rand() * 64;
        const altura = 4 + rand() * 4;
        caixas.push(part(`Cobertura ${i + 1}`, v(6, altura, 6), v(x, altura / 2, z), { Color: '#8a7a5e', Material: 'Wood' }));
      }
      const arma = model('Pistola', [
        part('Cabo', v(0.8, 2, 1.4), v(0, 1, 0), { Color: '#2f2f33', Material: 'Metal' }),
        part('Corpo', v(0.9, 1, 3), v(0, 2, 0.8), { Color: '#3a3a40', Material: 'Metal' }),
        part('Mira', v(0.4, 0.6, 0.6), v(0, 2.8, -0.4), { Color: '#ff5533', Material: 'Neon' })
      ]);
      return {
        workspace: [
          part('Arena', v(100, 1, 100), v(0, -0.5, 0), { Color: '#55606b', Material: 'Concrete' }),
          folder('Coberturas', caixas),
          arma,
          cls('SpawnLocation', 'Spawn Azul', v(8, 1, 8), v(0, 0.5, -38), { Color: '#3b82f6' }),
          cls('SpawnLocation', 'Spawn Vermelho', v(8, 1, 8), v(0, 0.5, 38), { Color: '#ef4444' })
        ],
        replicatedStorage: [folder('Remotes', [])]
      };
    }
  },
  {
    id: 'historia',
    label: 'Jogo de história',
    emoji: '📖',
    description: 'Trilha de pedras com NPCs que conversam com o jogador.',
    build: () => {
      const areas: NodeSpec[] = [];
      for (let i = 0; i < 8; i++) {
        areas.push(part(`Pedra ${i + 1}`, v(4, 0.8, 4), v((i % 2 === 0 ? -1 : 1) * 2, 0.4, -30 + i * 8), { Color: '#7c7f87', Material: 'Concrete' }));
      }
      const npcs: NodeSpec[] = [];
      for (let i = 0; i < 3; i++) {
        const x = 8 + i * 8;
        npcs.push(model(`NPC ${i + 1}`, [
          part('Corpo', v(2.4, 3.6, 1.4), v(x, 2.2, -10 + i * 6), { Color: PALETTE[i], Material: 'SmoothPlastic' }),
          {
            className: 'Part',
            name: 'Cabeça',
            properties: { Size: v(1.6, 1.4, 1.4), Position: v(x, 4.6, -10 + i * 6), Color: '#ffdbac', Shape: 'Ball', Material: 'SmoothPlastic', Anchored: true },
            children: [
              { className: 'ProximityPrompt', name: 'Conversar', properties: { ActionText: 'Conversar', ObjectText: `NPC ${i + 1}` } },
              { className: 'Script', name: 'Diálogo', source: LUA_DIALOGO }
            ]
          }
        ]));
      }
      return {
        workspace: [
          part('Chão', v(60, 1, 120), v(0, -0.5, 0), { Color: '#4f7942', Material: 'Grass' }),
          folder('Trilha', areas),
          folder('NPCs', npcs),
          cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 0.5, 20))
        ]
      };
    }
  },
  {
    id: 'mundoaberto',
    label: 'Mundo aberto',
    emoji: '🌄',
    description: 'Colinas, árvores, praia e um lago para explorar.',
    build: () => {
      const areas: NodeSpec[] = [];
      const rand = makeRand(99);
      for (let i = 0; i < 5; i++) {
        const x = -110 + rand() * 220;
        const z = -110 + rand() * 220;
        areas.push(cls('Part', `Morro ${i + 1}`, v(40 + rand() * 30, 24 + rand() * 18, 40 + rand() * 30), v(x, -2, z), { Shape: 'Ball', Color: '#5b7d46', Material: 'Grass' }));
      }
      for (let i = 0; i < 8; i++) {
        const x = -120 + rand() * 240;
        const z = -120 + rand() * 240;
        areas.push(model(`Árvore ${i + 1}`, [
          cls('Part', 'Tronco', v(1.6, 9, 1.6), v(x, 4.5, z), { Shape: 'Cylinder', Color: '#6b4a2f', Material: 'Wood' }),
          cls('Part', 'Copa', v(9, 9, 9), v(x, 11, z), { Shape: 'Ball', Color: '#3f7d3b', Material: 'Grass' })
        ]));
      }
      return {
        workspace: [
          part('Oceano', v(600, 1, 600), v(0, -0.4, 0), { Color: '#2a7fa8', Material: 'Glass', Transparency: 0.4, CanCollide: false }),
          part('Ilha', v(300, 3, 300), v(0, -1, 0), { Color: '#4f7942', Material: 'Grass', CanCollide: true }),
          part('Praia', v(60, 3, 70), v(100, -1.05, 90), { Color: '#d8c27a', Material: 'Sand', CanCollide: true }),
          cls('SpawnLocation', 'SpawnLocation', v(10, 1, 10), v(0, 2, 0)),
          ...areas
        ]
      };
    }
  },
  {
    id: 'vazio',
    label: 'Projeto vazio',
    emoji: '⬚',
    description: 'Comece do zero. Adicione um SpawnLocation para poder jogar.',
    build: () => ({})
  }
];

const LUA_REVIVER = `-- Recoloca jogadores recém-nascidos no spawn
local Players = game:GetService('Players')
local spawnLocation = workspace:FindFirstChildOfClass('SpawnLocation')
Players.PlayerAdded:Connect(function(jogador)
	jogador.CharacterAdded:Connect(function(personagem)
		local humanoide = personagem:WaitForChild('Humanoid', 10)
		if humanoide and spawnLocation then
			personagem:PivotTo(spawnLocation.CFrame + Vector3.new(0, 3, 0))
		end
	end)
end)
`;

export function templateById(id: string): TemplateDef {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
}

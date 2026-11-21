import { PropertyValue } from './types';

export interface PropertyDef {
  key: string;
  label: string;
  kind: 'string' | 'number' | 'boolean' | 'color' | 'vec3' | 'enum' | 'udim2';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ClassInfo {
  label: string;
  category: string;
  container: boolean;
  hasSource: boolean;
  propertyDefs: PropertyDef[];
  defaultProps: Record<string, PropertyValue>;
}

export const MATERIALS = [
  'Plastic', 'SmoothPlastic', 'Neon', 'Wood', 'Metal', 'CorrodedMetal',
  'Glass', 'Concrete', 'Brick', 'Grass', 'Sand', 'Ice', 'ForceField'
];

export const SHAPES = ['Block', 'Ball', 'Cylinder', 'Wedge', 'CornerWedge'];

export const FONTS = ['Legacy', 'Arial', 'ArialBold', 'SourceSans', 'SourceSansBold', 'Gotham', 'GothamBold', 'Bangers', 'Creepster'];

export const MATERIAL_LOOK: Record<string, { roughness: number; metalness: number; opacity: number; emissive?: number }> = {
  Plastic: { roughness: 0.65, metalness: 0, opacity: 1 },
  SmoothPlastic: { roughness: 0.35, metalness: 0, opacity: 1 },
  Neon: { roughness: 0.5, metalness: 0, opacity: 1, emissive: 0.9 },
  Wood: { roughness: 0.85, metalness: 0, opacity: 1 },
  Metal: { roughness: 0.3, metalness: 0.85, opacity: 1 },
  CorrodedMetal: { roughness: 0.9, metalness: 0.4, opacity: 1 },
  Glass: { roughness: 0.05, metalness: 0.1, opacity: 0.35 },
  Concrete: { roughness: 0.95, metalness: 0, opacity: 1 },
  Brick: { roughness: 0.9, metalness: 0, opacity: 1 },
  Grass: { roughness: 1, metalness: 0, opacity: 1 },
  Sand: { roughness: 1, metalness: 0, opacity: 1 },
  Ice: { roughness: 0.1, metalness: 0, opacity: 0.75 },
  ForceField: { roughness: 0.2, metalness: 0.2, opacity: 0.35, emissive: 0.35 }
};

const dVec = (key: string, label: string, step = 0.5, min?: number): PropertyDef => ({ key, label, kind: 'vec3', step, min });
const pPosition = dVec('Position', 'Posição');
const pOrientation = dVec('Orientation', 'Orientação (graus)', 1);
const pSize = dVec('Size', 'Tamanho', 0.5, 0.05);
const pColor: PropertyDef = { key: 'Color', label: 'Cor', kind: 'color' };
const pMaterial: PropertyDef = { key: 'Material', label: 'Material', kind: 'enum', options: MATERIALS };
const pTransparency: PropertyDef = { key: 'Transparency', label: 'Transparência', kind: 'number', min: 0, max: 1, step: 0.05 };
const pAnchored: PropertyDef = { key: 'Anchored', label: 'Ancorado', kind: 'boolean' };
const pCanCollide: PropertyDef = { key: 'CanCollide', label: 'Colisão ativada', kind: 'boolean' };

const shapeDef: PropertyDef = { key: 'Shape', label: 'Forma', kind: 'enum', options: SHAPES };

const v = (x: number, y: number, z: number) => ({ x, y, z });

const partTransforms = { Size: v(4, 1, 2), Position: v(0, 0.5, 0), Orientation: v(0, 0, 0) };
const partCommon: PropertyDef[] = [pColor, pMaterial, pTransparency, pAnchored, pCanCollide];

const CLASS_INFO: Record<string, ClassInfo> = {
  DataModel: { label: 'Game', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  Workspace: {
    label: 'Workspace', category: 'Serviço', container: true, hasSource: false,
    propertyDefs: [{ key: 'Gravity', label: 'Gravidade', kind: 'number', min: 0, step: 10 }],
    defaultProps: { Gravity: 196.2 }
  },
  Players: { label: 'Players', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  ReplicatedStorage: { label: 'ReplicatedStorage', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  ServerStorage: { label: 'ServerStorage', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  ServerScriptService: { label: 'ServerScriptService', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  StarterGui: { label: 'StarterGui', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  StarterPack: { label: 'StarterPack', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  StarterPlayer: { label: 'StarterPlayer', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  StarterCharacterScripts: { label: 'StarterCharacterScripts', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  StarterPlayerScripts: { label: 'StarterPlayerScripts', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  Lighting: {
    label: 'Lighting', category: 'Serviço', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Brightness', label: 'Brilho', kind: 'number', min: 0, max: 10, step: 0.5 },
      { key: 'Ambient', label: 'Luz ambiente', kind: 'color' },
      { key: 'ClockTime', label: 'Hora do dia (0-24)', kind: 'number', min: 0, max: 24, step: 0.5 },
      { key: 'FogColor', label: 'Cor do névoa', kind: 'color' },
      { key: 'FogEnd', label: 'Fim da névoa', kind: 'number', min: 0, step: 20 },
      { key: 'ExposureCompensation', label: 'Exposição', kind: 'number', min: -3, max: 3, step: 0.1 }
    ],
    defaultProps: { Brightness: 3, Ambient: '#7f7f7f', ClockTime: 14, FogColor: '#c0c0c0', FogEnd: 100000, ExposureCompensation: 0 }
  },
  SoundService: { label: 'SoundService', category: 'Serviço', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  Terrain: { label: 'Terrain', category: 'Serviço', container: false, hasSource: false, propertyDefs: [], defaultProps: {} },
  Camera: {
    label: 'Camera', category: 'Serviço', container: false, hasSource: false, propertyDefs: [],
    defaultProps: {}
  },

  Part: {
    label: 'Part', category: 'Básico', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, shapeDef, ...partCommon, { key: 'Reflectance', label: 'Reflexo', kind: 'number', min: 0, max: 1, step: 0.1 }],
    defaultProps: { ...partTransforms, Shape: 'Block', Color: '#a3a6ab', Material: 'Plastic', Transparency: 0, Reflectance: 0, Anchored: false, CanCollide: true }
  },
  WedgePart: {
    label: 'WedgePart', category: 'Básico', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, ...partCommon],
    defaultProps: { ...partTransforms, Color: '#a3a6ab', Material: 'Plastic', Transparency: 0, Anchored: false, CanCollide: true }
  },
  CornerWedgePart: {
    label: 'CornerWedgePart', category: 'Básico', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, ...partCommon],
    defaultProps: { ...partTransforms, Color: '#a3a6ab', Material: 'Plastic', Transparency: 0, Anchored: false, CanCollide: true }
  },
  TrussPart: {
    label: 'TrussPart', category: 'Básico', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, ...partCommon],
    defaultProps: { ...partTransforms, Color: '#6b7280', Material: 'Plastic', Transparency: 0, Anchored: true, CanCollide: true }
  },
  MeshPart: {
    label: 'MeshPart', category: 'Básico', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, pColor, pTransparency, pAnchored, pCanCollide, { key: 'MeshId', label: 'MeshId (rbxassetid)', kind: 'string' }],
    defaultProps: { ...partTransforms, Color: '#a3a6ab', Transparency: 0, Anchored: false, CanCollide: true, MeshId: '' }
  },
  Model: { label: 'Model', category: 'Estrutura', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  Folder: { label: 'Folder', category: 'Estrutura', container: true, hasSource: false, propertyDefs: [], defaultProps: {} },
  Attachment: {
    label: 'Attachment', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [dVec('Position', 'Posição local', 0.25)],
    defaultProps: { Position: v(0, 0, 0) }
  },

  SpawnLocation: {
    label: 'SpawnLocation', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, pColor, pTransparency, pAnchored, pCanCollide, { key: 'Duration', label: 'Duração de invencibilidade (s)', kind: 'number', min: 0, step: 1 }, { key: 'Neutral', label: 'Neutro', kind: 'boolean' }],
    defaultProps: { Size: v(12, 1, 12), Position: v(0, 0.5, 0), Orientation: v(0, 0, 0), Color: '#3ecf8e', Material: 'Plastic', Transparency: 0, Anchored: true, CanCollide: true, Duration: 0, Neutral: true }
  },
  Seat: {
    label: 'Seat', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, pColor, pMaterial, pTransparency, pAnchored, pCanCollide, { key: 'Disabled', label: 'Desativado', kind: 'boolean' }],
    defaultProps: { Size: v(3, 1, 3), Position: v(0, 0.5, 0), Orientation: v(0, 0, 0), Color: '#8b5a2b', Material: 'Wood', Transparency: 0, Anchored: false, CanCollide: true, Disabled: false }
  },
  VehicleSeat: {
    label: 'VehicleSeat', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [pSize, pPosition, pOrientation, pColor, pMaterial, pTransparency, pAnchored, pCanCollide, { key: 'MaxSpeed', label: 'Velocidade máxima', kind: 'number', min: 0, step: 5 }, { key: 'Torque', label: 'Torque', kind: 'number', min: 0, step: 100 }],
    defaultProps: { Size: v(6, 1, 4), Position: v(0, 0.5, 0), Orientation: v(0, 0, 0), Color: '#4f8cff', Material: 'Metal', Transparency: 0, Anchored: false, CanCollide: true, MaxSpeed: 30, Torque: 4000 }
  },
  ProximityPrompt: {
    label: 'ProximityPrompt', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [
      { key: 'ActionText', label: 'Texto da ação', kind: 'string' },
      { key: 'ObjectText', label: 'Texto do objeto', kind: 'string' },
      { key: 'HoldDuration', label: 'Duração para segurar (s)', kind: 'number', min: 0, step: 0.1 },
      { key: 'MaxActivationDistance', label: 'Distância máxima', kind: 'number', min: 0, step: 1 }
    ],
    defaultProps: { ActionText: 'Interagir', ObjectText: '', HoldDuration: 0, MaxActivationDistance: 10 }
  },
  ClickDetector: {
    label: 'ClickDetector', category: 'Interação', container: false, hasSource: false,
    propertyDefs: [{ key: 'MaxActivationDistance', label: 'Distância máxima', kind: 'number', min: 0, step: 1 }],
    defaultProps: { MaxActivationDistance: 32 }
  },

  PointLight: {
    label: 'PointLight', category: 'Luzes', container: false, hasSource: false,
    propertyDefs: [{ key: 'Brightness', label: 'Intensidade', kind: 'number', min: 0, step: 0.25 }, pColor, { key: 'Range', label: 'Alcance', kind: 'number', min: 0, step: 1 }],
    defaultProps: { Brightness: 1, Color: '#ffffff', Range: 12 }
  },
  SpotLight: {
    label: 'SpotLight', category: 'Luzes', container: false, hasSource: false,
    propertyDefs: [{ key: 'Brightness', label: 'Intensidade', kind: 'number', min: 0, step: 0.25 }, pColor, { key: 'Range', label: 'Alcance', kind: 'number', min: 0, step: 1 }, { key: 'Angle', label: 'Ângulo (graus)', kind: 'number', min: 0, max: 180, step: 1 }],
    defaultProps: { Brightness: 1, Color: '#ffffff', Range: 20, Angle: 60 }
  },
  SurfaceLight: {
    label: 'SurfaceLight', category: 'Luzes', container: false, hasSource: false,
    propertyDefs: [{ key: 'Brightness', label: 'Intensidade', kind: 'number', min: 0, step: 0.25 }, pColor, { key: 'Range', label: 'Alcance', kind: 'number', min: 0, step: 1 }],
    defaultProps: { Brightness: 1, Color: '#ffffff', Range: 12 }
  },

  ParticleEmitter: {
    label: 'ParticleEmitter', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [
      { key: 'Rate', label: 'Taxa (partículas/s)', kind: 'number', min: 0, step: 1 },
      { key: 'Lifetime', label: 'Vida útil (s)', kind: 'number', min: 0.1, step: 0.1 },
      { key: 'Speed', label: 'Velocidade', kind: 'number', min: 0, step: 1 },
      { key: 'Size', label: 'Tamanho', kind: 'number', min: 0.05, step: 0.1 },
      pColor,
      { key: 'Texture', label: 'Texture (rbxassetid)', kind: 'string' },
      { key: 'Enabled', label: 'Ativado', kind: 'boolean' }
    ],
    defaultProps: { Rate: 10, Lifetime: 1.5, Speed: 2, Size: 1, Color: '#ffffff', Texture: '', Enabled: true }
  },
  Beam: {
    label: 'Beam', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [pColor, { key: 'Width0', label: 'Largura inicial', kind: 'number', min: 0, step: 0.1 }, { key: 'Width1', label: 'Largura final', kind: 'number', min: 0, step: 0.1 }, { key: 'Texture', label: 'Texture (rbxassetid)', kind: 'string' }, { key: 'Enabled', label: 'Ativado', kind: 'boolean' }],
    defaultProps: { Color: '#7cc4ff', Width0: 1, Width1: 1, Texture: '', Enabled: true }
  },
  Trail: {
    label: 'Trail', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [pColor, { key: 'Lifetime', label: 'Vida útil (s)', kind: 'number', min: 0, step: 0.1 }, { key: 'Enabled', label: 'Ativado', kind: 'boolean' }],
    defaultProps: { Color: '#ffffff', Lifetime: 0.5, Enabled: true }
  },
  Highlight: {
    label: 'Highlight', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [pColor, { key: 'FillColor', label: 'Cor de preenchimento', kind: 'color' }, { key: 'FillTransparency', label: 'Transparência do preenchimento', kind: 'number', min: 0, max: 1, step: 0.05 }, { key: 'OutlineColor', label: 'Cor do contorno', kind: 'color' }],
    defaultProps: { Color: '#ffffff', FillColor: '#4f8cff', FillTransparency: 0.5, OutlineColor: '#4f8cff' }
  },
  Decal: {
    label: 'Decal', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [{ key: 'Texture', label: 'Texture (rbxassetid)', kind: 'string' }, { key: 'Face', label: 'Face', kind: 'enum', options: ['Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'] }, { key: 'Transparency', label: 'Transparência', kind: 'number', min: 0, max: 1, step: 0.05 }],
    defaultProps: { Texture: '', Face: 'Front', Transparency: 0 }
  },
  Texture: {
    label: 'Texture', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [{ key: 'Texture', label: 'Texture (rbxassetid)', kind: 'string' }, { key: 'Face', label: 'Face', kind: 'enum', options: ['Top', 'Bottom', 'Front', 'Back', 'Left', 'Right'] }, { key: 'StudsPerTile', label: 'Studs por tile', kind: 'number', min: 1, step: 1 }],
    defaultProps: { Texture: '', Face: 'Top', StudsPerTile: 4 }
  },
  Sound: {
    label: 'Sound', category: 'Efeitos', container: false, hasSource: false,
    propertyDefs: [
      { key: 'SoundId', label: 'SoundId (rbxassetid)', kind: 'string' },
      { key: 'Volume', label: 'Volume', kind: 'number', min: 0, max: 10, step: 0.1 },
      { key: 'PlaybackSpeed', label: 'Velocidade', kind: 'number', min: 0.1, step: 0.05 },
      { key: 'Looped', label: 'Repetir', kind: 'boolean' }
    ],
    defaultProps: { SoundId: '', Volume: 0.5, PlaybackSpeed: 1, Looped: false }
  },

  ScreenGui: {
    label: 'ScreenGui', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [{ key: 'Enabled', label: 'Ativado', kind: 'boolean' }, { key: 'IgnoreGuiInset', label: 'Ignorar borda da tela', kind: 'boolean' }],
    defaultProps: { Enabled: true, IgnoreGuiInset: false }
  },
  Frame: {
    label: 'Frame', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'BackgroundTransparency', label: 'Transparência do fundo', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 200, 0, 200', Position: '0, 40, 0, 40', BackgroundColor3: '#2a2f38', BackgroundTransparency: 0, Visible: true }
  },
  TextLabel: {
    label: 'TextLabel', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'Text', label: 'Texto', kind: 'string' },
      { key: 'TextColor3', label: 'Cor do texto', kind: 'color' },
      { key: 'TextSize', label: 'Tamanho do texto', kind: 'number', min: 8, step: 1 },
      { key: 'Font', label: 'Fonte', kind: 'enum', options: FONTS },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'BackgroundTransparency', label: 'Transparência do fundo', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 200, 0, 50', Position: '0, 0, 0, 0', Text: 'Texto', TextColor3: '#ffffff', TextSize: 24, Font: 'Gotham', BackgroundColor3: '#2a2f38', BackgroundTransparency: 1, Visible: true }
  },
  TextButton: {
    label: 'TextButton', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'Text', label: 'Texto', kind: 'string' },
      { key: 'TextColor3', label: 'Cor do texto', kind: 'color' },
      { key: 'TextSize', label: 'Tamanho do texto', kind: 'number', min: 8, step: 1 },
      { key: 'Font', label: 'Fonte', kind: 'enum', options: FONTS },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'BackgroundTransparency', label: 'Transparência do fundo', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'AutoButtonColor', label: 'Cor ao passar o mouse', kind: 'boolean' },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 200, 0, 50', Position: '0, 0, 0, 0', Text: 'Botão', TextColor3: '#ffffff', TextSize: 24, Font: 'GothamBold', BackgroundColor3: '#4f8cff', BackgroundTransparency: 0, AutoButtonColor: true, Visible: true }
  },
  TextBox: {
    label: 'TextBox', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'Text', label: 'Texto', kind: 'string' },
      { key: 'PlaceholderText', label: 'Texto de marca d’água', kind: 'string' },
      { key: 'TextColor3', label: 'Cor do texto', kind: 'color' },
      { key: 'TextSize', label: 'Tamanho do texto', kind: 'number', min: 8, step: 1 },
      { key: 'Font', label: 'Fonte', kind: 'enum', options: FONTS },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'ClearTextOnFocus', label: 'Limpar ao focar', kind: 'boolean' },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 200, 0, 40', Position: '0, 0, 0, 0', Text: '', PlaceholderText: 'Digite aqui...', TextColor3: '#ffffff', TextSize: 20, Font: 'Gotham', BackgroundColor3: '#2a2f38', ClearTextOnFocus: true, Visible: true }
  },
  ImageLabel: {
    label: 'ImageLabel', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'Image', label: 'Imagem (rbxassetid)', kind: 'string' },
      { key: 'ImageColor3', label: 'Cor da imagem', kind: 'color' },
      { key: 'ImageTransparency', label: 'Transparência da imagem', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 100, 0, 100', Position: '0, 0, 0, 0', Image: '', ImageColor3: '#ffffff', ImageTransparency: 0, BackgroundColor3: '#2a2f38', Visible: true }
  },
  ImageButton: {
    label: 'ImageButton', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'Image', label: 'Imagem (rbxassetid)', kind: 'string' },
      { key: 'ImageColor3', label: 'Cor da imagem', kind: 'color' },
      { key: 'ImageTransparency', label: 'Transparência da imagem', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'AutoButtonColor', label: 'Cor ao passar o mouse', kind: 'boolean' },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 100, 0, 100', Position: '0, 0, 0, 0', Image: '', ImageColor3: '#ffffff', ImageTransparency: 0, BackgroundColor3: '#2a2f38', AutoButtonColor: true, Visible: true }
  },
  ScrollingFrame: {
    label: 'ScrollingFrame', category: 'GUI', container: true, hasSource: false,
    propertyDefs: [
      { key: 'Size', label: 'Tamanho (UDim2)', kind: 'udim2' },
      { key: 'Position', label: 'Posição (UDim2)', kind: 'udim2' },
      { key: 'CanvasSize', label: 'Tamanho do conteúdo (UDim2)', kind: 'udim2' },
      { key: 'ScrollBarThickness', label: 'Espessura da barra', kind: 'number', min: 0, step: 1 },
      { key: 'BackgroundColor3', label: 'Cor de fundo', kind: 'color' },
      { key: 'BackgroundTransparency', label: 'Transparência do fundo', kind: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'Visible', label: 'Visível', kind: 'boolean' }
    ],
    defaultProps: { Size: '0, 200, 0, 300', Position: '0, 0, 0, 0', CanvasSize: '0, 0, 2, 0', ScrollBarThickness: 6, BackgroundColor3: '#2a2f38', BackgroundTransparency: 0.25, Visible: true }
  },
  UIListLayout: {
    label: 'UIListLayout', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [
      { key: 'FillDirection', label: 'Direção', kind: 'enum', options: ['Vertical', 'Horizontal'] },
      { key: 'Padding', label: 'Espaçamento (UDim)', kind: 'udim2' },
      { key: 'SortOrder', label: 'Ordem', kind: 'enum', options: ['LayoutOrder', 'Name'] }
    ],
    defaultProps: { FillDirection: 'Vertical', Padding: '0, 0, 0, 8', SortOrder: 'LayoutOrder' }
  },
  UIGridLayout: {
    label: 'UIGridLayout', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [
      { key: 'CellSize', label: 'Tamanho da célula (UDim2)', kind: 'udim2' },
      { key: 'CellPadding', label: 'Espaçamento (UDim2)', kind: 'udim2' },
      { key: 'SortOrder', label: 'Ordem', kind: 'enum', options: ['LayoutOrder', 'Name'] }
    ],
    defaultProps: { CellSize: '0, 80, 0, 80', CellPadding: '0, 8, 0, 8', SortOrder: 'LayoutOrder' }
  },
  UIPadding: {
    label: 'UIPadding', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [
      { key: 'PaddingTop', label: 'Superior (UDim)', kind: 'udim2' },
      { key: 'PaddingBottom', label: 'Inferior (UDim)', kind: 'udim2' },
      { key: 'PaddingLeft', label: 'Esquerda (UDim)', kind: 'udim2' },
      { key: 'PaddingRight', label: 'Direita (UDim)', kind: 'udim2' }
    ],
    defaultProps: { PaddingTop: '0, 8', PaddingBottom: '0, 8', PaddingLeft: '0, 8', PaddingRight: '0, 8' }
  },
  UICorner: {
    label: 'UICorner', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [{ key: 'CornerRadius', label: 'Raio (UDim)', kind: 'udim2' }],
    defaultProps: { CornerRadius: '0, 8' }
  },
  UIStroke: {
    label: 'UIStroke', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [pColor, { key: 'Thickness', label: 'Espessura', kind: 'number', min: 0, step: 0.5 }, { key: 'Transparency', label: 'Transparência', kind: 'number', min: 0, max: 1, step: 0.05 }],
    defaultProps: { Color: '#ffffff', Thickness: 1, Transparency: 0 }
  },
  UIGradient: {
    label: 'UIGradient', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [pColor, { key: 'Rotation', label: 'Rotação (graus)', kind: 'number', step: 5 }],
    defaultProps: { Color: '#4f8cff', Rotation: 90 }
  },
  UIScale: {
    label: 'UIScale', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [{ key: 'Scale', label: 'Escala', kind: 'number', min: 0.1, step: 0.05 }],
    defaultProps: { Scale: 1 }
  },
  UIAspectRatioConstraint: {
    label: 'UIAspectRatioConstraint', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [{ key: 'AspectRatio', label: 'Proporção (largura/altura)', kind: 'number', min: 0.1, step: 0.05 }, { key: 'AspectRatioType', label: 'Tipo', kind: 'enum', options: ['FitWithinMaxSize', 'ScaleWithParentSize'] }],
    defaultProps: { AspectRatio: 1.7777, AspectRatioType: 'FitWithinMaxSize' }
  },
  UIPageLayout: {
    label: 'UIPageLayout', category: 'GUI', container: false, hasSource: false,
    propertyDefs: [
      { key: 'FillDirection', label: 'Direção', kind: 'enum', options: ['Vertical', 'Horizontal'] },
      { key: 'Padding', label: 'Espaçamento (UDim)', kind: 'udim2' },
      { key: 'Animated', label: 'Animado', kind: 'boolean' }
    ],
    defaultProps: { FillDirection: 'Horizontal', Padding: '0, 0', Animated: true }
  },

  Script: { label: 'Script', category: 'Scripts', container: false, hasSource: true, propertyDefs: [{ key: 'Enabled', label: 'Ativado', kind: 'boolean' }], defaultProps: { Enabled: true } },
  LocalScript: { label: 'LocalScript', category: 'Scripts', container: false, hasSource: true, propertyDefs: [{ key: 'Enabled', label: 'Ativado', kind: 'boolean' }], defaultProps: { Enabled: true } },
  ModuleScript: { label: 'ModuleScript', category: 'Scripts', container: false, hasSource: true, propertyDefs: [], defaultProps: {} }
};

export const PART_CLASSES = ['Part', 'WedgePart', 'CornerWedgePart', 'TrussPart', 'SpawnLocation', 'Seat', 'VehicleSeat', 'MeshPart'];

export const AUX_COLORS: Record<string, string> = {
  PointLight: '#ffd66b',
  SpotLight: '#ffd66b',
  SurfaceLight: '#ffd66b',
  ParticleEmitter: '#b07cff',
  Beam: '#7cc4ff',
  Trail: '#7cc4ff',
  ProximityPrompt: '#38d17c',
  ClickDetector: '#38d17c',
  Sound: '#5ad1a5'
};

export const SCRIPT_CLASSES = ['Script', 'LocalScript', 'ModuleScript'];

export const STARTER_SOURCE: Record<string, string> = {
  Script: "-- Script criado no Roblox Web Studio\nlocal objeto = script.Parent\nprint(objeto.Name .. ' carregado')\n",
  LocalScript: "-- LocalScript criado no Roblox Web Studio\nlocal player = game:GetService('Players').LocalPlayer\nprint('Olá, ' .. player.Name)\n",
  ModuleScript: '-- Módulo criado no Roblox Web Studio\nlocal Modulo = {}\n\nfunction Modulo.exemplo()\n\treturn 42\nend\n\nreturn Modulo\n'
};

export const INSERT_CATEGORIES: { label: string; classes: string[] }[] = [
  { label: 'Básico', classes: ['Part', 'WedgePart', 'CornerWedgePart', 'TrussPart', 'MeshPart', 'Model', 'Folder'] },
  { label: 'Interação', classes: ['SpawnLocation', 'Seat', 'VehicleSeat', 'ProximityPrompt', 'ClickDetector', 'Attachment'] },
  { label: 'Luzes', classes: ['PointLight', 'SpotLight', 'SurfaceLight'] },
  { label: 'Efeitos', classes: ['ParticleEmitter', 'Beam', 'Trail', 'Highlight', 'Decal', 'Texture', 'Sound'] },
  { label: 'Interface', classes: ['ScreenGui', 'Frame', 'TextLabel', 'TextButton', 'TextBox', 'ImageLabel', 'ImageButton', 'ScrollingFrame', 'UIListLayout', 'UIGridLayout', 'UIPadding', 'UICorner', 'UIStroke', 'UIGradient', 'UIScale', 'UIAspectRatioConstraint', 'UIPageLayout'] },
  { label: 'Scripts', classes: ['Script', 'LocalScript', 'ModuleScript'] }
];

export function classInfo(className: string): ClassInfo | null {
  return CLASS_INFO[className] ?? null;
}

export function defaultPropsFor(className: string): Record<string, PropertyValue> {
  const info = CLASS_INFO[className];
  return info ? JSON.parse(JSON.stringify(info.defaultProps)) : {};
}

export function isContainer(className: string): boolean {
  const info = CLASS_INFO[className];
  return !!info && info.container;
}

export function hasSource(className: string): boolean {
  const info = CLASS_INFO[className];
  return !!info && info.hasSource;
}

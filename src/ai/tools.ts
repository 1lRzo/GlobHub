import { InstanceId, Project, PropertyValue, RbxInstance, Vec3 } from '../core/types';
import { findByName, isDescendantOf } from '../core/tree';
import { isContainer, classInfo, MATERIALS } from '../core/classes';
import { validateLuau } from '../scripting/luau';
import { useStore } from '../store/useStore';
import { AgentTool, AgentToolResult } from './types';

/* ------------------------------------------------------------------ */
/* Helpers de navegação no projeto                                      */
/* ------------------------------------------------------------------ */

function getProject(): Project {
  const state = useStore.getState();
  if (!state.project) throw new Error('Nenhum projeto aberto.');
  return state.project;
}

function fail(message: string): AgentToolResult {
  return { ok: false, message };
}

export function resolvePath(project: Project, path: string): RbxInstance | null {
  const parts = path.split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const root = project.instances[project.rootId];
  let cur: RbxInstance | null = null;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    if (i === 0) {
      const service = root.children
        .map(id => project.instances[id])
        .find(s => s && (s.name.toLowerCase() === part || s.className.toLowerCase() === part));
      if (!service) return null;
      cur = service;
      continue;
    }
    if (!cur) return null;
    const child = cur.children
      .map(id => project.instances[id])
      .find(c => c && (c.name.toLowerCase() === part || c.className.toLowerCase() === part));
    if (!child) return null;
    cur = child;
  }
  return cur;
}

export function resolveParent(project: Project, path: string | undefined): RbxInstance | null {
  if (!path || !path.trim()) return null;
  return resolvePath(project, path);
}

function parseVec(value: unknown): Vec3 | null {
  if (Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number')) {
    return { x: value[0] as number, y: value[1] as number, z: value[2] as number };
  }
  if (value && typeof value === 'object' && ['x', 'y', 'z'].every(k => typeof (value as Record<string, unknown>)[k] === 'number')) {
    const o = value as { x: number; y: number; z: number };
    return { x: o.x, y: o.y, z: o.z };
  }
  return null;
}

/** Converte um valor vindo do modelo/comando para PropertyValue. */
function toProperty(value: unknown): PropertyValue | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  const vec = parseVec(value);
  if (vec) return vec;
  return null;
}

function parseProps(raw: unknown): Record<string, PropertyValue> | null {
  if (raw == null || raw === '') return {};
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const out: Record<string, PropertyValue> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const pv = toProperty(v);
    if (pv !== null) out[k] = pv;
  }
  return out;
}

/** Caminho textual de um objeto, para relatórios. */
export function pathOf(project: Project, id: InstanceId): string {
  const names: string[] = [];
  let cur: RbxInstance | null = project.instances[id] ?? null;
  while (cur && cur.className !== 'DataModel') {
    names.unshift(cur.name);
    cur = cur.parent ? project.instances[cur.parent] ?? null : null;
  }
  return names.join('/');
}

function defaultParent(classOrFolder: string): InstanceId | null {
  const project = getProject();
  const root = project.instances[project.rootId];
  const isGui = classOrFolder.startsWith('UI')
    || ['ScreenGui', 'Frame', 'TextLabel', 'TextButton', 'TextBox', 'ImageLabel', 'ImageButton', 'ScrollingFrame'].includes(classOrFolder);
  const wanted = isGui ? 'StarterGui' : 'Workspace';
  const svc = root.children.map(id => project.instances[id]).find(s => s?.className === wanted);
  return svc?.id ?? root.children[0] ?? null;
}

function outlineTree(project: Project, id: InstanceId, depth: number, lines: string[], maxDepth: number): void {
  const inst = project.instances[id];
  if (!inst || inst.className === 'DataModel') return;
  const extra: string[] = [];
  if (inst.className === 'Script' || inst.className === 'LocalScript' || inst.className === 'ModuleScript') {
    extra.push(`${(inst.source ?? '').split('\n').length} linhas`);
  }
  lines.push(`${'  '.repeat(depth)}· ${inst.name} (${inst.className}${extra.length ? ': ' + extra.join(', ') : ''})`);
  if (depth >= maxDepth) {
    if (inst.children.length > 0) lines.push(`${'  '.repeat(depth + 1)}… (+${inst.children.length} filhos)`);
    return;
  }
  for (const cid of inst.children) outlineTree(project, cid, depth + 1, lines, maxDepth);
}

export function projectOutline(maxDepth = 4): string {
  const project = getProject();
  const root = project.instances[project.rootId];
  const lines: string[] = [`Projeto: ${project.name} · ${Object.keys(project.instances).length} objetos`];
  for (const sid of root.children) outlineTree(project, sid, 0, lines, maxDepth);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* Registro de ferramentas                                              */
/* ------------------------------------------------------------------ */

function findTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const project = getProject();
    const name = String(args.name ?? '').trim();
    if (!name) return fail('Informe o nome (ou parte dele) a pesquisar.');
    const className = args.className ? String(args.className).trim() : null;
    const limit = Math.min(Number(args.limit ?? 50) || 50, 200);
    const matches = Object.values(project.instances)
      .filter(i => i.className !== 'DataModel'
        && i.name.toLowerCase().includes(name.toLowerCase())
        && (!className || i.className.toLowerCase() === className.toLowerCase()))
      .slice(0, limit)
      .map(i => `${pathOf(project, i.id)} (${i.className})`);
    if (matches.length === 0) return { ok: true, message: `Nenhum objeto com nome contendo "${name}".` };
    return { ok: true, message: `Encontrados ${matches.length} objetos:\n${matches.join('\n')}` };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function listChildrenTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const project = getProject();
    const inst = resolveParent(project, String(args.path ?? 'Workspace'));
    if (!inst) return fail(`Caminho não encontrado: ${args.path}`);
    if (inst.children.length === 0) return { ok: true, message: `${pathOf(project, inst.id)} não tem filhos.` };
    const lines = inst.children
      .map(id => project.instances[id])
      .filter(Boolean)
      .map(c => `· ${c!.name} (${c!.className})`);
    return { ok: true, message: `${pathOf(project, inst.id)} → ${inst.children.length} filhos:\n${lines.join('\n')}` };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function createInstanceTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const className = String(args.className ?? 'Part').trim();
    const info = classInfo(className);
    if (!info) return fail(`Classe desconhecida: ${className}. Use classes do catálogo, como Part, Model, Folder, Script...`);
    const project = state.project;
    const parent = resolveParent(project, args.parentPath ? String(args.parentPath) : '') ?? null;
    const parentId = parent ? parent.id : defaultParent(className);
    if (!parentId) return fail('Não foi possível determinar onde inserir o objeto.');
    if (parent && !isContainer(parent.className) && parent.className !== 'Workspace') {
      return fail(`"${parent.name}" (${parent.className}) não aceita filhos. Insira dentro de uma pasta, Model ou de um serviço.`);
    }
    const nameOverride = args.name ? String(args.name).trim() : undefined;
    const props = parseProps(args.properties);
    if (props === null) return fail('Propriedades inválidas: use um objeto JSON, ex.: {"Color":"#ff0000"}.');
    const id = state.addInstance(className, parentId, props);
    if (!id) return fail('Falha ao criar o objeto.');
    if (nameOverride) state.updateInstance(id, { name: nameOverride });
    const inst = useStore.getState().project?.instances[id];
    return {
      ok: true,
      message: `Criado ${inst?.name ?? nameOverride ?? className} (${className}) em ${pathOf(useStore.getState().project!, parentId)}.`,
      createdIds: [id]
    };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function createFolderTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const name = String(args.name ?? '').trim();
    if (!name) return fail('Informe o nome da pasta.');
    const project = state.project;
    const parent = resolveParent(project, args.parentPath ? String(args.parentPath) : 'Workspace');
    if (!parent) return fail(`Caminho do pai não encontrado: ${args.parentPath}`);
    const id = state.addInstance('Folder', parent.id, {});
    if (!id) return fail('Falha ao criar a pasta.');
    state.updateInstance(id, { name });
    return { ok: true, message: `Pasta "${name}" criada em ${pathOf(project, parent.id)}.`, createdIds: [id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function createScriptTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const kind = String(args.kind ?? 'Script');
    if (!['Script', 'LocalScript', 'ModuleScript'].includes(kind)) return fail('kind deve ser Script, LocalScript ou ModuleScript.');
    const name = String(args.name ?? 'NovoScript').trim();
    const source = String(args.source ?? '');
    const issues = validateLuau(source).filter(i => i.severity === 'error');
    const project = state.project;
    let parentId: InstanceId | null = null;
    if (args.parentPath) {
      const parent = resolveParent(project, String(args.parentPath));
      if (!parent) return fail(`Caminho do pai não encontrado: ${args.parentPath}`);
      parentId = parent.id;
    } else {
      const wanted = kind === 'LocalScript' ? 'StarterPlayerScripts' : 'ServerScriptService';
      const root = project.instances[project.rootId];
      const svc = root.children.map(id => project.instances[id]).find(s => s?.className === wanted);
      parentId = svc?.id ?? null;
    }
    if (!parentId) return fail('Não foi possível determinar onde inserir o script.');
    const id = state.addInstance(kind, parentId, {});
    if (!id) return fail('Falha ao criar o script.');
    state.updateInstance(id, { name, source });
    const note = issues.length ? ` Atenção: a análise estrutural apontou possíveis problemas: ${issues.map(i => `linha ${i.line}: ${i.message}`).join('; ')}` : '';
    return { ok: true, message: `Script "${name}" (${kind}) criado.${note}`, createdIds: [id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function editScriptTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const inst = resolveParent(project, String(args.scriptPath ?? ''));
    if (!inst) return fail(`Script não encontrado: ${args.scriptPath}`);
    if (inst.source === undefined) return fail(`"${inst.name}" (${inst.className}) não é um script editável.`);
    const mode = String(args.mode ?? 'replace');
    const newSource = String(args.source ?? '');
    if (mode === 'append') {
      state.setInstanceSource(inst.id, (inst.source ?? '') + (inst.source?.endsWith('\n') ? '' : '\n') + newSource + '\n');
    } else {
      state.setInstanceSource(inst.id, newSource);
    }
    const finalSource = useStore.getState().project?.instances[inst.id]?.source ?? '';
    const issues = validateLuau(finalSource);
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const note = errors.length || warnings.length
      ? ` Análise estrutural: ${errors.length} erro(s), ${warnings.length} aviso(s). ${[...errors, ...warnings].map(i => `linha ${i.line}: ${i.message}`).join('; ')}`
      : ' Análise estrutural: sem problemas.';
    return { ok: true, message: `Script "${inst.name}" atualizado (${mode === 'append' ? 'texto adicionado' : 'código substituído'}).${note}`, affectedIds: [inst.id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function readScriptTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const project = getProject();
    const inst = resolveParent(project, String(args.scriptPath ?? ''));
    if (!inst) return fail(`Script não encontrado: ${args.scriptPath}`);
    if (inst.source === undefined) return fail(`"${inst.name}" (${inst.className}) não é um script.`);
    return { ok: true, message: `--- ${pathOf(project, inst.id)} (${inst.className}) ---\n${inst.source}` };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function renameTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const inst = resolveParent(state.project, String(args.path ?? ''));
    if (!inst) return fail(`Objeto não encontrado: ${args.path}`);
    const newName = String(args.newName ?? '').trim();
    if (!newName) return fail('Informe o novo nome.');
    state.updateInstance(inst.id, { name: newName });
    return { ok: true, message: `Renomeado para "${newName}" (${inst.className}).`, affectedIds: [inst.id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function setPropertyTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const inst = resolveParent(state.project, String(args.path ?? ''));
    if (!inst) return fail(`Objeto não encontrado: ${args.path}`);
    const key = String(args.key ?? '');
    const value = toProperty(args.value);
    if (!key || value === null) return fail('Informe key e value (número, texto, booleano ou vetor [x,y,z]).');
    state.setProperty(inst.id, key, value);
    return { ok: true, message: `${pathOf(state.project, inst.id)}.${key} = ${typeof value === 'object' ? JSON.stringify(value) : value}`, affectedIds: [inst.id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function moveTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const inst = resolveParent(project, String(args.path ?? ''));
    if (!inst) return fail(`Objeto não encontrado: ${args.path}`);
    const parent = resolveParent(project, String(args.newParentPath ?? ''));
    if (!parent) return fail(`Novo pai não encontrado: ${args.newParentPath}`);
    const ok = state.reparent(inst.id, parent.id);
    if (!ok) return fail('Movimento inválido: um objeto não pode ir para dentro dele mesmo.');
    return { ok: true, message: `"${inst.name}" movido para ${pathOf(project, parent.id)}.`, affectedIds: [inst.id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function duplicateTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const inst = resolveParent(project, String(args.path ?? ''));
    if (!inst) return fail(`Objeto não encontrado: ${args.path}`);
    if (!inst.parent || inst.parent === project.rootId) return fail('Esse objeto não pode ser duplicado (é um serviço).');
    const times = Math.max(1, Math.min(Number(args.times ?? 1) || 1, 100));
    const clones: InstanceId[] = [];
    for (let i = 0; i < times; i++) {
      state.duplicateInstances([inst.id]);
    }
    const projectAfter = useStore.getState().project;
    if (projectAfter && inst.parent) {
      const parent2 = projectAfter.instances[inst.parent];
      const recent = parent2 ? parent2.children.slice(-times) : [];
      clones.push(...recent.filter(id => projectAfter.instances[id] && id !== inst.id));
    }
    if (clones.length === 0) return fail('Falha ao duplicar.');
    return { ok: true, message: `Duplicado ${clones.length}× : ${pathOf(project, inst.id)}.`, createdIds: clones };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function deleteTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const inst = resolveParent(project, String(args.path ?? ''));
    if (!inst) return fail(`Objeto não encontrado: ${args.path}`);
    if (inst.parent === project.rootId) return fail('Não é possível excluir um serviço (Workspace, Players...).');
    const count = 1 + collectAll(project, inst.id).length;
    if (!args.confirmed) {
      return {
        ok: false,
        needsConfirm: true,
        confirmSummary: `Excluir "${pathOf(project, inst.id)}" e mais ${count - 1} objeto(s) dentro dele.`,
        message: 'Ação destrutiva: aguardando confirmação do usuário.'
      };
    }
    state.deleteInstances([inst.id]);
    return { ok: true, message: `Excluídos ${count} objeto(s): ${pathOf(project, inst.id)} e seu conteúdo.` };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function collectAll(project: Project, id: InstanceId): InstanceId[] {
  const inst = project.instances[id];
  if (!inst) return [];
  const out: InstanceId[] = [];
  for (const c of inst.children) {
    out.push(c, ...collectAll(project, c));
  }
  return out;
}

function groupChildrenTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const parent = resolveParent(project, String(args.path ?? ''));
    if (!parent) return fail(`Caminho não encontrado: ${args.path}`);
    const name = String(args.name ?? 'Model').trim();
    if (parent.children.length < 1) return fail('Não há filhos para agrupar.');
    state.groupChildren(parent.id, name);
    const projectAfter = useStore.getState().project;
    const parentAfter = projectAfter ? projectAfter.instances[parent.id] : null;
    const modelChild = parentAfter ? (parentAfter.children.find(cid => projectAfter.instances[cid]?.className === 'Model') ?? null) : null;
    return { ok: true, message: `${name}: filhos agrupados em um Model.`, affectedIds: modelChild ? [modelChild] : undefined };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function setLightingTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const root = project.instances[project.rootId];
    const lighting = root.children.map(id => project.instances[id]).find(s => s?.className === 'Lighting');
    if (!lighting) return fail('Serviço Lighting não encontrado.');
    const props = parseProps(args.properties);
    if (!props) return fail('Propriedades inválidas: use JSON, ex.: {"ClockTime":21,"FogEnd":120}.');
    const keys = Object.keys(props);
    const valid = new Set(classInfo('Lighting')?.propertyDefs.map(d => d.key) ?? []);
    for (const k of keys) {
      if (!valid.has(k)) return fail(`Propriedade de iluminação desconhecida: ${k}. Válidas: ${[...valid].join(', ')}.`);
      state.setProperty(lighting.id, k, props[k]);
    }
    return { ok: true, message: `Lighting atualizado: ${keys.map(k => `${k}=${JSON.stringify(props[k])}`).join(', ')}.`, affectedIds: [lighting.id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function analyzeScriptsTool(_args: Record<string, unknown>): AgentToolResult {
  try {
    const project = getProject();
    const scripts = Object.values(project.instances).filter(i => i.source !== undefined);
    if (scripts.length === 0) return { ok: true, message: 'Não há scripts no projeto.' };
    const lines: string[] = [];
    let errors = 0, warnings = 0;
    for (const s of scripts) {
      const issues = validateLuau(s.source ?? '');
      if (issues.length === 0) continue;
      for (const issue of issues) {
        if (issue.severity === 'error') errors++; else warnings++;
        lines.push(`${pathOf(project, s.id)} — linha ${issue.line} — ${issue.severity === 'error' ? 'ERRO' : 'aviso'}: ${issue.message}`);
      }
    }
    if (lines.length === 0) {
      return { ok: true, message: `Analisados ${scripts.length} script(s): nenhum erro estrutural detectado.` };
    }
    return { ok: true, message: `Analisados ${scripts.length} script(s): ${errors} erro(s), ${warnings} aviso(s).\n${lines.join('\n')}` };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function createParticlesTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const target = resolveParent(project, String(args.path ?? ''));
    if (!target) return fail(`Alvo não encontrado: ${args.path}`);
    if (target.className !== 'Part' && target.className !== 'MeshPart' && target.className !== 'SpawnLocation') {
      return fail('ParticleEmitter precisa estar dentro de uma Part/MeshPart/SpawnLocation.');
    }
    const props = parseProps(args.properties) ?? {};
    const id = state.addInstance('ParticleEmitter', target.id, props);
    if (!id) return fail('Falha ao criar o ParticleEmitter.');
    return { ok: true, message: `ParticleEmitter adicionado a ${pathOf(project, target.id)}.`, createdIds: [id] };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

function createNpcTool(args: Record<string, unknown>): AgentToolResult {
  try {
    const state = useStore.getState();
    if (!state.project) return fail('Nenhum projeto aberto.');
    const project = state.project;
    const name = String(args.name ?? 'NPC').trim();
    const position = parseVec(args.position) ?? { x: 0, y: 3, z: 0 };
    const root = project.instances[project.rootId];
    const workspace = root.children.map(id => project.instances[id]).find(s => s?.className === 'Workspace');
    if (!workspace) return fail('Workspace não encontrado.');
    const modelId = state.addInstance('Model', workspace.id, {});
    if (!modelId) return fail('Falha ao criar o Model do NPC.');
    state.updateInstance(modelId, { name });
    const torso = state.addInstance('Part', modelId, {
      Size: { x: 2.4, y: 3, z: 1.2 }, Position: { x: position.x, y: position.y, z: position.z },
      Color: '#3b82f6', Anchored: true, CanCollide: false
    });
    if (torso) state.updateInstance(torso, { name: 'Corpo' });
    const head = torso ? state.addInstance('Part', modelId, {
      Size: { x: 1.6, y: 1.4, z: 1.4 }, Position: { x: position.x, y: position.y + 2.2, z: position.z },
      Color: '#ffdbac', Shape: 'Ball', Anchored: true, CanCollide: false
    }) : null;
    if (head) state.updateInstance(head, { name: 'Cabeça' });
    return {
      ok: true,
      message: `NPC "${name}" criado (Model com Corpo e Cabeça ancorados). Para um NPC que persegue jogadores ou conversa, peça em seguida a criação de scripts em Luau dentro do Model.`,
      createdIds: [modelId]
    };
  } catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'outline_project',
    description: 'Mostra a estrutura do projeto: serviços, pastas, models e scripts com contagens.',
    params: ['maxDepth'],
    run: args => {
      try { return { ok: true, message: projectOutline(Math.min(Number(args.maxDepth ?? 4) || 4, 8)) }; }
      catch (e) { return fail(String(e instanceof Error ? e.message : e)); }
    }
  },
  {
    name: 'find_objects',
    description: 'Pesquisa objetos por pedaço do nome (e opcionalmente pela classe).',
    params: ['name', 'className', 'limit'],
    run: findTool
  },
  {
    name: 'list_children',
    description: 'Lista os filhos diretos de um caminho, ex.: "Workspace/Map/Buildings".',
    params: ['path'],
    run: listChildrenTool
  },
  {
    name: 'create_instance',
    description: 'Cria um objeto (Part, WedgePart, SpawnLocation, Seat, PointLight, Frame, TextButton etc.) dentro de um caminho.',
    params: ['className', 'name', 'parentPath', 'properties (objeto JSON, ex.: {"Color":"#ff0000"})'],
    run: createInstanceTool
  },
  {
    name: 'create_folder',
    description: 'Cria uma Folder dentro de um caminho.',
    params: ['name', 'parentPath'],
    run: createFolderTool
  },
  {
    name: 'create_script',
    description: 'Cria Script/LocalScript/ModuleScript com código Luau. Sem parentPath usa o serviço correto.',
    params: ['kind', 'name', 'parentPath', 'source'],
    run: createScriptTool
  },
  {
    name: 'edit_script',
    description: 'Substitui todo o código (mode=replace) ou adiciona ao final (mode=append) de um script existente.',
    params: ['scriptPath', 'source', 'mode'],
    run: editScriptTool
  },
  {
    name: 'read_script',
    description: 'Lê o código Luau de um script.',
    params: ['scriptPath'],
    run: readScriptTool
  },
  {
    name: 'rename_object',
    description: 'Renomeia um objeto do projeto.',
    params: ['path', 'newName'],
    run: renameTool
  },
  {
    name: 'set_property',
    description: 'Altera uma propriedade de um objeto (Color, Material, Transparency, Anchored, CanCollide, Size, Position, Brightness...).',
    params: ['path', 'key', 'value'],
    run: setPropertyTool
  },
  {
    name: 'move_object',
    description: 'Move um objeto para outro pai da hierarquia.',
    params: ['path', 'newParentPath'],
    run: moveTool
  },
  {
    name: 'duplicate_objects',
    description: 'Duplica um objeto N vezes (máx. 100) no mesmo pai. útil para casas, moedas, plataformas.',
    params: ['path', 'times'],
    run: duplicateTool
  },
  {
    name: 'delete_objects',
    description: 'Exclui um objeto e toda a sua subárvore. SEMPRE exige confirmação do usuário (needsConfirm).',
    destructive: true,
    params: ['path', 'confirmed'],
    run: deleteTool
  },
  {
    name: 'group_children',
    description: 'Agrupa todos os filhos diretos de um caminho em um Model.',
    params: ['path', 'name'],
    run: groupChildrenTool
  },
  {
    name: 'set_lighting',
    description: 'Configura iluminação: Brightness, Ambient, ClockTime, FogColor, FogEnd, ExposureCompensation.',
    params: ['properties (objeto JSON)'],
    run: setLightingTool
  },
  {
    name: 'analyze_scripts',
    description: 'Analisa todos os scripts do projeto com o validador Luau e reporta erros e avisos.',
    params: [],
    run: analyzeScriptsTool
  },
  {
    name: 'create_particles',
    description: 'Adiciona um ParticleEmitter a uma Part existente.',
    params: ['path', 'properties (objeto JSON)'],
    run: createParticlesTool
  },
  {
    name: 'create_npc',
    description: 'Cria um Model básico de NPC (Corpo e Cabeça ancorados) no Workspace.',
    params: ['name', 'position ([x,y,z])'],
    run: createNpcTool
  }
];

export const MATERIAL_NAMES = MATERIALS;

/** Nomes legados mantidos para compatibilidade interna de testes. */
export function namesInFolder(project: Project, id: InstanceId): string[] {
  const inst = project.instances[id];
  if (!inst) return [];
  return inst.children.map(c => project.instances[c]?.name ?? '').filter(Boolean);
}

export function instanceOf(project: Project, id: InstanceId): RbxInstance | undefined {
  return project.instances[id];
}

export function instanceCount(project: Project): number {
  return Object.keys(project.instances).length;
}

export { findByName, isDescendantOf };

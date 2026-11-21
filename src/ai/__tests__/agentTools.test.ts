import { describe, it, expect, beforeEach } from 'vitest';

import { resolveParent, resolvePath, pathOf, AGENT_TOOLS } from '../tools';
import { executeToolForTest, agentSend, getSettings } from '../agent';
import { useStore } from '../../store/useStore';

// O Vitest roda neste projeto em ambiente node (sem DOM). As configurações do
// agente usam localStorage no navegador; aqui instalamos um stub seguro para
// os testes rodarem sem depender de jsdom.
const memoryStore = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage ??= {
  clear: () => memoryStore.clear(),
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memoryStore.set(String(k), String(v)); },
  removeItem: (k: string) => { memoryStore.delete(k); }
};

function resetWithProject() {
  localStorage.clear();
  useStore.getState().createProject('Projeto Teste', 'vazio');
}

describe('resolver caminhos da hierarquia', () => {
  beforeEach(resetWithProject);

  it('resolve serviços pelo nome ou classe', () => {
    const project = useStore.getState().project!;
    expect(resolvePath(project, 'Workspace')).not.toBeNull();
    expect(resolvePath(project, 'workspace')).not.toBeNull();
    expect(resolvePath(project, 'ServerScriptService')).not.toBeNull();
    expect(resolvePath(project, 'NaoExiste')).toBeNull();
  });

  it('resolve caminhos aninhados com resolveParent', () => {
    const state = useStore.getState();
    const ws = resolveParent(state.project!, 'Workspace')!;
    const folderId = state.addInstance('Folder', ws.id, {});
    state.updateInstance(folderId!, { name: 'Map' });
    expect(state.project!.instances['Workspace'] ?? null).toBeDefined();
    expect(resolveParent(state.project!, 'Workspace/Map')!.id).toBe(folderId);
  });

  it('pathOf ignora a raiz DataModel', () => {
    const project = useStore.getState().project!;
    const ws = resolveParent(project, 'Workspace')!;
    expect(pathOf(project, ws.id)).toBe('Workspace');
  });
});

describe('ferramentas do agente', () => {
  beforeEach(resetWithProject);

  it('create_instance cria objeto com propriedades', () => {
    const result = executeToolForTest('create_instance', {
      className: 'Part', name: 'Plataforma', parentPath: 'Workspace',
      properties: { Size: [4, 1, 2], Color: '#ff0000', Anchored: true }
    });
    expect(result.ok).toBe(true);
    expect(result.createdIds?.length).toBe(1);
    const project = useStore.getState().project!;
    const inst = project.instances[result.createdIds![0]];
    expect(inst.name).toBe('Plataforma');
  });

  it('create_script cria no serviço correto e valida Luau', () => {
    const ok = executeToolForTest('create_script', {
      kind: 'Script', name: 'Main', source: 'local x = 1\nprint(x)\n'
    });
    expect(ok.ok).toBe(true);
    expect(ok.createdIds?.length).toBe(1);

    const bad = executeToolForTest('create_script', {
      kind: 'Script', name: 'Quebrado', source: 'if true then\nprint("falta end")\n'
    });
    expect(bad.ok).toBe(true);
    expect(bad.message).toContain('possíveis problemas');
  });

  it('delete_objects exige confirmação antes de excluir', () => {
    const state = useStore.getState();
    const ws = resolveParent(state.project!, 'Workspace')!;
    const folderId = state.addInstance('Folder', ws.id, {}) as string;
    state.updateInstance(folderId, { name: 'Alvo' });
    state.addInstance('Part', folderId, {});

    const first = executeToolForTest('delete_objects', { path: 'Workspace/Alvo' });
    expect(first.needsConfirm).toBe(true);

    const second = executeToolForTest('delete_objects', { path: 'Workspace/Alvo', confirmed: true });
    expect(second.ok).toBe(true);
    expect(useStore.getState().project!.instances[folderId]).toBeUndefined();
  });

  it('set_lighting rejeita propriedades desconhecidas', () => {
    const bad = executeToolForTest('set_lighting', { properties: { Inexistente: 1 } });
    expect(bad.ok).toBe(false);
    const good = executeToolForTest('set_lighting', { properties: { ClockTime: 21 } });
    expect(good.ok).toBe(true);
  });

  it('registro expõe todas as ferramentas com nome e descrição', () => {
    expect(AGENT_TOOLS.length).toBeGreaterThanOrEqual(16);
    for (const tool of AGENT_TOOLS) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(5);
      expect(typeof tool.run).toBe('function');
    }
  });
});

describe('modo local (sem chave de API)', () => {
  beforeEach(resetWithProject);

  it('agente local responde a comandos diretos', async () => {
    expect(getSettings().apiKey).toBe('');
    useStore.getState().pushAiMessage('system', 'CONFIRME:Excluir "Workspace/Lixo".');
    expect(useStore.getState().aiMessages.some(m => m.text.startsWith('CONFIRME:'))).toBe(true);
    await agentSend('resumo do projeto');
    const msgs = useStore.getState().aiMessages;
    expect(msgs.some(m => m.role === 'agent')).toBe(true);
  });
});

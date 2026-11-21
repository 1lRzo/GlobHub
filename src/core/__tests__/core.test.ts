import { describe, expect, it } from 'vitest';
import { instantiateProject, findService, SERVICE_ORDER } from '../project';
import { TEMPLATES } from '../templates';
import { serializeProject, deserializeProject } from '../serialize';
import { cloneSubtree, collectDescendantIds, createInstance, removeSubtree } from '../tree';
import { classInfo, PART_CLASSES } from '../classes';
import { Project } from '../types';

function validateTree(p: Project) {
  const ids = new Set(Object.keys(p.instances));
  const root = p.instances[p.rootId];
  expect(root).toBeDefined();
  expect(root.className).toBe('DataModel');
  for (const inst of Object.values(p.instances)) {
    if (inst.parent) {
      expect(ids.has(inst.parent), `pai ausente para ${inst.name}`).toBe(true);
      const parent = p.instances[inst.parent];
      expect(parent.children).toContain(inst.id);
    }
    for (const childId of inst.children) {
      expect(ids.has(childId), `filho ausente para ${inst.name}`).toBe(true);
      expect(p.instances[childId].parent).toBe(inst.id);
    }
    if (inst.parent === null) {
      expect(inst.id).toBe(p.rootId);
    }
  }
  expect(p.instances[p.rootId].children.length).toBe(SERVICE_ORDER.length);
}

describe('construção de projetos', () => {
  it('cria serviços padrão consistentes', () => {
    const p = instantiateProject('Teste', 'baseplate');
    validateTree(p);
    for (const svc of SERVICE_ORDER) {
      expect(findService(p, svc), `serviço ausente: ${svc}`).not.toBeNull();
    }
    const starterPlayer = findService(p, 'StarterPlayer')!;
    expect(starterPlayer.children.map(c => p.instances[c].className).sort())
      .toEqual(['StarterCharacterScripts', 'StarterPlayerScripts']);
    const replicated = findService(p, 'ReplicatedStorage')!;
    expect(replicated.children.map(c => p.instances[c].name).sort())
      .toEqual(['Modules', 'Remotes']);
  });

  it('gera SpawnLocation para todos os templates jogáveis', () => {
    for (const tpl of TEMPLATES) {
      const p = instantiateProject('T', tpl.id);
      validateTree(p);
      const workspace = findService(p, 'Workspace')!;
      const all = collectDescendantIds(p, workspace.id).map(id => p.instances[id]);
      if (tpl.id !== 'vazio') {
        expect(all.some(i => i.className === 'SpawnLocation'), `sem spawn: ${tpl.id}`).toBe(true);
      }
      expect(p.template).toBe(tpl.id);
    }
  });

  it('partes possuem Size e Position numéricos', () => {
    for (const tpl of TEMPLATES) {
      const p = instantiateProject('T', tpl.id);
      for (const inst of Object.values(p.instances)) {
        if (PART_CLASSES.includes(inst.className)) {
          for (const key of ['Size', 'Position']) {
            const val = inst.properties[key] as { x: number; y: number; z: number } | undefined;
            expect(val, `${key} ausente em ${inst.className} (${tpl.id})`).toBeDefined();
            for (const axis of ['x', 'y', 'z'] as const) {
              expect(typeof val![axis]).toBe('number');
              expect(Number.isFinite(val![axis])).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('operações na árvore', () => {
  it('remove subárvores mantendo consistência', () => {
    const p = instantiateProject('T', 'cidade');
    const workspace = findService(p, 'Workspace')!;
    const mapFolder = workspace.children.map(id => p.instances[id]).find(i => i.name === 'Map')!;
    const before = Object.keys(p.instances).length;
    removeSubtree(p, mapFolder.id);
    expect(Object.keys(p.instances).length).toBeLessThan(before);
    const ids = new Set(Object.keys(p.instances));
    for (const inst of Object.values(p.instances)) {
      if (inst.parent) expect(ids.has(inst.parent)).toBe(true);
      for (const c of inst.children) expect(ids.has(c)).toBe(true);
    }
  });

  it('clona subárvores com novos ids', () => {
    const p = instantiateProject('T', 'baseplate');
    const workspace = findService(p, 'Workspace')!;
    const base = workspace.children.map(id => p.instances[id]).find(i => i.name === 'Baseplate')!;
    const cloneId = cloneSubtree(p, base.id, workspace.id)!;
    expect(cloneId).toBeDefined();
    expect(cloneId).not.toBe(base.id);
    expect(p.instances[cloneId].name).toBe(base.name);
    expect(p.instances[workspace.id].children).toContain(cloneId);
  });

  it('createInstance aplica propriedades por cima dos padrões', () => {
    const inst = createInstance('Part', 'MinhaParte', { Color: '#ff0000' });
    expect(inst.properties.Color).toBe('#ff0000');
    expect(inst.properties.Material).toBe('Plastic');
    expect(inst.className).toBe('Part');
  });
});

describe('serialização', () => {
  it('faz ida e volta sem perder dados', () => {
    const p = instantiateProject('Save', 'obby');
    const json = serializeProject(p);
    const restored = deserializeProject(json);
    expect(restored).not.toBeNull();
    expect(Object.keys(restored!.instances)).toEqual(Object.keys(p.instances));
    expect(restored!.instances[p.rootId].children).toEqual(p.instances[p.rootId].children);
    const lighting = findService(restored!, 'Lighting')!;
    expect(typeof lighting.properties.Brightness).toBe('number');
  });

  it('rejeita JSON inválido ou malformado', () => {
    expect(deserializeProject('não é json')).toBeNull();
    expect(deserializeProject('{"foo": 1}')).toBeNull();
    expect(deserializeProject('{"id":"x","rootId":"y","instances":{}}')).toBeNull();
  });
});

describe('registro de classes', () => {
  it('todas as classes criáveis existem no registro', () => {
    for (const tpl of TEMPLATES) {
      const p = instantiateProject('T', tpl.id);
      for (const inst of Object.values(p.instances)) {
        expect(classInfo(inst.className), `classe não registrada: ${inst.className}`).not.toBeNull();
      }
    }
  });
});

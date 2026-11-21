import { InstanceId, Project, PropertyValue, RbxInstance } from './types';
import { newId } from './ids';
import { createInstance } from './tree';
import { NodeSpec, templateById } from './templates';

export const SERVICE_ORDER = [
  'Workspace', 'Players', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService',
  'StarterGui', 'StarterPack', 'StarterPlayer', 'Lighting', 'SoundService'
];

function applySpec(
  instances: Record<InstanceId, RbxInstance>,
  spec: NodeSpec,
  parentId: InstanceId
): InstanceId {
  const inst = createInstance(spec.className, spec.name ?? spec.className, spec.properties);
  inst.parent = parentId;
  if (spec.source && inst.source !== undefined) {
    inst.source = spec.source;
  }
  instances[inst.id] = inst;
  const parent = instances[parentId];
  if (parent) parent.children.push(inst.id);
  for (const child of spec.children ?? []) {
    applySpec(instances, child, inst.id);
  }
  return inst.id;
}

export function instantiateProject(name: string, templateId: string): Project {
  const tpl = templateById(templateId);
  const instances: Record<InstanceId, RbxInstance> = {};

  const rootId = newId();
  instances[rootId] = { id: rootId, className: 'DataModel', name: 'Game', parent: null, children: [], properties: {} };
  const root = instances[rootId];

  const serviceIds: Record<string, InstanceId> = {};
  for (const svc of SERVICE_ORDER) {
    const inst = createInstance(svc, svc);
    inst.parent = rootId;
    instances[inst.id] = inst;
    root.children.push(inst.id);
    serviceIds[svc] = inst.id;
  }

  const created = (parentId: InstanceId, spec: { className: string; name?: string; properties?: Record<string, PropertyValue> }): InstanceId => {
    const inst = createInstance(spec.className, spec.name, spec.properties);
    inst.parent = parentId;
    instances[inst.id] = inst;
    instances[parentId].children.push(inst.id);
    return inst.id;
  };

  created(serviceIds.Workspace, { className: 'Terrain', name: 'Terrain' });
  created(serviceIds.Workspace, { className: 'Camera', name: 'Camera' });
  created(serviceIds.StarterPlayer, { className: 'StarterCharacterScripts', name: 'StarterCharacterScripts' });
  created(serviceIds.StarterPlayer, { className: 'StarterPlayerScripts', name: 'StarterPlayerScripts' });
  created(serviceIds.ReplicatedStorage, { className: 'Folder', name: 'Modules' });
  created(serviceIds.ReplicatedStorage, { className: 'Folder', name: 'Remotes' });

  const built = tpl.build();
  for (const spec of built.workspace ?? []) applySpec(instances, spec, serviceIds.Workspace);
  for (const spec of built.serverScriptService ?? []) applySpec(instances, spec, serviceIds.ServerScriptService);
  for (const spec of built.starterGui ?? []) applySpec(instances, spec, serviceIds.StarterGui);
  for (const spec of built.replicatedStorage ?? []) applySpec(instances, spec, serviceIds.ReplicatedStorage);
  if (built.lighting) {
    instances[serviceIds.Lighting].properties = { ...instances[serviceIds.Lighting].properties, ...built.lighting };
  }
  if (built.workspaceProps) {
    instances[serviceIds.Workspace].properties = { ...instances[serviceIds.Workspace].properties, ...built.workspaceProps };
  }

  const now = Date.now();
  return {
    id: newId(),
    name: name.trim() || 'Novo jogo',
    template: tpl.id,
    createdAt: now,
    updatedAt: now,
    rootId,
    instances
  };
}

export function metaFromProject(p: Project): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    template: p.template,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    instanceCount: Object.keys(p.instances).length
  };
}

export function findService(project: Project, className: string): RbxInstance | null {
  const root = project.instances[project.rootId];
  if (!root) return null;
  for (const id of root.children) {
    const inst = project.instances[id];
    if (inst && inst.className === className) return inst;
  }
  return null;
}

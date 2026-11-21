import { InstanceId, Project, PropertyValue, RbxInstance } from './types';
import { newId } from './ids';
import { defaultPropsFor, hasSource, STARTER_SOURCE } from './classes';

export function createInstance(className: string, name?: string, properties?: Record<string, PropertyValue>): RbxInstance {
  const inst: RbxInstance = {
    id: newId(),
    className,
    name: name ?? className,
    parent: null,
    children: [],
    properties: defaultPropsFor(className)
  };
  if (hasSource(className) && inst.source === undefined) {
    inst.source = STARTER_SOURCE[className] ?? '';
  }
  if (properties) {
    inst.properties = { ...inst.properties, ...properties };
  }
  return inst;
}

export function isDescendantOf(project: Project, id: InstanceId, maybeAncestor: InstanceId): boolean {
  let cur: InstanceId | null = project.instances[id]?.parent ?? null;
  while (cur) {
    if (cur === maybeAncestor) return true;
    cur = project.instances[cur]?.parent ?? null;
  }
  return false;
}

export function collectDescendantIds(project: Project, id: InstanceId): InstanceId[] {
  const out: InstanceId[] = [];
  const walk = (iid: InstanceId) => {
    const inst = project.instances[iid];
    if (!inst) return;
    out.push(iid);
    for (const c of inst.children) walk(c);
  };
  walk(id);
  return out;
}

export function removeSubtree(project: Project, id: InstanceId): void {
  const inst = project.instances[id];
  if (!inst) return;
  for (const child of [...inst.children]) {
    removeSubtree(project, child);
  }
  if (inst.parent && project.instances[inst.parent]) {
    const parent = project.instances[inst.parent];
    parent.children = parent.children.filter(c => c !== id);
  }
  delete project.instances[id];
}

export function cloneSubtree(project: Project, id: InstanceId, parentId: InstanceId): InstanceId | null {
  const src = project.instances[id];
  if (!src) return null;
  const copy: RbxInstance = JSON.parse(JSON.stringify(src));
  copy.id = newId();
  copy.parent = parentId;
  copy.children = [];
  project.instances[copy.id] = copy;
  const targetParent = project.instances[parentId];
  if (targetParent) targetParent.children.push(copy.id);
  for (const child of src.children) {
    cloneSubtree(project, child, copy.id);
  }
  return copy.id;
}

export function findByName(project: Project, name: string): RbxInstance[] {
  return Object.values(project.instances).filter(i => i.name === name);
}

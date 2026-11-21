import { InstanceId, Project, RbxInstance, Vec3 } from './types';
import { PART_CLASSES } from './classes';

/**
 * Posição "no mundo" aproximada de um objeto: usa o Part mais próximo na cadeia
 * de ancestrais e, se não houver, procura o primeiro Part no subárvore do
 * ancestral mais próximo (ex.: luz dentro de um Model de poste).
 */
export function findNearestPartPositionFor(project: Project, inst: RbxInstance): Vec3 | null {
  let cur: InstanceId | null = inst.parent;
  let firstContainer: RbxInstance | null = null;
  while (cur) {
    const node = project.instances[cur];
    if (!node) break;
    if (PART_CLASSES.includes(node.className) && node.properties.Position) {
      const base = node.properties.Position as Vec3;
      // soma anexos intermediários simples (Attachments) entre o objeto e o part
      let offsetX = 0, offsetY = 0, offsetZ = 0;
      let walk: InstanceId | null = inst.id;
      while (walk && walk !== node.id) {
        const mid = project.instances[walk];
        if (mid?.className === 'Attachment' && mid.properties.Position) {
          const off = mid.properties.Position as Vec3;
          offsetX += off.x; offsetY += off.y; offsetZ += off.z;
        }
        walk = mid?.parent ?? null;
      }
      return { x: base.x + offsetX, y: base.y + offsetY, z: base.z + offsetZ };
    }
    if (!firstContainer && (node.className === 'Model' || node.className === 'Folder')) {
      firstContainer = node;
    }
    cur = node.parent;
  }
  const search = firstContainer ?? (PART_CLASSES.includes(inst.className) ? inst : null);
  if (search) {
    const stack: InstanceId[] = [...search.children];
    while (stack.length) {
      const id = stack.shift()!;
      const node = project.instances[id];
      if (node && PART_CLASSES.includes(node.className) && node.properties.Position) {
        const base = node.properties.Position as Vec3;
        // sobe do part encontrado até o container somando Attachments
        let walk: InstanceId | null = id;
        let dx = 0, dy = 0, dz = 0;
        while (walk && walk !== search.id) {
          const mid = project.instances[walk];
          if (mid?.className === 'Attachment' && mid.properties.Position) {
            dx += (mid.properties.Position as Vec3).x;
            dy += (mid.properties.Position as Vec3).y;
            dz += (mid.properties.Position as Vec3).z;
          }
          walk = mid?.parent ?? null;
        }
        return { x: base.x + dx, y: base.y + dy, z: base.z + dz };
      }
      if (node) stack.push(...node.children);
    }
  }
  return null;
}

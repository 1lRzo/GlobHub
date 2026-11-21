import { Project } from './types';

const FORMAT = 'rws_v1';

export function serializeProject(p: Project): string {
  return JSON.stringify({ format: FORMAT, project: p });
}

export function deserializeProject(json: string): Project | null {
  try {
    const data = JSON.parse(json);
    const p = data && typeof data === 'object' ? (data.project ?? data) : null;
    if (!p || typeof p !== 'object') return null;
    if (typeof p.id !== 'string' || typeof p.rootId !== 'string') return null;
    if (!p.instances || typeof p.instances !== 'object') return null;
    const root = p.instances[p.rootId];
    if (!root || !Array.isArray(root.children)) return null;
    for (const inst of Object.values(p.instances as Record<string, { id?: string; className?: string; children?: unknown }>)) {
      if (typeof inst.id !== 'string' || typeof inst.className !== 'string' || !Array.isArray(inst.children)) return null;
    }
    return p as Project;
  } catch {
    return null;
  }
}

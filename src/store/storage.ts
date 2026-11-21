import { Project, ProjectMeta } from '../core/types';
import { metaFromProject } from '../core/project';
import { deserializeProject, serializeProject } from '../core/serialize';

const META_KEY = 'rws.meta.v1';
const DATA_PREFIX = 'rws.project.v1.';

function readMetas(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(m => m && typeof m.id === 'string');
  } catch {
    return [];
  }
}

function writeMetas(metas: ProjectMeta[]): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metas));
  } catch (err) {
    console.error('Não foi possível salvar a lista de projetos', err);
  }
}

export function listProjectMetas(): ProjectMeta[] {
  return readMetas().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveProjectData(p: Project): ProjectMeta {
  try {
    localStorage.setItem(DATA_PREFIX + p.id, serializeProject(p));
    const metas = readMetas().filter(m => m.id !== p.id);
    metas.unshift(metaFromProject(p));
    writeMetas(metas);
  } catch (err) {
    console.error('Falha ao salvar o projeto; exporte uma cópia para não perder progresso.', err);
  }
  return metaFromProject(p);
}

export function loadProjectData(id: string): Project | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + id);
    if (!raw) return null;
    return deserializeProject(raw);
  } catch {
    return null;
  }
}

export function deleteProjectData(id: string): void {
  try {
    localStorage.removeItem(DATA_PREFIX + id);
    writeMetas(readMetas().filter(m => m.id !== id));
  } catch {
    // ignorar falhas de remoção
  }
}

export function downloadProjectFile(p: Project): void {
  const blob = new Blob([serializeProject(p)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${p.name.replace(/[^\w\- ]+/g, '') || 'projeto'}.rws.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

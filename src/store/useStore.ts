import { create } from 'zustand';
import { InstanceId, Project, ProjectMeta, PropertyValue, RbxInstance, ToolMode, TransformPayload, Vec3 } from '../core/types';
import { instantiateProject, metaFromProject } from '../core/project';
import { deserializeProject } from '../core/serialize';
import { createInstance, isDescendantOf, removeSubtree, cloneSubtree } from '../core/tree';
import { isContainer } from '../core/classes';
import { newId } from '../core/ids';
import { AiMessage } from '../ai/types';
import { deleteProjectData, downloadProjectFile, listProjectMetas, loadProjectData, saveProjectData } from './storage';

const UNDO_LIMIT = 60;
const COALESCE_WINDOW = 900;

export type SaveState = 'saved' | 'saving';

interface StudioState {
  projects: ProjectMeta[];
  currentProjectId: string | null;
  project: Project | null;
  selection: InstanceId[];
  expanded: Record<string, boolean>;
  tool: ToolMode;
  undoStack: string[];
  redoStack: string[];
  saveState: SaveState;
  lastCoalesce: { key: string; time: number } | null;
  toast: string | null;
  /** Conversa com o agente de IA (limpa ao limpar a conversa; não participa de undo). */
  aiMessages: AiMessage[];

  refreshProjects(): void;
  createProject(name: string, templateId: string): string;
  openProject(id: string): boolean;
  closeProject(): void;
  removeProject(id: string): void;
  duplicateProject(id: string): void;
  renameProject(id: string, name: string): void;
  importProject(json: string): boolean;
  exportCurrentProject(): void;

  select(id: InstanceId | null, additive?: boolean): void;
  setExpanded(id: string, value: boolean): void;
  setTool(tool: ToolMode): void;
  showToast(message: string): void;

  addInstance(className: string, parentId?: InstanceId | null, props?: Record<string, PropertyValue>): InstanceId | null;
  updateInstance(id: InstanceId, patch: Partial<RbxInstance>): void;
  setProperty(id: InstanceId, key: string, value: PropertyValue): void;
  deleteInstances(ids: InstanceId[]): void;
  duplicateInstances(ids: InstanceId[]): void;
  reparent(id: InstanceId, newParentId: InstanceId): boolean;
  groupSelection(): void;
  ungroup(id: InstanceId): void;
  setInstanceSource(id: InstanceId, source: string): void;
  groupChildren(parentId: InstanceId, name: string): void;
  pushAiMessage(role: AiMessage['role'], text: string, actions?: string[]): void;
  clearAiMessages(): void;

  beginTransformForSelection(): void;
  commitTransform(id: InstanceId, transform: TransformPayload): void;

  undo(): void;
  redo(): void;
  saveNow(): void;
  clearToast(): void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function pruneSelection(selection: InstanceId[], project: Project | null): InstanceId[] {
  if (!project) return [];
  return selection.filter(id => !!project.instances[id]);
}

export const useStore = create<StudioState>((set, get) => {
  function schedulePersist() {
    if (!get().project) return;
    set({ saveState: 'saving' });
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const state = get();
      if (state.project) saveProjectData(state.project);
      set({ saveState: 'saved' });
    }, 800);
  }

  /** Aplica uma mutação no projeto atual com snapshot de undo opcional. */
  function mutateProject(
    mutate: (p: Project) => void,
    opts?: { undo?: boolean; coalesceKey?: string }
  ) {
    const state = get();
    if (!state.project) return;
    const useUndo = opts?.undo !== false;
    const now = Date.now();
    const coalesceKey = opts?.coalesceKey;
    let addSnapshot = useUndo;
    if (useUndo && coalesceKey && state.lastCoalesce && state.lastCoalesce.key === coalesceKey && now - state.lastCoalesce.time < COALESCE_WINDOW) {
      addSnapshot = false;
    }
    const undoStack = addSnapshot
      ? [...state.undoStack, JSON.stringify(state.project)].slice(-UNDO_LIMIT)
      : state.undoStack;
    const project: Project = JSON.parse(JSON.stringify(state.project));
    mutate(project);
    project.updatedAt = now;
    set({
      project,
      undoStack,
      redoStack: [],
      lastCoalesce: coalesceKey ? { key: coalesceKey, time: now } : null,
      selection: pruneSelection(state.selection, project)
    });
    schedulePersist();
  }

  function resolveInsertParent(state: StudioState, className: string, parentId?: InstanceId | null): InstanceId {
    const project = state.project;
    if (!project) return '';
    const services = project.instances[project.rootId]?.children ?? [];
    if (parentId && project.instances[parentId]) return parentId;
    const first = state.selection[0] ? project.instances[state.selection[0]] : null;
    const isGuiClass = className === 'ScreenGui' || ['Frame', 'TextLabel', 'TextButton', 'TextBox', 'ImageLabel', 'ImageButton', 'ScrollingFrame'].includes(className) || className.startsWith('UI');
    if (isGuiClass) {
      return findServiceIdByName(project, 'StarterGui') ?? services[0];
    }
    if (first) {
      if (isContainer(first.className)) return first.id;
      if (first.parent) return first.parent;
    }
    return findServiceIdByName(project, 'Workspace') ?? services[0];
  }

  function findServiceIdByName(project: Project, className: string): InstanceId | null {
    const root = project.instances[project.rootId];
    if (!root) return null;
    for (const id of root.children) {
      const inst = project.instances[id];
      if (inst && inst.className === className) return id;
    }
    return null;
  }

  return {
    projects: listProjectMetas(),
    currentProjectId: null,
    project: null,
    selection: [],
    expanded: { Workspace: true },
    tool: 'select',
    undoStack: [],
    redoStack: [],
    saveState: 'saved',
    lastCoalesce: null,
    toast: null,
    aiMessages: [],

    refreshProjects() {
      set({ projects: listProjectMetas() });
    },

    createProject(name, templateId) {
      const project = instantiateProject(name, templateId);
      saveProjectData(project);
      set({
        projects: listProjectMetas(),
        currentProjectId: project.id,
        project,
        selection: [],
        expanded: { Workspace: true },
        undoStack: [],
        redoStack: [],
        saveState: 'saved',
        lastCoalesce: null
      });
      return project.id;
    },

    openProject(id) {
      const project = loadProjectData(id);
      if (!project) return false;
      set({
        projects: listProjectMetas(),
        currentProjectId: project.id,
        project,
        selection: [],
        expanded: { Workspace: true },
        undoStack: [],
        redoStack: [],
        saveState: 'saved',
        lastCoalesce: null
      });
      return true;
    },

    closeProject() {
      const state = get();
      if (state.project) schedulePersist();
      set({ currentProjectId: null, project: null, selection: [], undoStack: [], redoStack: [] });
    },

    removeProject(id) {
      deleteProjectData(id);
      const state = get();
      set({
        projects: listProjectMetas(),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        project: state.currentProjectId === id ? null : state.project
      });
    },

    duplicateProject(id) {
      const project = loadProjectData(id);
      if (!project) return;
      const clone: Project = { ...project, id: newId(), name: `${project.name} (cópia)`, createdAt: Date.now(), updatedAt: Date.now() };
      saveProjectData(clone);
      set({ projects: listProjectMetas() });
    },

    renameProject(id, name) {
      const clean = name.trim();
      if (!clean) return;
      const state = get();
      if (state.project && state.currentProjectId === id) {
        mutateProject(p => { p.name = clean; });
      } else {
        const project = loadProjectData(id);
        if (!project) return;
        project.name = clean;
        project.updatedAt = Date.now();
        saveProjectData(project);
        set({ projects: listProjectMetas() });
      }
    },

    importProject(json) {
      const project = deserializeProject(json);
      if (!project) {
        get().showToast('Arquivo inválido: não é um projeto do Roblox Web Studio.');
        return false;
      }
      project.id = newId();
      const meta = saveProjectData(project);
      set({
        projects: listProjectMetas(),
        currentProjectId: project.id,
        project,
        selection: [],
        expanded: { Workspace: true },
        undoStack: [],
        redoStack: [],
        saveState: 'saved',
        lastCoalesce: null
      });
      void meta;
      return true;
    },

    exportCurrentProject() {
      const state = get();
      if (state.project) downloadProjectFile(state.project);
    },

    select(id, additive) {
      if (!id) {
        set({ selection: [] });
        return;
      }
      if (additive) {
        const sel = get().selection;
        set({ selection: sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id] });
      } else {
        set({ selection: [id] });
      }
    },

    setExpanded(id, value) {
      set(s => ({ expanded: { ...s.expanded, [id]: value } }));
    },

    setTool(tool) {
      set({ tool });
    },

    showToast(message) {
      set({ toast: message });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 3500);
    },

    clearToast() {
      set({ toast: null });
    },

    addInstance(className, parentId, props) {
      const state = get();
      if (!state.project) return null;
      const target = resolveInsertParent(state, className, parentId ?? null);
      if (!target || !state.project.instances[target]) return null;
      const inst = createInstance(className, undefined, props);
      inst.parent = target;
      const newIdValue = inst.id;
      mutateProject(p => {
        p.instances[newIdValue] = inst;
        p.instances[target].children.push(newIdValue);
      });
      set(s => ({ selection: [newIdValue], expanded: { ...s.expanded, [target]: true } }));
      return newIdValue;
    },

    updateInstance(id, patch) {
      mutateProject(p => {
        const inst = p.instances[id];
        if (inst) Object.assign(inst, patch);
      });
    },

    setProperty(id, key, value) {
      mutateProject(p => {
        const inst = p.instances[id];
        if (inst) inst.properties[key] = value;
      }, { coalesceKey: `${id}:${key}` });
    },

    deleteInstances(ids) {
      mutateProject(p => {
        for (const id of ids) removeSubtree(p, id);
      });
    },

    duplicateInstances(ids) {
      let newIds: InstanceId[] = [];
      mutateProject(p => {
        for (const id of ids) {
          const inst = p.instances[id];
          if (!inst || !inst.parent) continue;
          if (inst.parent === p.rootId) continue; // serviços não podem ser duplicados
          const cloned = cloneSubtree(p, id, inst.parent);
          if (cloned) newIds.push(cloned);
        }
      });
      if (newIds.length) set({ selection: newIds });
    },

    reparent(id, newParentId) {
      const project = get().project;
      if (!project) return false;
      const inst = project.instances[id];
      const newParent = project.instances[newParentId];
      if (!inst || !newParent || !newParentId) return false;
      if (id === newParentId) return false;
      if (isDescendantOf(project, newParentId, id)) return false;
      const oldParentId = inst.parent;
      if (oldParentId === newParentId) return true;
      mutateProject(p => {
        const moving = p.instances[id];
        if (oldParentId && p.instances[oldParentId]) {
          p.instances[oldParentId].children = p.instances[oldParentId].children.filter(c => c !== id);
        }
        moving.parent = newParentId;
        p.instances[newParentId].children.push(id);
      });
      set(s => ({ expanded: { ...s.expanded, [newParentId]: true } }));
      return true;
    },

    groupSelection() {
      const state = get();
      if (!state.project || state.selection.length < 2) return;
      const first = state.project.instances[state.selection[0]];
      if (!first || !first.parent) return;
      const parentId = first.parent;
      const members = state.selection.filter(id => {
        const inst = state.project!.instances[id];
        return inst && inst.parent === parentId;
      });
      if (members.length < 2) return;
      const modelId = newId();
      const modelInst = createInstance('Model', 'Model');
      modelInst.id = modelId;
      modelInst.parent = parentId;
      mutateProject(p => {
        p.instances[modelId] = modelInst;
        p.instances[parentId].children.push(modelId);
        for (const id of members) {
          const inst = p.instances[id];
          if (inst?.parent) {
            p.instances[inst.parent].children = p.instances[inst.parent].children.filter(c => c !== id);
          }
          inst.parent = modelId;
          p.instances[modelId].children.push(id);
        }
      });
      set(s => ({ selection: [modelId], expanded: { ...s.expanded, [modelId]: true } }));
    },

    ungroup(id) {
      const project = get().project;
      if (!project) return;
      const inst = project.instances[id];
      if (!inst || inst.className !== 'Model' || !inst.parent) return;
      const parentId = inst.parent;
      const members = [...inst.children];
      mutateProject(p => {
        const m = p.instances[id];
        if (!m) return;
        for (const childId of members) {
          const child = p.instances[childId];
          if (!child) continue;
          child.parent = parentId;
          p.instances[parentId].children.push(childId);
        }
        removeSubtree(p, id);
      });
      set({ selection: members.filter(mid => !!get().project?.instances[mid]) });
    },

    groupChildren(parentId, name) {
      const state = get();
      if (!state.project) return;
      const parent = state.project.instances[parentId];
      if (!parent || parent.children.length < 1) return;
      const children = [...parent.children];
      const modelId = newId();
      const modelInst = createInstance('Model', name);
      modelInst.id = modelId;
      modelInst.parent = parentId;
      mutateProject(p => {
        p.instances[modelId] = modelInst;
        p.instances[parentId].children.push(modelId);
        for (const cid of children) {
          const inst = p.instances[cid];
          if (!inst) continue;
          p.instances[parentId].children = p.instances[parentId].children.filter(c => c !== cid);
          inst.parent = modelId;
          p.instances[modelId].children.push(cid);
        }
      });
      set(s => ({ selection: [modelId], expanded: { ...s.expanded, [modelId]: true } }));
    },

    pushAiMessage(role, text, actions) {
      const msg: AiMessage = { id: newId(), role, text, ts: Date.now() };
      if (actions && actions.length > 0) msg.actions = actions;
      set(s => ({ aiMessages: [...s.aiMessages, msg].slice(-200) }));
    },

    clearAiMessages() {
      set({ aiMessages: [] });
    },

    setInstanceSource(id, source) {
      mutateProject(p => {
        const inst = p.instances[id];
        if (inst) inst.source = source;
      }, { coalesceKey: `source:${id}` });
    },

    beginTransformForSelection() {
      const state = get();
      if (!state.project) return;
      // um único snapshot por gesto (o commit não cria undo adicional)
      set(s => ({ undoStack: [...s.undoStack, JSON.stringify(s.project!)].slice(-UNDO_LIMIT), redoStack: [] }));
    },

    commitTransform(id, transform) {
      const applyVec = (target: Vec3 | undefined, next: Vec3 | undefined) => {
        if (!target || !next) return;
        target.x = Math.round(next.x * 1000) / 1000;
        target.y = Math.round(next.y * 1000) / 1000;
        target.z = Math.round(next.z * 1000) / 1000;
      };
      mutateProject(p => {
        const inst = p.instances[id];
        if (!inst) return;
        if (transform.position && inst.properties.Position) applyVec(inst.properties.Position as Vec3, transform.position);
        if (transform.orientation && inst.properties.Orientation) applyVec(inst.properties.Orientation as Vec3, transform.orientation);
        if (transform.size && inst.properties.Size) applyVec(inst.properties.Size as Vec3, transform.size);
      }, { undo: false });
    },

    undo() {
      const state = get();
      if (!state.project || state.undoStack.length === 0) return;
      const previous = state.undoStack[state.undoStack.length - 1];
      const current = JSON.stringify(state.project);
      let project: Project | null = null;
      try {
        project = JSON.parse(previous);
      } catch {
        return;
      }
      if (!project) return;
      set({
        project,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, current].slice(-UNDO_LIMIT),
        selection: pruneSelection(state.selection, project)
      });
      schedulePersist();
    },

    redo() {
      const state = get();
      if (!state.project || state.redoStack.length === 0) return;
      const next = state.redoStack[state.redoStack.length - 1];
      const current = JSON.stringify(state.project);
      let project: Project | null = null;
      try {
        project = JSON.parse(next);
      } catch {
        return;
      }
      if (!project) return;
      set({
        project,
        undoStack: [...state.undoStack, current].slice(-UNDO_LIMIT),
        redoStack: state.redoStack.slice(0, -1),
        selection: pruneSelection(state.selection, project)
      });
      schedulePersist();
    },

    saveNow() {
      const state = get();
      if (!state.project) return;
      saveProjectData(state.project);
      set({ saveState: 'saved', projects: listProjectMetas() });
    }
  };
});

export function projectStats(p: Project) {
  return metaFromProject(p);
}

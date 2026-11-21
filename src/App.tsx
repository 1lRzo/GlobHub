import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { ProjectManager } from './features/projects/ProjectManager';
import { Studio } from './features/studio/Studio';

export default function App() {
  const project = useStore(s => s.project);
  const refreshProjects = useStore(s => s.refreshProjects);

  useEffect(() => {
    refreshProjects();
    const onBeforeUnload = () => {
      const state = useStore.getState();
      if (state.project) state.saveNow();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [refreshProjects]);

  if (project) {
    return <Studio onHome={() => useStore.setState({ project: null, currentProjectId: null })} />;
  }
  return <ProjectManager />;
}

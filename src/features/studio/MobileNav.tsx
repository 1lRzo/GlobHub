import { Icon } from '../../ui/Icons';

export type MobilePanel = 'explorer' | 'insert' | 'tools' | 'properties' | 'code' | 'pick-script' | 'project' | 'ai' | null;

interface MobileNavProps {
  active: MobilePanel;
  onOpen: (panel: Exclude<MobilePanel, null>) => void;
  onFocusViewport: () => void;
}

const ITEMS: { id: Exclude<MobilePanel, null>; icon: string; label: string }[] = [
  { id: 'explorer', icon: 'layers', label: 'Explorer' },
  { id: 'insert', icon: 'plus', label: 'Inserir' },
  { id: 'code', icon: 'script', label: 'Código' },
  { id: 'properties', icon: 'sliders', label: 'Props' },
  { id: 'tools', icon: 'wrench', label: 'Ferramentas' },
  { id: 'ai', icon: 'spark', label: 'IA' },
  { id: 'project', icon: 'gamepad', label: 'Projeto' }
];

export function MobileNav({ active, onOpen, onFocusViewport }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Navegação do editor">
      <button className={`nav-btn ${active === null ? 'viewport-btn' : ''}`} onClick={onFocusViewport} aria-label="Visualização 3D">
        <Icon name="eye" size={19} />
        <span>3D</span>
      </button>
      {ITEMS.map(item => (
        <button key={item.id} className={`nav-btn ${active === item.id ? 'active' : ''}`} onClick={() => onOpen(item.id)} aria-label={item.label}>
          <Icon name={item.icon} size={19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

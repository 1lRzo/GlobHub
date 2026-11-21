import type { ReactNode } from 'react';

interface IconProps {
  name: string;
  size?: number;
}

export function Icon({ name, size = 18 }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };
  const paths: Record<string, ReactNode> = {
    cube: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
    folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z" />,
    script: <path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm1 5h6M9 12h6M9 15h3" />,
    light: <><circle cx="12" cy="10" r="3.5" /><path d="M12 2v2M12 16v2M4 10H2M22 10h-2M5 3l1.5 1.5M17.5 18.5L19 20M19 3l-1.5 1.5M6.5 18.5L5 20" /></>,
    effects: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 9l.9 2.1L22 15l-2.1.9L19 18l-.9-2.1L16 15l2.1-.9L19 12Z" />,
    gui: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
    sound: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9a4 4 0 0 1 0 6" /></>,
    trash: <><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
    pen: <path d="M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16l-1 4Z" />,
    move: <><path d="M12 2v20M2 12h20" /><path d="m8 6 4-4 4 4M8 18l4 4 4-4M6 8 2 12l4 4M18 8l4 4-4 4" /></>,
    rotate: <path d="M20 8A8 8 0 1 0 21 14M21 3v5h-5" />,
    scale: <><path d="M4 20L20 4" /><path d="M14 4h6v6M10 20H4v-6" /></>,
    cursor: <path d="M5 3l7 17 2.5-6.5L21 11 5 3Z" />,
    undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
    redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>,
    chevron: <path d="m8 9 4 4 4-4" />,
    more: <><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 21v-6h8v6" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" /></>,
    upload: <><path d="M12 15V3m0 0 4 4m-4-4L8 7" /><path d="M4 19h16" /></>,
    home: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" />,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
    sliders: <><path d="M5 5v6m0 4v4M12 5v10m0 4v0M19 5v2m0 4v8" /><circle cx="5" cy="13" r="2" /><circle cx="12" cy="17" r="2" /><circle cx="19" cy="9" r="2" /></>,
    wrench: <path d="M14 6a4 4 0 0 0 5 3.9l-8.6 8.6a2.4 2.4 0 1 1-3.4-3.4L15.6 6.6A4 4 0 0 0 14 6Z" />,
    gamepad: <><rect x="2.5" y="7" width="19" height="11" rx="5" /><path d="M7 11v3m-1.5-1.5h3M15 11.5h.01M18 13.5h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.6" /></>,
    spark: <path d="M12 3l2 5.5L19.5 10 14 12l-2 5.5L10 12 4.5 10 10 8.5 12 3Zm7 8.5L20 14l2.5 1-2.5 1-1 2.5-1-2.5L15.5 15l2.5-1 1-2.5Z" />,
    group: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /><path d="M13 7h3.5A1.5 1.5 0 0 1 18 8.5V11M8.5 18H7a1.5 1.5 0 0 1-1.5-1.5V13" /></>
  };
  return <svg {...common}>{paths[name] ?? paths.cube}</svg>;
}

const CLASS_ICON: Record<string, string> = {
  Part: 'cube', WedgePart: 'cube', CornerWedgePart: 'cube', TrussPart: 'cube', MeshPart: 'cube',
  Seat: 'cube', VehicleSeat: 'cube',
  SpawnLocation: 'gamepad',
  Model: 'group', Folder: 'folder', Attachment: 'cube',
  Script: 'script', LocalScript: 'script', ModuleScript: 'script',
  PointLight: 'light', SpotLight: 'light', SurfaceLight: 'light',
  ParticleEmitter: 'effects', Beam: 'effects', Trail: 'effects', Highlight: 'effects',
  Decal: 'effects', Texture: 'effects', Sound: 'sound',
  ScreenGui: 'gui', Frame: 'gui', TextLabel: 'gui', TextButton: 'gui', TextBox: 'gui',
  ImageLabel: 'gui', ImageButton: 'gui', ScrollingFrame: 'gui',
  UIListLayout: 'gui', UIGridLayout: 'gui', UIPadding: 'gui', UICorner: 'gui', UIStroke: 'gui',
  UIGradient: 'gui', UIScale: 'gui', UIAspectRatioConstraint: 'gui', UIPageLayout: 'gui',
  ProximityPrompt: 'eye', ClickDetector: 'cursor'
};

export function iconForClass(className: string): string {
  return CLASS_ICON[className] ?? 'cube';
}

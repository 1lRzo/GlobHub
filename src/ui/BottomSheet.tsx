import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icons';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div
      className={`sheet-backdrop ${visible ? 'open' : ''}`}
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`sheet ${visible ? 'open' : ''}`} role="dialog" aria-label={title}>
        <div className="sheet-head">
          <div className="sheet-handle" aria-hidden="true" />
          <span className="sheet-title">{title}</span>
          <button className="btn-ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

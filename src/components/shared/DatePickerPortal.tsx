import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type DatePickerPortalProps = {
  className?: string;
  children?: ReactNode;
};

const PORTAL_ID = 'datepicker-portal-root';

function ensurePortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  let root = document.getElementById(PORTAL_ID) as HTMLElement | null;
  if (!root) {
    root = document.createElement('div');
    root.id = PORTAL_ID;
    root.style.position = 'relative';
    root.style.zIndex = '9999';
    document.body.appendChild(root);
  }
  return root;
}

export function DatePickerPortal({ className, children }: DatePickerPortalProps) {
  const portalRoot = ensurePortalRoot();
  if (portalRoot) {
    return createPortal(<div className={className}>{children}</div>, portalRoot);
  }
  return <div className={className}>{children}</div>;
}

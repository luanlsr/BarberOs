'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@barberos/ui';

type FormModalProps = Readonly<{
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  icon?: React.ReactNode;
  onClose: () => void;
  size?: 'default' | 'wide';
  title: string;
}>;

export function FormModal({
  children,
  description,
  eyebrow,
  icon,
  onClose,
  size = 'default',
  title,
}: FormModalProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <div className="app-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={'app-dialog form-modal form-modal-' + size}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="app-dialog-header form-modal-header">
          {icon ? (
            <div className="form-modal-icon" aria-hidden="true">
              {icon}
            </div>
          ) : null}
          <div className="form-modal-title">
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="form-modal-body">{children}</div>
      </section>
    </div>
  );
}

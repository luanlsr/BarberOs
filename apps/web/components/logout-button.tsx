'use client';

import { LogOut } from 'lucide-react';
import { IconButton } from '@barberos/ui';

export function LogoutButton() {
  async function logout() {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.assign('/login');
  }
  return (
    <IconButton label="Sair" onClick={logout}>
      <LogOut size={17} aria-hidden="true" />
    </IconButton>
  );
}

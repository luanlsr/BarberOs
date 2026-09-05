'use client';

import { useState } from 'react';
import type { SessionContext } from '@barberos/contracts';

export function WorkspaceSwitcher({ session }: { session: SessionContext }) {
  const [pending, setPending] = useState(false);
  const workspaces = session.availableWorkspaces ?? [];
  if (workspaces.length < 2)
    return (
      <div className="workspace-meta">
        <strong>{session.tenantName}</strong>
        <span>{session.branchName}</span>
      </div>
    );
  return (
    <label className="workspace-select-label">
      <span className="sr-only">Workspace ativo</span>
      <select
        aria-label="Trocar workspace"
        value={`${session.tenantId}:${session.activeBranchId ?? session.branchScope[0]}`}
        disabled={pending}
        onChange={async (event) => {
          const [tenantId, branchId] = event.target.value.split(':');
          setPending(true);
          const response = await fetch('/api/auth/workspace', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ tenantId, branchId }),
          });
          if (response.ok) window.location.reload();
          setPending(false);
        }}
      >
        {workspaces.map((workspace) => (
          <option
            key={`${workspace.tenantId}:${workspace.branchId}`}
            value={`${workspace.tenantId}:${workspace.branchId}`}
          >
            {workspace.tenantName} · {workspace.branchName}
          </option>
        ))}
      </select>
    </label>
  );
}

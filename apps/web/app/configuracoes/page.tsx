import { redirect } from 'next/navigation';
import { getSessionContext } from '../../lib/auth/server';
import { canAccessSettingsSection, settingsSections } from '../../lib/settings-sections';

export default async function ConfiguracoesPage() {
  const session = await getSessionContext();
  if (!session) redirect('/');
  if (!session.permissions.includes('settings.read')) redirect('/forbidden');

  const visibleSections = settingsSections.filter((section) =>
    canAccessSettingsSection(section, session),
  );
  const firstSection = visibleSections[0];
  if (!firstSection) redirect('/forbidden');

  redirect(firstSection.href);
}

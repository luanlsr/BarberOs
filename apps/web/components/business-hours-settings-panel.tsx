'use client';

import * as React from 'react';
import { CalendarOff, Clock3, Save } from 'lucide-react';
import { Button } from '@barberos/ui';
import { getSaoPauloTodayIso } from '../lib/agenda-availability';
import type { AgendaProfessional } from '../lib/agenda-data';
import { getStoreOperationsSettingsStorageKey } from '../lib/store-operations-settings';
import type { StoreOperationsSettings, StoreScheduleBlock } from '../lib/store-operations-settings';
import { AppToastRegion, useAppToast } from './app-toast';
import { RelatedSelect } from './form-controls';

type BusinessHoursSettingsPanelProps = {
  branchName: string;
  professionals?: readonly AgendaProfessional[];
  settings: StoreOperationsSettings;
};

export function BusinessHoursSettingsPanel({
  branchName,
  professionals = [],
  settings,
}: Readonly<BusinessHoursSettingsPanelProps>) {
  const [startTime, setStartTime] = React.useState(settings.openingHours.startTime);
  const [endTime, setEndTime] = React.useState(settings.openingHours.endTime);
  const [blocks, setBlocks] = React.useState<StoreScheduleBlock[]>(() => [...settings.blocks]);
  const [blockDate, setBlockDate] = React.useState(
    settings.blocks[0]?.dateIso ?? getSaoPauloTodayIso(),
  );
  const [blockStart, setBlockStart] = React.useState('15:00');
  const [blockEnd, setBlockEnd] = React.useState('15:30');
  const [blockProfessionalId, setBlockProfessionalId] = React.useState('');
  const [blockReason, setBlockReason] = React.useState('Bloqueio administrativo');
  const [status, setStatus] = React.useState('Configuração atual aplicada na Agenda.');
  const { dismissToast, showToast, toast } = useAppToast();
  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    label: professional.name,
    description: professional.roleLabel,
  }));

  React.useEffect(() => {
    const stored = window.localStorage.getItem(
      getStoreOperationsSettingsStorageKey(settings.openingHours.branchId),
    );
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as StoreOperationsSettings;
      setStartTime(parsed.openingHours.startTime);
      setEndTime(parsed.openingHours.endTime);
      setBlocks([...parsed.blocks]);
      setStatus('Configuração local carregada e refletida na Agenda.');
    } catch {
      setStatus('Não foi possível carregar a configuração local salva.');
    }
  }, [settings.openingHours.branchId]);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (endTime <= startTime) {
      setStatus('Informe um intervalo válido de funcionamento.');
      showToast('Informe um intervalo válido de funcionamento.', 'warning');
      return;
    }

    persistSettings({
      openingHours: {
        ...settings.openingHours,
        startTime,
        endTime,
      },
      blocks,
    });
    setStatus(`Horário atualizado para ${startTime} as ${endTime} nesta sessão.`);
    showToast('Horário de funcionamento salvo com sucesso.');
  }

  function handleAddBlock() {
    const reason = blockReason.trim();
    if (!reason || blockEnd <= blockStart) {
      setStatus('Informe motivo e um intervalo válido para bloquear horário.');
      showToast('Informe motivo e um intervalo válido para bloquear horário.', 'warning');
      return;
    }

    const nextBlocks = [
      ...blocks,
      {
        id: `local-block-${Date.now()}`,
        branchId: settings.openingHours.branchId,
        dateIso: blockDate,
        professionalId: blockProfessionalId || null,
        startTime: blockStart,
        endTime: blockEnd,
        reason,
      },
    ];
    setBlocks(nextBlocks);
    persistSettings({
      openingHours: {
        ...settings.openingHours,
        startTime,
        endTime,
      },
      blocks: nextBlocks,
    });
    setStatus('Bloqueio adicionado nesta sessão.');
    showToast('Bloqueio de agenda salvo com sucesso.');
  }

  function persistSettings(nextSettings: StoreOperationsSettings) {
    window.localStorage.setItem(
      getStoreOperationsSettingsStorageKey(settings.openingHours.branchId),
      JSON.stringify(nextSettings),
    );
    window.dispatchEvent(new Event('barberos:store-operations-settings-changed'));
  }

  return (
    <section className="business-hours-panel" aria-labelledby="business-hours-title">
      <div className="settings-detail-head">
        <div className="settings-card-icon">
          <Clock3 size={22} aria-hidden="true" />
        </div>
        <div>
          <h2 id="business-hours-title">Horário de funcionamento</h2>
          <p>{branchName} usa este intervalo como base para slots e disponibilidade da Agenda.</p>
        </div>
      </div>

      <form className="business-hours-form" onSubmit={handleSave}>
        <label>
          <span>Abertura</span>
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label>
          <span>Fechamento</span>
          <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </label>
        <label>
          <span>Intervalo dos slots</span>
          <input readOnly value={`${settings.openingHours.slotMinutes} min`} />
        </label>
        <Button type="submit">
          <Save size={16} aria-hidden="true" />
          Salvar horários
        </Button>
      </form>

      <div className="business-hours-blocks">
        <div className="settings-detail-head compact">
          <div className="settings-card-icon">
            <CalendarOff size={20} aria-hidden="true" />
          </div>
          <div>
            <h3>Bloqueios de agenda</h3>
            <p>Use para almoço, manutenção, reunião ou indisponibilidade temporária.</p>
          </div>
        </div>

        <div className="business-hours-form block-form">
          <label>
            <span>Data</span>
            <input
              type="date"
              value={blockDate}
              onChange={(event) => setBlockDate(event.target.value)}
            />
          </label>
          <label>
            <span>Início</span>
            <input
              type="time"
              value={blockStart}
              onChange={(event) => setBlockStart(event.target.value)}
            />
          </label>
          <label>
            <span>Fim</span>
            <input
              type="time"
              value={blockEnd}
              onChange={(event) => setBlockEnd(event.target.value)}
            />
          </label>
          <label>
            <span>Profissional</span>
            <RelatedSelect
              emptyLabel="Nenhum profissional cadastrado"
              onChange={setBlockProfessionalId}
              options={professionalOptions}
              placeholder="Todos os profissionais"
              searchPlaceholder="Buscar profissional"
              value={blockProfessionalId}
            />
          </label>
          <label>
            <span>Motivo</span>
            <input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} />
          </label>
          <Button type="button" variant="secondary" onClick={handleAddBlock}>
            Bloquear horário
          </Button>
        </div>

        <div className="business-hours-block-list" aria-label="Bloqueios configurados">
          {blocks.map((block) => (
            <article key={block.id}>
              <strong>{block.reason}</strong>
              <span>
                {block.dateIso} · {block.startTime} - {block.endTime}
              </span>
            </article>
          ))}
        </div>
      </div>

      <p className="business-hours-status" role="status">
        {status}
      </p>

      <AppToastRegion toast={toast} onDismiss={dismissToast} />
    </section>
  );
}

'use client';

import * as React from 'react';
import { CalendarOff, Clock3, Save } from 'lucide-react';
import { Button } from '@barberos/ui';
import { getStoreOperationsSettingsStorageKey } from '../lib/store-operations-settings';
import type { StoreOperationsSettings, StoreScheduleBlock } from '../lib/store-operations-settings';

type BusinessHoursSettingsPanelProps = {
  branchName: string;
  settings: StoreOperationsSettings;
};

export function BusinessHoursSettingsPanel({
  branchName,
  settings,
}: Readonly<BusinessHoursSettingsPanelProps>) {
  const [startTime, setStartTime] = React.useState(settings.openingHours.startTime);
  const [endTime, setEndTime] = React.useState(settings.openingHours.endTime);
  const [blocks, setBlocks] = React.useState<StoreScheduleBlock[]>(() => [...settings.blocks]);
  const [blockDate, setBlockDate] = React.useState(settings.blocks[0]?.dateIso ?? '2026-09-05');
  const [blockStart, setBlockStart] = React.useState('15:00');
  const [blockEnd, setBlockEnd] = React.useState('15:30');
  const [blockReason, setBlockReason] = React.useState('Bloqueio administrativo');
  const [status, setStatus] = React.useState('Configuração atual aplicada na Agenda.');

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
    setStatus(`Horário atualizado para ${startTime} as ${endTime} nesta sessão.`);
  }

  function handleAddBlock() {
    const reason = blockReason.trim();
    if (!reason || blockEnd <= blockStart) {
      setStatus('Informe motivo e um intervalo válido para bloquear horário.');
      return;
    }

    setBlocks((current) => [
      ...current,
      {
        id: `local-block-${Date.now()}`,
        branchId: settings.openingHours.branchId,
        dateIso: blockDate,
        professionalId: null,
        startTime: blockStart,
        endTime: blockEnd,
        reason,
      },
    ]);
    setStatus('Bloqueio adicionado nesta sessão.');
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
    </section>
  );
}

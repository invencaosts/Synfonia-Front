import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { apiErrorMessage } from '../../services/adminService';

const DURATIONS = [
  { value: 1, label: '1 dia' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 365, label: '1 ano' },
  { value: '', label: 'Permanente' },
];

// Montado só enquanto o modal está aberto: cada abertura começa com o formulário limpo
const ModerationForm = ({ onClose, onConfirm, description, confirmText, danger, askDuration, onSavingChange }) => {
  const [motivo, setMotivo] = useState('');
  const [dias, setDias] = useState(7);
  const [saving, setSavingState] = useState(false);
  const [error, setError] = useState(null);

  const setSaving = (value) => {
    setSavingState(value);
    onSavingChange(value);
  };

  const motivoValido = motivo.trim().length >= 5;

  const handleConfirm = async () => {
    if (!motivoValido || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ motivo: motivo.trim(), dias: askDuration ? (dias === '' ? null : Number(dias)) : undefined });
      setSaving(false);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
      <div className="space-y-4">
        {description && <p className="text-sm text-dim">{description}</p>}

        {askDuration && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-dim">Duração</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDias(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${dias === opt.value ? 'bg-brand/10 border-brand/30 text-brand-legible' : 'border-(--border-subtle) text-dim hover:text-main'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="moderacao-motivo" className="text-[10px] font-black uppercase tracking-widest text-dim">
            Motivo (fica registrado na auditoria)
          </label>
          <textarea
            id="moderacao-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex.: spam, discurso de ódio, conteúdo impróprio..."
            className="w-full bg-(--bg-side) border border-(--border-subtle) rounded-2xl p-3 text-sm text-main placeholder:text-dim/50 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
          />
          <p className="text-[10px] text-dim/60 text-right">{motivo.trim().length}/500 · mínimo 5</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="px-4! py-2! text-sm">
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={saving}
            disabled={!motivoValido}
            className="px-4! py-2! text-sm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
  );
};

/**
 * Confirmação de ação de moderação: exige motivo (vai para a auditoria) e, na suspensão, a duração.
 * onConfirm recebe { motivo, dias } e deve devolver uma Promise.
 */
const ModerationActionModal = ({
  isOpen, onClose, onConfirm, title, description, confirmText = 'Confirmar',
  danger = true, askDuration = false
}) => {
  const [saving, setSaving] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title={title} maxWidth="max-w-md">
      {isOpen && (
        <ModerationForm
          onClose={onClose}
          onConfirm={onConfirm}
          description={description}
          confirmText={confirmText}
          danger={danger}
          askDuration={askDuration}
          onSavingChange={setSaving}
        />
      )}
    </Modal>
  );
};

export default ModerationActionModal;

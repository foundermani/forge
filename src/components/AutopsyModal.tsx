'use client';

import { useState } from 'react';
import type { Autopsy } from '@/lib/db';

const FIELDS: Array<{ key: keyof Autopsy; label: string }> = [
  { key: 'problemSolved', label: 'What problem did you solve?' },
  { key: 'surprise', label: 'What surprised you?' },
  { key: 'bestLine', label: 'Best line or moment?' },
  { key: 'changeTomorrow', label: 'What would you change tomorrow?' },
  { key: 'principle', label: 'What did you learn about songwriting?' },
];

export default function AutopsyModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (a: Autopsy) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Autopsy>({
    problemSolved: '',
    surprise: '',
    bestLine: '',
    changeTomorrow: '',
    principle: '',
  });
  const [saving, setSaving] = useState(false);

  const complete = FIELDS.every(({ key }) => values[key].trim().length > 0);

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  return (
    <div className="scrim">
      <div className="scrim-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="pillar-label">autopsy · sixty seconds</span>
          <button className="btn-text" onClick={onCancel}>
            back
          </button>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          {FIELDS.map(({ key, label }) => (
            <div className="autopsy-field" key={key}>
              <label htmlFor={`autopsy-${key}`}>{label}</label>
              <textarea
                id={`autopsy-${key}`}
                rows={1}
                value={values[key]}
                onChange={(e) => {
                  autoGrow(e.target);
                  setValues((v) => ({ ...v, [key]: e.target.value }));
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn"
            disabled={!complete || saving}
            onClick={() => {
              setSaving(true);
              onSubmit(values);
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

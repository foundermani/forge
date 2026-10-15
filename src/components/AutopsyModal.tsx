'use client';

import { useState } from 'react';
import type { Autopsy } from '@/lib/db';
import { CRITERIA, type CriterionKey, type Ratings } from '@/lib/disciplines';

type Text = Omit<Autopsy, 'ratings'>;

const FIELDS: Array<{ key: keyof Text; label: string }> = [
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
  const [values, setValues] = useState<Text>({
    problemSolved: '',
    surprise: '',
    bestLine: '',
    changeTomorrow: '',
    principle: '',
  });
  const [ratings, setRatings] = useState<Partial<Ratings>>({});
  const [saving, setSaving] = useState(false);

  const complete =
    FIELDS.every(({ key }) => values[key].trim().length > 0) &&
    CRITERIA.every(({ key }) => typeof ratings[key] === 'number');

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function rate(key: CriterionKey, n: number) {
    setRatings((r) => ({ ...r, [key]: n }));
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

        <p className="pillar-label" style={{ marginTop: '1.75rem' }}>
          rate it honestly · 1 to 5
        </p>
        <div style={{ marginTop: '0.5rem' }}>
          {CRITERIA.map(({ key, label, question }) => (
            <div className="autopsy-field" key={key}>
              <label>
                {label} — {question}
              </label>
              <div className="rating" role="radiogroup" aria-label={label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={ratings[key] === n}
                    onClick={() => rate(key, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn"
            disabled={!complete || saving}
            onClick={() => {
              setSaving(true);
              onSubmit({ ...values, ratings: ratings as Ratings });
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

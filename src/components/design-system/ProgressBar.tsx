interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className="ds-progress" aria-label={label} aria-valuenow={normalized}>
      <span style={{ width: `${normalized}%` }} />
    </div>
  );
}

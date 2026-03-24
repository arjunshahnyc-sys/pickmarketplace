'use client';

import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { percent: 0, color: '#E5E7EB', label: '' };

    let score = 0;

    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    // Determine color and label
    let color = '#EF4444'; // red
    let label = 'Weak';

    if (score >= 60) {
      color = '#F59E0B'; // yellow
      label = 'Medium';
    }
    if (score >= 80) {
      color = '#10B981'; // green
      label = 'Strong';
    }

    return { percent: score, color, label };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${strength.percent}%`,
            backgroundColor: strength.color,
          }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: strength.color }}>
        {strength.label}
      </p>
    </div>
  );
}

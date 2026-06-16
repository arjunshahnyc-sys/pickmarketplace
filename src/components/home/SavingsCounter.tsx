'use client';

import { useState, useEffect } from 'react';

export default function SavingsCounter() {
  const [totalSaved, setTotalSaved] = useState(847);

  useEffect(() => {
    // Load initial value from localStorage or use seed value
    const stored = localStorage.getItem('pick_aggregate_savings');
    if (stored) {
      setTotalSaved(parseInt(stored, 10));
    } else {
      localStorage.setItem('pick_aggregate_savings', '847');
    }

    // Increment by random amount every 10 seconds
    const interval = setInterval(() => {
      setTotalSaved((prev) => {
        const increment = Math.floor(Math.random() * 26) + 5; // 5-30
        const newTotal = prev + increment;
        localStorage.setItem('pick_aggregate_savings', newTotal.toString());
        return newTotal;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Smooth number animation
  const [displayValue, setDisplayValue] = useState(totalSaved);

  useEffect(() => {
    const duration = 500; // ms
    const steps = 20;
    const stepValue = (totalSaved - displayValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(totalSaved);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + stepValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalSaved, displayValue]);

  return (
    <div className="text-center py-4">
      <p className="text-sm text-black/60">
        Pick users have saved{' '}
        <span className="font-bold text-black">${Math.floor(displayValue).toLocaleString()}</span>{' '}
        this month
      </p>
    </div>
  );
}

// TODO: Replace with real aggregate from /api/stats once tracking is wired

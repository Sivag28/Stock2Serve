import React from 'react';
import { FaUtensils } from 'react-icons/fa';

const ProcessingIndicator = ({ message = 'Processing...' }) => (
  <div
    className="pointer-events-none fixed left-1/2 top-20 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-amber-800 shadow-lg shadow-amber-900/10"
    role="status"
    aria-live="polite"
  >
    <FaUtensils className="animate-pulse text-amber-600" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export default ProcessingIndicator;

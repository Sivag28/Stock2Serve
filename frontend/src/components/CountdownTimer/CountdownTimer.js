import React, { useEffect, useState } from 'react';

const CountdownTimer = ({ expiryTime }) => {
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    if (!expiryTime) return undefined;

    const updateTimer = () => {
      const target = new Date(expiryTime).getTime();
      const now = Date.now();
      const diff = Math.max(target - now, 0);

      const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  return <span>{timeLeft}</span>;
};

export default CountdownTimer;

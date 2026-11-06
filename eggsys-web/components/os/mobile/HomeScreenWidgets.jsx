import React, { useState, useEffect } from 'react';

export default function HomeScreenWidgets() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mx-0 mb-5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-4 shadow-lg">
      <p className="text-white/70 text-xs font-medium">{dateStr}</p>
      <p className="text-white text-4xl font-bold leading-tight">{timeStr}</p>
    </div>
  );
}
import React from 'react';

const LOGO_URL = "https://media.base44.com/images/public/6946b759fb67abb9152e7314/398c6f43c_file_000000004cec81f596e27c29b1ce8a00.png";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-[100000] bg-gradient-to-br from-slate-950 via-gray-900 to-black flex flex-col items-center justify-center p-5 sm:p-6 text-center select-none overflow-y-auto"
      style={{ fontFamily: 'Consolas, "Cascadia Code", ui-monospace, monospace' }}
    >
      {/* Decorative grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Soft glowing accents */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md my-auto">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl mb-4 overflow-hidden">
            <img src={LOGO_URL} alt="EggetSystem" className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            EggetSystem
          </h1>
          <p className="text-xs sm:text-sm text-white/40 mt-1 tracking-widest uppercase">
            Theegget Creations
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 text-left">
          <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-white/50 mb-6">{subtitle}</p>}
          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-white/40">{footer}</div>
        )}
      </div>
    </div>
  );
}
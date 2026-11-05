import React from 'react';

// Inline horizontal EggetSystem wordmark for replacing the written word
// "EggetSystem" inside running text, headings, labels, and buttons.
// Renders inline at text height by default; pass `height` (px) or a Tailwind
// height class via className to scale it for larger headings.
export const WORDMARK_URL =
  'https://media.base44.com/images/public/6946b759fb67abb9152e7314/fc048df08_EggetSystem_text_cropped.png';

export default function EggSysWord({ height = 16, className = '', style }) {
  return (
    <img
      src={WORDMARK_URL}
      alt="EggetSystem"
      draggable={false}
      className={`inline-block align-middle object-contain select-none ${className}`}
      style={{ height, width: 'auto', verticalAlign: 'middle', ...style }}
    />
  );
}
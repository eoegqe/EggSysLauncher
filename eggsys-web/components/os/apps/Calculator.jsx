import React, { useState } from 'react';
import { Delete } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [operation, setOperation] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(num.toString());
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num.toString() : display + num);
    }
  };

  const handleOperation = (op) => {
    const current = parseFloat(display);
    if (prev !== null && operation && !newNumber) {
      handleEquals();
    } else {
      setPrev(current);
    }
    setOperation(op);
    setNewNumber(true);
  };

  const handleEquals = () => {
    const current = parseFloat(display);
    if (prev === null || operation === null) return;

    let result;
    switch (operation) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '×': result = prev * current; break;
      case '÷': result = prev / current; break;
      default: return;
    }

    setDisplay(result.toString());
    setPrev(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrev(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleDelete = () => {
    setDisplay(display.slice(0, -1) || '0');
  };

  const buttons = [
    ['C', '÷', '×', 'DEL'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.', '', '']
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="text-right">
          {operation && <div className="text-sm text-gray-400 mb-1">{prev} {operation}</div>}
          <div className="text-4xl font-bold text-gray-800 break-all">{display}</div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-3">
        {buttons.flat().map((btn, idx) => {
          if (btn === '') return <div key={idx} />;
          
          const isNumber = typeof btn === 'string' && !isNaN(btn);
          const isOperation = ['+', '-', '×', '÷', '='].includes(btn);
          
          return (
            <button
              key={idx}
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === 'DEL') handleDelete();
                else if (isNumber || btn === '.') handleNumber(btn);
                else if (btn === '=') handleEquals();
                else if (isOperation) handleOperation(btn);
              }}
              className={`rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-md ${
                btn === 'C' 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white col-span-1'
                  : btn === 'DEL'
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center'
                  : isOperation
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-50'
              } ${btn === '0' ? 'col-span-2' : ''} ${btn === '=' ? 'row-span-2' : ''}`}
            >
              {btn === 'DEL' ? <Delete className="w-5 h-5" /> : btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
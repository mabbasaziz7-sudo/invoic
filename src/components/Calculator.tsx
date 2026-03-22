import { useState } from 'react';

interface CalculatorProps {
  onClose: () => void;
}

export default function Calculator({ onClose }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && operator) {
      let result = 0;
      switch (operator) {
        case '+': result = prevValue + current; break;
        case '-': result = prevValue - current; break;
        case '×': result = prevValue * current; break;
        case '÷': result = current !== 0 ? prevValue / current : 0; break;
      }
      setDisplay(String(result));
      setPrevValue(result);
    } else {
      setPrevValue(current);
    }
    setOperator(nextOperator);
    setWaitingForOperand(true);
  };

  const calculate = () => {
    if (prevValue !== null && operator) {
      performOperation('=');
      setOperator(null);
    }
  };

  const buttons = [
    ['C', '÷', '×', '⌫'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.', '', ''],
  ];

  const handleButton = (btn: string) => {
    if (btn >= '0' && btn <= '9') inputDigit(btn);
    else if (btn === '.') inputDot();
    else if (btn === 'C') clear();
    else if (btn === '⌫') setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    else if (btn === '=') calculate();
    else if (['+', '-', '×', '÷'].includes(btn)) performOperation(btn);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-[#1e293b] rounded-2xl p-4 w-80 shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <button onClick={onClose} className="text-red-400 hover:text-red-300 text-xl font-bold">✕</button>
          <h3 className="text-white font-bold text-lg">آلة حاسبة ⌨️</h3>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 mb-3 text-left">
          <div className="text-green-400 text-3xl font-mono text-right" dir="ltr">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().filter(b => b).map((btn, i) => (
            <button
              key={i}
              onClick={() => handleButton(btn)}
              className={`p-3 rounded-xl text-lg font-bold transition-all ${
                btn === 'C' ? 'bg-red-600 text-white hover:bg-red-700' :
                btn === '=' ? 'bg-green-600 text-white hover:bg-green-700 row-span-2' :
                ['+', '-', '×', '÷'].includes(btn) ? 'bg-orange-500 text-white hover:bg-orange-600' :
                btn === '⌫' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

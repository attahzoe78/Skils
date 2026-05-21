'use client';
import { useState, useRef, useEffect } from 'react';
import { Phone, RotateCcw, Wifi } from 'lucide-react';

const USSD_CODE = '*767*911#';

export default function USSDSimulator() {
  const [phone, setPhone] = useState('0803' + Math.floor(1000000 + Math.random() * 9000000));
  const [sessionId] = useState('SID-' + Math.random().toString(36).slice(2, 10).toUpperCase());
  const [text, setText] = useState('');
  const [display, setDisplay] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEnd, setIsEnd] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  const dial = async (inputText: string) => {
    setLoading(true);
    const newText = text === '' ? inputText : `${text}*${inputText}`;
    try {
      const res = await fetch('/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, phoneNumber: phone, text: newText }),
      });
      const responseText = await res.text();
      const ended = responseText.startsWith('END');
      const message = responseText.replace(/^(CON|END)\s*/, '');
      setDisplay(message);
      setHistory(prev => [...prev, `> ${inputText || USSD_CODE}`, message]);
      setText(ended ? '' : newText);
      setIsEnd(ended);
    } catch {
      setDisplay('Service unavailable. Try again.');
      setIsEnd(true);
    }
    setInput('');
    setLoading(false);
  };

  const reset = () => {
    setText('');
    setDisplay('');
    setInput('');
    setHistory([]);
    setIsEnd(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (display === '') {
      dial('');
    } else {
      dial(input.trim());
    }
  };

  const startSession = () => {
    setDisplay('');
    setHistory([]);
    setIsEnd(false);
    setText('');
    dial('');
  };

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4">
        <h2 className="font-bold text-lg text-white mb-1">USSD Simulator</h2>
        <p className="text-xs text-slate-400">Test the USSD emergency system · Compatible with Africa's Talking</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-slate-400">Callback URL:</span>
          <code className="bg-slate-800 text-cyan-400 px-2 py-0.5 rounded font-mono">/api/ussd</code>
        </div>
      </div>

      {/* Phone mockup */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-xs bg-slate-900 rounded-3xl border-2 border-slate-600 shadow-2xl overflow-hidden">
          {/* Phone top bar */}
          <div className="bg-slate-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Phone size={12} />
              <span>{phone}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi size={12} className="text-green-400" />
              <span className="text-xs text-green-400">MTN NG</span>
            </div>
          </div>

          {/* USSD Display */}
          <div
            ref={displayRef}
            className="ussd-display p-4 min-h-48 max-h-64 overflow-y-auto font-mono text-sm leading-relaxed"
          >
            {display === '' && !loading && (
              <div className="text-green-600 text-xs">
                Dial {USSD_CODE} to start emergency session
              </div>
            )}
            {loading && <div className="text-green-300 animate-pulse">Connecting…</div>}
            {display && (
              <pre className="whitespace-pre-wrap text-green-400">{display}</pre>
            )}
            {isEnd && (
              <div className="mt-2 text-green-600 text-xs border-t border-green-900 pt-2">
                Session ended. Dial {USSD_CODE} to start again.
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="bg-slate-800 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={display === '' ? USSD_CODE : 'Enter option…'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-green-500"
            />
            <button
              onClick={display === '' ? startSession : handleSend}
              disabled={loading}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {display === '' ? 'Dial' : 'Send'}
            </button>
          </div>

          {/* Quick dial keypad */}
          {display && !isEnd && (
            <div className="bg-slate-900 p-3 grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => (
                <button
                  key={k}
                  onClick={() => { setInput(k); }}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg py-2 text-sm font-mono transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* Reset */}
          <div className="bg-slate-800 px-4 pb-3 flex justify-between items-center">
            <button onClick={reset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
            <span className="text-xs text-slate-500">Session: {sessionId}</span>
          </div>
        </div>

        {/* Session history */}
        {history.length > 0 && (
          <div className="w-full max-w-xs mt-4">
            <p className="text-xs text-slate-500 mb-2">Session Log</p>
            <div className="bg-slate-900 rounded-xl p-3 max-h-32 overflow-y-auto">
              {history.map((line, i) => (
                <div key={i} className={`text-xs font-mono ${line.startsWith('>') ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Info */}
        <div className="w-full max-w-xs mt-4 bg-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">Callback Integration</p>
          <div className="space-y-1 text-xs font-mono">
            <div className="text-slate-400">POST <span className="text-cyan-400">/api/ussd</span></div>
            <div className="text-slate-500">sessionId: string</div>
            <div className="text-slate-500">phoneNumber: string</div>
            <div className="text-slate-500">text: string (menu path)</div>
          </div>
          <div className="mt-3 p-2 bg-green-950 rounded-lg border border-green-900">
            <p className="text-xs text-green-400">✓ Africa's Talking compatible</p>
            <p className="text-xs text-green-400">✓ Works on 2G/3G networks</p>
            <p className="text-xs text-green-400">✓ No internet required for users</p>
          </div>
        </div>
      </div>
    </div>
  );
}

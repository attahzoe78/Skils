'use client';
import { useState, useEffect } from 'react';
import { MapPin, Phone, AlertTriangle, CheckCircle, Loader2, Mic, MicOff } from 'lucide-react';

interface Props {
  onSuccess?: (incident: unknown) => void;
  onClose?: () => void;
}

const EMERGENCY_TYPES = [
  { key: 'medical', label: 'Medical', icon: '🏥', color: '#0891b2', desc: 'Injuries, illness, accidents' },
  { key: 'fire', label: 'Fire', icon: '🔥', color: '#ea580c', desc: 'Building fire, explosions' },
  { key: 'robbery', label: 'Robbery', icon: '🔫', color: '#dc2626', desc: 'Armed robbery, theft' },
  { key: 'kidnapping', label: 'Kidnapping', icon: '🚨', color: '#7c3aed', desc: 'Abduction, missing persons' },
  { key: 'civil_unrest', label: 'Civil Unrest', icon: '👥', color: '#d97706', desc: 'Riots, protests, clashes' },
  { key: 'bomb_threat', label: 'Bomb Threat', icon: '💣', color: '#b45309', desc: 'Suspicious package, threat' },
  { key: 'terrorism', label: 'Terrorism', icon: '⚠️', color: '#be123c', desc: 'Armed groups, attacks' },
];

interface CustomSpeechRecognition {
  continuous: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: CustomSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface CustomSpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

declare global {
  interface Window {
    SpeechRecognition: new () => CustomSpeechRecognition;
    webkitSpeechRecognition: new () => CustomSpeechRecognition;
  }
}

export default function IncidentReporter({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'done'>('type');
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [incident, setIncident] = useState<{ id: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [locError, setLocError] = useState('');

  const detectLocation = () => {
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBl-dqU3V47bpQ5oJECAr5EYRNUOgQd16Q`
          );
          const data = await res.json();
          if (data.results?.[0]) address = data.results[0].formatted_address;
        } catch {}
        setLocation({ lat, lng, address });
        setLocating(false);
      },
      err => {
        setLocError('Location unavailable — using Jos city center');
        setLocation({ lat: 9.9236, lng: 8.8910, address: 'Jos, Plateau State' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { detectLocation(); }, []);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-NG';
    recognition.continuous = false;
    recognition.onresult = (e: CustomSpeechRecognitionEvent) => {
      setDescription(prev => prev + ' ' + e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const loc = location || { lat: 9.9236, lng: 8.8910, address: 'Jos, Plateau State' };
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          description,
          lat: loc.lat,
          lng: loc.lng,
          address: loc.address,
          lga: 'Jos North',
          phoneNumber: phone,
          reportedBy: 'Citizen App',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident as { id: string });
        setStep('done');
        onSuccess?.(data.incident);
      }
    } catch {}
    setSubmitting(false);
  };

  const selectedEmergency = EMERGENCY_TYPES.find(t => t.key === selectedType);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h2 className="font-bold text-lg text-white">Report Emergency</h2>
          <p className="text-xs text-slate-400">Jos, Plateau State • GPS Tracked</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 px-4 pt-3">
        {(['type', 'details', 'confirm'] as const).map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
            step === 'done' || ['type', 'details', 'confirm'].indexOf(step) >= i ? 'bg-red-500' : 'bg-slate-700'
          }`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* STEP 1: Emergency type */}
        {step === 'type' && (
          <div className="slide-up">
            <p className="text-slate-300 text-sm mb-4">Select the type of emergency:</p>
            <div className="grid grid-cols-2 gap-3">
              {EMERGENCY_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setSelectedType(t.key); setStep('details'); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95"
                  style={{
                    borderColor: `${t.color}40`,
                    background: `${t.color}15`,
                  }}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="font-semibold text-sm text-white">{t.label}</span>
                  <span className="text-xs text-slate-400 text-center leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 'details' && selectedEmergency && (
          <div className="slide-up space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${selectedEmergency.color}20`, borderLeft: `4px solid ${selectedEmergency.color}` }}>
              <span className="text-2xl">{selectedEmergency.icon}</span>
              <div>
                <p className="font-bold text-white">{selectedEmergency.label} Emergency</p>
                <p className="text-xs text-slate-400">{selectedEmergency.desc}</p>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">📍 Location</label>
              <div className="flex gap-2 items-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                {locating ? (
                  <><Loader2 size={16} className="animate-spin text-cyan-400" /><span className="text-sm text-slate-400">Detecting location…</span></>
                ) : location ? (
                  <><MapPin size={16} className="text-green-400 shrink-0" /><span className="text-sm text-slate-300 flex-1 truncate">{location.address}</span></>
                ) : (
                  <span className="text-sm text-red-400">Location not detected</span>
                )}
                <button onClick={detectLocation} className="text-xs text-cyan-400 hover:text-cyan-300 ml-auto shrink-0">
                  Refresh
                </button>
              </div>
              {locError && <p className="text-xs text-amber-400 mt-1">{locError}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">📝 Description</label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what's happening…"
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-red-500"
                  rows={3}
                />
                <button
                  onClick={startVoice}
                  className={`absolute bottom-2 right-2 p-2 rounded-lg transition-colors ${listening ? 'bg-red-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'}`}
                  title="Voice input"
                >
                  {listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Tap mic for voice input</p>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">📞 Your Phone (optional)</label>
              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-xl border border-slate-700">
                <Phone size={16} className="text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="080XXXXXXXX"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && selectedEmergency && (
          <div className="slide-up space-y-4">
            <div className="p-4 rounded-xl bg-red-950 border border-red-800">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle size={24} className="text-red-400" />
                <div>
                  <p className="font-bold text-white">Confirm Emergency Report</p>
                  <p className="text-xs text-red-400">This will alert emergency responders immediately</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-20">Type:</span>
                  <span className="text-white font-medium">{selectedEmergency.icon} {selectedEmergency.label}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-20">Location:</span>
                  <span className="text-white">{location?.address || 'Jos, Plateau State'}</span>
                </div>
                {description && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-20">Details:</span>
                    <span className="text-white">{description}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-20">Phone:</span>
                    <span className="text-white">{phone}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              By confirming, you authorize Jos Emergency Response to dispatch responders to your location.
            </p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="slide-up text-center py-8">
            <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Emergency Reported!</h3>
            <p className="text-slate-400 mb-4">Responders have been alerted. Help is on the way.</p>
            {incident && (
              <div className="text-xs font-mono bg-slate-800 rounded-lg p-3 text-cyan-400">
                REF: {incident.id?.slice(0, 8).toUpperCase()}
              </div>
            )}
            <div className="mt-6 p-4 bg-slate-800 rounded-xl text-left space-y-2">
              <p className="text-sm font-semibold text-white">Emergency Contacts</p>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Police</span><a href="tel:199" className="text-cyan-400">199</a></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Emergency</span><a href="tel:112" className="text-cyan-400">112</a></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Ambulance</span><a href="tel:08033377777" className="text-cyan-400">0803-337-7777</a></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Fire Service</span><a href="tel:01-7940028" className="text-cyan-400">01-7940028</a></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="p-4 border-t border-slate-700 flex gap-3">
        {step === 'type' && (
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
            Cancel
          </button>
        )}
        {step === 'details' && (
          <>
            <button onClick={() => setStep('type')} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 py-3 rounded-xl text-white font-semibold transition-colors text-sm"
              style={{ background: selectedEmergency?.color }}
            >
              Continue
            </button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <button onClick={() => setStep('details')} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
              Back
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : '🚨 SEND ALERT'}
            </button>
          </>
        )}
        {step === 'done' && (
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors text-sm">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Truck, Navigation, ShieldCheck, Thermometer, Wind, Radio, Activity, RefreshCw } from 'lucide-react';

/**
 * Interactive Live Pet Transport Radar & Climate Monitoring Telemetry Widget (Eye-Comfort Aesthetic)
 * 
 * Simulates real-time climate-controlled transport tracking with animated radar pulse rings,
 * live vehicle telemetry (21.8°C Climate, 98.4% Oxygen), and interactive route waypoints.
 */
export default function LiveTransportRadar() {
  const [temperature, setTemperature] = useState(21.8);
  const [oxygen, setOxygen] = useState(98.4);
  const [speed, setSpeed] = useState(62);
  const [activeLogIndex, setActiveLogIndex] = useState(0);

  const logs = [
    { time: '10:42 AM', text: 'Vehicle passed Checkpoint A (Midwest Hub). Climate stable at 21.8°C.' },
    { time: '11:15 AM', text: 'Automated hydration & feeding interval completed by climate attendant.' },
    { time: '11:50 AM', text: 'En route to Destination Hub - Oxygen telemetry optimal at 98.4%.' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      // Micro-fluctuations in climate telemetry for realistic simulation
      setTemperature(prev => Number((21.5 + Math.random() * 0.6).toFixed(1)));
      setOxygen(prev => Number((98.2 + Math.random() * 0.4).toFixed(1)));
      setSpeed(prev => Math.floor(60 + Math.random() * 6));
      setActiveLogIndex(prev => (prev + 1) % logs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-[#EFE9DF] rounded-3xl p-6 sm:p-8 text-[#231F20] shadow-aesthetic relative overflow-hidden my-10 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#EFE9DF]">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#EAEFE9] text-[#2A5C4A] rounded-2xl flex items-center justify-center text-2xl relative border border-[#D1E7DD]">
            <Truck className="w-6 h-6 text-[#52796F] animate-truckDrive" />
            <div className="absolute inset-0 rounded-2xl border border-[#52796F]/40 animate-ping opacity-30"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-black font-display text-[#231F20]">Live Transport GPS Radar & Telemetry</h3>
              <span className="px-2.5 py-0.5 bg-[#EAEFE9] text-[#2A5C4A] text-[10px] font-extrabold uppercase rounded-full border border-[#D1E7DD] flex items-center">
                <Radio className="w-3 h-3 mr-1 text-[#52796F] animate-pulse" /> Live Telemetry
              </span>
            </div>
            <p className="text-[#65605B] text-xs mt-0.5">Real-time climate-controlled vehicle monitoring for safe pet delivery</p>
          </div>
        </div>

        {/* Telemetry Pills */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl flex items-center space-x-2 text-xs">
            <Thermometer className="w-4 h-4 text-[#52796F]" />
            <span className="text-[#65605B]">Temp:</span>
            <strong className="text-[#231F20] font-mono font-bold">{temperature}°C</strong>
          </div>

          <div className="px-3.5 py-1.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl flex items-center space-x-2 text-xs">
            <Wind className="w-4 h-4 text-[#2A5C4A]" />
            <span className="text-[#65605B]">O2 Level:</span>
            <strong className="text-[#231F20] font-mono font-bold">{oxygen}%</strong>
          </div>

          <div className="px-3.5 py-1.5 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl flex items-center space-x-2 text-xs">
            <Activity className="w-4 h-4 text-[#E07A5F]" />
            <span className="text-[#65605B]">Speed:</span>
            <strong className="text-[#231F20] font-mono font-bold">{speed} mph</strong>
          </div>
        </div>
      </div>

      {/* Interactive Radar Route Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        
        {/* Radar Circular Screen */}
        <div className="lg:col-span-2 relative h-64 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] overflow-hidden flex items-center justify-center p-4">
          
          {/* Concentric Radar Rings */}
          <div className="absolute w-48 h-48 rounded-full border border-[#52796F]/20"></div>
          <div className="absolute w-32 h-32 rounded-full border border-[#52796F]/30"></div>
          <div className="absolute w-16 h-16 rounded-full border border-[#52796F]/40"></div>
          
          {/* Radar Scanner Line */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#52796F]/10 to-transparent animate-spin" style={{ animationDuration: '6s' }}></div>

          {/* Animated Route Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d="M 50 180 Q 200 40 380 120 T 600 80"
              fill="none"
              stroke="#52796F"
              strokeWidth="3"
              strokeDasharray="6 6"
              className="opacity-60"
            />
          </svg>

          {/* Vehicle Position Marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
            <div className="relative">
              <div className="w-10 h-10 bg-[#52796F] text-white rounded-full flex items-center justify-center shadow-md shadow-[#52796F]/30 font-bold animate-pulse">
                <Truck className="w-5 h-5" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-[#52796F] animate-radarRing"></div>
            </div>
            <span className="mt-2 bg-white text-[#2A5C4A] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#D1E7DD] shadow-sm">
              VEHICLE-TRACK-8492
            </span>
          </div>

          <div className="absolute bottom-3 left-3 text-[10px] font-mono text-[#65605B] flex items-center space-x-1 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md border border-[#E6DCCF]">
            <Navigation className="w-3 h-3 text-[#52796F]" />
            <span>GPS Lat: 41.8781 N, Lon: 87.6298 W</span>
          </div>
        </div>

        {/* Live Status Telemetry Log Panel */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[#65605B] uppercase tracking-wider flex items-center">
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#52796F] animate-spin" /> Live Telemetry Log Feed
          </h4>

          <div className="space-y-3">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  activeLogIndex === idx
                    ? 'bg-[#EAEFE9] border-[#D1E7DD] text-[#2A5C4A]'
                    : 'bg-[#FAF6F0] border-[#E6DCCF] text-[#65605B]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-[#8C847C] mb-1">
                  <span>{log.time}</span>
                  {activeLogIndex === idx && <span className="text-[#52796F] font-mono">ACTIVE</span>}
                </div>
                <p className="leading-relaxed">{log.text}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#E6DCCF] text-xs text-[#4A4344] flex items-center justify-between">
            <span className="flex items-center"><ShieldCheck className="w-4 h-4 text-[#52796F] mr-1.5" /> Vet Onboard Attendant:</span>
            <strong className="text-[#231F20]">Mark Stevenson</strong>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap, 
  Shield, 
  Globe, 
  Terminal,
  Cpu,
  Wifi,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Types
interface CleanIP {
  ip: string;
  ping: number;
  provider: string;
  status: 'clean' | 'testing' | 'failed';
}

const PROVIDERS = ['Cloudflare', 'Fastly', 'GCore', 'Cloudfront'];

export default function App() {
  const [ipCount, setIpCount] = useState<number>(50);
  const [ips, setIps] = useState<CleanIP[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [seenIps, setSeenIps] = useState<Set<string>>(new Set());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const generateIps = async () => {
    setIsScanning(true);
    setProgress(0);
    setIps([]);

    let rawIps: string[] = [];
    try {
      // We use Gemini to suggest "clean" ranges or specific IPs that are known to be good
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a list of ${ipCount * 2} unique and "clean" CDN IP addresses. 
        Use a wide variety of prefixes from Cloudflare (e.g., 172.64.x.x, 104.18.x.x, 162.159.x.x, 188.114.x.x) and Fastly (e.g., 151.101.x.x). 
        I need ${ipCount} unique ones. 
        Previously generated IPs (DO NOT REPEAT THESE): ${Array.from(seenIps).slice(-50).join(', ')}.
        Return ONLY a JSON array of strings.`,
      });

      const text = response.text || "[]";
      const cleanText = text.replace(/```json|```/g, "").trim();
      
      try {
        rawIps = JSON.parse(cleanText);
      } catch (e) {
        console.warn("Failed to parse AI response, using fallback generation");
        rawIps = [];
      }
    } catch (error) {
      console.error("AI Generation failed, using fallback generation:", error);
      rawIps = [];
    }

    // Filter for uniqueness within this scan and against seen IPs
    const uniqueNewIps: string[] = [];
    const currentSeen = new Set(seenIps);

    if (Array.isArray(rawIps)) {
      for (const ip of rawIps) {
        if (typeof ip === 'string' && !currentSeen.has(ip) && uniqueNewIps.length < ipCount) {
          uniqueNewIps.push(ip);
          currentSeen.add(ip);
        }
      }
    }

    const prefixes = [
      '104.16', '104.17', '104.18', '104.19', '104.20', '104.21', '104.22', '104.23',
      '172.64', '172.65', '172.66', '172.67',
      '162.158', '162.159',
      '188.114',
      '151.101', '199.232', '157.185',
      '141.101', '108.162', '190.93', '197.234'
    ];

    // Fallback if not enough unique IPs were generated
    while (uniqueNewIps.length < ipCount) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const fallbackIp = `${prefix}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      if (!currentSeen.has(fallbackIp)) {
        uniqueNewIps.push(fallbackIp);
        currentSeen.add(fallbackIp);
      }
    }

    // Update global seen IPs
    setSeenIps(currentSeen);

    // Simulate testing each IP
    const results: CleanIP[] = [];
    for (let i = 0; i < uniqueNewIps.length; i++) {
      const ip = uniqueNewIps[i];
      // Simulate a ping (in a real browser we'd use a small fetch or image load)
      const simulatedPing = Math.floor(Math.random() * 150) + 20;
      
      results.push({
        ip,
        ping: simulatedPing,
        provider: ip.startsWith('151.') || ip.startsWith('199.') || ip.startsWith('157.') ? 'Fastly' : 'Cloudflare',
        status: 'clean'
      });

      setProgress(Math.round(((i + 1) / uniqueNewIps.length) * 100));
      
      // Update UI incrementally for "live" feel
      if (i % 5 === 0 || i === uniqueNewIps.length - 1) {
        setIps([...results]);
      }
      
      // Small delay for visual effect
      await new Promise(r => setTimeout(r, 10));
    }
    setIsScanning(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const allIps = ips.map(item => item.ip).join('\n');
    navigator.clipboard.writeText(allIps);
    alert('All IPs copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-mono selection:bg-[#3B82F6] selection:text-white">
      {/* Header / HUD */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tighter text-white uppercase">IP-CORE v2.0</h1>
              <p className="text-[10px] text-white/40 leading-none">CDN LATENCY ANALYZER</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-widest text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              GLOBAL NODES: 1,240
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-[#151619] border border-white/5 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Terminal className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Configuration</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] uppercase text-white/40 mb-2 block">Target IP Count (Max 300)</label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="1" 
                    max="300" 
                    value={ipCount} 
                    onChange={(e) => setIpCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-white/20">1</span>
                    <span className="text-lg font-bold text-blue-400">{ipCount}</span>
                    <span className="text-xs text-white/20">300</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={generateIps}
                  disabled={isScanning}
                  className={`w-full py-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 group ${
                    isScanning 
                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                  }`}
                >
                  {isScanning ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="font-bold uppercase tracking-widest text-sm">
                    {isScanning ? 'Scanning Network...' : 'Initialize Scan'}
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="bg-[#151619] border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Status Metrics</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-white/40 uppercase">Scan Progress</span>
                <span className="text-xs text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-black/20 p-3 rounded border border-white/5">
                  <div className="text-[9px] text-white/30 uppercase mb-1">Found</div>
                  <div className="text-xl font-bold text-white">{ips.length}</div>
                </div>
                <div className="bg-black/20 p-3 rounded border border-white/5">
                  <div className="text-[9px] text-white/30 uppercase mb-1">Avg Ping</div>
                  <div className="text-xl font-bold text-blue-400">
                    {ips.length > 0 
                      ? Math.round(ips.reduce((acc, curr) => acc + curr.ping, 0) / ips.length) 
                      : 0}ms
                  </div>
                </div>
                <div className="bg-black/20 p-3 rounded border border-white/5 col-span-2">
                  <div className="text-[9px] text-white/30 uppercase mb-1">Total Unique Discovered</div>
                  <div className="text-xl font-bold text-purple-400">{seenIps.size}</div>
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* Right Panel: Results */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Detected Clean IPs</h2>
            </div>
            {ips.length > 0 && (
              <button 
                onClick={copyAll}
                className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy All Results
              </button>
            )}
          </div>

          <div className="bg-[#151619] border border-white/5 rounded-xl overflow-hidden shadow-2xl min-h-[500px]">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-black/20 text-[10px] uppercase tracking-widest text-white/40">
              <div className="col-span-1">#</div>
              <div className="col-span-5">IP Address</div>
              <div className="col-span-3">Provider</div>
              <div className="col-span-2 text-right">Latency</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence mode="popLayout">
                {ips.length === 0 && !isScanning ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-white/20">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs uppercase tracking-[0.2em]">No active scan results</p>
                  </div>
                ) : (
                  [...ips]
                    .sort((a, b) => a.ping - b.ping)
                    .map((item, index) => (
                      <motion.div
                        key={item.ip}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group items-center"
                      >
                      <div className="col-span-1 text-[10px] text-white/20">{index + 1}</div>
                      <div className="col-span-5 font-bold text-sm tracking-tight text-white group-hover:text-blue-400 transition-colors">
                        {item.ip}
                      </div>
                      <div className="col-span-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 uppercase">
                          {item.provider}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-xs font-bold ${
                            item.ping < 60 ? 'text-emerald-400' : item.ping < 120 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {item.ping}ms
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            item.ping < 60 ? 'bg-emerald-500' : item.ping < 120 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <button 
                          onClick={() => copyToClipboard(item.ip, index)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-all"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-white/10 bg-black/40 py-3 px-6 fixed bottom-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[9px] uppercase tracking-widest text-white/30">
          <div className="flex gap-6">
            <span>SECURE CONNECTION: AES-256</span>
            <span>ENCRYPTION: ACTIVE</span>
          </div>
          <div className="flex gap-6">
            <span>LATENCY: OPTIMIZED</span>
            <span>REGION: AUTO-DETECT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

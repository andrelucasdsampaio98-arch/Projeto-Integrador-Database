import React, { useState, useEffect } from 'react';
import { Globe, Wifi, QrCode, Copy, Check, ShieldCheck, AlertTriangle, Terminal, Smartphone, Laptop, ExternalLink } from 'lucide-react';

export const AcessoPorIP: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [customIP, setCustomIP] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIPCmd, setCopiedIPCmd] = useState(false);
  const [qrTargetUrl, setQrTargetUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setCurrentUrl(url);
      setQrTargetUrl(url);
    }
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIPCmd(true);
    setTimeout(() => setCopiedIPCmd(false), 2000);
  };

  const activeDisplayUrl = customIP.trim()
    ? (customIP.startsWith('http') ? customIP : `http://${customIP}:3000`)
    : currentUrl;

  return (
    <div className="space-y-6">
      {/* Main Container */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-black flex items-center gap-2">
              Acesso por IP e Rede do Laboratório
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-black font-extrabold border border-slate-300">
                Celular, Computador e Notebook
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Guia completo e gerador de QR Code para conectar múltiplos aparelhos na mesma rede Wi-Fi da escola ou pela nuvem.
            </p>
          </div>
        </div>

        {/* 2 MAIN ACCESS MODES COMPARISON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mode 1: Cloud Link (HTTPS) */}
          <div className="rounded-2xl bg-emerald-50/50 border-2 border-emerald-400 p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Opção 1: Link em Nuvem (Mais Fácil)
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">100% Recomendado</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Endereço Web Publicado (HTTPS)</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Qualquer aparelho com internet abre instantaneamente. O microfone para a aba <strong>Ouvir e Legendar</strong> funciona perfeitamente sem bloqueios de segurança do navegador.
              </p>

              {/* URL Box */}
              <div className="mt-3 p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2 shadow-xs">
                <span className="font-mono text-xs text-emerald-800 font-semibold truncate">{currentUrl || 'https://seu-link-ponte.run.app'}</span>
                <button
                  onClick={() => handleCopy(currentUrl)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shrink-0"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <ul className="text-xs text-slate-600 space-y-1 pt-2 border-t border-emerald-200/80">
              <li className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Check className="h-3.5 w-3.5" /> Microfone liberado automaticamente
              </li>
              <li className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Check className="h-3.5 w-3.5" /> Funciona dentro ou fora da escola
              </li>
              <li className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Check className="h-3.5 w-3.5" /> Não precisa deixar o computador do professor ligado rodando terminal
              </li>
            </ul>
          </div>

          {/* Mode 2: Local IP (HTTP) */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs border border-amber-200 flex items-center gap-1.5">
                  <Wifi className="h-4 w-4" /> Opção 2: Endereço IP Local
                </span>
                <span className="text-[11px] text-amber-700 font-bold">Rede Interna da Escola</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Acesso direto pelo IP do computador</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Útil para laboratórios sem internet externa. O computador da sala executa o app e outros notebooks e celulares no mesmo Wi-Fi acessam via <code>http://192.168.X.X:3000</code>.
              </p>

              {/* IP Input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customIP}
                  onChange={(e) => {
                    setCustomIP(e.target.value);
                    const formatted = e.target.value.startsWith('http')
                      ? e.target.value
                      : `http://${e.target.value}:3000`;
                    setQrTargetUrl(formatted);
                  }}
                  placeholder="Ex: 192.168.1.105"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-xs"
                />
                <button
                  onClick={() => handleCopy(`http://${customIP || '192.168.1.100'}:3000`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition shrink-0"
                >
                  Copiar IP
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <strong>⚠️ Atenção sobre o microfone em HTTP:</strong>
              <p>
                Os navegadores bloqueiam o microfone em conexões sem HTTPS. No Chrome, autorize acessando <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.
              </p>
            </div>
          </div>
        </div>

        {/* QR CODE & SMARTPHONE SHARING */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 flex flex-col sm:flex-row items-center gap-6">
          {/* Dynamic SVG QR Code Representation */}
          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                activeDisplayUrl
              )}&color=0f172a`}
              alt="QR Code de Acesso"
              className="w-36 h-36 rounded-lg"
              loading="lazy"
            />
            <span className="text-[10px] text-slate-700 font-black mt-1">ESCANEIE COM A CÂMERA</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-700">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Como conectar o celular do aluno ao vivo:</h3>
            </div>
            <ol className="space-y-1.5 list-decimal pl-4">
              <li>Conecte o smartphone na mesma rede Wi-Fi da sala de aula / laboratório.</li>
              <li>Abra a câmera do celular e aponte para o QR Code ao lado.</li>
              <li>Toque no link que surge na tela para abrir o <strong>Ponte</strong> instantaneamente.</li>
              <li>
                Dica PWA: Toque no menu do navegador (3 pontinhos) e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela de início"</strong>.
              </li>
            </ol>
            <div className="text-[11px] text-blue-800 font-mono bg-blue-50 p-2 rounded-lg border border-blue-200 truncate">
              Destino atual do QR: {activeDisplayUrl}
            </div>
          </div>
        </div>

        {/* COMMAND LINE GUIDE FOR LAB ADMINS */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-600" />
              Como descobrir o IP do computador no laboratório:
            </h4>
            <button
              onClick={() => handleCopyCmd('ipconfig')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              {copiedIPCmd ? 'Comando copiado!' : 'Copiar comando Windows'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono shadow-xs">
              <span className="text-slate-500 block text-[10px]">No Windows (Prompt de comando ou PowerShell):</span>
              <code className="text-blue-700 font-bold block mt-1">ipconfig</code>
              <span className="text-slate-600 text-[11px] block mt-1">
                Procure por "Endereço IPv4" (Ex: 192.168.0.25).
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono shadow-xs">
              <span className="text-slate-500 block text-[10px]">No Linux / Ubuntu / Mac (Terminal):</span>
              <code className="text-emerald-700 font-bold block mt-1">hostname -I || ip a</code>
              <span className="text-slate-600 text-[11px] block mt-1">
                O primeiro número exibido é o IP da rede local.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

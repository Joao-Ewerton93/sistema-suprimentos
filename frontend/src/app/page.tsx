"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SOLICITANTES = ['Glaybson','Thaynara','Elluard','Emanuele','Maria Clara','Flavia','Francisco','Leonardo','Murilo'];
const UNIDADES = ['UND','M','M²','M³','KG','L','CX','PCT','PR','GL'];

type Item = { descricao: string; unidade: string; quantidade: number; };
type Req  = { id: number; engenheiro: string; data: string; numero_solicitacao: string; status_solicitacao: string; status_final: string | null; };

const STATUS_MAP: Record<string, {label:string;dot:string;text:string}> = {
  pendente:     {label:'Pendente',   dot:'bg-amber-400 animate-pulse', text:'text-amber-400'},
  aprovado:     {label:'Aprovado',   dot:'bg-emerald-500',             text:'text-emerald-400'},
  chegada_obra: {label:'A Caminho',  dot:'bg-indigo-500',              text:'text-indigo-400'},
  finalizado:   {label:'Finalizado', dot:'bg-teal-500',                text:'text-teal-400'},
  aguardando:   {label:'Aguardando', dot:'bg-slate-500 animate-pulse', text:'text-slate-400'},
};

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_MAP[status ?? 'aguardando'] ?? STATUS_MAP['aguardando'];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 border border-white/5">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      <span className={`text-[10px] font-medium ${s.text}`}>{s.label}</span>
    </span>
  );
}

const EMPTY_ITEM: Item = { descricao:'', unidade:'UND', quantidade:1 };
const cellCls = "border border-white/10";
const inputCls = "bg-transparent w-full outline-none text-slate-200 placeholder-slate-700 text-xs px-3 py-2";

export default function UserPortal() {
  const [reqs, setReqs]           = useState<Req[]>([]);
  const [nextNum, setNextNum]     = useState('...');
  const [today]                   = useState(new Date().toLocaleDateString('pt-BR'));

  const [obra, setObra]           = useState('SALG EXCLUSIVE RESORT');
  const [cc]                      = useState('PS-021');
  const [local, setLocal]         = useState('');
  const [area, setArea]           = useState('');
  const [solicitante, setSol]     = useState('');
  const [destino, setDestino]     = useState('');
  const [responsavel, setResp]    = useState('');
  const [itens, setItens]         = useState<Item[]>([{ ...EMPTY_ITEM }]);

  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const fetchReqs = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/requisicoes`); if(r.ok) setReqs(await r.json()); } catch {}
  }, []);

  const fetchNext = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/requisicoes/next-number`); if(r.ok) { const j=await r.json(); setNextNum(j.number); } } catch {}
  }, []);

  useEffect(() => { fetchReqs(); fetchNext(); }, [fetchReqs, fetchNext]);

  const addItem    = () => setItens(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItens(p => p.filter((_,idx) => idx!==i));
  const setItem    = (i: number, f: keyof Item, v: string|number) =>
    setItens(p => p.map((it,idx) => idx===i ? {...it,[f]:v} : it));

  const reset = () => {
    setItens([{...EMPTY_ITEM}]); setSol(''); setLocal('');
    setArea(''); setDestino(''); setResp(''); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!solicitante) { setError('Selecione o solicitante.'); return; }
    if (itens.some(i => !i.descricao.trim())) { setError('Preencha a descrição de todos os itens.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/requisicoes`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          engenheiro: solicitante, data: today,
          numero_solicitacao: nextNum, obra,
          centro_custo: cc, local_obra: local,
          area_atividade: area, itens: JSON.stringify(itens),
          destino, responsavel, status_solicitacao:'pendente',
        }),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      setSuccess(true); reset(); fetchReqs(); fetchNext();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#161b2e] border-b border-white/5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Gestão de Suprimentos" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Gestão de Suprimentos</h1>
            <p className="text-[10px] text-slate-500">Portal do Engenheiro</p>
          </div>
        </div>
        <a href="/admin" className="text-[10px] text-slate-600 hover:text-slate-300 border border-white/5 hover:border-white/15 px-3 py-1.5 rounded-lg transition-all">Painel Admin →</a>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10 space-y-12">

        {/* ── FORMULÁRIO ── */}
        <section>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-100">Nova Requisição de Material</h2>
            <p className="text-xs text-slate-500 mt-1">Preencha o formulário e clique em enviar. O número é gerado automaticamente.</p>
          </div>

          {success ? (
            <div className="border-2 border-emerald-500/30 rounded-2xl p-16 bg-emerald-500/5 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">✓</div>
              <p className="text-base font-semibold text-emerald-400">Requisição enviada com sucesso!</p>
              <p className="text-xs text-slate-600 mt-2">Acompanhe o status na tabela abaixo</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl overflow-hidden border border-white/10 text-xs">

                {/* Cabeçalho */}
                <div className="grid grid-cols-[1fr_auto] bg-[#1a2540] border-b border-white/10">
                  <div className="px-5 py-3 flex items-center gap-3">
                    <img src="/logo.png" alt="Gestão de Suprimentos" className="h-7 w-auto object-contain" />
                    <span className="text-[11px] font-bold text-slate-300 tracking-wide uppercase">Pernambuco Construtora</span>
                  </div>
                  <div className="px-6 py-3 border-l border-white/10 text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Requisição de Material Nº</p>
                    <p className="text-lg font-bold text-blue-400 font-mono leading-tight">{nextNum}</p>
                  </div>
                </div>

                {/* Obra / CC / Data */}
                <div className="grid grid-cols-[1fr_100px_160px] border-b border-white/10">
                  <div className={`${cellCls} flex items-center border-l-0 border-t-0`}>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase px-3 whitespace-nowrap">Obra:</span>
                    <input value={obra} onChange={e=>setObra(e.target.value)} placeholder="Nome da obra" className={inputCls} />
                  </div>
                  <div className={`${cellCls} flex items-center justify-center border-t-0`}>
                    <span className="text-sm font-bold text-blue-300 font-mono">{cc}</span>
                  </div>
                  <div className={`${cellCls} flex items-center gap-2 px-4 border-t-0 border-r-0`}>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase whitespace-nowrap">Data:</span>
                    <span className="text-slate-300 font-mono">{today}</span>
                  </div>
                </div>

                {/* Local / Área */}
                <div className="grid grid-cols-2 border-b border-white/10">
                  <div className={`${cellCls} flex items-center border-l-0 border-t-0`}>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase px-3 whitespace-nowrap">Local:</span>
                    <input value={local} onChange={e=>setLocal(e.target.value)} placeholder="Ex: Bangalô Tradicional" className={inputCls} />
                  </div>
                  <div className={`${cellCls} flex items-center border-t-0 border-r-0`}>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase px-3 whitespace-nowrap">Área / Atividade:</span>
                    <input value={area} onChange={e=>setArea(e.target.value)} placeholder="Ex: Acabamento" className={inputCls} />
                  </div>
                </div>

                {/* Header tabela itens */}
                <div className="grid grid-cols-[1fr_90px_100px_90px_90px] bg-[#1a2540] border-b border-white/10">
                  {['Descrição','Unidade','Quantidade','Total','Obra'].map(h => (
                    <div key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-white/10 last:border-r-0">{h}</div>
                  ))}
                </div>

                {/* Linhas de itens */}
                {itens.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_100px_90px_90px] border-b border-white/10 group hover:bg-white/3 transition-colors">
                    <div className="border-r border-white/10 flex items-center">
                      <input value={it.descricao} onChange={e=>setItem(i,'descricao',e.target.value)}
                        placeholder="Descrição do material..." className={`${inputCls} flex-1`} />
                      {itens.length > 1 && (
                        <button type="button" onClick={()=>removeItem(i)} className="opacity-0 group-hover:opacity-100 px-2 text-red-400 hover:text-red-300 text-base leading-none transition-opacity">×</button>
                      )}
                    </div>
                    <div className="border-r border-white/10">
                      <select value={it.unidade} onChange={e=>setItem(i,'unidade',e.target.value)}
                        className="bg-transparent w-full h-full outline-none text-slate-300 text-xs px-3 py-2 cursor-pointer">
                        {UNIDADES.map(u=><option key={u} className="bg-[#1a2540]" value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="border-r border-white/10">
                      <input type="number" min={1} value={it.quantidade} onChange={e=>setItem(i,'quantidade',Number(e.target.value))}
                        className={`${inputCls} text-center`} />
                    </div>
                    <div className="border-r border-white/10 flex items-center justify-center text-slate-500 font-mono">
                      {it.quantidade.toFixed(2)}
                    </div>
                    <div className="flex items-center px-3 text-slate-500 font-mono">{cc}</div>
                  </div>
                ))}

                {/* Adicionar item */}
                <div className="border-b border-white/10">
                  <button type="button" onClick={addItem}
                    className="w-full px-4 py-2.5 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/5 transition-colors text-left flex items-center gap-2">
                    <span className="text-base leading-none font-bold">+</span> Adicionar item
                  </button>
                </div>

                {/* Header rodapé */}
                <div className="grid grid-cols-3 bg-[#1a2540] border-b border-white/10">
                  {['Solicitante','Destino','Responsável'].map(h=>(
                    <div key={h} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-white/10 last:border-r-0">{h}</div>
                  ))}
                </div>

                {/* Rodapé */}
                <div className="grid grid-cols-3">
                  <div className={`${cellCls} border-l-0 border-b-0`}>
                    <select required value={solicitante} onChange={e=>setSol(e.target.value)}
                      className="bg-transparent w-full h-full outline-none text-slate-200 text-xs px-3 py-3 cursor-pointer appearance-none">
                      <option className="bg-[#1a2540]" value="">— Selecione —</option>
                      {SOLICITANTES.map(s=><option key={s} className="bg-[#1a2540]" value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className={`${cellCls} border-b-0`}>
                    <input value={destino} onChange={e=>setDestino(e.target.value)} placeholder="Destino..." className={inputCls} />
                  </div>
                  <div className={`${cellCls} border-r-0 border-b-0`}>
                    <input value={responsavel} onChange={e=>setResp(e.target.value)} placeholder="Responsável..." className={inputCls} />
                  </div>
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">✕ {error}</p>}

              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {loading ? 'Enviando...' : '✓ Enviar Requisição'}
                </button>
                <button type="button" onClick={reset}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-colors">
                  Limpar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ── ACOMPANHAMENTO ── */}
        <section>
          <h2 className="text-base font-semibold text-slate-100 mb-1">Acompanhamento</h2>
          <p className="text-xs text-slate-500 mb-5">Status de todas as suas requisições em tempo real.</p>
          <div className="bg-[#161b2e] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-wider">
                  {['Nº','Solicitante','Nº Requisição','Data','Status Solicitação','Status Entrega'].map(h=>(
                    <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reqs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-700">Nenhuma requisição encontrada.</td></tr>
                )}
                {reqs.map((r, i) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-slate-600 font-mono">#{String(i+1).padStart(3,'0')}</td>
                    <td className="px-5 py-3 text-slate-300 font-medium">{r.engenheiro||'—'}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono">{r.numero_solicitacao||'—'}</td>
                    <td className="px-5 py-3 text-slate-600">{r.data||'—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status_solicitacao}/></td>
                    <td className="px-5 py-3"><StatusBadge status={r.status_final}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

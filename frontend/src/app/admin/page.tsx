"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Requisicao = {
  id: number; engenheiro: string; data: string; numero_solicitacao: string;
  status_solicitacao: string; numero_pedido: string | null;
  status_pedido: string | null; status_final: string | null; previsao_chegada: string | null;
  // campos do formulário
  obra?: string | null; centro_custo?: string | null; local_obra?: string | null;
  area_atividade?: string | null; itens?: string | null;
  destino?: string | null; responsavel?: string | null;
};
type Toast = { id: number; message: string; type: 'success' | 'error' };

// ── PASSWORD GATE ──────────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Senha incorreta');
      sessionStorage.setItem('sf_token', json.token);
      onAuth();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#243C4C] flex items-center justify-center font-sans">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Gestão de Suprimentos" className="h-20 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-[#F4FCFB]">Gestão de Suprimentos</h1>
          <p className="text-xs text-slate-500 mt-1">Painel Administrativo</p>
        </div>
        <form onSubmit={handleLogin} className="bg-[#5289AD] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Senha de acesso</label>
            <input
              type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              placeholder="••••••••" autoFocus
              className="w-full bg-black/30 border border-white/8 rounded-lg px-4 py-2.5 text-sm text-[#F4FCFB]/90 outline-none focus:border-[#698696] transition-all placeholder-slate-700"
            />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">✕ {error}</p>}
          <button type="submit" disabled={loading || !pwd}
            className="w-full py-2.5 rounded-xl bg-[#698696] text-[#243C4C] hover:bg-[#ACBCBF] hover:text-[#243C4C] disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center mt-4 text-xs text-slate-700">
          <a href="/" className="hover:text-slate-500 transition-colors">← Voltar ao portal</a>
        </p>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('sf_token');
    if (!token) { setAuthed(false); return; }
    fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(j => setAuthed(!!j.valid)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="min-h-screen bg-[#243C4C] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#698696]/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { sessionStorage.removeItem('sf_token'); setAuthed(false); }} />;
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [filter, setFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

  const addToast = (message: string, type: 'success' | 'error' = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/requisicoes`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setRequisicoes(await res.json());
    } catch (err: any) { addToast('Falha ao carregar dados.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro no upload');
      addToast('Requisição importada!', 'success'); fetchData();
    } catch (err: any) { addToast(err.message, 'error'); }
    finally { setLoading(false); e.target.value = ''; }
  };

  const excluirRequisicao = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir esta requisição permanentemente?')) return;
    try {
      const res = await fetch(`${API_URL}/api/requisicoes/${id}`, { method: 'DELETE' });
      let json: any = {};
      try { json = await res.json(); } catch {}
      if (!res.ok) throw new Error(json.error || `Erro HTTP ${res.status}`);
      setSelectedIds(p => p.filter(i => i !== id));
      if (expandedId === id) setExpandedId(null);
      addToast('Requisição excuída.', 'success'); fetchData();
    } catch (err: any) {
      console.error('[DELETE]', err);
      addToast(err.message || 'Falha ao excluir.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !confirm(`Excluir ${selectedIds.length} requisições?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/requisicoes/bulk-delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSelectedIds([]); addToast('Excluídas com sucesso.', 'success'); fetchData();
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const criarNovaRequisicao = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requisicoes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engenheiro: '', data: new Date().toLocaleDateString('pt-BR'), numero_solicitacao: '', status_solicitacao: 'pendente' }),
      });
      if (!res.ok) throw new Error('Erro ao criar');
      addToast('Nova requisição criada.', 'success'); fetchData();
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const updateField = async (id: number, field: string, value: string) => {
    setRequisicoes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'numero_pedido' && value.trim()) updated.status_solicitacao = 'aprovado';
      if (field === 'status_final' && value === 'finalizado') updated.status_solicitacao = 'aprovado';
      return updated;
    }));
    try {
      const payload: Record<string, any> = { [field]: value };
      if (field === 'numero_pedido' && value.trim()) payload.status_solicitacao = 'aprovado';
      if (field === 'status_final' && value === 'finalizado') payload.status_solicitacao = 'aprovado';
      const res = await fetch(`${API_URL}/api/requisicoes/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { fetchData(); throw new Error(json.error); }
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const handleLocal = (id: number, field: string, value: string) =>
    setRequisicoes(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filteredReqs = requisicoes.filter(r => filter === 'todos' || r.status_solicitacao === filter);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filteredReqs.length && filteredReqs.length > 0 ? [] : filteredReqs.map(r => r.id));

  const metrics = {
    total: requisicoes.length,
    pendente: requisicoes.filter(r => r.status_solicitacao === 'pendente').length,
    aprovado: requisicoes.filter(r => r.status_solicitacao === 'aprovado').length,
    a_caminho: requisicoes.filter(r => r.status_final === 'chegada_obra').length,
    finalizado: requisicoes.filter(r => r.status_final === 'finalizado').length,
  };

  const inputCls = "bg-transparent border-b border-transparent hover:border-white/10 focus:border-[#698696] focus:bg-[#243C4C] disabled:cursor-not-allowed transition-all outline-none px-1 py-0.5 rounded-sm";

  return (
    <div className="min-h-screen bg-[#243C4C] text-[#F4FCFB]/90 font-sans" translate="no">

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg text-xs font-medium shadow-xl border pointer-events-auto
            ${t.type === 'success' ? 'bg-emerald-900/80 border-[#ACBCBF]/40 text-emerald-300' : 'bg-red-900/80 border-red-500/40 text-red-300'}`}>
            {t.type === 'success' ? '✓ ' : '✕ '}{t.message}
          </div>
        ))}
      </div>
      {loading && <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#698696]/20"><div className="h-full bg-[#698696] animate-pulse w-full" /></div>}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#5289AD] border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Gestão de Suprimentos" className="h-9 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-semibold text-[#F4FCFB] tracking-wide">Gestão de Suprimentos</h1>
            <p className="text-[10px] text-slate-500">Painel Administrativo</p>
          </div>
        </div>
        {/* Navegação */}
        <nav className="flex items-center gap-1">
          <a href="/admin"
            className="flex items-center gap-1.5 text-[10px] text-[#698696] bg-[#698696]/10 border border-[#698696]/30 px-3 py-1.5 rounded-lg font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/admin/fornecedores"
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-[#ACBCBF] hover:bg-[#ACBCBF]/10 hover:border-[#ACBCBF]/30 border border-transparent px-3 py-1.5 rounded-lg transition-all font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Fornecedores
          </a>
          <a href="/admin/relatorios"
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent px-3 py-1.5 rounded-lg transition-all font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Relatórios
          </a>
          <div className="w-px h-5 bg-white/8 mx-1" />
          <a href="/" className="text-[10px] text-slate-600 hover:text-slate-400 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all">Portal →</a>
          <button onClick={onLogout} className="text-[10px] text-slate-600 hover:text-red-400 hover:border-red-500/20 border border-white/5 px-3 py-1.5 rounded-lg transition-all">Sair</button>
        </nav>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-5">
        {[
          { label: 'Total de Pedidos', value: metrics.total, color: 'text-[#698696]', badge: 'Ativos' },
          { label: 'Pendentes', value: metrics.pendente, color: 'text-amber-400', badge: 'Aguardando' },
          { label: 'Aprovados', value: metrics.aprovado, color: 'text-[#ACBCBF]', badge: 'Solicitação' },
          { label: 'A Caminho', value: metrics.a_caminho, color: 'text-indigo-400', badge: 'Em Trânsito' },
          { label: 'Finalizados', value: metrics.finalizado, color: 'text-teal-400', badge: 'Entregues' },
        ].map(({ label, value, color, badge }) => (
          <div key={label} className="bg-[#5289AD] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
            <span className="inline-flex items-center mt-2 px-2.5 py-0.5 text-[10px] font-medium rounded-full bg-[#ACBCBF]/10 text-[#ACBCBF] border border-[#ACBCBF]/20">{badge}</span>
          </div>
        ))}
      </div>

      {/* Barra de ações + Filtros */}
      <div className="flex items-center justify-between px-5 pb-3">
        {/* Filtros de status */}
        <div className="flex gap-1.5">
          {['todos', 'pendente', 'aprovado'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-4 py-1.5 rounded-full border transition-all font-medium
                ${filter === f ? 'bg-[#698696]/20 border-[#698696] text-[#698696]/80' : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {/* Ações */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 text-xs font-medium transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Excluir ({selectedIds.length})
            </button>
          )}

        </div>
      </div>

      {/* Table */}
      <div className="px-5 pb-6 overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#5289AD] text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="p-0 w-1 rounded-l-lg" />
              <th className="px-3 py-3 w-8">
                <input type="checkbox" checked={selectedIds.length === filteredReqs.length && filteredReqs.length > 0}
                  onChange={toggleSelectAll} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" />
              </th>
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3 w-16">Nº</th>
              <th className="px-3 py-3 w-48">Solicitante</th>
              <th className="px-3 py-3 w-28">Data</th>
              <th className="px-3 py-3 w-32">Nº Requisição</th>
              <th className="px-3 py-3 w-36">Status</th>
              <th className="px-3 py-3 w-32">Nº Pedido</th>
              <th className="px-3 py-3 w-40">Entrega</th>
              <th className="px-3 py-3 rounded-r-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredReqs.length === 0 && !loading && (
              <tr><td colSpan={10} className="text-center py-12 text-slate-700">Nenhuma requisição encontrada.</td></tr>
            )}
            {filteredReqs.map((r, i) => {
              const isFin = r.status_final === 'finalizado';
              const isExpanded = expandedId === r.id;
              let parsedItens: {descricao:string;unidade:string;quantidade:number}[] = [];
              try { parsedItens = JSON.parse(r.itens || '[]'); } catch {}
              return (
                <React.Fragment key={r.id}>
                <tr className={`border-b border-white/5 transition-colors group ${isFin ? 'opacity-60 bg-black/30' : isExpanded ? 'bg-[#698696]/5' : 'hover:bg-white/5'}`}>
                  <td className="p-0"><div className={`w-[3px] h-10 rounded-sm transition-all ${isExpanded ? 'bg-blue-400 scale-y-100' : 'bg-[#698696] scale-y-75 group-hover:scale-y-100'}`} /></td>
                  <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" /></td>
                  <td className="px-2 py-3">
                    <button onClick={() => toggleExpand(r.id)} title={isExpanded ? 'Fechar' : 'Ver itens'}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all text-xs ${
                        parsedItens.length > 0 ? 'text-[#698696] hover:bg-[#ACBCBF] hover:text-[#243C4C]/20' : 'text-slate-700 cursor-default'
                      } ${isExpanded ? 'bg-[#698696]/20 rotate-90' : ''}`}>
                      {parsedItens.length > 0 ? '▶' : '·'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-slate-500 font-mono">#{String(i + 1).padStart(3, '0')}</td>
                  <td className="px-3 py-3">
                    <input type="text" disabled={isFin} value={r.engenheiro} placeholder="Engenheiro"
                      onChange={e => handleLocal(r.id, 'engenheiro', e.target.value)}
                      onBlur={e => updateField(r.id, 'engenheiro', e.target.value)}
                      className={`${inputCls} w-full text-[#F4FCFB]/90`} />
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" disabled={isFin} value={r.data}
                      onChange={e => handleLocal(r.id, 'data', e.target.value)}
                      onBlur={e => updateField(r.id, 'data', e.target.value)}
                      className={`${inputCls} w-24 text-slate-500 font-mono`} />
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" disabled={isFin} value={r.numero_solicitacao}
                      onChange={e => handleLocal(r.id, 'numero_solicitacao', e.target.value)}
                      onBlur={e => updateField(r.id, 'numero_solicitacao', e.target.value)}
                      className={`${inputCls} w-24 text-slate-500 font-mono`} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-black/20">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status_solicitacao === 'aprovado' ? 'bg-[#ACBCBF]' : 'bg-amber-400 animate-pulse'}`} />
                      <select disabled={isFin} value={r.status_solicitacao || 'pendente'}
                        onChange={e => updateField(r.id, 'status_solicitacao', e.target.value)}
                        className={`bg-transparent outline-none text-[10px] font-medium cursor-pointer disabled:cursor-not-allowed appearance-none pr-3 ${r.status_solicitacao === 'aprovado' ? 'text-[#ACBCBF]' : 'text-amber-400'}`}>
                        <option className="bg-[#5289AD]" value="pendente">Pendente</option>
                        <option className="bg-[#5289AD]" value="aprovado">Aprovado</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <input type="text" disabled={isFin} value={r.numero_pedido || ''} placeholder="—"
                      onChange={e => handleLocal(r.id, 'numero_pedido', e.target.value)}
                      onBlur={e => updateField(r.id, 'numero_pedido', e.target.value)}
                      className={`${inputCls} w-24 text-slate-500 font-mono`} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-black/20">
                      <span className={`w-1.5 h-1.5 rounded-full ${isFin ? 'bg-teal-500' : r.status_final === 'chegada_obra' ? 'bg-indigo-500' : 'bg-slate-500 animate-pulse'}`} />
                      <select disabled={isFin} value={r.status_final || 'aguardando'}
                        onChange={e => updateField(r.id, 'status_final', e.target.value)}
                        className={`bg-transparent outline-none text-[10px] font-medium cursor-pointer disabled:cursor-not-allowed appearance-none pr-3 ${isFin ? 'text-teal-400' : r.status_final === 'chegada_obra' ? 'text-indigo-400' : 'text-slate-400'}`}>
                        <option className="bg-[#5289AD]" value="aguardando">Aguardando...</option>
                        <option className="bg-[#5289AD]" value="chegada_obra">Chegada em Obra</option>
                        <option className="bg-[#5289AD]" value="finalizado">Pedido Finalizado</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateField(r.id, 'status_final', 'finalizado')} disabled={isFin}
                        className={`px-3 py-1.5 rounded text-[10px] font-medium border whitespace-nowrap transition-colors
                          ${isFin ? 'bg-teal-500/10 text-teal-600/50 border-teal-500/10 cursor-not-allowed' : 'bg-[#ACBCBF]/20 text-[#ACBCBF] hover:bg-[#ACBCBF]/40 border-[#ACBCBF]/20'}`}>
                        {isFin ? '✓ Finalizado' : 'Finalizar Pedido'}
                      </button>
                      <button onClick={e => excluirRequisicao(r.id, e)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1.5 rounded transition-all" title="Excluir">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ── LINHA EXPANDIDA ── */}
                {isExpanded && (
                  <tr className="border-b border-[#698696]/20">
                    <td colSpan={11} className="px-6 py-4 bg-[#0a0e1a]">
                      <div className="space-y-3">
                        {/* Info da obra */}
                        <div className="flex flex-wrap gap-4 text-[10px]">
                          {r.obra && <span className="text-slate-500">🏗 <span className="text-slate-300 font-medium">{r.obra}</span></span>}
                          {r.centro_custo && <span className="text-slate-500">📌 <span className="text-[#698696]/80 font-mono font-semibold">{r.centro_custo}</span></span>}
                          {r.local_obra && <span className="text-slate-500">📍 Local: <span className="text-slate-300">{r.local_obra}</span></span>}
                          {r.area_atividade && <span className="text-slate-500">🔧 Área: <span className="text-slate-300">{r.area_atividade}</span></span>}
                          {r.destino && <span className="text-slate-500">📦 Destino: <span className="text-slate-300">{r.destino}</span></span>}
                          {r.responsavel && <span className="text-slate-500">👤 Responsável: <span className="text-slate-300">{r.responsavel}</span></span>}
                        </div>

                        {/* Tabela de itens */}
                        {parsedItens.length > 0 ? (
                          <div className="rounded-lg overflow-hidden border border-white/8">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="bg-[#5289AD] text-slate-500 uppercase tracking-wider">
                                  <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                                  <th className="px-3 py-2 text-center font-semibold w-20">Unidade</th>
                                  <th className="px-3 py-2 text-center font-semibold w-24">Quantidade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedItens.map((it, idx) => (
                                  <tr key={idx} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                                    <td className="px-3 py-2 text-slate-300">{it.descricao || '—'}</td>
                                    <td className="px-3 py-2 text-center text-slate-500 font-mono">{it.unidade}</td>
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">{it.quantidade}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-700 italic">Nenhum item registrado nesta requisição.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

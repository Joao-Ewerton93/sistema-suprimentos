"use client";

import React, { useState, useEffect } from 'react';

type Requisicao = {
  id: number;
  engenheiro: string;
  data: string;
  numero_solicitacao: string;
  status_solicitacao: string;
  numero_pedido: string | null;
  status_pedido: string | null;
  status_final: string | null;
  previsao_chegada: string | null;
};

export default function Dashboard() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [filter, setFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/requisicoes');
      if (res.ok) {
        const data = await res.json();
        // Ordena por ID crescente para a sequência 1, 2, 3 ficar lógica de cima pra baixo,
        // ou se quiser manter os novos no topo, você pode usar data.
        setRequisicoes(data);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) fetchData();
    } catch (error) { console.error("Erro no upload", error); }
  };

  const aprovarRequisicao = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3001/api/requisicoes/${id}/aprovar_pedido`, { method: 'PUT' });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const concluirRequisicao = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:3001/api/requisicoes/${id}/concluir`, { method: 'PUT' });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const excluirRequisicao = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta requisição?')) return;
    try {
      await fetch(`http://localhost:3001/api/requisicoes/${id}`, { method: 'DELETE' });
      // Remover do selection se estiver
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja excluir as ${selectedIds.length} requisições selecionadas?`)) return;
    try {
      await fetch('http://localhost:3001/api/requisicoes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      setSelectedIds([]);
      fetchData();
    } catch(e) { console.error(e); }
  };

  const criarNovaRequisicao = async () => {
    try {
      await fetch(`http://localhost:3001/api/requisicoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           engenheiro: '',
           data: new Date().toLocaleDateString('pt-BR'),
           numero_solicitacao: '',
           status_solicitacao: 'pendente',
           status_final: 'aguardando'
        })
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const updateField = async (id: number, field: string, value: string) => {
    // Atualização otimista na tela (Muda instantaneamente na hora que clica)
    setRequisicoes(prev => prev.map(r => {
      if (r.id === id) {
        let updated = { ...r, [field]: value };
        // Auto-aprovação ao preencher numero_pedido ou finalizar pedido
        if (field === 'numero_pedido' && value.trim() !== '') {
          updated.status_solicitacao = 'aprovado';
        }
        if (field === 'status_final' && value === 'finalizado') {
          updated.status_solicitacao = 'aprovado';
        }
        return updated;
      }
      return r;
    }));
    
    try {
      let payload: any = { [field]: value };
      if (field === 'numero_pedido' && value.trim() !== '') {
        payload.status_solicitacao = 'aprovado';
      }
      if (field === 'status_final' && value === 'finalizado') {
        payload.status_solicitacao = 'aprovado';
      }

      await fetch(`http://localhost:3001/api/requisicoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch(e) { console.error(e); }
  };

  // Atualiza o estado local IMEDIATAMENTE enquanto o usuário digita
  const handleLocalChange = (id: number, field: string, value: string) => {
    setRequisicoes(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredRequisicoes = requisicoes.filter(r => {
    if (filter === 'todos') return true;
    return r.status_solicitacao === filter;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequisicoes.length && filteredRequisicoes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequisicoes.map(r => r.id));
    }
  };

  const metrics = {
    pendente: requisicoes.filter(r => r.status_solicitacao === 'pendente').length,
    em_cotacao: requisicoes.filter(r => r.status_solicitacao === 'em_cotacao').length,
    aguardando_aprovacao: requisicoes.filter(r => r.status_solicitacao === 'aguardando_aprovacao').length,
    aprovado: requisicoes.filter(r => r.status_solicitacao === 'aprovado').length,
    a_caminho: requisicoes.filter(r => r.status_final === 'chegada_obra').length,
    finalizado: requisicoes.filter(r => r.status_final === 'finalizado').length,
    total: requisicoes.length,
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 font-sans relative overflow-hidden" translate="no">
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#161b2e] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm shadow-lg shadow-blue-500/20">📦</div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-wide">SupplyFlow</h1>
            <p className="text-[10px] text-slate-500">Sistema Kanban de Suprimentos</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete} 
              className="flex items-center justify-center w-8 h-8 rounded-md bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/40 transition-all shadow-sm mr-2"
              title="Excluir Selecionados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          )}

          <button onClick={criarNovaRequisicao} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-600/30 transition-all shadow-sm">
            + Novo Pedido
          </button>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-800/80 text-blue-200 border border-blue-500/50 text-xs cursor-pointer hover:bg-blue-600 transition-colors shadow-sm">
            <input type="file" className="hidden" onChange={handleFileUpload} />
            Importar IA
          </label>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-5">
        <MetricCard label="Total de Pedidos" value={metrics.total} colorClass="text-blue-400" badge="Ativos" />
        <MetricCard label="Pendentes" value={metrics.pendente} colorClass="text-slate-400" badge="Aguardando Ação" />
        <MetricCard label="Aprovados" value={metrics.aprovado} colorClass="text-emerald-400" badge="Solicitação" />
        <MetricCard label="Pedidos a Caminho" value={metrics.a_caminho} colorClass="text-cyan-400" badge="Em Trânsito" />
        <MetricCard label="Finalizados" value={metrics.finalizado} colorClass="text-teal-400" badge="Entregues" />
      </div>

      {/* Toolbar Filters */}
      <div className="flex gap-2 px-5 pb-3">
        {['todos', 'pendente', 'em_cotacao', 'aguardando_aprovacao', 'aprovado'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-4 py-1.5 rounded-full border transition-all duration-300 font-medium ${
              filter === f 
                ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {f === 'todos' ? 'Todos' : f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="px-5 pb-6 overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#161b2e] text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="p-0 w-1 rounded-l-lg"></th>
              <th className="px-3 py-3 w-8">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === filteredRequisicoes.length && filteredRequisicoes.length > 0} 
                  onChange={toggleSelectAll} 
                  className="w-3.5 h-3.5 rounded border-white/20 bg-[#0f1117] accent-blue-500 cursor-pointer" 
                />
              </th>
              <th className="px-3 py-3 font-semibold text-left w-20">Nº DA REQUISIÇÃO</th>
              <th className="px-3 py-3 font-semibold text-left w-48">Engenheiro</th>
              <th className="px-3 py-3 font-semibold text-left w-28">Data</th>
              <th className="px-3 py-3 font-semibold text-left w-32">Nº Solicitação</th>
              <th className="px-3 py-3 font-semibold text-left w-36">STATUS</th>
              <th className="px-3 py-3 font-semibold text-left w-32">Nº Pedido</th>
              <th className="px-3 py-3 font-semibold text-left w-40">STATUS ENTREGA</th>
              <th className="px-3 py-3 font-semibold text-left rounded-r-lg w-full">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="before:block before:h-2">
            {filteredRequisicoes.map((r, index) => {
              // Sequência sempre de 1, 2, 3... independente do ID no banco
              const sequenceNum = String(index + 1).padStart(3, '0');
              const isFinalizado = r.status_final === 'finalizado';
              
              return (
                <tr key={r.id} className={`border-b border-white/5 transition-colors group ${isFinalizado ? 'opacity-60 bg-black/40' : 'hover:bg-white/5'}`}>
                  <td className="p-0"><div className="w-[3px] h-10 bg-blue-500 rounded-sm scale-y-75 group-hover:scale-y-100 transition-transform"></div></td>
                  
                  <td className="px-3 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(r.id)} 
                      onChange={() => toggleSelect(r.id)} 
                      className="w-3.5 h-3.5 rounded border-white/20 bg-[#0f1117] accent-blue-500 cursor-pointer" 
                    />
                  </td>

                  <td className="px-3 py-3 text-slate-400 font-mono">#{sequenceNum}</td>
                  
                  <td className="px-3 py-3 text-slate-200 font-medium">
                    <input 
                      type="text"
                      disabled={isFinalizado}
                      value={r.engenheiro}
                      onChange={e => handleLocalChange(r.id, 'engenheiro', e.target.value)}
                      onBlur={e => updateField(r.id, 'engenheiro', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 focus:bg-[#0f1117] disabled:bg-transparent disabled:cursor-not-allowed transition-all outline-none w-full px-1 py-0.5 rounded-sm"
                      placeholder="Ex: Glaybson"
                    />
                  </td>
                  
                  <td className="px-3 py-3 text-slate-500 font-mono">
                    <input 
                      type="text"
                      disabled={isFinalizado}
                      value={r.data}
                      onChange={e => handleLocalChange(r.id, 'data', e.target.value)}
                      onBlur={e => updateField(r.id, 'data', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 focus:bg-[#0f1117] disabled:bg-transparent disabled:cursor-not-allowed transition-all outline-none w-24 px-1 py-0.5 rounded-sm"
                    />
                  </td>
                  
                  <td className="px-3 py-3 text-slate-500 font-mono">
                    <input 
                      type="text"
                      disabled={isFinalizado}
                      value={r.numero_solicitacao}
                      onChange={e => handleLocalChange(r.id, 'numero_solicitacao', e.target.value)}
                      onBlur={e => updateField(r.id, 'numero_solicitacao', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 focus:bg-[#0f1117] disabled:bg-transparent disabled:cursor-not-allowed transition-all outline-none w-24 px-1 py-0.5 rounded-sm"
                    />
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-black/20 hover:border-white/20 transition-all">
                      <span className={`w-1.5 h-1.5 rounded-full ${r.status_solicitacao === 'aprovado' ? 'bg-emerald-500' : 'bg-slate-400 animate-pulse'}`}></span>
                      <select 
                        disabled={isFinalizado}
                        value={r.status_solicitacao || 'pendente'}
                        onChange={e => updateField(r.id, 'status_solicitacao', e.target.value)}
                        className={`bg-transparent outline-none text-[10px] font-medium cursor-pointer disabled:cursor-not-allowed appearance-none pr-4 ${r.status_solicitacao === 'aprovado' ? 'text-emerald-400' : 'text-slate-400'}`}
                      >
                        <option className="bg-[#161b2e] text-slate-400" value="pendente">Pendente</option>
                        <option className="bg-[#161b2e] text-emerald-400" value="aprovado">Aprovado</option>
                      </select>
                    </div>
                  </td>
                  
                  <td className="px-3 py-3 text-slate-500 font-mono">
                    <input 
                      type="text"
                      disabled={isFinalizado}
                      value={r.numero_pedido || ''}
                      onChange={e => handleLocalChange(r.id, 'numero_pedido', e.target.value)}
                      onBlur={e => updateField(r.id, 'numero_pedido', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 focus:bg-[#0f1117] disabled:bg-transparent disabled:cursor-not-allowed transition-all outline-none w-24 px-1 py-0.5 rounded-sm"
                      placeholder="—"
                    />
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-black/20 hover:border-white/20 transition-all">
                      <span className={`w-1.5 h-1.5 rounded-full ${isFinalizado ? 'bg-emerald-500' : r.status_final === 'chegada_obra' ? 'bg-indigo-500' : 'bg-slate-500 animate-pulse'}`}></span>
                      <select 
                        disabled={isFinalizado}
                        value={r.status_final || 'aguardando'}
                        onChange={e => updateField(r.id, 'status_final', e.target.value)}
                        className={`bg-transparent outline-none text-[10px] font-medium cursor-pointer disabled:cursor-not-allowed appearance-none pr-4 ${isFinalizado ? 'text-emerald-400' : r.status_final === 'chegada_obra' ? 'text-indigo-400' : 'text-slate-400'}`}
                      >
                        <option className="bg-[#161b2e] text-slate-400" value="aguardando">Aguardando...</option>
                        <option className="bg-[#161b2e] text-indigo-400" value="chegada_obra">Chegada em Obra</option>
                        <option className="bg-[#161b2e] text-emerald-400" value="finalizado">Pedido Finalizado</option>
                      </select>
                    </div>
                  </td>
                  
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateField(r.id, 'status_final', 'finalizado')} 
                        disabled={isFinalizado}
                        className={`px-3 py-1.5 rounded text-[10px] font-medium transition-colors border whitespace-nowrap ${isFinalizado ? 'bg-emerald-500/10 text-emerald-600/50 border-emerald-500/10 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border-emerald-500/20'}`}
                      >
                        {isFinalizado ? '✓ Finalizado' : 'Finalizar Pedido'}
                      </button>
                      
                      <button onClick={(e) => excluirRequisicao(r.id, e)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1.5 rounded transition-all ml-1" title="Excluir individualmente">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, colorClass, badge, isWarn = false }: any) {
  return (
    <div className="bg-[#161b2e] border border-white/5 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-white/10 transition-all">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${colorClass}`}>{value}</div>
      <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 text-[10px] font-medium rounded-full border ${isWarn ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
        {isWarn && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>}
        {badge}
      </span>
    </div>
  );
}

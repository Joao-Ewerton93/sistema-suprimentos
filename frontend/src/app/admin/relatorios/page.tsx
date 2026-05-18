"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Requisicao = {
  id: number; engenheiro: string; data: string; numero_solicitacao: string;
  status_solicitacao: string; numero_pedido: string | null;
  status_final: string | null; previsao_chegada: string | null;
  obra?: string | null; centro_custo?: string | null; local_obra?: string | null;
  area_atividade?: string | null; itens?: string | null;
  destino?: string | null; responsavel?: string | null;
};

// ── GUARD ──────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('sf_token');
    if (!token) { setOk(false); return; }
    fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(r => r.json()).then(j => setOk(!!j.valid)).catch(() => setOk(false));
  }, []);

  useEffect(() => {
    if (ok === false) window.location.href = '/admin';
  }, [ok]);

  if (ok === null || ok === false)
    return <div className="min-h-screen bg-[#243C4C] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#698696]/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  return <>{children}</>;
}


// ── RELATÓRIOS ─────────────────────────────────────────────────────
function RelatoriosPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroEngenheiro, setFiltroEngenheiro] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/requisicoes`);
      if (!res.ok) throw new Error();
      setRequisicoes(await res.json());
    } catch { showToast('Falha ao carregar dados.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const parseData = (str: string) => {
    if (!str) return null;
    // DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return new Date(str);
  };

  const filtered = requisicoes.filter(r => {
    if (filtroStatus !== 'todos' && r.status_solicitacao !== filtroStatus) return false;
    if (filtroEngenheiro && !r.engenheiro?.toLowerCase().includes(filtroEngenheiro.toLowerCase())) return false;
    if (filtroDataInicio) {
      const d = parseData(r.data);
      if (!d || d < new Date(filtroDataInicio)) return false;
    }
    if (filtroDataFim) {
      const d = parseData(r.data);
      if (!d || d > new Date(filtroDataFim + 'T23:59:59')) return false;
    }
    return true;
  });

  const metrics = {
    total: filtered.length,
    pendente: filtered.filter(r => r.status_solicitacao === 'pendente').length,
    aprovado: filtered.filter(r => r.status_solicitacao === 'aprovado').length,
    finalizado: filtered.filter(r => r.status_final === 'finalizado').length,
    a_caminho: filtered.filter(r => r.status_final === 'chegada_obra').length,
  };

  const statusLabel = (r: Requisicao) => {
    if (r.status_final === 'finalizado') return 'Finalizado';
    if (r.status_final === 'chegada_obra') return 'A Caminho';
    if (r.status_solicitacao === 'aprovado') return 'Aprovado';
    return 'Pendente';
  };

  // ── EXPORT EXCEL ────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((r, i) => {
        let itens = '';
        try { itens = JSON.parse(r.itens || '[]').map((it: any) => `${it.descricao} (${it.quantidade} ${it.unidade})`).join('; '); } catch {}
        return {
          'Nº': i + 1,
          'Engenheiro / Solicitante': r.engenheiro || '—',
          'Data': r.data || '—',
          'Nº Solicitação': r.numero_solicitacao || '—',
          'Nº Pedido': r.numero_pedido || '—',
          'Status': statusLabel(r),
          'Obra': r.obra || '—',
          'Centro de Custo': r.centro_custo || '—',
          'Local da Obra': r.local_obra || '—',
          'Área/Atividade': r.area_atividade || '—',
          'Destino': r.destino || '—',
          'Responsável': r.responsavel || '—',
          'Itens': itens || '—',
          'Previsão Chegada': r.previsao_chegada || '—',
        };
      });

      // Resumo
      const resumo = [
        { Métrica: 'Total de Requisições', Valor: metrics.total },
        { Métrica: 'Pendentes', Valor: metrics.pendente },
        { Métrica: 'Aprovadas', Valor: metrics.aprovado },
        { Métrica: 'A Caminho', Valor: metrics.a_caminho },
        { Métrica: 'Finalizadas', Valor: metrics.finalizado },
        { Métrica: 'Gerado em', Valor: new Date().toLocaleString('pt-BR') },
      ];

      const wb = XLSX.utils.book_new();
      const wsReqs = XLSX.utils.json_to_sheet(rows);
      const wsResumo = XLSX.utils.json_to_sheet(resumo);

      // Larguras de coluna
      wsReqs['!cols'] = [
        { wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
        { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
        { wch: 18 }, { wch: 20 }, { wch: 50 }, { wch: 18 },
      ];
      wsResumo['!cols'] = [{ wch: 28 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, wsReqs, 'Requisições');
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `relatorio-suprimentos-${date}.xlsx`);
      showToast('Excel exportado com sucesso!');
    } catch (e) { showToast('Erro ao exportar Excel.', 'error'); }
    finally { setExporting(null); }
  };

  // ── EXPORT PDF ──────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Cabeçalho
      doc.setFillColor(15, 17, 23);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(226, 232, 240);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Gestão de Suprimentos', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Relatório de Requisições', 14, 19);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 25);

      // Filtros aplicados
      const filtrosTexto = [];
      if (filtroStatus !== 'todos') filtrosTexto.push(`Status: ${filtroStatus}`);
      if (filtroEngenheiro) filtrosTexto.push(`Engenheiro: ${filtroEngenheiro}`);
      if (filtroDataInicio) filtrosTexto.push(`De: ${filtroDataInicio}`);
      if (filtroDataFim) filtrosTexto.push(`Até: ${filtroDataFim}`);
      if (filtrosTexto.length) {
        doc.setFontSize(8);
        doc.setTextColor(99, 102, 241);
        doc.text(`Filtros: ${filtrosTexto.join(' | ')}`, 14, 31);
      }

      // Cards de métricas no PDF
      const cards = [
        { label: 'Total', value: metrics.total, color: [59, 130, 246] },
        { label: 'Pendentes', value: metrics.pendente, color: [251, 191, 36] },
        { label: 'Aprovados', value: metrics.aprovado, color: [52, 211, 153] },
        { label: 'A Caminho', value: metrics.a_caminho, color: [99, 102, 241] },
        { label: 'Finalizados', value: metrics.finalizado, color: [20, 184, 166] },
      ];
      const cardY = filtrosTexto.length ? 35 : 32;
      const cardW = 50, cardH = 16;
      cards.forEach((c, i) => {
        const x = 14 + i * (cardW + 4);
        doc.setFillColor(22, 27, 46);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'F');
        doc.setTextColor(c.color[0], c.color[1], c.color[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(String(c.value), x + 4, cardY + 10);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(c.label, x + 4, cardY + 14);
      });

      // Tabela
      const tableY = cardY + cardH + 6;
      const body = filtered.map((r, i) => [
        String(i + 1).padStart(3, '0'),
        r.engenheiro || '—',
        r.data || '—',
        r.numero_solicitacao || '—',
        r.numero_pedido || '—',
        statusLabel(r),
        r.obra || '—',
        r.centro_custo || '—',
        r.previsao_chegada || '—',
      ]);

      autoTable(doc, {
        startY: tableY,
        head: [['Nº', 'Engenheiro', 'Data', 'Nº Solicitação', 'Nº Pedido', 'Status', 'Obra', 'C. Custo', 'Previsão']],
        body,
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [226, 232, 240], fillColor: [15, 17, 23], lineColor: [30, 41, 59], lineWidth: 0.2 },
        headStyles: { fillColor: [22, 27, 46], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [18, 22, 36] },
        columnStyles: {
          0: { cellWidth: 12 }, 1: { cellWidth: 42 }, 2: { cellWidth: 22 },
          3: { cellWidth: 28 }, 4: { cellWidth: 24 }, 5: { cellWidth: 24 },
          6: { cellWidth: 38 }, 7: { cellWidth: 22 }, 8: { cellWidth: 22 },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw as string;
            const colors: Record<string, [number, number, number]> = {
              'Finalizado': [20, 184, 166], 'A Caminho': [99, 102, 241],
              'Aprovado': [52, 211, 153], 'Pendente': [251, 191, 36],
            };
            const c = colors[val] || [148, 163, 184];
            doc.setTextColor(c[0], c[1], c[2]);
            doc.setFontSize(8);
            doc.text(val, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1, { baseline: 'middle' });
          }
        },
        // Rodapé
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}  •  Gestão de Suprimentos`,
            14, doc.internal.pageSize.height - 6
          );
        },
      });

      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      doc.save(`relatorio-suprimentos-${date}.pdf`);
      showToast('PDF exportado com sucesso!');
    } catch (e) { console.error(e); showToast('Erro ao exportar PDF.', 'error'); }
    finally { setExporting(null); }
  };

  const inputCls = "bg-[#243C4C] border border-white/8 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none focus:border-[#698696] transition-all w-full placeholder-slate-700";

  return (
    <div className="min-h-screen bg-[#243C4C] text-[#F4FCFB]/90 font-sans" translate="no">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-xs font-medium shadow-xl border
          ${toast.type === 'success' ? 'bg-emerald-900/80 border-[#ACBCBF]/40 text-emerald-300' : 'bg-red-900/80 border-red-500/40 text-red-300'}`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#5289AD] border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="h-9 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-semibold text-[#F4FCFB] tracking-wide">Gestão de Suprimentos</h1>
            <p className="text-[10px] text-slate-500">Relatórios e Exportação</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <a href="/admin" className="text-[10px] text-slate-500 hover:text-slate-300 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all">
            ← Painel Admin
          </a>
          <a href="/" className="text-[10px] text-slate-600 hover:text-slate-400 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all">Portal →</a>
        </div>
      </header>

      <div className="p-5 space-y-5">

        {/* Título */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F4FCFB]">Relatório de Requisições</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Filtre, visualize e exporte os dados em PDF ou Excel</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportExcel} disabled={!!exporting || loading || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ACBCBF]/80 text-[#243C4C]/20 text-[#ACBCBF] border border-[#ACBCBF]/30 text-xs font-medium hover:bg-[#ACBCBF]/80 text-[#243C4C]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {exporting === 'excel' ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />Exportando...</span>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>Exportar Excel</>
              )}
            </button>
            <button onClick={exportPDF} disabled={!!exporting || loading || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-medium hover:bg-red-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {exporting === 'pdf' ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Exportando...</span>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Exportar PDF</>
              )}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#5289AD] border border-white/5 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-medium">Filtros</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] text-slate-600 mb-1">Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={inputCls}>
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-1">Engenheiro</label>
              <input type="text" placeholder="Filtrar por nome..." value={filtroEngenheiro}
                onChange={e => setFiltroEngenheiro(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-1">Data Início</label>
              <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-1">Data Fim</label>
              <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className={inputCls} />
            </div>
          </div>
          {(filtroStatus !== 'todos' || filtroEngenheiro || filtroDataInicio || filtroDataFim) && (
            <button onClick={() => { setFiltroStatus('todos'); setFiltroEngenheiro(''); setFiltroDataInicio(''); setFiltroDataFim(''); }}
              className="mt-3 text-[10px] text-slate-600 hover:text-slate-400 underline transition-colors">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: metrics.total, color: 'text-[#698696]', border: 'border-[#698696]/20' },
            { label: 'Pendentes', value: metrics.pendente, color: 'text-amber-400', border: 'border-amber-500/20' },
            { label: 'Aprovados', value: metrics.aprovado, color: 'text-[#ACBCBF]', border: 'border-[#ACBCBF]/20' },
            { label: 'A Caminho', value: metrics.a_caminho, color: 'text-indigo-400', border: 'border-indigo-500/20' },
            { label: 'Finalizados', value: metrics.finalizado, color: 'text-teal-400', border: 'border-teal-500/20' },
          ].map(({ label, value, color, border }) => (
            <div key={label} className={`bg-[#5289AD] border ${border} rounded-xl p-4`}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</div>
              <div className={`text-2xl font-semibold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabela de preview */}
        <div className="bg-[#5289AD] border border-white/5 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-xs font-medium text-slate-300">Pré-visualização — {filtered.length} registro(s)</p>
            {loading && <span className="text-[10px] text-slate-600 animate-pulse">Carregando...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-white/5">
                  <th className="px-4 py-3 w-12">Nº</th>
                  <th className="px-4 py-3">Engenheiro</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Nº Solicitação</th>
                  <th className="px-4 py-3">Nº Pedido</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Obra</th>
                  <th className="px-4 py-3">C. Custo</th>
                  <th className="px-4 py-3">Previsão Chegada</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-700">Nenhuma requisição encontrada com os filtros aplicados.</td></tr>
                )}
                {filtered.map((r, i) => {
                  const st = statusLabel(r);
                  const stColor: Record<string, string> = {
                    'Finalizado': 'text-teal-400 bg-teal-500/10 border-teal-500/20',
                    'A Caminho': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                    'Aprovado': 'text-[#ACBCBF] bg-[#ACBCBF]/10 border-[#ACBCBF]/20',
                    'Pendente': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  };
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600 font-mono">#{String(i + 1).padStart(3, '0')}</td>
                      <td className="px-4 py-2.5 text-[#F4FCFB]/90">{r.engenheiro || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{r.data || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{r.numero_solicitacao || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{r.numero_pedido || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-medium ${stColor[st]}`}>{st}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-[180px] truncate">{r.obra || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{r.centro_custo || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{r.previsao_chegada || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return <AuthGuard><RelatoriosPage /></AuthGuard>;
}

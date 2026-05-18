"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Fornecedor = {
  id: number; nome: string; cnpj: string | null; contato: string | null;
  email: string | null; telefone: string | null; categoria: string | null;
  observacoes: string | null; created_at: string;
};

const CATEGORIAS = ['Materiais de Construção', 'Elétrica', 'Hidráulica', 'Ferramentas', 'EPI/Segurança', 'Concreto/Argamassa', 'Transporte/Logística', 'Serviços', 'Outros'];

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
    return <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  return <>{children}</>;
}


const emptyForm = { nome: '', cnpj: '', contato: '', email: '', telefone: '', categoria: '', observacoes: '' };

function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Fornecedor | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fornecedores`);
      if (!res.ok) throw new Error();
      setFornecedores(await res.json());
    } catch { showToast('Falha ao carregar fornecedores.', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditando(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (f: Fornecedor) => {
    setEditando(f);
    setForm({ nome: f.nome, cnpj: f.cnpj || '', contato: f.contato || '', email: f.email || '', telefone: f.telefone || '', categoria: f.categoria || '', observacoes: f.observacoes || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { showToast('Nome é obrigatório.', 'error'); return; }
    setLoading(true);
    try {
      const url = editando ? `${API_URL}/api/fornecedores/${editando.id}` : `${API_URL}/api/fornecedores`;
      const method = editando ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(editando ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
      setShowModal(false);
      fetchData();
    } catch (err: any) { showToast(err.message || 'Erro ao salvar.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (f: Fornecedor) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fornecedores/${f.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Fornecedor excluído.');
      setConfirmDelete(null);
      fetchData();
    } catch { showToast('Erro ao excluir.', 'error'); }
    finally { setLoading(false); }
  };

  const filtered = fornecedores.filter(f => {
    const matchBusca = !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.cnpj?.includes(busca) || f.contato?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = filtroCategoria === 'todas' || f.categoria === filtroCategoria;
    return matchBusca && matchCat;
  });

  const inputCls = "w-full bg-slate-50 dark:bg-[#0f1117] border border-slate-300 dark:border-white/8 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all placeholder-slate-400 dark:placeholder-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-800 dark:text-slate-200 font-sans" translate="no">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-xs font-medium shadow-xl border
          ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-300' : 'bg-red-900/80 border-red-500/40 text-red-300'}`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white dark:bg-[#161b2e] border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="h-9 w-auto object-contain" />
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-wide">Gestão de Suprimentos</h1>
            <p className="text-[10px] text-slate-500">Fornecedores</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <a href="/admin" className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent px-3 py-1.5 rounded-lg transition-all font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/admin/fornecedores" className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Fornecedores
          </a>
          <a href="/admin/relatorios" className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/30 border border-transparent px-3 py-1.5 rounded-lg transition-all font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Relatórios
          </a>
          <div className="w-px h-5 bg-white/8 mx-1" />
          <a href="/" className="text-[10px] text-slate-600 hover:text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg transition-all">Portal →</a>
          <button onClick={() => { sessionStorage.removeItem('sf_token'); window.location.href = '/admin'; }}
            className="text-[10px] text-slate-600 hover:text-red-400 hover:border-red-500/20 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-lg transition-all">Sair</button>
        </nav>
      </header>

      <div className="p-5 space-y-5">

        {/* Título + botão */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Fornecedores</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{fornecedores.length} fornecedor(es) cadastrado(s)</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-medium transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Fornecedor
          </button>
        </div>

        {/* Busca + filtro categoria */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar por nome, CNPJ ou contato..." value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-white dark:bg-[#161b2e] border border-slate-200 dark:border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all placeholder-slate-400 dark:placeholder-slate-700" />
          </div>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            className="bg-white dark:bg-[#161b2e] border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500 transition-all">
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Grid de Cards */}
        {loading && fornecedores.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-700 text-xs">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="text-slate-800" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="text-slate-700 text-xs">{busca || filtroCategoria !== 'todas' ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}</p>
            {!busca && filtroCategoria === 'todas' && (
              <button onClick={openCreate} className="text-xs text-emerald-500 hover:underline mt-1">+ Cadastrar primeiro fornecedor</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(f => (
              <div key={f.id} className="bg-white dark:bg-[#161b2e] border border-slate-200 dark:border-white/5 rounded-xl p-4 hover:border-slate-200 dark:border-white/10 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{f.nome}</p>
                      {f.cnpj && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{f.cnpj}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(f)} title="Editar"
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setConfirmDelete(f)} title="Excluir"
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                {f.categoria && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
                    {f.categoria}
                  </span>
                )}

                <div className="space-y-1.5 text-[11px]">
                  {f.contato && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span className="text-slate-600 dark:text-slate-400">{f.contato}</span>
                    </div>
                  )}
                  {f.telefone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span className="text-slate-600 dark:text-slate-400">{f.telefone}</span>
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <a href={`mailto:${f.email}`} className="text-blue-400 hover:underline truncate">{f.email}</a>
                    </div>
                  )}
                  {f.observacoes && (
                    <p className="text-slate-600 italic mt-2 line-clamp-2">{f.observacoes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161b2e] border border-slate-300 dark:border-white/8 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-600 hover:text-slate-700 dark:text-slate-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Nome da Empresa *</label>
                  <input type="text" required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Razão social ou nome fantasia" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">CNPJ</label>
                  <input type="text" value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className={inputCls}>
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Contato (Nome)</label>
                  <input type="text" value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))}
                    placeholder="Nome do responsável" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="contato@empresa.com.br" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Condições de pagamento, prazo de entrega, etc." rows={3}
                    className={`${inputCls} resize-none`} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-white/8 text-slate-500 hover:text-slate-700 dark:text-slate-300 text-xs transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-all disabled:opacity-50">
                  {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161b2e] border border-red-500/20 rounded-2xl w-full max-w-sm shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" className="text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Excluir fornecedor?</p>
            <p className="text-xs text-slate-500 mb-4">"{confirmDelete.nome}" será removido permanentemente.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-white/8 text-slate-500 hover:text-slate-700 dark:text-slate-300 text-xs transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={loading}
                className="flex-1 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 text-red-400 text-xs font-medium transition-all">
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <AuthGuard><FornecedoresPage /></AuthGuard>;
}

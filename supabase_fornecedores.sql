-- =======================================================
-- TABELA: fornecedores
-- Execute este SQL no Supabase SQL Editor
-- =======================================================

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT        NOT NULL,
  cnpj        TEXT        UNIQUE,
  contato     TEXT,
  email       TEXT,
  telefone    TEXT,
  categoria   TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Desabilitar RLS (o backend usa SERVICE_ROLE_KEY)
ALTER TABLE public.fornecedores DISABLE ROW LEVEL SECURITY;

-- Índice de busca rápida por nome
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores (nome);

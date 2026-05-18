-- =======================================================
-- TABELA: usuarios e atualizações na tabela requisicoes
-- Execute este SQL no Supabase SQL Editor
-- =======================================================

-- 1. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  senha       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Adicionar coluna usuario_id na tabela requisicoes
ALTER TABLE public.requisicoes
ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Criar um índice para otimizar a busca dos pedidos por usuário
CREATE INDEX IF NOT EXISTS idx_requisicoes_usuario_id ON public.requisicoes(usuario_id);

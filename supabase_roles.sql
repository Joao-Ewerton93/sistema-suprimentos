-- =======================================================
-- TABELA: usuarios (Adicionando cargos)
-- Execute este SQL no Supabase SQL Editor
-- =======================================================

-- 1. Adiciona a coluna 'role' (cargo) com padrão 'user'
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. (Opcional) Se você já tiver um usuário e quiser promovê-lo a admin:
-- Substitua 'seu-email@aqui.com' pelo e-mail da conta que você criou no portal
-- UPDATE public.usuarios SET role = 'admin' WHERE email = 'admin@supplyflow.com';

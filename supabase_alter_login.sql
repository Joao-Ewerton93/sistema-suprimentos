-- =======================================================
-- MUDANÇA DE E-MAIL PARA USUÁRIO
-- Execute este SQL no Supabase SQL Editor
-- =======================================================

-- Renomeia a coluna email para usuario
ALTER TABLE public.usuarios RENAME COLUMN email TO usuario;

-- Se quiser criar o usuário Admin sem e-mail:
INSERT INTO public.usuarios (nome, usuario, senha, role) 
VALUES (
  'Administrador', 
  'admin', 
  '$2b$10$B3HPA5Oq7M0iI.cWnhlDZe475ZF3oNR3dGl2D903vcV6rgPYsqWsy', 
  'admin'
);

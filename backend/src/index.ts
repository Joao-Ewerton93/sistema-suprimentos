import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { supabase } from './database/supabase';
import { extractDataFromFile } from './services/gemini.service';

dotenv.config();

const app = express();

// CORS: aceita localhost em dev e a URL do frontend em produção
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (ex: Postman, mobile) e origens permitidas
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origem não permitida — ${origin}`));
        }
    },
    credentials: true,
}));

app.use(express.json());

// Validação de tipo de arquivo no Multer
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Formato não suportado: ${file.mimetype}. Use JPG, PNG, WEBP ou PDF.`));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper para verificar se uma requisição está finalizada
async function isRequisicaoFinalizada(id: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('requisicoes')
        .select('status_final')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data?.status_final === 'finalizado';
}

// Rota de Teste
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Backend funcionando' });
});

// Auth — Login do Admin
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD não configurado no servidor.' });
    if (password === adminPassword) {
        const token = Buffer.from(`supplyflow:${adminPassword}`).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Senha incorreta.' });
    }
});

// Auth — Verificar Token
app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const expected = Buffer.from(`supplyflow:${adminPassword}`).toString('base64');
    res.json({ valid: token === expected });
});

// Extrair dados com IA (sem inserir no banco)
app.post('/api/extract', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        const extractedData = await extractDataFromFile(req.file.buffer, req.file.mimetype);
        res.json({ success: true, extracted: extractedData });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Próximo Número de Requisição (auto-incremento visual)
app.get('/api/requisicoes/next-number', async (_req, res) => {
    try {
        const { count, error } = await supabase
            .from('requisicoes')
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        const year = new Date().getFullYear();
        const next = String((count || 0) + 1).padStart(2, '0');
        res.json({ number: `${year}-${next}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Listar Requisições
app.get('/api/requisicoes', async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('requisicoes')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Upload e Processamento (Gemini)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        // 1. Extração Multimodal com Gemini (Buffer)
        const extractedData = await extractDataFromFile(req.file.buffer, req.file.mimetype);

        // 2. Inserção no Supabase (Status: Em cotação)
        const { data, error } = await supabase
            .from('requisicoes')
            .insert([{
                engenheiro: extractedData.solicitante || extractedData.engenheiro || 'Desconhecido',
                data: extractedData.data || new Date().toLocaleDateString('pt-BR'),
                numero_solicitacao: extractedData.numero_solicitacao || 'NOVO',
                previsao_chegada: extractedData.previsao_chegada || null,
                status_solicitacao: 'pendente',
                status_final: null
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, request: data[0], extracted: extractedData });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Excluir Múltiplas Requisições
app.post('/api/requisicoes/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) return res.json({ success: true });

        const { error } = await supabase
            .from('requisicoes')
            .delete()
            .in('id', ids);

        if (error) throw error;
        res.json({ success: true, message: 'Requisições excluídas.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Criar Requisição
app.post('/api/requisicoes', async (req, res) => {
    try {
        const payload = req.body;
        const { data, error } = await supabase
            .from('requisicoes')
            .insert([{
                engenheiro:          payload.engenheiro          || 'Desconhecido',
                data:                payload.data                || new Date().toLocaleDateString('pt-BR'),
                numero_solicitacao:  payload.numero_solicitacao  || 'NOVO',
                numero_pedido:       payload.numero_pedido       || null,
                previsao_chegada:    payload.previsao_chegada    || null,
                status_solicitacao:  payload.status_solicitacao  || 'pendente',
                status_pedido:       payload.status_pedido       || null,
                status_final:        null,
                // Campos do formulário de requisição
                obra:                payload.obra                || null,
                centro_custo:        payload.centro_custo        || null,
                local_obra:          payload.local_obra          || null,
                area_atividade:      payload.area_atividade      || null,
                itens:               payload.itens               || null,
                destino:             payload.destino             || null,
                responsavel:         payload.responsavel         || null,
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, request: data[0] });
    } catch (err: any) {
        console.error('[POST /api/requisicoes]', err.message);
        res.status(500).json({ error: err.message });
    }
});


// Aprovar/Concluir Requisições — registrada ANTES de /:id (rota mais específica primeiro)
app.put('/api/requisicoes/:id/:action', async (req, res) => {
    try {
        const { id, action } = req.params;
        let updateData: Record<string, any> = {};

        if (action === 'aprovar_fornecedor') {
            updateData = { status_solicitacao: 'aprovado' };
        } else if (action === 'aprovar_pedido') {
            updateData = { status_pedido: 'aprovado' };
        } else if (action === 'concluir') {
            updateData = { status_final: 'finalizado' };
        } else {
            return res.status(400).json({ error: 'Ação inválida.' });
        }

        // Impedir modificações se já finalizado
        const finalizado = await isRequisicaoFinalizada(id);
        if (finalizado) {
            return res.status(400).json({ error: 'Requisição já finalizada e não pode ser alterada.' });
        }

        const { error } = await supabase
            .from('requisicoes')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: `Ação ${action} realizada.` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar Requisição Manualmente
app.put('/api/requisicoes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Impedir modificações se já finalizada
        const finalizado = await isRequisicaoFinalizada(id);
        if (finalizado) {
            return res.status(400).json({ error: 'Requisição já finalizada e não pode ser alterada.' });
        }

        const { error } = await supabase
            .from('requisicoes')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Requisição atualizada.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Excluir Requisição Individual
app.delete('/api/requisicoes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('requisicoes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Requisição excluída.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend rodando na porta ${PORT}`);

    // Auto-ping para evitar sleep no Render (a cada 14 minutos)
    if (process.env.RENDER_EXTERNAL_URL) {
        const pingUrl = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
        setInterval(async () => {
            try {
                const { default: https } = await import('https');
                https.get(pingUrl, () => console.log('[keep-alive] ping enviado'));
            } catch {}
        }, 14 * 60 * 1000);
        console.log(`[keep-alive] Ativo → ${pingUrl}`);
    }
});

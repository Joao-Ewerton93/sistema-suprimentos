import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { supabase } from './database/supabase';
import { extractDataFromFile } from './services/gemini.service';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Rota de Teste
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend funcionando' });
});

// Listar Requisições
app.get('/api/requisicoes', async (req, res) => {
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
                data: extractedData.data || new Date().toLocaleDateString(),
                numero_solicitacao: extractedData.numero_solicitacao || 'NOVO',
                previsao_chegada: extractedData.previsao_chegada || null,
                status_solicitacao: 'pendente'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ success: true, request: data[0], extracted: extractedData });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Aprovar/Concluir Requisições
app.put('/api/requisicoes/:id/:action', async (req, res) => {
    try {
        const { id, action } = req.params;
        let updateData = {};

        if (action === 'aprovar_fornecedor') {
            updateData = { status_solicitacao: 'forn_aprov' };
        } else if (action === 'aprovar_pedido') {
            updateData = { status_pedido: 'ped_aprov' };
        } else if (action === 'concluir') {
            updateData = { status_final: 'concluido' };
        } else {
            return res.status(400).json({ error: 'Ação inválida.' });
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

// Criar Requisição Manualmente (Sem Gemini)
app.post('/api/requisicoes', async (req, res) => {
    try {
        const payload = req.body;
        const { data, error } = await supabase
            .from('requisicoes')
            .insert([{
                engenheiro: payload.engenheiro || 'Desconhecido',
                data: payload.data || new Date().toLocaleDateString(),
                numero_solicitacao: payload.numero_solicitacao || 'NOVO',
                numero_pedido: payload.numero_pedido || null,
                previsao_chegada: payload.previsao_chegada || null,
                status_solicitacao: payload.status_solicitacao || 'cotacao',
                status_pedido: payload.status_pedido || null,
                status_final: payload.status_final || null
            }])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, request: data[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Excluir Requisição Manualmente
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});

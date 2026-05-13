import { GoogleGenerativeAI } from '@google/generative-ai';

export async function extractDataFromFile(fileBuffer: Buffer, mimeType: string): Promise<any> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY não configurada. Retornando dados mockados.");
        return {
            engenheiro: "Eng. Mockado",
            data: new Date().toLocaleDateString(),
            numero_solicitacao: "PS-000",
            previsao_chegada: ""
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Usa o modelo Pro para máxima precisão na extração de dados
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `Extraia os dados desta requisição e retorne estritamente um formato JSON. Não adicione nenhum texto fora do JSON.
        
        Estrutura obrigatória:
        {
            "solicitante": "Procure o nome preenchido abaixo da palavra 'ENGENHEIRO' no rodapé do documento (ex: GLAYBSON)",
            "data": "A data exata que está ao lado do campo 'DATA' no topo (ex: 21/2/2026)",
            "numero_solicitacao": "O número que aparece no título do documento após 'REQUISIÇÃO DE MATERIAL Nº' (ex: 2026-01). NÃO pegue códigos do meio da tabela como PS-021."
        }`;

        const imagePart = {
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: mimeType
            }
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        const responseText = result.response.text();
        console.log("Resposta bruta do Gemini:", responseText);
        
        return JSON.parse(responseText);

    } catch (error: any) {
        console.error("=== ERRO NA IA (GEMINI) ===");
        console.error(error?.message || error);
        console.error("===========================");
        return {
            engenheiro: "Erro na IA",
            data: new Date().toLocaleDateString(),
            numero_solicitacao: "ERR-001",
            previsao_chegada: ""
        };
    }
}

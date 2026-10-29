import { MCPAdapter } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import Fastify from "fastify";
import { createAgent, HumanMessage, SystemMessage } from "langchain";

const fastify = Fastify({
    logger: true,
});

const model = new ChatOpenAI({
    model: "nvidia/nemotron-3.5-super-vl:free",
    temperature: 0.7,
    maxRetries: 5,
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
        baseURL: process.env.OPENROUTER_API_BASE_URL,
    },
});

const adapter = new MCPAdapter({
    servers: {
        chamados: {
            transport: "stdio",
            command: "node",
            args: ["/home/bcanuto/workspace/estudos/chamados-mcp/mcp/src/index.ts"],
        }
    }
});

fastify.post("/", async (request, reply) => {

    const body = request.body as { question: string };
    if (!body.question) {
        reply.status(400).send({ error: 'Termo de busca nao informado' });
        return;
    }

    try {
        const tools = await adapter.listTools();

        const agent = createAgent({ model, tools })
        const result = await agent.invoke({
            messages: [
                new SystemMessage(`
                    Você é um assistente de suporte para o cliente com amplo conhecimento na base de dados, seu papel é sanar dúvidas sobre questinamentos do usuário.

                    Seu objetivo é identificar a inteção do usuário e o primeiro passo é categorizar o assunto da dúvida.

                    INSTRUÇÕES:
                    - UTILIZE a lista de categoria para identificar o assunto da dúvida.
                    - Se você NÃO encontrou a categoria, responda com "INFORME a categoria ou setor relacionado ao assunto".
                    - Você NÃO DEVE fornecer NENHUMA informação confidencial ou pessoal, apenas fornecer informações sobre a dúvida do usuário.
                `),
                new HumanMessage(body.question)
            ]
        })

        reply.send(result);

    } catch (error) {
        reply.log.error(error);
        reply.status(500).send(error);

    } finally {
        await adapter.close();
    }
});

fastify.listen({ port: 3001 }, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }

    fastify.log.info(`Server listening at ${address}`);
});
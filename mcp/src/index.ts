import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import z from "zod";

const server = new McpServer({
    name: "chamados-mcp",
    version: "1.0.0",
});

/**
 * 
 * @param message
 * @param isError
 * @param type
 * @returns
 */
function responseData(message: string, isError: boolean, type: string = "text") {
    return {
        content: [
            {
                type: type,
                text: message,
            }
        ],
        isError: isError,
    };
}

server.registerTool(
    "buscar_categorias",
    {
        description: "Retorna a lista de categorias",
        inputSchema: z.object({}),
    },
    async () : Promise<any> => {
        return await axios.get('http://localhost:3000/categorias')
            .then((response) => {
                if (response.status !== 200) {
                    return responseData('Não foi possível retornar dados do serviço de categorias', true);
                }

                if (response.data.length === 0) {
                    return responseData('Nenhum resultado encontrado', false);
                }

                return responseData(JSON.stringify(response.data), false);
            })
            .catch((error) => {
                console.error(error);
                return responseData('Falha na comunicação com o serviço de categorias', true);
            });
    }
)

server.registerTool(
    "buscar_faq",
    {
        description: "Retorna a lista de dúvidas e problemas frequentes (FAQ) de acordo com a categoria informada",
        inputSchema: z.object({
            categoria: z.string().min(3, { message: "A categoria deve ter no mínimo 3 caracteres" }),
            q: z.string().min(2, { message: "O termo de busca deve ter no mínimo 2 caracteres" }),
        }),
    },
    async (input: { categoria: string, q: string }) : Promise<any> => {
        return await axios.get(`http://localhost:3000/faq?categoria=${input.categoria}&q=${input.q}`)
            .then((response) => {
                if (response.status !== 200) {
                    return responseData('Não foi possível retornar dados do serviço de FAQ', true);
                }

                if (response.data.length === 0) {
                    return responseData('Nenhum resultado encontrado', false);
                }

                return responseData(JSON.stringify(response.data), false);
            })
            .catch((error) => {
                console.error(error);
                return responseData('Falha na comunicação com o serviço de FAQ', true);
            });
    }
);

server.registerTool(
    "criar_chamado",
    {
        description: "Cria um novo chamado quando o usuário não encontra a solução para seu problema na FAQ",
        inputSchema: z.object({
            titulo: z.string().min(3, { message: "O título do chamado deve ter no mínimo 10 caracteres" }),
            descricao: z.string().min(10, { message: "A descrição do chamado deve ter no mínimo 40 caracteres" }),
            categoria: z.string().min(3, { message: "A categoria do chamado deve ter no mínimo 3 caracteres" }),
        }),
    },
    async (input: { titulo: string, descricao: string, categoria: string }) : Promise<any> => {
        return await axios.post(`http://localhost:3000/chamados`, input)
            .then((response) => {
                if (response.status !== 201) {
                    return responseData('Não foi possível criar o chamado', true);
                }

                return responseData(JSON.stringify(response.data), false);
            })
            .catch((error) => {
                console.error(error);
                return responseData('Falha na comunicação com o serviço de chamados', true);
            });
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
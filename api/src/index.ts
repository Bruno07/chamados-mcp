import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

const fastify = Fastify({
  logger: true,
});

type Filtro = {
  categoria: String,
  palavras_chave: String[],
  titulo: String
};

const schemaChamado = z.object({
  titulo: z.string().min(3, { message: "O título deve ter no mínimo 3 caracteres" }),
  descricao: z.string().min(10, { message: "A descrição deve ter no mínimo 10 caracteres" }),
  categoria: z.string().min(3, { message: "A categoria deve ter no mínimo 3 caracteres" }),
});

type Chamado = z.infer<typeof schemaChamado>;

fastify.get("/faq", async (request, reply) => {
    const query = request.query as { categoria: string, q: string };
    const arquivo = await readFile('src/data/faq.json', 'utf8');

    if (!query.categoria && !query.q) {
        reply.status(400).send({ error: 'Categoria ou termo de busca não informado' });
    }

    let faq = JSON.parse(arquivo).filter((f: Filtro) => f.categoria === query.categoria && (f.palavras_chave.includes(query.q) || f.titulo.includes(query.q)));

    reply.type('application/json');
    reply.send(faq);
});

fastify.get("/categorias", async (request, reply) => {
    const arquivo = await readFile('src/data/categorias.json', 'utf8');
    reply.type('application/json');
    reply.send(JSON.parse(arquivo));
})

fastify.post("/chamados", async (request, reply) => {
    const corpo = request.body as Chamado;
    const arquivo = await readFile('src/data/chamados.json', 'utf8');

    const result = schemaChamado.safeParse(corpo);
    if (!result.success) {
        reply.status(400).send(result.error);
        return;
    }

    const chamado = {
        id: randomUUID(),
        titulo:    corpo.titulo,
        descricao: corpo.descricao,
        categoria: corpo.categoria,
        status: 'aberto'
    };

    let chamados = JSON.parse(arquivo)
    chamados.push(chamado);
    await writeFile('src/data/chamados.json', JSON.stringify(chamados, null, 2), 'utf8');

    reply.type('application/json');
    reply.send({
        status: 201,
        message: 'Chamado criado com sucesso',
        data: {
            ...chamado
        }
    });
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  fastify.log.info(`Server listening at ${address}`);
});
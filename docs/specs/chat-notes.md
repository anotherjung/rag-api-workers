# If you are working with larger documents, you have the option to use gemini models ↗, which have large context windows and are well-suited to RAG workflows.

gemma-3-12b-it

@cf/google/gemma-3-12b-it

Gemma 3 models are well-suited for a variety of text generation and image understanding tasks, including question answering, summarization, and reasoning. Gemma 3 models are multimodal, handling text and image input and generating text output, with a large, 128K context window, multilingual support in over 140 languages, and is available in more sizes than previous versions.

https://developers.cloudflare.com/workers-ai/models/gemma-3-12b-it/

export interface Env {
  AI: Ai;
}

export default {
  async fetch(request, env): Promise<Response> {

    const messages = [
      { role: "system", content: "You are a friendly assistant" },
      {
        role: "user",
        content: "What is the origin of the phrase Hello, World",
      },
    ];

    const stream = await env.AI.run("@cf/google/gemma-3-12b-it", {
      messages,
      stream: true,
    });

    return new Response(stream, {
      headers: { "content-type": "text/event-stream" },
    });
  },
} satisfies ExportedHandler<Env>;


app.get('/', async (c) => {
  // ... Existing code
  const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`

  let modelUsed: string = ""
  let response = null

  if () {
    const model = ""
    modelUsed = model

    const message = await anthropic.messages.create({
      max_tokens: 1024,
      model,
      messages: [
        { role: 'user', content: question }
      ],
      system: [systemPrompt, notes ? contextMessage : ''].join(" ")
    })

    response = {
      response: message.content.map(content => content.text).join("\n")
    }
  } else {
    const model = "@cf/meta/llama-3.1-8b-instruct"
    modelUsed = model

    response = await c.env.AI.run(
      model,
      {
        messages: [
          ...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      }
    )
  }

  if (response) {
    c.header('x-model-used', modelUsed)
    return c.text(response.response)
  } else {
    return c.text("We were unable to generate output", 500)
  }
})


## Deleting notes and vectors

If you no longer need a note, you can delete it from the database. Any time that you delete a note, you will also need to delete the corresponding vector from Vectorize. You can implement this by building a DELETE /notes/:id route in your src/index.js file:

app.delete("/notes/:id", async (c) => {
  const { id } = c.req.param();

  const query = `DELETE FROM notes WHERE id = ?`;
  await c.env.DB.prepare(query).bind(id).run();

  await c.env.VECTOR_INDEX.deleteByIds([id]);

  return c.status(204);
});
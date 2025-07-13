
https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/#1-create-a-new-worker-project

https://developers.cloudflare.com/workers-ai/platform/pricing/
find model

npx wrangler dev --remote

src/index.js

npx wrangler deploy


curl  https://rag-ai-tutorial.jungno.workers.dev

mkdir docs && mkdir docs/specs
touch docs/specs/index.md

touch docs/specs/vectorize.md src/vectorize.js

npx wrangler run dev

http://localhost:63243

curl -X POST http://localhost:63243 \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine learning is fascinating and powerful"}'
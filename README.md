
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

npx wrangler dev --remote

http://localhost:56100

curl -X POST http://localhost:56100 \
  -H "Content-Type: application/json" \
  -d '{"text": "batman"}'

curl "http://localhost:56100?q=artificial intelligence"

npx wrangler tail --format pretty

npm run deploy

curl -X POST https://rag-ai-tutorial.jungno.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "batman"}'

 https://rag-ai-tutorial.jungno.workers.dev

 curl " https://rag-ai-tutorial.jungno.workers.dev?q=batman"


touch docs/specs/hono.md src/hono.js


## update wranger dev 
npm i -D wrangler@latest

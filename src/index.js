/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { RAGWorkflow } from "./vectorize";
export { RAGWorkflow };

export default {
	async fetch(request, env, ctx) {
		console.log(request);

		if (request.method === "POST") {
			const { text } = await request.json();
	  
			// Create workflow instance
			const instance = await env.RAG_WORKFLOW.create({ 
			  params: { text } 
			});
	  
			return new Response(JSON.stringify({ 
			  success: true,
			  workflowId: instance.id,
			  message: "Note processing started"
			}));
		  }
		  else {
			const answer = await env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
				messages: [
					{
						role: "user",
						content: "What is the square root of 9?",
					},
				],
			})
			return new Response(JSON.stringify(answer));
		  }
	},
};


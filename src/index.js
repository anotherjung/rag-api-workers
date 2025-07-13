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
		try {
			if (request.method === "POST") {
				const { text } = await request.json();
				console.log("Received text:", text);
		  
				// For now, just return success without workflow
				// TODO: Enable workflow once local dev issues are resolved
				return new Response(JSON.stringify({ 
				  success: true,
				  message: "Text received successfully",
				  text: text,
				  note: "Workflow processing temporarily disabled in local dev"
				}));
			}

			// Handle GET requests - simplified for now
			if (request.method === "GET") {
				const url = new URL(request.url);
				const query = url.searchParams.get("q");
				
				if (query) {
					return new Response(JSON.stringify({
						message: "Search functionality temporarily disabled in local dev",
						query: query,
						note: "Vectorize local bindings not yet supported"
					}));
				}
			}

			// Default AI demo
			const answer = await env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
				messages: [{ role: "user", content: "What is the square root of 9?" }]
			});
			return new Response(JSON.stringify(answer));
		} catch (error) {
			console.error("Error:", error);
			return new Response(JSON.stringify({ 
				error: error.message,
				stack: error.stack 
			}), { status: 500 });
		}
	},
};


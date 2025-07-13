import { WorkflowEntrypoint } from "cloudflare:workers";

export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    await step.do("example step", async () => {
      console.log("Hello World!");
    });
  }
}
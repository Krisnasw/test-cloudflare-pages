export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }

    // Serve static assets from ASSETS binding
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<{ ASSETS: Fetcher }>;
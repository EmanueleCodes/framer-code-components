/**
 * Cloudflare Worker: serves globe binary data from R2.
 * Routes: /globe_low.bin, /globe_medium.bin, /globe_high.bin
 */

export interface Env {
    GLOBE_BUCKET: R2Bucket;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname.replace(/^\//, "") || "globe_high.bin";

        // Only allow .bin files
        if (!path.endsWith(".bin") || !/^globe_(low|medium|high)\.bin$/.test(path)) {
            return new Response("Not found", { status: 404 });
        }

        try {
            const object = await env.GLOBE_BUCKET.get(path);
            if (!object) {
                return new Response("Not found", { status: 404 });
            }

            return new Response(object.body, {
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        } catch (err) {
            return new Response("Internal error", { status: 500 });
        }
    },
};

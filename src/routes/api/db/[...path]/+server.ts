import { env } from '$env/dynamic/private';
import { error, type RequestHandler } from '@sveltejs/kit';

export const fallback: RequestHandler = async ({ request, params, fetch }) => {
	const pbUrl = env.POCKETBASE_URL ?? env.PUBLIC_POCKETBASE_URL ?? 'http://192.168.15.14:8080';
	// Construct the target URL on the PocketBase server
	const targetUrl = `${pbUrl.replace(/\/+$/, '')}/${params.path}${new URL(request.url).search}`;

	// Clone the headers from the incoming request, omitting 'host'
	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (key.toLowerCase() !== 'host') {
			headers.set(key, value);
		}
	}

	try {
		const body = request.body ? request.body : undefined;

		// Fetch from the local PocketBase server using SvelteKit's fetch
		const res = await fetch(targetUrl, {
			method: request.method,
			headers,
			body,
			// @ts-ignore
			duplex: body ? 'half' : undefined
		});

		// Return the streamed response back to the client
		return new Response(res.body, {
			status: res.status,
			headers: res.headers
		});
	} catch (err) {
		console.error('[PB Proxy Error]:', err);
		throw error(502, 'Bad Gateway');
	}
};

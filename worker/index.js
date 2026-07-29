const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')
    const canUseAppShell = request.method === 'GET' || request.method === 'HEAD'

    if (response.status === 404 && acceptsHtml && canUseAppShell) {
      response = await env.ASSETS.fetch(
        new Request(new URL('/index.html', request.url), request),
      )
    }

    return withSecurityHeaders(response)
  },
}

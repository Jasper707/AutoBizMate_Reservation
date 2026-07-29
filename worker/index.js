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

function runtimeConfiguration(env) {
  return {
    supabaseUrl: String(env.SUPABASE_URL ?? '').trim(),
    supabasePublishableKey: String(
      env.SUPABASE_PUBLISHABLE_KEY ?? '',
    ).trim(),
  }
}

function runtimeConfigResponse(request, env) {
  const config = runtimeConfiguration(env)
  const url = new URL(request.url)
  const javascript = url.pathname.endsWith('.js')
  const body = javascript
    ? `globalThis.__AUTOBIZMATE_CONFIG__=${JSON.stringify(config)};`
    : JSON.stringify(config)

  return new Response(body, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': javascript
        ? 'application/javascript; charset=utf-8'
        : 'application/json; charset=utf-8',
    },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (
      request.method === 'GET'
      && (
        url.pathname === '/api/runtime-config'
        || url.pathname === '/api/runtime-config.js'
      )
    ) {
      return withSecurityHeaders(runtimeConfigResponse(request, env))
    }

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

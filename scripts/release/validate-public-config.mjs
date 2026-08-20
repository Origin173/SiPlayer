const configuredUrl = process.env.EXPO_PUBLIC_GATEWAY_URL?.trim() ?? '';
if (!configuredUrl) {
  throw new Error('Missing EXPO_PUBLIC_GATEWAY_URL GitHub Variable.');
}

let gatewayUrl;
try {
  gatewayUrl = new URL(configuredUrl);
} catch {
  throw new Error(`Invalid EXPO_PUBLIC_GATEWAY_URL: ${configuredUrl}`);
}

if (!['http:', 'https:'].includes(gatewayUrl.protocol)) {
  throw new Error(`EXPO_PUBLIC_GATEWAY_URL must use http or https: ${configuredUrl}`);
}

if (['localhost', '127.0.0.1', '::1'].includes(gatewayUrl.hostname)) {
  throw new Error(`EXPO_PUBLIC_GATEWAY_URL must not point to localhost: ${configuredUrl}`);
}

console.log(`Validated public Gateway URL: ${gatewayUrl.origin}`);

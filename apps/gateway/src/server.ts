import { buildApp } from './app';
import { loadConfig } from './config/env';

const config = loadConfig();
const app = buildApp(config);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error, 'gateway failed to start');
  process.exitCode = 1;
}

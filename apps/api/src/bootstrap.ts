import { loadConfig } from '@form/config';

// Validate all production-critical configuration before importing modules that
// create database, Redis, storage or AI clients at module evaluation time.
loadConfig();

await import('./server.js');

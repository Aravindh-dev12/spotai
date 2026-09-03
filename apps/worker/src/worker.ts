import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { StubAiGateway, type AiGateway } from '@form/ai-gateway';
import { loadConfig } from '@form/config';
import { updateRevealJob } from '@form/db/features';

const config = loadConfig();
const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: true });
const ai: AiGateway = new StubAiGateway();

const worker = new Worker('form-jobs', async job => {
  switch (job.name) {
    case 'season-narrative':
      return ai.generateSeasonNarrative(job.data);
    case 'form-reveal': {
      const revealId = String(job.data.revealId);
      await updateRevealJob(revealId, { status: 'processing' });
      try {
        const result = await ai.createFormReveal({
          userId: String(job.data.userId),
          archetype: String(job.data.archetype ?? 'UNKNOWN'),
          seasonLabel: String(job.data.seasonId),
          mediaIds: [String(job.data.sourceMediaId)],
          consentToken: `reveal:${revealId}`
        });
        await updateRevealJob(revealId, { status: result.status === 'ready' ? 'ready' : 'processing' });
        return result;
      } catch (error) {
        await updateRevealJob(revealId, { status: 'failed', errorCode: 'render_failed' });
        throw error;
      }
    }
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, { connection, concurrency: 4 });

worker.on('completed', job => console.info(JSON.stringify({ level: 'info', event: 'job_completed', jobId: job.id, name: job.name })));
worker.on('failed', (job, error) => console.error(JSON.stringify({ level: 'error', event: 'job_failed', jobId: job?.id, name: job?.name, error: error.message })));
worker.on('error', error => console.error(JSON.stringify({ level: 'error', event: 'worker_error', error: error.message })));

async function shutdown(signal: string) {
  console.info(JSON.stringify({ level: 'info', event: 'worker_shutdown', signal }));
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

console.info(JSON.stringify({ level: 'info', event: 'worker_started', queue: 'form-jobs', environment: config.NODE_ENV }));

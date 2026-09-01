import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { StubAiGateway } from '@form/ai-gateway';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const ai = new StubAiGateway();

new Worker('form-jobs', async job => {
  switch (job.name) {
    case 'season-narrative':
      return ai.generateSeasonNarrative(job.data);
    case 'form-reveal':
      return ai.createFormReveal(job.data);
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, { connection });

console.log('FORM worker listening on form-jobs');

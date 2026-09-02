import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { StubAiGateway } from '@form/ai-gateway';
import { updateRevealJob } from '@form/db/features';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const ai = new StubAiGateway();

new Worker('form-jobs', async job => {
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
        // The stub provider does not create a persisted output asset yet. A production
        // renderer adapter must create media_assets output before marking the job ready.
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

console.log('FORM worker listening on form-jobs');

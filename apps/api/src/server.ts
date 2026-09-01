import Fastify from 'fastify';
import { lifeSignalSchema, newTraitVector, applySignal, awakeningProgress, resolveForm } from '@form/domain';
import { StubAiGateway } from '@form/ai-gateway';

const app = Fastify({ logger: true });
const ai = new StubAiGateway();

app.get('/health', async () => ({ ok: true, service: 'form-api' }));

app.post('/v1/life-signals/preview', async (request, reply) => {
  const parsed = lifeSignalSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'invalid_signal', details: parsed.error.flatten() });
  const classification = await ai.classifyLifeSignal(parsed.data);
  const traits = applySignal(newTraitVector(), classification);
  return { classification, preview: { traits, awakeningProgress: awakeningProgress(traits), archetype: resolveForm(traits) } };
});

app.post('/v1/life-mode/label', async (request, reply) => {
  const body = request.body as { wantsMore?: string[]; wantsLess?: string[]; desiredFeeling?: string };
  if (!Array.isArray(body?.wantsMore) || body.wantsMore.length === 0) return reply.code(400).send({ error: 'wants_more_required' });
  const label = await ai.generateLifeModeLabel({ wantsMore: body.wantsMore, wantsLess: body.wantsLess ?? [], desiredFeeling: body.desiredFeeling });
  return { label };
});

const port = Number(process.env.API_PORT ?? 3000);
await app.listen({ port, host: '0.0.0.0' });

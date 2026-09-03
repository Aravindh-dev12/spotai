import type { ClassifiedSignal, LifeSignal, TraitVector } from '@form/domain';

export interface CreativeRequest {
  userId: string;
  archetype: string;
  seasonLabel: string;
  mediaIds: string[];
  consentToken: string;
}

export interface CreativeResult { assetId: string; status: 'queued' | 'ready'; }

export interface AiGateway {
  classifyLifeSignal(signal: LifeSignal): Promise<ClassifiedSignal>;
  generateLifeModeLabel(input: { wantsMore: string[]; wantsLess: string[]; desiredFeeling?: string }): Promise<string>;
  generateSeasonNarrative(input: { traits: TraitVector; evidenceSummaries: string[] }): Promise<string>;
  createFormReveal(input: CreativeRequest): Promise<CreativeResult>;
}

export interface AiGatewayOptions {
  provider: 'stub' | 'openai-compatible';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

const traitKeys = ['explore', 'connect', 'create', 'move', 'build', 'care'] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeWeights(input: unknown) {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const raw = Object.fromEntries(traitKeys.map(key => [key, clamp(Number(source[key]) || 0, 0, 100)])) as Record<(typeof traitKeys)[number], number>;
  const sum = traitKeys.reduce((total, key) => total + raw[key], 0);
  if (sum <= 0) return { explore: 20, connect: 20, create: 15, move: 15, build: 15, care: 15 };
  const normalized = Object.fromEntries(traitKeys.map(key => [key, Math.round((raw[key] / sum) * 100)])) as Record<(typeof traitKeys)[number], number>;
  const drift = 100 - traitKeys.reduce((total, key) => total + normalized[key], 0);
  normalized.explore = clamp(normalized.explore + drift, 0, 100);
  return normalized;
}

export class StubAiGateway implements AiGateway {
  async classifyLifeSignal(signal: LifeSignal): Promise<ClassifiedSignal> {
    return {
      signalId: signal.id,
      weights: { explore: 35, connect: 20, create: 10, move: 15, build: 10, care: 10 },
      confidence: 0.55,
      rationale: 'Development stub only; replace with a reviewed classifier adapter.'
    };
  }
  async generateLifeModeLabel() { return 'EXPAND'; }
  async generateSeasonNarrative() { return 'Your season changed through the moments you chose to count.'; }
  async createFormReveal() { return { assetId: crypto.randomUUID(), status: 'queued' as const }; }
}

class OpenAiCompatibleGateway implements AiGateway {
  constructor(private readonly options: Required<Pick<AiGatewayOptions, 'apiKey'|'baseUrl'|'model'|'timeoutMs'>>) {}

  private async jsonCompletion(system: string, user: string): Promise<Record<string, unknown>> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.options.apiKey}` },
          signal: AbortSignal.timeout(this.options.timeoutMs),
          body: JSON.stringify({
            model: this.options.model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
          })
        });
        if (!response.ok) throw new Error(`ai_http_${response.status}`);
        const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = body.choices?.[0]?.message?.content;
        if (!content) throw new Error('ai_empty_response');
        const parsed = JSON.parse(content) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('ai_invalid_json');
        return parsed as Record<string, unknown>;
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('ai_request_failed');
  }

  async classifyLifeSignal(signal: LifeSignal): Promise<ClassifiedSignal> {
    const result = await this.jsonCompletion(
      'You classify user-approved real-life evidence for SpotAI. Never assign a personality, archetype, diagnosis, moral score or entitlement. Return JSON only with weights for explore, connect, create, move, build, care; confidence 0..1; and a brief factual rationale. Weights express semantic relevance only.',
      JSON.stringify({ description: signal.description, evidenceLevel: signal.evidenceLevel, occurredAt: signal.occurredAt })
    );
    return {
      signalId: signal.id,
      weights: normalizeWeights(result.weights),
      confidence: clamp(Number(result.confidence) || 0.5, 0, 1),
      rationale: String(result.rationale ?? 'Structured AI classification.').slice(0, 280)
    };
  }

  async generateLifeModeLabel(input: { wantsMore: string[]; wantsLess: string[]; desiredFeeling?: string }): Promise<string> {
    const result = await this.jsonCompletion('Return JSON only: {"label":"..."}. Produce one short uppercase 1-3 word Life Mode label. Do not diagnose or judge the user.', JSON.stringify(input));
    const label = String(result.label ?? 'EXPAND').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 28);
    return label || 'EXPAND';
  }

  async generateSeasonNarrative(input: { traits: TraitVector; evidenceSummaries: string[] }): Promise<string> {
    const result = await this.jsonCompletion('Return JSON only: {"narrative":"..."}. Summarize only the supplied structured season facts in <= 80 words. Avoid diagnosis, certainty about personality, shame or invented events.', JSON.stringify(input));
    return String(result.narrative ?? 'Your season changed through the moments you chose to count.').slice(0, 700);
  }

  async createFormReveal(): Promise<CreativeResult> {
    return { assetId: crypto.randomUUID(), status: 'queued' };
  }
}

export function createAiGateway(options: AiGatewayOptions): AiGateway {
  if (options.provider === 'stub') return new StubAiGateway();
  if (!options.apiKey || !options.model) throw new Error('ai_configuration_incomplete');
  return new OpenAiCompatibleGateway({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl ?? 'https://api.openai.com/v1',
    model: options.model,
    timeoutMs: options.timeoutMs ?? 12_000
  });
}

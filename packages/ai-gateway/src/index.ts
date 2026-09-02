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

export class StubAiGateway implements AiGateway {
  async classifyLifeSignal(signal: LifeSignal): Promise<ClassifiedSignal> {
    return {
      signalId: signal.id,
      weights: { explore: 35, connect: 20, create: 10, move: 15, build: 10, care: 10 },
      confidence: 0.55,
      rationale: 'Development stub only; replace with a reviewed classifier adapter.'
    };
  }

  async generateLifeModeLabel(_input: { wantsMore: string[]; wantsLess: string[]; desiredFeeling?: string }): Promise<string> {
    return 'EXPAND';
  }

  async generateSeasonNarrative(_input: { traits: TraitVector; evidenceSummaries: string[] }): Promise<string> {
    return 'Your season changed through the moments you chose to count.';
  }

  async createFormReveal(_input: CreativeRequest): Promise<CreativeResult> {
    return { assetId: crypto.randomUUID(), status: 'queued' };
  }
}

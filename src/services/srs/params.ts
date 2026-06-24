import { generatorParameters, type FSRSParameters } from 'ts-fsrs';

/** User-facing scheduling configuration (persisted in settings later). */
export interface SrsConfig {
  /** Target probability of recall when a card becomes due (0–1). */
  requestRetention: number;
  /** Maximum interval, in days. */
  maximumInterval: number;
  /** Add randomness to intervals to avoid review pile-ups. */
  enableFuzz: boolean;
}

export const DEFAULT_SRS_CONFIG: SrsConfig = {
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years
  enableFuzz: true,
};

/** Translate our config into ts-fsrs parameters (with sane FSRS defaults). */
export function toFsrsParameters(config: SrsConfig = DEFAULT_SRS_CONFIG): FSRSParameters {
  return generatorParameters({
    request_retention: config.requestRetention,
    maximum_interval: config.maximumInterval,
    enable_fuzz: config.enableFuzz,
  });
}

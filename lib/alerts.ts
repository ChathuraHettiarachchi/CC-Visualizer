export interface AlertConfig {
  costThresholdUsd: number;
  errorCountThreshold: number;
}

const STORAGE_KEY = "cc-viz-alert-config";
const DEFAULTS: AlertConfig = { costThresholdUsd: 0.5, errorCountThreshold: 5 };

export function loadAlertConfig(): AlertConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveAlertConfig(config: AlertConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function checkThresholds(
  prev: { cost: number; errors: number },
  curr: { cost: number; errors: number },
  config: AlertConfig
): Array<"cost" | "errors"> {
  const crossed: Array<"cost" | "errors"> = [];
  if (prev.cost < config.costThresholdUsd && curr.cost >= config.costThresholdUsd) crossed.push("cost");
  if (prev.errors < config.errorCountThreshold && curr.errors >= config.errorCountThreshold) crossed.push("errors");
  return crossed;
}

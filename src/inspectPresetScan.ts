import { parseBooleanValue } from './envUtils.js';

export const INSPECT_PRESET_SCAN_ENV = 'OOBEE_INSPECT_PRESET_SCAN';
export const INSPECT_PRESET_METADATA_ENV = 'OOBEE_INSPECT_PRESET_METADATA';

export const resolveInspectPresetScanEnabled = (): boolean => {
  return parseBooleanValue(process.env[INSPECT_PRESET_SCAN_ENV]) ?? false;
};

export interface InspectPresetMetadata {
  siteUrl?: string;
  rsid?: string;
  siteId?: number;
}

// Real site URL etc, since the CLI's -u arg is a downloaded sitemap file path in this mode
export const resolveInspectPresetMetadata = (): InspectPresetMetadata | undefined => {
  if (!resolveInspectPresetScanEnabled()) {
    return undefined;
  }

  const raw = process.env[INSPECT_PRESET_METADATA_ENV];
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as InspectPresetMetadata;
  } catch {
    return undefined;
  }
};

const inspectPresetDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const resolveDateOrToday = (date: Date): Date => {
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
};

export const formatInspectPresetScanDate = (date: Date): string => {
  return inspectPresetDateFormatter.format(resolveDateOrToday(date));
};

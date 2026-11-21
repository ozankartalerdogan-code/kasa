import { t } from './dil.mjs';

export function nodeSurumHatasi(surum) {
  const ana = /^(?:v)?(\d+)\./.exec(surum);
  return ana && Number(ana[1]) >= 24 ? ''
    : t('surum.yetersiz', { surum: surum.startsWith('v') ? surum : `v${surum}` });
}

import { kodluHata } from './dil.mjs';

export function envCoz(metin) {
  const degerler = Object.create(null);
  for (const satir of metin.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!satir.trim() || satir.trimStart().startsWith('#')) continue;
    const eslesme = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(satir.trim());
    if (!eslesme) throw kodluHata('GECERSIZ_ENV_BICIMI');
    let deger = eslesme[2];
    if (deger.startsWith('"') || deger.startsWith("'")) {
      if (deger.length < 2 || !deger.endsWith(deger[0])) throw kodluHata('GECERSIZ_ENV_BICIMI');
      deger = deger.slice(1, -1);
    }
    degerler[eslesme[1]] = deger;
  }
  return degerler;
}

export function envYaz(degerler) {
  return Object.entries(degerler).map(([ad, deger]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ad)) throw kodluHata('GECERSIZ_ENV_ADI');
    if (typeof deger !== 'string' || /[\r\n\u2028\u2029]/u.test(deger)) {
      throw kodluHata('GECERSIZ_ENV_BICIMI');
    }
    if (deger.includes("'") && /["\\$]/.test(deger)) throw kodluHata('GECERSIZ_ENV_BICIMI');
    const tirnak = deger.includes("'") ? '"' : "'";
    return `${ad}=${/^[A-Za-z0-9_\-./:@+,]*$/.test(deger) ? deger : tirnak + deger + tirnak}\n`;
  }).join('');
}

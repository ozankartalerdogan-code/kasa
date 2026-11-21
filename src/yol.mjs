import { realpath, stat } from 'node:fs/promises';
import { resolve, extname, dirname, basename, join, posix } from 'node:path';
import { kodluHata } from './dil.mjs';

export function yolTemizle(metin) {
  let yol = metin.trim();
  if (yol.startsWith('& ')) yol = yol.slice(2);
  if (yol.length >= 2 && (yol[0] === '"' || yol[0] === "'") && yol.at(-1) === yol[0]) {
    const tek = yol[0] === "'";
    yol = yol.slice(1, -1);
    if (tek) yol = yol.replaceAll("''", "'");
  }
  return yol;
}

export async function ayniYol(a, b) {
  const esitle = x => resolve(x).toLowerCase();
  if (esitle(a) === esitle(b)) return true;
  try {
    if (esitle(await realpath(a)) === esitle(await realpath(b))) return true;
    const aa = await stat(a), bb = await stat(b);
    return aa.ino !== 0 && aa.ino === bb.ino && aa.dev === bb.dev;
  } catch (hata) { if (hata.code !== 'ENOENT') throw hata; return false; }
}
function guvenliDosyaAdi(ad) {
  // Her platformda hem Windows hem POSIX yol ayırıcılarını kaldır.
  let sonuc = posix.basename(ad.replaceAll('\\', '/')).replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_')
    .replace(/\.{2,}/g, '_').replace(/[. ]+$/g, '');
  if (!sonuc) sonuc = '_';
  // Windows aygıt adları uzantı eklendiğinde de ayrılmıştır.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:[. ]|$)/i.test(sonuc)) sonuc = `_${sonuc}`;
  return sonuc;
}

export async function cikarHedef(hedef, asilAd, kasa) {
  let klasor = false;
  try { klasor = (await stat(hedef)).isDirectory(); }
  catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
  return sifresizHedef(klasor ? join(hedef, guvenliDosyaAdi(asilAd)) : hedef, kasa);
}

export async function sifresizHedef(hedef, kasa) {
  const tam = resolve(hedef);
  let gercek = tam;
  try { gercek = await realpath(tam); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; gercek = join(await realpath(dirname(tam)), basename(tam)); }
  try { if ((await stat(tam)).isDirectory()) throw kodluHata('HEDEF_KLASOR'); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
  const kasaYollari = [resolve(kasa)];
  try { kasaYollari.push(await realpath(kasa)); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
  for (const yol of [tam, gercek]) {
    if (extname(yol).toLowerCase() === '.age' || kasaYollari.some(k => {
      const a = yol.toLowerCase(), b = k.toLowerCase();
      return a === b || a === `${b}.bak` || a === `${b}.kilit` || a === `${b}.tmp` || a.startsWith(`${b}.tmp.`);
    })) throw kodluHata('SIFRESIZ_HEDEF_YASAK');
  }
  if (await ayniYol(tam, kasa) || await ayniYol(tam, `${kasa}.bak`) || await ayniYol(tam, `${kasa}.kilit`)) throw kodluHata('SIFRESIZ_HEDEF_YASAK');
  return tam;
}

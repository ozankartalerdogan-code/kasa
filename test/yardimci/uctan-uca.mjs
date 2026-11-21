import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { calistir } from '../../src/cli.mjs';
import { OturumSonu } from '../../src/gizli-girdi.mjs';
import { etkinDil, dilAyarla } from '../../src/dil.mjs';
import { PanoOturumu } from '../../src/pano-oturumu.mjs';

export const SIFRE = 'deneme-ana-sifre-uctan-uca';
export const YENI = 'deneme-ana-sifre-yeni-uctan-uca';
export const NOT = 'yalniz-gizli-not-ğüç';
export const DEGER = 'yalniz-gizli-anahtar-123';
export const PAROLA = 'yalniz-gizli-hesap-parolasi-456';
export const sha = veri => createHash('sha256').update(veri).digest('hex');
export const kur = ['1', SIFRE, SIFRE];
export const anahtar = (ad = 'İstanbul ışık', deger = DEGER) => ['5', ad, '1', 'İş', NOT, deger];
let testGizlileri = new Set();

// Global ortam ve çıktı yakalama nedeniyle bu dosyayı kullanan testler sıralıdır.
export async function ortam(t) {
  const kok = await mkdtemp(join(tmpdir(), 'kasa-uctan-uca-'));
  const adlar = ['KASA_DOSYA', 'LOCALAPPDATA', 'USERPROFILE', 'KASA_DIL'];
  const once = adlar.map(ad => [ad, process.env[ad]]), dil = etkinDil();
  const oncekiGizliler = testGizlileri; testGizlileri = new Set();
  Object.assign(process.env, { KASA_DOSYA: join(kok, 'kasa.age'),
    LOCALAPPDATA: join(kok, 'yerel'), USERPROFILE: join(kok, 'profil'), KASA_DIL: '' });
  t.after(async () => {
    for (const [ad, deger] of once) {
      if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger;
    }
    dilAyarla(dil);
    testGizlileri = oncekiGizliler;
    await rm(kok, { recursive: true, force: true });
  });
  return { kok, yol: process.env.KASA_DOSYA };
}

// Eşdeğer sahte Girdi: cevapları ekrana yansıtmaz; her gerçek soruyu kaydeder.
// CLI işlem hatalarını yakaladığı için sürücü hatalarını ayrıca dışarı taşırız.
export async function sur(adimlar, { gizliler = [], acik = [], secenekler = {} } = {}) {
  const satirlar = [], sorular = [], kopyalar = [], zamanlar = [], temizlenen = [], son = [];
  const bekleyen = [...adimlar];
  let surucuHatasi, kapandi = false;
  const pano = new PanoOturumu({
    temizle: async isaret => { temizlenen.push(isaret); return 'TEMIZLENDI'; },
    sonDene: isaret => { son.push(isaret); return 'TEMIZLENDI'; },
    zamanla: (is, ms) => { const zaman = { is, ms, iptal: false }; zamanlar.push(zaman); return zaman; },
    iptal: zaman => { if (zaman) zaman.iptal = true; }
  });
  const durum = { satirlar, sorular, kopyalar, zamanlar, temizlenen, son,
    get ekran() { return satirlar.join('\n'); } };
  const log = console.log, warn = console.warn, error = console.error;
  const yaz = process.stdout.write, hataYaz = process.stderr.write;
  const argv = process.argv, kod = process.exitCode;
  try {
    process.argv = process.argv.slice(0, 2); process.exitCode = 0;
    console.log = console.warn = console.error = (...x) => satirlar.push(x.join(' '));
    process.stdout.write = process.stderr.write = x => { satirlar.push(String(x)); return true; };
    await calistir({ secenekler: { isFaktoru: 4, ...secenekler }, pano,
      panoyaYaz: async deger => { kopyalar.push(deger); return `sahte-pano-${kopyalar.length}`; },
      girdiOlustur: () => ({
        async sor(mesaj, gizli) {
          sorular.push({ mesaj, gizli: Boolean(gizli) }); satirlar.push(mesaj);
          try {
            while (typeof bekleyen[0] === 'function') await bekleyen.shift()(durum);
            assert.ok(bekleyen.length, `Beklenmeyen soru: ${mesaj}`);
            const adim = bekleyen.shift();
            if (Array.isArray(adim)) {
              assert.match(mesaj, adim[0]);
              if (gizli && adim[1]) testGizlileri.add(adim[1]);
              return adim[1];
            }
            assert.equal(typeof adim, 'string');
            if (gizli && adim) testGizlileri.add(adim);
            return adim;
          } catch (hata) {
            surucuHatasi = hata; throw new OturumSonu('Test sürücüsü durdu');
          }
        }, kapat() { kapandi = true; }
      }) });
    durum.kod = process.exitCode;
  } finally {
    console.log = log; console.warn = warn; console.error = error;
    process.stdout.write = yaz; process.stderr.write = hataYaz;
    process.argv = argv; process.exitCode = kod;
  }
  if (surucuHatasi) throw surucuHatasi;
  assert.equal(bekleyen.length, 0, 'Tüm klavye girdileri tüketilmeli');
  assert.ok(kapandi, 'Girdi kapatılmalı');
  for (const gizli of new Set([SIFRE, YENI, NOT, DEGER, PAROLA, ...testGizlileri, ...gizliler, ...kopyalar])) {
    if (gizli && !acik.includes(gizli)) assert.ok(!durum.ekran.includes(gizli), 'Gizli değer ekrana sızmamalı');
  }
  return durum;
}

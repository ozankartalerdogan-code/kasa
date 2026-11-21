import { createHash } from 'node:crypto';
import { kodluHata } from './dil.mjs';

export function yeniKasa() {
  const tarih = new Date().toISOString();
  return { semaSurumu: 1, olusturmaTarihi: tarih, guncellemeTarihi: tarih, kayitlar: [], dosyalar: [] };
}

const nesne = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const metin = x => typeof x === 'string';
const tarih = x => metin(x) && Number.isFinite(Date.parse(x));
const zorunlu = durum => { if (!durum) throw kodluHata('GECERSIZ_SEMA'); };

// Sürüm 1 içindeki eski kayıtlara kategori eklenir. Gelecek sürümler burada göç ettirilir.
export function dogrulaVeGoc(veri) {
  zorunlu(nesne(veri) && veri.semaSurumu === 1);
  zorunlu(Array.isArray(veri.kayitlar) && Array.isArray(veri.dosyalar));
  const kasa = structuredClone(veri);
  zorunlu(tarih(kasa.olusturmaTarihi) && tarih(kasa.guncellemeTarihi));
  const kimlikler = new Set();
  for (const grup of [kasa.kayitlar, kasa.dosyalar]) {
    const adlar = new Set();
    for (const oge of grup) {
      zorunlu(nesne(oge));
      if (oge.kategori === undefined) oge.kategori = 'Genel';
      zorunlu(metin(oge.id) && oge.id.length > 0 && !kimlikler.has(oge.id));
      zorunlu(metin(oge.ad) && oge.ad.trim().length > 0 && !adlar.has(oge.ad));
      zorunlu(metin(oge.kategori) && metin(oge.not) && tarih(oge.guncellemeTarihi));
      kimlikler.add(oge.id); adlar.add(oge.ad);
    }
  }
  for (const kayit of kasa.kayitlar) {
    zorunlu(['anahtar', 'hesap', 'env'].includes(kayit.tur));
    if (kayit.tur === 'anahtar') zorunlu(metin(kayit.deger));
    if (kayit.tur === 'hesap') zorunlu(metin(kayit.kullanici) && metin(kayit.parola) && metin(kayit.adres));
    if (kayit.tur === 'env') zorunlu(nesne(kayit.degerler) && Object.values(kayit.degerler).every(metin));
  }
  let toplam = 0;
  for (const dosya of kasa.dosyalar) {
    zorunlu(Number.isSafeInteger(dosya.boyutBayt) && dosya.boyutBayt >= 0 && dosya.boyutBayt <= 25 * 1024 * 1024);
    toplam += dosya.boyutBayt; zorunlu(toplam <= 100 * 1024 * 1024);
    zorunlu(metin(dosya.icerikBase64) && dosya.icerikBase64.length === Math.ceil(dosya.boyutBayt / 3) * 4);
    zorunlu(metin(dosya.icerikBase64) && metin(dosya.sha256) && /^[a-f0-9]{64}$/.test(dosya.sha256));
    const ham = Buffer.from(dosya.icerikBase64, 'base64');
    try {
      zorunlu(ham.toString('base64') === dosya.icerikBase64);
      zorunlu(Number.isSafeInteger(dosya.boyutBayt) && ham.length === dosya.boyutBayt);
      zorunlu(createHash('sha256').update(ham).digest('hex') === dosya.sha256);
    } finally { ham.fill(0); }
  }
  return kasa;
}

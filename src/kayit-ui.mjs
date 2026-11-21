import { randomUUID } from 'node:crypto';
import { sinirliOku } from './kasa.mjs';
import { envCoz } from './env.mjs';
import { sifreUret } from './uret.mjs';
import { yolTemizle } from './yol.mjs';
import { etkinDil, kodluHata, t } from './dil.mjs';
import { tarihBicimle } from './tarih.mjs';

export const evet = metin => {
  const temiz = metin.trim().toLocaleLowerCase('tr');
  return temiz === 'evet' || temiz === 'yes';
};
export const guvenli = metin => String(metin).replace(/[\x00-\x1f\x7f-\x9f]/g, harf => `\\u${harf.charCodeAt(0).toString(16).padStart(4, '0')}`);
export function numaraylaSec(ogeler, metin) {
  const sayi = metin.trim();
  const oge = /^[1-9]\d*$/.test(sayi) ? ogeler[Number(sayi) - 1] : undefined;
  if (!oge) throw kodluHata('GECERSIZ_SECIM');
  return oge;
}
export async function kayitSor(sor, ad, eski) {
  const mesaj = alan => t(`kayit.${eski ? alan : `yeni.${alan}`}`);
  const turGirdisi = (await sor(mesaj('turSor'))).trim();
  const tur = turGirdisi === '' && eski ? eski.tur : { '1': 'anahtar', '2': 'hesap', '3': 'env' }[turGirdisi];
  if (!tur) throw kodluHata('GECERSIZ_SECIM');
  const koru = eski?.tur === tur ? eski : undefined;
  const alan = async (mesaj, gizli, onceki = '') => (await sor(mesaj, gizli)) || onceki;
  const kayit = { id: eski?.id ?? randomUUID(), ad, tur,
    kategori: (await sor(mesaj('kategoriSor'))).trim() || eski?.kategori || t('ortak.varsayilanKategori'),
    not: await alan(mesaj('notSor'), true, eski?.not), guncellemeTarihi: new Date().toISOString() };
  let uretilenParola;
  if (tur === 'anahtar') kayit.deger = await alan(mesaj('degerSor'), true, koru?.deger);
  if (tur === 'hesap') {
    kayit.kullanici = await alan(mesaj('kullaniciSor'), false, koru?.kullanici);
    kayit.parola = await sor(t(koru ? 'kayit.parolaKoruSor' : 'kayit.parolaUretSor'), true);
    if (!kayit.parola) {
      if (koru && !evet(await sor(t('kayit.yeniParolaOnay')))) kayit.parola = koru.parola;
      else kayit.parola = uretilenParola = sifreUret();
    }
    kayit.adres = await alan(mesaj('adresSor'), false, koru?.adres);
  }
  if (tur === 'env') {
    const yol = yolTemizle(await sor(t('kayit.envYolSor')));
    kayit.degerler = Object.assign(Object.create(null), koru?.degerler);
    if (yol) {
      if (koru && !evet(await sor(t('kayit.envDegistirOnay')))) return;
      const ham = await sinirliOku(yol, 1024 * 1024);
      try { kayit.degerler = envCoz(ham.toString('utf8')); } finally { ham.fill(0); }
    } else {
      while (true) {
        const ad = (await sor(t('kayit.envAdSor'))).trim();
        if (!ad) break;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ad)) throw kodluHata('GECERSIZ_ENV_ADI');
        kayit.degerler[ad] = await alan(mesaj('envDegerSor'), true, kayit.degerler[ad]);
      }
      if (koru) while (true) {
        const ad = (await sor(t('kayit.envSilSor'))).trim();
        if (!ad) break;
        delete kayit.degerler[ad];
      }
    }
  }
  return { kayit, uretilenParola };
}

export async function kartGoster(oge, dosya, sor, yaz, temizle) {
  const satir = (ad, deger) => yaz(`${ad}: ${guvenli(deger)}`);
  satir(t('kart.ad'), oge.ad);
  satir(t('kart.tur'), t(dosya ? 'tur.dosya' : `tur.${oge.tur}`));
  satir(t('kart.kategori'), oge.kategori);
  if (dosya) {
    satir(t('kart.boyut'), t('kart.boyutDeger', { boyut: oge.boyutBayt }));
    satir(t('kart.sha256'), oge.sha256);
  }
  if (oge.tur === 'hesap') { satir(t('kart.kullanici'), oge.kullanici); satir(t('kart.adres'), oge.adres); }
  satir(t('kart.guncelleme'), tarihBicimle(oge.guncellemeTarihi, etkinDil()));
  const gizli = [];
  if (oge.tur === 'anahtar') gizli.push([t('kart.deger'), oge.deger]);
  if (oge.tur === 'hesap') gizli.push([t('kart.parola'), oge.parola]);
  if (oge.tur === 'env') gizli.push(...Object.entries(oge.degerler));
  gizli.push([t('kart.not'), oge.not]);
  gizli.forEach(([ad], i) => satir(`${i + 1}) ${ad}`, t('kart.gizli')));
  try {
    const secim = (await sor(t('kart.alanSecSor'))).trim();
    if (secim) { const [ad, deger] = numaraylaSec(gizli, secim); satir(ad, deger); }
    await sor(t('kart.temizleSor'));
  } finally { temizle(); }
}

#!/usr/bin/env node
import { stat, unlink, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gocHazirla } from './goc.mjs';
import { evet, guvenli, numaraylaSec, kayitSor, kartGoster } from './kayit-ui.mjs';
import { kasaYolu, oturumOku, kaydet, dosyaHazirla, dosyaCikar, sifreDegistir, yedekAl, dogrula, sifresizYaz } from './kasa.mjs';
import { yeniKasa } from './sema.mjs';
import { Girdi, OturumSonu } from './gizli-girdi.mjs';
import { envYaz } from './env.mjs';
import { ara, kategoriyeGore, kategoriler } from './arama.mjs';
import { sifreUret } from './uret.mjs';
import { panoyaKopyala } from './pano-win.mjs';
import { PanoOturumu } from './pano-oturumu.mjs';
import { yolTemizle, sifresizHedef, cikarHedef, ayniYol } from './yol.mjs';
import {
  bilinenHataKodu, dilAyarla, dilAyarOku, dilAyarYaz, dilSor,
  kodluHata, ortamDili, t, varsayilanDil
} from './dil.mjs';

const temizle = () => process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
async function varMi(yol) {
  try { await stat(yol); return true; } catch (hata) { if (hata.code === 'ENOENT') return false; throw hata; }
}
function hataMetni(hata) {
  if (hata?.code === 'EEXIST') return t('hata.fs.EEXIST');
  if (hata?.code === 'ENOENT') return t('hata.fs.ENOENT');
  if (['EACCES', 'EPERM'].includes(hata?.code)) return t('hata.fs.IZIN');
  if (hata?.code === 'ENOSPC') return t('hata.fs.ENOSPC');
  if (hata?.code) return t('hata.fs.GENEL');
  // Yalnız uygulamanın sabit mesajları gösterilir; kütüphane hataları veri içerebilir.
  return bilinenHataKodu(hata?.kod) ? t(`hata.${hata.kod}`) : t('hata.GENEL');
}
export async function calistir({ girdiOlustur = () => new Girdi(), secenekler = {},
  pano = new PanoOturumu(), panoyaYaz = panoyaKopyala } = {}) {
let girdi, sifre, kasa, beklenenOzet, kilidiBirak;
let sonuc = '';
dilAyarla(ortamDili() ?? varsayilanDil());
try {
  const ayar = await dilAyarOku(kasaYolu());
  if (ayar.dil) dilAyarla(ayar.dil);
  if (process.argv.length > 2) throw kodluHata('GECERSIZ_SECIM');
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(t('acilis.surum', { surum: version }));
  girdi = girdiOlustur();
  const sor = (mesaj, gizli = false) => girdi.sor(mesaj, gizli);
  if (!ayar.dil) {
    const secilen = await dilSor(sor);
    await dilAyarYaz(kasaYolu(), secilen);
    dilAyarla(secilen);
  }
  const onay = async mesaj => evet(await sor(mesaj));
  const hazir = await gocHazirla(sor);
  const yol = hazir.yol;
  kilidiBirak = hazir.kilidiBirak;
  const yeniSifreSor = async eskiSifre => {
    console.log(t('sifre.ipucu'));
    while (true) {
      const yeni = await sor(t('sifre.yeni'), true);
      const tekrar = await sor(t('sifre.tekrar'), true);
      if (Array.from(yeni).length < 12) { console.log(t('hata.KISA_SIFRE')); continue; }
      if (yeni !== tekrar) { console.log(t('sifre.uyusmuyor')); continue; }
      if (yeni === eskiSifre) { console.log(t('hata.AYNI_SIFRE')); continue; }
      return yeni;
    }
  };
  const ozetYaz = bilgi => {
    console.log(t('ozet.boyutSema', { boyut: bilgi.boyutBayt, sema: bilgi.semaSurumu }));
    console.log(t('ozet.guncelleme', { tarih: guvenli(bilgi.guncellemeTarihi) }));
    console.log(t('ozet.sha256', { sha256: bilgi.sha256 }));
  };
  const kopyala = async deger => {
    if (girdi.hata) throw girdi.hata;
    try { pano.izle(await panoyaYaz(deger)); }
    catch (hata) { if (hata.panoIsareti) pano.izle(hata.panoIsareti, 5000, false); throw hata; }
    if (girdi.hata) throw girdi.hata;
    console.log(t('pano.kopyalandi'));
  };
  const zorunluAd = async mesaj => {
    const ad = (await sor(mesaj)).trim();
    if (!ad) throw kodluHata('AD_BOS');
    return ad;
  };
  const zorunluYol = async mesaj => {
    const yol = yolTemizle(await sor(mesaj));
    if (!yol) throw kodluHata('YOL_BOS');
    return yol;
  };
  const listele = (ogeler, dosya = false) => {
    if (!ogeler.length) console.log(t('hata.OGE_YOK'));
    ogeler.forEach((oge, i) => console.log(`${i + 1}) ${guvenli(oge.ad)} | ${t(`turKisa.${dosya ? 'dosya' : oge.tur}`)} | ${guvenli(oge.kategori)}`));
  };
  const sec = async (ogeler, dosya = false) => {
    if (!ogeler.length) throw kodluHata('OGE_YOK');
    listele(ogeler, dosya);
    return numaraylaSec(ogeler, await sor(t('liste.numaraSor')));
  };
  if (hazir.kasa) {
    ({ kasa, sifre, beklenenOzet } = hazir);
  } else if (await varMi(yol)) {
    for (let deneme = 1; ; deneme++) {
      sifre = await sor(t('giris.anaSifre'), true);
      try { ({ kasa, beklenenOzet } = await oturumOku(yol, sifre)); break; } catch (hata) {
        if (hata.kod !== 'YANLIS_SIFRE' || deneme >= 3) throw hata;
        console.log(t('giris.yanlisKalan', { mesaj: hataMetni(hata), kalan: 3 - deneme }));
      }
    }
  } else {
    console.log(t('kasa.yeni1'));
    console.log(t('kasa.yeni2'));
    sifre = await yeniSifreSor();
    kasa = yeniKasa(); beklenenOzet = await kaydet(yol, kasa, sifre, { ...secenekler, beklenenOzet: null });
  }
  while (true) {
    console.log(t('menu.liste'));
    const islem = (await sor(t('ortak.seciminiz'))).trim();
    if (islem === '0') break; // Her değişiklik zaten kalıcı olarak kaydedilmiştir.
    let aday, uretilenParola;
    try {
      if (islem === '1') {
        const liste = kategoriler([...kasa.kayitlar, ...kasa.dosyalar]).map(guvenli).join(', ') || t('islem1.henuzYok');
        console.log(t('islem1.kategoriler', { liste }));
        const kategori = (await sor(t('islem1.kategoriSor'))).trim();
        listele(kategoriyeGore(kasa.kayitlar, kategori));
        console.log(t('ortak.dosyalarBaslik')); listele(kategoriyeGore(kasa.dosyalar, kategori), true);
      } else if (islem === '2') {
        const metin = await sor(t('islem2.aranacak'));
        listele(ara(kasa.kayitlar, metin));
        console.log(t('ortak.dosyalarBaslik')); listele(ara(kasa.dosyalar, metin), true);
      } else if (islem === '3') {
        const tur = (await sor(t('ortak.kayitVeyaDosya'))).trim();
        const ogeler = { '1': kasa.kayitlar, '2': kasa.dosyalar }[tur];
        if (!ogeler) throw kodluHata('GECERSIZ_SECIM');
        if (!ogeler.length) { console.log(t(tur === '2' ? 'ortak.henuzDosyaYok' : 'ortak.henuzKayitYok')); continue; }
        await kartGoster(await sec(ogeler, tur === '2'), tur === '2', sor, console.log, temizle);
      } else if (islem === '4') {
        if (!kasa.kayitlar.length) { console.log(t('ortak.henuzKayitYok')); continue; }
        const kayit = await sec(kasa.kayitlar);
        console.log(t('islem4.secilen', { ad: guvenli(kayit.ad) }));
        if (kayit.tur === 'anahtar') await kopyala(kayit.deger);
        else if (kayit.tur === 'hesap') {
          const alan = { '1': 'parola', '2': 'kullanici' }[(await sor(t('islem4.alanSor'))).trim()];
          if (!alan) throw kodluHata('GECERSIZ_SECIM');
          await kopyala(kayit[alan]);
        } else {
          const degisken = await sec(Object.keys(kayit.degerler).map(ad => ({ ad, tur: 'degisken', kategori: '' })));
          await kopyala(kayit.degerler[degisken.ad]);
        }
      } else if (islem === '5') {
        const ad = await zorunluAd(t('islem5.adSor'));
        const eski = kasa.kayitlar.find(x => x.ad === ad);
        if (eski && !await onay(t('islem5.guncelleOnay'))) continue;
        const sonuc = await kayitSor(sor, ad, eski);
        if (!sonuc) continue;
        const { kayit } = sonuc; uretilenParola = sonuc.uretilenParola;
        aday = structuredClone(kasa);
        aday.kayitlar = aday.kayitlar.filter(x => x.id !== kayit.id); aday.kayitlar.push(kayit);
      } else if (islem === '6') {
        const kaynak = await zorunluYol(t('islem6.yolSor'));
        const kategori = (await sor(t('islem6.kategoriSor'))).trim();
        const dosya = await dosyaHazirla(kaynak, kategori || t('ortak.varsayilanKategori'), await sor(t('islem6.notSor'), true),
          kasa.dosyalar.reduce((toplam, x) => toplam + x.boyutBayt, 0));
        if (kasa.dosyalar.some(x => x.ad === dosya.ad)) throw kodluHata('DOSYA_ZATEN_VAR');
        aday = structuredClone(kasa); aday.dosyalar.push(dosya);
      } else if (islem === '7') {
        if (!kasa.dosyalar.length) { console.log(t('ortak.henuzDosyaYok')); continue; }
        const dosya = await sec(kasa.dosyalar, true);
        const hedef = await cikarHedef(await zorunluYol(t('islem7.hedefSor')), dosya.ad, yol);
        console.log(t('ortak.sifresizUyari', { hedef: guvenli(hedef) }));
        let uzerineYaz = false;
        if (await varMi(hedef)) {
          if (!await onay(t('ortak.uzerineYazOnay'))) continue;
          uzerineYaz = true;
        }
        await sifresizHedef(hedef, yol);
        if (girdi.hata) throw girdi.hata;
        await dosyaCikar(dosya, hedef, { uzerineYaz }); console.log(t('islem7.cikarildi'));
      } else if (islem === '8') {
        const envKayitlari = kasa.kayitlar.filter(x => x.tur === 'env');
        if (!envKayitlari.length) { console.log(t('islem8.envYok')); continue; }
        const kayit = await sec(envKayitlari);
        const hedef = await cikarHedef(await zorunluYol(t('islem8.hedefSor')), `${kayit.ad}.env`, yol);
        console.log(t('ortak.sifresizUyari', { hedef: guvenli(hedef) }));
        let uzerineYaz = false;
        if (await varMi(hedef)) {
          if (!await onay(t('ortak.uzerineYazOnay'))) continue;
          uzerineYaz = true;
        }
        const ham = Buffer.from(envYaz(kayit.degerler), 'utf8');
        try {
          if (girdi.hata) throw girdi.hata;
          await sifresizHedef(hedef, yol);
          await sifresizYaz(hedef, ham, { uzerineYaz });
        } finally { ham.fill(0); }
        console.log(t('islem8.uyari'));
      } else if (islem === '9') {
        const tur = (await sor(t('ortak.kayitVeyaDosya'))).trim();
        const alan = { '1': 'kayitlar', '2': 'dosyalar' }[tur];
        if (!alan) throw kodluHata('GECERSIZ_SECIM');
        const oge = await sec(kasa[alan], tur === '2');
        if (!await onay(t('islem9.silOnay', { ad: guvenli(oge.ad) }))) continue;
        aday = structuredClone(kasa); aday[alan] = aday[alan].filter(x => x.id !== oge.id);
      } else if (islem === '10') {
        const uzunluk = (await sor(t('islem10.uzunlukSor'))).trim();
        await kopyala(sifreUret(uzunluk === '' ? 24 : (/^\d+$/.test(uzunluk) ? Number(uzunluk) : NaN)));
      } else if (islem === '11') {
        if (await sor(t('islem11.mevcutSifre'), true) !== sifre) throw kodluHata('MEVCUT_SIFRE_YANLIS');
        const yeniSifre = await yeniSifreSor(sifre);
        if (girdi.hata) throw girdi.hata;
        try {
          kasa = await sifreDegistir(yol, sifre, yeniSifre,
            { ...secenekler, beklenenOzet, ozetBildir: ozet => { beklenenOzet = ozet; } });
        }
        catch (hata) {
          if (hata.kod === 'DOGRULANAMADI') {
            throw new OturumSonu(t('hata.DOGRULANAMADI'), 'DOGRULANAMADI');
          }
          throw hata;
        }
        sifre = yeniSifre;
        if (girdi.hata) throw girdi.hata;
        console.log(t('islem11.degisti'));
        console.log(t('islem11.eskiBakUyari', { yol: guvenli(`${yol}.bak`) }));
        console.log(t('islem11.bulutUyari'));
        console.log(t('islem11.kagidaYaz'));
        if (await onay(t('islem11.bakSilOnay', { yol: guvenli(`${yol}.bak`) }))) {
          await unlink(`${yol}.bak`); console.log(t('islem11.bakSilindi'));
        }
      } else if (islem === '12') {
        const hedef = yolTemizle(await sor(t('islem12.hedefSor')));
        if (girdi.hata) throw girdi.hata;
        const bilgi = await yedekAl(yol, sifre, hedef || dirname(yol));
        if (girdi.hata) throw girdi.hata;
        console.log(t('islem12.yedekAlindi', { yol: guvenli(bilgi.yol) }));
        ozetYaz(bilgi);
      } else if (islem === '13') {
        const hedef = yolTemizle(await sor(t('islem13.hedefSor')));
        let bilgi;
        try { bilgi = await dogrula(hedef || yol, sifre); }
        catch (hata) {
          if (hata.kod !== 'YANLIS_SIFRE') throw hata;
          if (!await onay(t('islem13.eskiSifreOnay'))) continue;
          bilgi = await dogrula(hedef || yol, await sor(t('islem13.dosyaSifreSor'), true));
        }
        if (girdi.hata) throw girdi.hata;
        console.log(t(await ayniYol(hedef || yol, yol) ? 'islem13.mevcutSaglam' : 'islem13.yedekSaglam', {
          yol: guvenli(resolve(hedef || yol)),
          kayitSayisi: bilgi.kayitSayisi,
          dosyaSayisi: bilgi.dosyaSayisi
        }));
        ozetYaz(bilgi);
      } else if (islem === '14') {
        const secilen = await dilSor(sor);
        await dilAyarYaz(kasaYolu(), secilen);
        dilAyarla(secilen);
      } else throw kodluHata('GECERSIZ_SECIM');
      if (aday) {
        if (girdi.hata) throw girdi.hata;
        aday.guncellemeTarihi = new Date().toISOString();
        beklenenOzet = await kaydet(yol, aday, sifre, { ...secenekler, beklenenOzet }); kasa = aday; console.log(t('ortak.kaydedildi'));
        if (uretilenParola && await onay(t('ortak.parolaKopyalaOnay'))) await kopyala(uretilenParola);
      }
      if (girdi.hata) throw girdi.hata;
    } catch (hata) {
      if (hata instanceof OturumSonu) throw hata;
      console.log(hataMetni(hata));
    }
  }
} catch (hata) {
  if (hata instanceof OturumSonu) { sonuc = hata.kod ? t(`hata.${hata.kod}`) : hata.message; if (hata.ayrinti) sonuc = hata.ayrinti + '\n' + sonuc; if (sonuc) process.exitCode = 2; }
  else { sonuc = hataMetni(hata); process.exitCode = 1; }
  if (hata.kilitUyarisi) sonuc += '\n' + t('kilit.kaldirilamadi');
} finally {
  if (pano.bitir() === 'HATA') {
    sonuc = [sonuc, t('pano.temizlenemedi')].filter(Boolean).join('\n');
    process.exitCode ||= 2;
  }
  try { await kilidiBirak?.(); }
  catch { sonuc = [sonuc, t('kilit.kaldirilamadi')].filter(Boolean).join('\n'); process.exitCode ||= 2; }
  sifre = undefined; kasa = undefined; girdi?.kapat(); temizle();
  if (sonuc) { process.exitCode ||= 2; console.log(sonuc); }
}
}
// Paket ve kasa.cmd, bağımlılıklardan önce denetim yapan baslat.mjs kullanır.
if (process.argv[1] && resolve(process.argv[1]) === (await import('node:url')).fileURLToPath(import.meta.url)) {
  const { baslangicDiliHazirla } = await import('./dil.mjs');
  baslangicDiliHazirla();
  const { nodeSurumHatasi } = await import('./surum.mjs');
  const hata = nodeSurumHatasi(process.version);
  if (hata) { console.error(hata); process.exitCode = 1; }
  else await calistir();
}

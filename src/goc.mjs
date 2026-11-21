import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { kasaYolu, oturumOku, ozet, sinirliOku } from './kasa.mjs';
import { kilitAl } from './kilit.mjs';
import { evet, guvenli } from './kayit-ui.mjs';
import { OturumSonu } from './gizli-girdi.mjs';
import { etkinDil, kodluHata, t } from './dil.mjs';
import { tarihBicimle } from './tarih.mjs';

async function bilgi(yol) {
  try { return await lstat(yol); }
  catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
}

// wx mevcut hedefi ezmeden kopya oluşturur.
export async function gocKopyala(eski, yeni, sifre) {
  const oturum = await oturumOku(eski, sifre);
  const veri = await sinirliOku(eski);
  if (ozet(veri) !== oturum.beklenenOzet) throw kodluHata('GOC_ESKI_DEGISTI');
  await mkdir(dirname(yeni), { recursive: true, mode: 0o700 });
  let dosya, olustu = false, tamam = false;
  try {
    dosya = await open(yeni, 'wx', 0o600); olustu = true;
    await dosya.writeFile(veri); await dosya.sync(); await dosya.close(); dosya = undefined;
    const kopya = await oturumOku(yeni, sifre);
    if (kopya.beklenenOzet !== oturum.beklenenOzet || ozet(await sinirliOku(eski)) !== oturum.beklenenOzet) throw kodluHata('GOC_DOGRULAMA');
    tamam = true; return kopya;
  } finally {
    await dosya?.close();
    if (olustu && !tamam) await unlink(yeni);
  }
}

export async function gocHazirla(sor, yaz = console.log) {
  const yeni = resolve(kasaYolu());
  const eski = process.env.USERPROFILE && resolve(join(process.env.USERPROFILE, 'Kasa', 'kasa.age'));
  const onay = async mesaj => evet(await sor(mesaj));
  const kilitler = [];
  const birak = async () => { let ilk; for (const kilit of kilitler.splice(0).reverse()) { try { await kilit(); } catch (hata) { ilk ||= hata; } } if (ilk) throw ilk; };
  const al = async yol => {
    const kilit = await kilitAl(yol, onay);
    if (!kilit) throw new OturumSonu(t('hata.KASA_ACILMADI'), 'KASA_ACILMADI');
    kilitler.push(kilit);
  };
  try {
    if (!process.env.KASA_DOSYA && eski && eski.toLowerCase() !== yeni.toLowerCase() && await bilgi(eski)) {
      const cakisma = async () => {
        const a = await bilgi(eski), b = await bilgi(yeni);
        if (!a || !b) return;
        const ayrinti = [t('goc.ikiKonum')];
        yaz(ayrinti[0]);
        for (const [yol, veri] of [[eski, a], [yeni, b]]) {
          const satir = t('goc.dosyaBilgi', { yol: guvenli(yol), boyut: veri.size, tarih: tarihBicimle(veri.mtime, etkinDil()) }); ayrinti.push(satir); yaz(satir);
        }
        const hata = new OturumSonu(t('hata.GOC_CAKISMA'), 'GOC_CAKISMA'); hata.ayrinti = ayrinti.join('\n'); throw hata;
      };
      await cakisma();
      yaz(t('goc.eskiKonum', { yol: guvenli(eski) }));
      yaz(t('goc.yeniKonum', { yol: guvenli(yeni) }));
      yaz(t('goc.secenekler'));
      const secim = (await sor(t('ortak.seciminiz'))).trim();
      if (!['1', '2'].includes(secim)) throw kodluHata('GECERSIZ_SECIM');
      await al(eski);
      await cakisma();
      if (secim === '2') return { yol: eski, kilidiBirak: birak };
      await al(yeni);
      await cakisma();
      let sifre;
      for (let deneme = 1; ; deneme++) {
        sifre = await sor(t('giris.anaSifre'), true);
        try { await oturumOku(eski, sifre); break; }
        catch (hata) {
          if (hata.kod !== 'YANLIS_SIFRE' || deneme >= 3) throw hata;
          yaz(t('giris.yanlisKalan', { mesaj: t('hata.YANLIS_SIFRE'), kalan: 3 - deneme }));
        }
      }
      const oturum = await gocKopyala(eski, yeni, sifre);
      yaz(t('goc.dogrulandi'));
      if (await onay(t('goc.eskiSilOnay', { yol: guvenli(`${eski}.bak`) }))) {
        try {
          const son = await oturumOku(yeni, sifre);
          if (son.beklenenOzet !== oturum.beklenenOzet) throw new Error();
        } catch { throw kodluHata('GOC_DOGRULAMA'); }
        if (ozet(await sinirliOku(eski)) !== oturum.beklenenOzet) throw kodluHata('GOC_ESKI_DEGISTI');
        await unlink(eski);
        await unlink(`${eski}.bak`).catch(hata => { if (hata.code !== 'ENOENT') throw hata; });
      } else yaz(t('goc.eskiSaklandi'));
      await kilitler[0](); kilitler.shift();
      return { yol: yeni, sifre, ...oturum, kilidiBirak: birak };
    }
    await al(yeni);
    return { yol: yeni, kilidiBirak: birak };
  } catch (hata) { try { await birak(); } catch { hata.kilitUyarisi = true; } throw hata; }
}

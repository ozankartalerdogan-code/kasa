import { Encrypter, Decrypter } from 'age-encryption';
import { mkdir, open, rename, unlink, stat } from 'node:fs/promises';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { dirname, join, basename, resolve } from 'node:path';
import { dogrulaVeGoc } from './sema.mjs';
import { kodluHata, t } from './dil.mjs';

export function kasaYolu() {
  if (process.env.KASA_DOSYA) return process.env.KASA_DOSYA;
  if (process.env.LOCALAPPDATA) return join(process.env.LOCALAPPDATA, 'kasa', 'kasa.age');
  if (!process.env.USERPROFILE) throw kodluHata('KULLANICI_KLASORU_YOK');
  return join(process.env.USERPROFILE, 'AppData', 'Local', 'kasa', 'kasa.age');
}
export async function sifrele(kasa, sifre, { isFaktoru } = {}) {
  const veri = Buffer.from(JSON.stringify(dogrulaVeGoc(kasa)), 'utf8');
  try {
    const age = new Encrypter();
    age.setPassphrase(sifre);
    if (isFaktoru !== undefined) age.setScryptWorkFactor(isFaktoru);
    return await age.encrypt(veri);
  } finally { veri.fill(0); }
}
export async function coz(veri, sifre) {
  let acik;
  try {
    try {
      const age = new Decrypter(); age.addPassphrase(sifre);
      acik = await age.decrypt(veri);
    } catch { throw kodluHata('YANLIS_SIFRE'); }
    let kasa;
    try { kasa = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(acik)); }
    catch { throw kodluHata('YANLIS_SIFRE'); }
    if (Number.isInteger(kasa?.semaSurumu) && kasa.semaSurumu > 1) throw kodluHata('YENI_SURUM');
    try { return dogrulaVeGoc(kasa); }
    catch { throw kodluHata('YANLIS_SIFRE'); }
  }
  finally { acik?.fill(0); }
}
export async function sinirliOku(yol, sinir = 200 * 1024 * 1024) {
  if ((await stat(yol)).size > sinir) throw kodluHata('OKUMA_BOYUT');
  const dosya = await open(yol, 'r');
  const parcalar = [];
  try {
    let toplam = 0;
    while (true) {
      const parca = Buffer.alloc(Math.min(64 * 1024, sinir - toplam + 1));
      const { bytesRead } = await dosya.read(parca);
      if (!bytesRead) break;
      toplam += bytesRead;
      if (toplam > sinir) { parca.fill(0); throw kodluHata('OKUMA_BOYUT'); }
      parcalar.push(parca.subarray(0, bytesRead));
    }
    return Buffer.concat(parcalar);
  } finally { for (const parca of parcalar) parca.fill(0); await dosya.close(); }
}
export async function oku(yol, sifre) { return coz(await sinirliOku(yol), sifre); }

export const ozet = veri => createHash('sha256').update(veri).digest('hex');
export async function oturumOku(yol, sifre) {
  const veri = await sinirliOku(yol);
  return { kasa: await coz(veri, sifre), beklenenOzet: ozet(veri) };
}
async function degismedi(yol, beklenenOzet) {
  if (beklenenOzet === undefined) return;
  let veri;
  try { veri = await sinirliOku(yol); }
  catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
  if ((veri ? ozet(veri) : null) !== beklenenOzet) throw kodluHata('DIS_DEGISIKLIK');
}

export async function kaydet(yol, kasa, sifre, secenekler = {}) {
  await degismedi(yol, secenekler.beklenenOzet);
  // Mevcut kasanın şifresi ve bütünlüğü doğrulanmadan üzerine yazılmaz.
  let onceki;
  try { onceki = await sinirliOku(yol); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
  if (onceki) await coz(onceki, sifre);
  const veri = await sifrele(kasa, sifre, secenekler);
  await atomikYaz(yol, veri, onceki, secenekler.beklenenOzet);
  return ozet(veri);
}

async function atomikYaz(yol, veri, onceki, beklenenOzet) {
  await mkdir(dirname(yol), { recursive: true, mode: 0o700 });
  const gecici = `${yol}.tmp.${randomBytes(12).toString('hex')}`;
  let tutamac;
  try {
    tutamac = await open(gecici, 'wx', 0o600);
    await tutamac.writeFile(veri); await tutamac.sync();
    await tutamac.close(); tutamac = undefined;
    await degismedi(yol, beklenenOzet);
    if (onceki) await atomikYaz(`${yol}.bak`, onceki);
    await degismedi(yol, beklenenOzet);
    await rename(gecici, yol);
  } finally {
    await tutamac?.close();
    await unlink(gecici).catch(hata => { if (hata.code !== 'ENOENT') throw hata; });
  }
}

export async function sifreDegistir(yol, eskiSifre, yeniSifre, secenekler = {}) {
  await degismedi(yol, secenekler.beklenenOzet);
  const onceki = await sinirliOku(yol);
  const kasa = await coz(onceki, eskiSifre);
  if (Array.from(yeniSifre).length < 12) throw kodluHata('KISA_SIFRE');
  if (eskiSifre === yeniSifre) throw kodluHata('AYNI_SIFRE');
  const veri = await sifrele(kasa, yeniSifre, secenekler);
  await atomikYaz(yol, veri, onceki, secenekler.beklenenOzet);
  try {
    const oturum = await oturumOku(yol, yeniSifre);
    if (oturum.beklenenOzet !== ozet(veri)) throw new Error();
    secenekler.ozetBildir?.(ozet(veri));
    return oturum.kasa;
  }
  catch { throw kodluHata('DOGRULANAMADI'); }
}

export async function dogrula(yol, sifre) {
  const veri = await sinirliOku(yol);
  const kasa = await coz(veri, sifre);
  return { kayitSayisi: kasa.kayitlar.length, dosyaSayisi: kasa.dosyalar.length,
    semaSurumu: kasa.semaSurumu, guncellemeTarihi: kasa.guncellemeTarihi,
    sha256: createHash('sha256').update(veri).digest('hex'), boyutBayt: veri.length };
}

export async function yedekAl(yol, sifre, hedefKlasor = dirname(yol)) {
  const veri = await sinirliOku(yol);
  const tarih = new Date();
  const gun = [tarih.getFullYear(), String(tarih.getMonth() + 1).padStart(2, '0'), String(tarih.getDate()).padStart(2, '0')].join('-');
  for (let sira = 1; ; sira++) {
    const hedef = resolve(hedefKlasor, `kasa-${gun}${sira === 1 ? '' : `-${sira}`}.age`);
    let dosya;
    try { dosya = await open(hedef, 'wx', 0o600); }
    catch (hata) { if (hata.code === 'EEXIST') continue; throw hata; }
    try {
      await dosya.writeFile(veri); await dosya.sync(); await dosya.close(); dosya = undefined;
      const sonuc = await dogrula(hedef, sifre);
      if (sonuc.sha256 !== ozet(veri)) throw kodluHata('YEDEK_DOGRULAMA');
      return { yol: hedef, ...sonuc };
    } catch (hata) { await dosya?.close(); await unlink(hedef); throw hata; }
  }
}

export function boyutDenetle(boyut, mevcutToplam = 0) {
  if (boyut > 25 * 1024 * 1024) throw kodluHata('DOSYA_COK_BUYUK');
  if (mevcutToplam + boyut > 100 * 1024 * 1024) throw kodluHata('TOPLAM_BOYUT_ASIMI');
}
export async function dosyaHazirla(yol, kategori = t('ortak.varsayilanKategori'), not = '', mevcutToplam = 0) {
  boyutDenetle((await stat(yol)).size, mevcutToplam);
  const ham = await sinirliOku(yol, 25 * 1024 * 1024);
  try {
    boyutDenetle(ham.length, mevcutToplam);
    return { id: randomUUID(), ad: basename(yol), kategori, not, guncellemeTarihi: new Date().toISOString(),
      boyutBayt: ham.length, sha256: createHash('sha256').update(ham).digest('hex'), icerikBase64: ham.toString('base64') };
  } finally { ham.fill(0); }
}
export async function dosyaCikar(dosya, hedef, { uzerineYaz = false } = {}) {
  const ham = Buffer.from(dosya.icerikBase64, 'base64');
  try {
    if (ham.toString('base64') !== dosya.icerikBase64 || ham.length !== dosya.boyutBayt ||
        createHash('sha256').update(ham).digest('hex') !== dosya.sha256) {
      throw kodluHata('DOSYA_DOGRULAMA');
    }
    await sifresizYaz(hedef, ham, { uzerineYaz });
  } finally { ham.fill(0); }
}

export async function sifresizYaz(hedef, ham, { uzerineYaz = false } = {}) {
  const gecici = `${hedef}.tmp.${randomUUID()}`;
  let dosya, ayrildi = false;
  try {
    dosya = await open(gecici, 'wx', 0o600);
    await dosya.writeFile(ham); await dosya.sync(); await dosya.close(); dosya = undefined;
    if (!uzerineYaz) { const hedefDosya = await open(hedef, 'wx', 0o600); ayrildi = true; await hedefDosya.close(); }
    await rename(gecici, hedef); ayrildi = false;
  } finally {
    try { await dosya?.close(); } finally {
      await unlink(gecici).catch(hata => { if (hata.code !== 'ENOENT') throw hata; });
      if (ayrildi) await unlink(hedef);
    }
  }
}

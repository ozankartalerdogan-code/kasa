import { dilAyarla } from '../src/dil.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { Encrypter } from 'age-encryption';
import { kasaYolu, kaydet, oku, coz } from '../src/kasa.mjs';
import { yeniKasa } from '../src/sema.mjs';
import { gocHazirla, gocKopyala } from '../src/goc.mjs';
import { nodeSurumHatasi } from '../src/surum.mjs';
import { sifresizHedef } from '../src/yol.mjs';
import { calistir } from '../src/cli.mjs';

// Metin ve menü beklentileri ortamın dilinden bağımsızdır.
process.env.KASA_DIL = 'tr';
dilAyarla('tr');

const sifre = 'yalnız-deneme-ana-şifresi';
async function ortam(t) {
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-dagitim-'));
  const once = Object.fromEntries(['KASA_DOSYA', 'LOCALAPPDATA', 'USERPROFILE'].map(ad => [ad, process.env[ad]]));
  process.env.USERPROFILE = join(dizin, 'kullanici');
  process.env.LOCALAPPDATA = join(dizin, 'yerel');
  process.env.KASA_DOSYA = join(dizin, 'ozel.age');
  t.after(async () => {
    for (const [ad, deger] of Object.entries(once)) {
      if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger;
    }
    await rm(dizin, { recursive: true, force: true });
  });
  const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age');
  const yeni = join(process.env.LOCALAPPDATA, 'kasa', 'kasa.age');
  await kaydet(eski, yeniKasa(), sifre, { isFaktoru: 4 });
  delete process.env.KASA_DOSYA;
  return { dizin, eski, yeni, veri: await readFile(eski) };
}
function sorucu(yanitlar, sorular = []) {
  return async (mesaj, gizli) => {
    sorular.push({ mesaj, gizli });
    assert.ok(yanitlar.length, `Beklenmeyen soru: ${mesaj}`);
    const yanit = yanitlar.shift();
    return typeof yanit === 'function' ? yanit() : yanit;
  };
}
test('Dağıtım: kasa yolu ortam değişkeni önceliklerini ve eksik profil hatasını korur', async t => {
  const { dizin, yeni } = await ortam(t);
  process.env.KASA_DOSYA = join(dizin, 'ozel.age');
  assert.equal(kasaYolu(), process.env.KASA_DOSYA);
  delete process.env.KASA_DOSYA;
  assert.equal(kasaYolu(), yeni);
  delete process.env.LOCALAPPDATA;
  assert.equal(kasaYolu(), join(process.env.USERPROFILE, 'AppData', 'Local', 'kasa', 'kasa.age'));
  delete process.env.USERPROFILE;
  assert.throws(kasaYolu, { kod: 'KULLANICI_KLASORU_YOK' });
});
for (const sil of [false, true]) {
  test(`Dağıtım: doğrulamalı göç eski kasa ve yedeğini ${sil ? 'onayla siler' : 'Enter ile saklar'}`, async t => {
    const { eski, yeni, veri } = await ortam(t);
    await writeFile(`${eski}.bak`, veri);
    const sorular = [];
    const sonuc = await gocHazirla(sorucu(['1', sifre, sil ? ' EVET ' : ''], sorular), () => {});
    try {
      assert.equal(sonuc.yol, resolve(yeni));
      assert.deepEqual(await readFile(yeni), veri);
      assert.equal((await oku(yeni, sifre)).semaSurumu, 1);
      assert.equal(sorular[1].gizli, true);
      assert.match(sorular[2].mesaj, /Eski konumdaki kasa ve .bak silinsin mi/);
      if (sil) {
        await assert.rejects(readFile(eski), { code: 'ENOENT' });
        await assert.rejects(readFile(`${eski}.bak`), { code: 'ENOENT' });
      } else {
        assert.deepEqual(await readFile(eski), veri);
        assert.deepEqual(await readFile(`${eski}.bak`), veri);
      }
    } finally { await sonuc.kilidiBirak(); }
    assert.deepEqual(await readdir(dirname(yeni)), ['kasa.age']);
    await assert.rejects(readFile(`${eski}.kilit`), { code: 'ENOENT' });
  });
}
test('Dağıtım: eski yerden aç seçimi dosya taşımaz ve boş kasa oluşturmaz', async t => {
  const { eski, yeni, veri } = await ortam(t);
  const sonuc = await gocHazirla(sorucu(['2']), () => {});
  try {
    assert.equal(sonuc.yol, resolve(eski));
    assert.deepEqual(await readFile(eski), veri);
    await assert.rejects(readFile(yeni), { code: 'ENOENT' });
  } finally { await sonuc.kilidiBirak(); }
});
test('Dağıtım: iki kasada boyut ve tarih yazılır, hiçbir dosya veya kilit değiştirilmez', async t => {
  const { eski, yeni, veri } = await ortam(t);
  await mkdir(dirname(yeni), { recursive: true }); await writeFile(yeni, 'başka-kasa');
  const satirlar = [];
  await assert.rejects(gocHazirla(() => assert.fail('Soru sorulmamalı'), x => satirlar.push(x)), { kod: 'GOC_CAKISMA' });
  assert.ok(satirlar.some(x => x.includes(eski) && x.includes('bayt') && x.includes('Son değişiklik:')));
  assert.ok(satirlar.some(x => x.includes(yeni) && x.includes('bayt') && x.includes('Son değişiklik:')));
  assert.deepEqual(await readFile(eski), veri); assert.equal(await readFile(yeni, 'utf8'), 'başka-kasa');
  assert.deepEqual(await readdir(dirname(eski)), ['kasa.age']);
  assert.deepEqual(await readdir(dirname(yeni)), ['kasa.age']);
});
test('Dağıtım: yanlış şifrede üç denemeden sonra hiçbir kasa taşınmaz', async t => {
  const { eski, yeni, veri } = await ortam(t);
  const sorular = [];
  await assert.rejects(gocHazirla(sorucu(['1', 'yanlış', 'yanlış', 'yanlış'], sorular), () => {}), { kod: 'YANLIS_SIFRE' });
  assert.equal(sorular.filter(x => x.gizli).length, 3);
  assert.deepEqual(await readFile(eski), veri);
  await assert.rejects(readFile(yeni), { code: 'ENOENT' });
  assert.deepEqual(await readdir(dirname(yeni)), []);
});
test('Dağıtım: göç sırasında oluşan hedef ezilmez ve silme onayı sorulmaz', async t => {
  const { eski, yeni, veri } = await ortam(t);
  await assert.rejects(gocHazirla(sorucu(['1', async () => {
    await writeFile(yeni, 'yeni-gelen-kasa'); return sifre;
  }]), () => {}), { code: 'EEXIST' });
  assert.equal(await readFile(yeni, 'utf8'), 'yeni-gelen-kasa');
  assert.deepEqual(await readFile(eski), veri);
  assert.deepEqual(await readdir(dirname(yeni)), ['kasa.age']);
});
test('Dağıtım: kopyalama mevcut hedefi ezmez; hatalı kaynakta hedef oluşturmaz', async t => {
  const { eski, yeni } = await ortam(t);
  await mkdir(dirname(yeni), { recursive: true }); await writeFile(yeni, 'koru');
  await assert.rejects(gocKopyala(eski, yeni, sifre), { code: 'EEXIST' });
  assert.equal(await readFile(yeni, 'utf8'), 'koru');
  const baska = join(dirname(yeni), 'baska.age');
  await assert.rejects(gocKopyala(eski, baska, 'yanlış'), { kod: 'YANLIS_SIFRE' });
  await assert.rejects(readFile(baska), { code: 'ENOENT' });
});
test('Dağıtım: KASA_DOSYA açık seçimi göç ve çakışma sorgusunu atlar', async t => {
  const { eski, yeni } = await ortam(t);
  process.env.KASA_DOSYA = eski;
  await mkdir(dirname(yeni), { recursive: true }); await writeFile(yeni, 'dokunma');
  const sonuc = await gocHazirla(() => assert.fail('Soru sorulmamalı'), () => {});
  assert.equal(sonuc.yol, resolve(eski)); await sonuc.kilidiBirak();
  assert.equal(await readFile(yeni, 'utf8'), 'dokunma');
});
test('Dağıtım: yeni şema yalnız başarılı şifre çözümünden sonra açıklanır', async () => {
  const age = new Encrypter(); age.setPassphrase(sifre); age.setScryptWorkFactor(4);
  const veri = await age.encrypt(JSON.stringify({ ...yeniKasa(), semaSurumu: 2 }));
  await assert.rejects(coz(veri, sifre), { kod: 'YENI_SURUM' });
  await assert.rejects(coz(veri, 'yanlış'), { kod: 'YANLIS_SIFRE' });
  const bozuk = new Uint8Array(veri); bozuk[bozuk.length - 1] ^= 1;
  await assert.rejects(coz(bozuk, sifre), { kod: 'YANLIS_SIFRE' });
  const gecersiz = await age.encrypt('{"semaSurumu":1}');
  await assert.rejects(coz(gecersiz, sifre), { kod: 'YANLIS_SIFRE' });
});
test('Dağıtım: kilit hedefi ve kilide sabit bağlantı şifresiz çıktıda reddedilir', async t => {
  const { eski, dizin } = await ortam(t);
  await writeFile(`${eski}.kilit`, 'deneme-kilidi');
  const bag = join(dizin, 'bag.env'); await link(`${eski}.kilit`, bag);
  for (const hedef of [`${eski}.kilit`, `${eski}.KILIT`, bag]) {
    await assert.rejects(sifresizHedef(hedef, eski), { kod: 'SIFRESIZ_HEDEF_YASAK' });
  }
});
test('Dağıtım: saf Node sürüm denetimi 18–23 için yönlendirir, 24 ve üstünü kabul eder', () => {
  for (const surum of ['v18.20.0', 'v20.19.0', 'v22.0.0', 'v23.9.0']) {
    assert.equal(nodeSurumHatasi(surum), `Bu program Node.js 24 veya üstünü gerektirir. Şu an: ${surum}. https://nodejs.org adresinden Node.js 24 LTS kurun.`);
  }
  for (const surum of ['v24.0.0', '24.14.1', 'v25.0.0', 'v26.0.0']) assert.equal(nodeSurumHatasi(surum), '');
});
test('Dağıtım: menü göçten sonra yeniden şifre sormadan açılır ve sürümü bir kez yazar', async t => {
  const { eski, yeni } = await ortam(t);
  const log = console.log, yaz = process.stdout.write, kod = process.exitCode, arg = process.argv;
  const satirlar = [], sorular = [];
  try {
    console.log = x => satirlar.push(x); process.stdout.write = () => true; process.argv = process.argv.slice(0, 2);
    await calistir({ girdiOlustur: () => ({ sor: sorucu(['1', sifre, 'evet', '0'], sorular), kapat() {} }),
      pano: { bitir: () => 'YOK' }, panoyaYaz: () => assert.fail('Panoya erişilmemeli') });
    assert.equal(sorular.filter(x => x.gizli).length, 1);
    assert.equal(satirlar.filter(x => x === 'Kasa v1.0.0').length, 1);
    assert.ok(satirlar.some(x => x.includes('Kayıtları listele')));
    assert.equal((await oku(yeni, sifre)).semaSurumu, 1);
    await assert.rejects(readFile(eski), { code: 'ENOENT' });
  } finally { console.log = log; process.stdout.write = yaz; process.exitCode = kod; process.argv = arg; }
});

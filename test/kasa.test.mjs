import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PassThrough, Writable } from 'node:stream';
import { Encrypter } from 'age-encryption';
import { yeniKasa, dogrulaVeGoc } from '../src/sema.mjs';
import { kasaYolu, kaydet, oku, sifrele, coz, dosyaHazirla, dosyaCikar } from '../src/kasa.mjs';
import { Girdi, OturumSonu } from '../src/gizli-girdi.mjs';
import { t as cevirMetin } from '../src/dil.mjs';

const sifre = 'yalnız-deneme-şifresi-725';
const hizli = { isFaktoru: 4 };
const kayit = () => ({ id: randomUUID(), ad: 'deneme', tur: 'anahtar', kategori: 'Genel',
  deger: 'GİZLİ-DEĞER-941578', not: '', guncellemeTarihi: new Date().toISOString() });
async function ortam(t) {
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-test-'));
  t.after(() => rm(dizin, { recursive: true, force: true }));
  const eski = process.env.KASA_DOSYA;
  const onceOrtam = { LOCALAPPDATA: process.env.LOCALAPPDATA, KASA_DIL: process.env.KASA_DIL };
  Object.assign(process.env, { LOCALAPPDATA: dizin, KASA_DIL: 'tr' });
  t.after(() => { for (const [ad, deger] of Object.entries(onceOrtam)) { if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger; } });
  process.env.KASA_DOSYA = join(dizin, 'kasa.age');
  t.after(() => { if (eski === undefined) delete process.env.KASA_DOSYA; else process.env.KASA_DOSYA = eski; });
  const kasa = yeniKasa(); kasa.kayitlar.push(kayit());
  const yol = kasaYolu(); await kaydet(yol, kasa, sifre, hizli);
  return { dizin, yol, kasa };
}
test('Yanlış şifre okumada ve kaydetmede dosyaya dokunmaz', async t => {
  const { yol, kasa, dizin } = await ortam(t); const once = await readFile(yol);
  await assert.rejects(oku(yol, 'yanlış'), { kod: 'YANLIS_SIFRE' });
  await assert.rejects(kaydet(yol, kasa, 'yanlış', hizli), { kod: 'YANLIS_SIFRE' });
  assert.deepEqual(await readFile(yol), once); assert.deepEqual(await readdir(dizin), ['kasa.age']);
});
for (const tur of ['bit değişimi', 'sondan 10 bayt kesilmesi']) {
  test(`Bozuk dosya reddedilir: ${tur}`, async t => {
    const { yol, kasa, dizin } = await ortam(t); let ham = await readFile(yol);
    if (tur === 'bit değişimi') ham[Math.floor(ham.length / 2)] ^= 1;
    else ham = ham.subarray(0, ham.length - 10);
    await writeFile(yol, ham);
    await assert.rejects(oku(yol, sifre), { kod: 'YANLIS_SIFRE' });
    await assert.rejects(kaydet(yol, kasa, sifre, hizli), { kod: 'YANLIS_SIFRE' });
    assert.deepEqual(await readFile(yol), ham); assert.deepEqual(await readdir(dizin), ['kasa.age']);
  });
}
test('Eski şemada kategori Genel olur ve yeniden kaydedilir', async t => {
  const { yol, kasa } = await ortam(t); delete kasa.kayitlar[0].kategori;
  const age = new Encrypter(); age.setPassphrase(sifre); age.setScryptWorkFactor(4);
  await writeFile(yol, await age.encrypt(JSON.stringify(kasa)));
  const acilan = await oku(yol, sifre);
  assert.equal(acilan.kayitlar[0].kategori, 'Genel');
  assert.equal(acilan.kayitlar[0].deger, kasa.kayitlar[0].deger);
  await kaydet(yol, acilan, sifre, hizli);
  assert.equal((await oku(yol, sifre)).kayitlar[0].kategori, 'Genel');
});
test('5 KB rastgele .jks gidiş dönüşünde boyut ve SHA-256 eşittir', async t => {
  const { yol, kasa, dizin } = await ortam(t);
  const kaynak = join(dizin, 'sahte.jks'), hedef = join(dizin, 'cikan.jks');
  const ham = randomBytes(5 * 1024); await writeFile(kaynak, ham);
  kasa.dosyalar.push(await dosyaHazirla(kaynak)); await kaydet(yol, kasa, sifre, hizli);
  await dosyaCikar((await oku(yol, sifre)).dosyalar[0], hedef);
  const cikan = await readFile(hedef); assert.equal(cikan.length, ham.length);
  assert.equal(createHash('sha256').update(cikan).digest('hex'), createHash('sha256').update(ham).digest('hex'));
  await assert.rejects(dosyaCikar(kasa.dosyalar[0], hedef), { code: 'EEXIST' });
  assert.deepEqual(await readFile(hedef), ham);
  await dosyaCikar(kasa.dosyalar[0], hedef, { uzerineYaz: true });
});
test('Atomik kayıt eski şifreli kopyayı korur, yeni kayıt okunur, geçici dosya kalmaz', async t => {
  const { yol, kasa, dizin } = await ortam(t); const once = await readFile(yol);
  const yeni = kayit(); yeni.ad = 'ikinci'; kasa.kayitlar.push(yeni);
  await kaydet(yol, kasa, sifre, hizli);
  assert.deepEqual(await readFile(`${yol}.bak`), once);
  assert.equal((await oku(yol, sifre)).kayitlar.length, 2);
  assert.deepEqual((await readdir(dizin)).sort(), ['kasa.age', 'kasa.age.bak']);
});
test('Standart age başlığı ve scrypt vardır; düz değer yoktur', async t => {
  const { yol, kasa } = await ortam(t); const ham = await readFile(yol);
  assert.equal(ham.subarray(0, ham.indexOf(10)).toString(), 'age-encryption.org/v1');
  assert.match(ham.toString(), /\n-> scrypt /);
  assert.equal(ham.includes(Buffer.from(kasa.kayitlar[0].deger)), false);
  assert.deepEqual(await coz(await sifrele(kasa, sifre, hizli), sifre), kasa);
});
test('Geçersiz şema ve bozuk gömülü dosya reddedilir', async t => {
  const { yol, kasa, dizin } = await ortam(t); const once = await readFile(yol);
  const kaynak = join(dizin, 'deneme.jks'); await writeFile(kaynak, randomBytes(20));
  kasa.dosyalar.push(await dosyaHazirla(kaynak)); kasa.dosyalar[0].sha256 = '0'.repeat(64);
  await assert.rejects(kaydet(yol, kasa, sifre, hizli), { kod: 'GECERSIZ_SEMA' });
  await assert.rejects(dosyaCikar(kasa.dosyalar[0], join(dizin, 'hedef')), { kod: 'DOSYA_DOGRULAMA' });
  assert.deepEqual(await readFile(yol), once);
  assert.throws(() => dogrulaVeGoc({ ...yeniKasa(), semaSurumu: 2 }), { kod: 'GECERSIZ_SEMA' });
});
test('Yedekleme başarısızsa asıl kasa korunur ve geçici dosya kaldırılır', async t => {
  const { yol, kasa, dizin } = await ortam(t); const once = await readFile(yol);
  await mkdir(`${yol}.bak`);
  kasa.kayitlar[0].deger = 'değişiklik';
  await assert.rejects(kaydet(yol, kasa, sifre, hizli));
  assert.deepEqual(await readFile(yol), once);
  assert.equal((await readdir(dizin)).some(ad => ad.includes('.tmp.')), false);
});
test('Normal şifreleme scrypt varsayılan iş faktörünü 18 olarak bırakır', async () => {
  const kasa = yeniKasa();
  const ham = await sifrele(kasa, sifre);
  assert.match(Buffer.from(ham).toString(), /\n-> scrypt [^\s]+ 18\n/);
  assert.deepEqual(await coz(ham, sifre), kasa);
});

function sahteTerminal(t, sure = 300000) {
  let ekran = ''; const giris = new PassThrough(); giris.isTTY = true;
  giris.isRaw = false; giris.setRawMode = deger => { giris.isRaw = deger; };
  const cikis = new Writable({ write(ham, kod, bitti) { ekran += ham.toString(); bitti(); } }); cikis.isTTY = true;
  const girdi = new Girdi({ giris, cikis, sure }); t.after(() => girdi.kapat());
  return { giris, girdi, ekran: () => ekran };
}
test('Gizli girdi Türkçe karakterleri okur, geri siler ve hiçbirini ekrana basmaz', async t => {
  const { giris, girdi, ekran } = sahteTerminal(t);
  const sonuc = girdi.sor('Şifre: ', true);
  giris.write('şifreĞ'); giris.write('\x7f'); giris.write('\r');
  assert.equal(await sonuc, 'şifre'); assert.equal(ekran(), 'Şifre: \n');
  girdi.kapat(); assert.equal(giris.isRaw, false);
});
test('Gizli girdide Ctrl+C normal terminal modunu geri getirir', async t => {
  const { giris, girdi } = sahteTerminal(t); const sonuc = girdi.sor('Şifre: ', true);
  giris.write('saklı'); giris.write('\x03');
  await assert.rejects(sonuc, OturumSonu); assert.equal(giris.isRaw, false);
});
test('Hareketsizlik ekranı temizler, kilitler ve terminali düzeltir', async t => {
  const { giris, girdi, ekran } = sahteTerminal(t, 30);
  await assert.rejects(girdi.sor('Seçim: '), { kod: 'OTOMATIK_KILIT' });
  assert.equal(giris.isRaw, false);
  assert.match(ekran(), new RegExp(`\\x1b\\[2J.*${cevirMetin('hata.OTOMATIK_KILIT')}`, 's'));
});

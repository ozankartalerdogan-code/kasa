import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { Encrypter } from 'age-encryption';
import { yeniKasa } from '../src/sema.mjs';
import { kasaYolu, kaydet, oku, sifreDegistir, yedekAl, dogrula } from '../src/kasa.mjs';

const sifre = 'deneme-eski-ana-şifresi';
const yeniSifre = 'deneme-yeni-ana-şifresi';
const hizli = { isFaktoru: 4 };
const ozet = veri => createHash('sha256').update(veri).digest('hex');

async function ortam(t) {
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-surum3-'));
  const eski = process.env.KASA_DOSYA;
  const onceOrtam = { LOCALAPPDATA: process.env.LOCALAPPDATA, KASA_DIL: process.env.KASA_DIL };
  Object.assign(process.env, { LOCALAPPDATA: dizin, KASA_DIL: 'tr' });
  t.after(() => { for (const [ad, deger] of Object.entries(onceOrtam)) { if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger; } });
  process.env.KASA_DOSYA = join(dizin, 'kasa.age');
  t.after(async () => {
    if (eski === undefined) delete process.env.KASA_DOSYA;
    else process.env.KASA_DOSYA = eski;
    await rm(dizin, { recursive: true, force: true });
  });
  const kasa = yeniKasa();
  kasa.kayitlar.push({ id: 'kayit-1', ad: 'deneme', tur: 'anahtar', kategori: 'Genel',
    deger: 'yalnız-bellekte-deneme', not: '', guncellemeTarihi: kasa.guncellemeTarihi });
  // Test sırları ve gömülü dosyanın açık içeriği diske yazılmaz.
  const ham = Buffer.from('gömülü deneme dosyası');
  kasa.dosyalar.push({ id: 'dosya-1', ad: 'deneme.jks', kategori: 'Genel', not: '',
    guncellemeTarihi: kasa.guncellemeTarihi, boyutBayt: ham.length,
    sha256: ozet(ham), icerikBase64: ham.toString('base64') });
  ham.fill(0);
  const yol = kasaYolu();
  await kaydet(yol, kasa, sifre, hizli);
  return { dizin, yol, kasa };
}

test('Şifre değişimi içeriği korur; kasa yeni, .bak eski şifreyle açılır', async t => {
  const { yol, kasa, dizin } = await ortam(t);
  const once = await readFile(yol);
  assert.deepEqual(await sifreDegistir(yol, sifre, yeniSifre, hizli), kasa);
  assert.deepEqual(await oku(yol, yeniSifre), kasa);
  await assert.rejects(oku(yol, sifre), { kod: 'YANLIS_SIFRE' });
  assert.deepEqual(await oku(`${yol}.bak`, sifre), kasa);
  assert.deepEqual(await readFile(`${yol}.bak`), once);
  await assert.rejects(oku(`${yol}.bak`, yeniSifre));
  // Yeni oturum şifresiyle sonraki kayıt da çalışır.
  await kaydet(yol, kasa, yeniSifre, hizli);
  assert.deepEqual(await oku(yol, yeniSifre), kasa);
  assert.deepEqual((await readdir(dizin)).sort(), ['kasa.age', 'kasa.age.bak']);
});

test('Yanlış eski şifre ve geçersiz yeni şifre dosyaları değiştirmez', async t => {
  const { yol, kasa, dizin } = await ortam(t);
  await kaydet(yol, kasa, sifre, hizli);
  const once = await readFile(yol), yedek = await readFile(`${yol}.bak`);
  await assert.rejects(sifreDegistir(yol, 'yanlış', yeniSifre, hizli), { kod: 'YANLIS_SIFRE' });
  await assert.rejects(sifreDegistir(yol, sifre, sifre, hizli), { kod: 'AYNI_SIFRE' });
  await assert.rejects(sifreDegistir(yol, sifre, 'kısa', hizli), { kod: 'KISA_SIFRE' });
  assert.deepEqual(await readFile(yol), once);
  assert.deepEqual(await readFile(`${yol}.bak`), yedek);
  assert.deepEqual((await readdir(dizin)).sort(), ['kasa.age', 'kasa.age.bak']);
});

test('Şifre değişiminde atomik yedekleme başarısızsa asıl kasa korunur', async t => {
  const { yol, dizin } = await ortam(t);
  const once = await readFile(yol);
  await mkdir(`${yol}.bak`);
  await assert.rejects(sifreDegistir(yol, sifre, yeniSifre, hizli));
  assert.deepEqual(await readFile(yol), once);
  assert.equal((await readdir(dizin)).some(ad => ad.includes('.tmp.')), false);
});

test('Tarihli yedek bayt bayt aynıdır; aynı gün -2 ve -3 mevcut dosyaları ezmez', async t => {
  const { yol, dizin } = await ortam(t);
  const once = await readFile(yol);
  const baslangic = new Date();
  const bir = await yedekAl(yol, sifre);
  const tarih = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  assert.ok([baslangic, new Date()].some(d => basename(bir.yol) === `kasa-${tarih(d)}.age`));
  assert.deepEqual(await readFile(bir.yol), once);
  assert.equal(bir.sha256, ozet(once)); assert.equal(bir.boyutBayt, once.length);
  // -2 adını önceden doldur: yeni yedek bu dosyayı da ezmemeli.
  const ikinci = bir.yol.replace(/\.age$/, '-2.age');
  await writeFile(ikinci, 'mevcut hedef', { flag: 'wx' });
  const uc = await yedekAl(yol, sifre, dizin);
  assert.equal(uc.yol, bir.yol.replace(/\.age$/, '-3.age'));
  assert.equal(await readFile(ikinci, 'utf8'), 'mevcut hedef');
  assert.deepEqual(await readFile(bir.yol), once);
  assert.deepEqual(await readFile(uc.yol), once);
  await rm(ikinci);
  const iki = await yedekAl(yol, sifre);
  assert.equal(iki.yol, ikinci);
  assert.deepEqual(await readFile(iki.yol), once);
  assert.deepEqual(await readFile(yol), once);
});

test('Başarısız yedek doğrulaması yeni kopyayı kaldırır, mevcut dosyayı korur', async t => {
  const { yol, dizin } = await ortam(t);
  const bir = await yedekAl(yol, sifre);
  const once = await readFile(bir.yol);
  await assert.rejects(yedekAl(yol, 'yanlış'), { kod: 'YANLIS_SIFRE' });
  assert.deepEqual(await readFile(bir.yol), once);
  assert.deepEqual((await readdir(dizin)).sort(), [basename(bir.yol), 'kasa.age'].sort());
});

test('Doğrulama yalnız sayıları ve şifreli dosyanın özetini verir, dosyaya yazmaz', async t => {
  const { yol, kasa, dizin } = await ortam(t);
  const once = await readFile(yol), bilgi = await stat(yol);
  assert.deepEqual(await dogrula(yol, sifre), { kayitSayisi: 1, dosyaSayisi: 1,
    semaSurumu: 1, guncellemeTarihi: kasa.guncellemeTarihi,
    sha256: ozet(once), boyutBayt: once.length });
  assert.deepEqual(await readFile(yol), once);
  assert.equal((await stat(yol)).mtimeMs, bilgi.mtimeMs);
  assert.deepEqual(await readdir(dizin), ['kasa.age']);
});

test('Doğrulama bit değişimini reddeder, bozuk dosyaya yazmaz', async t => {
  const { yol, dizin } = await ortam(t);
  const bozuk = await readFile(yol); bozuk[bozuk.length - 1] ^= 1;
  await writeFile(yol, bozuk);
  await assert.rejects(dogrula(yol, sifre), { kod: 'YANLIS_SIFRE' });
  assert.deepEqual(await readFile(yol), bozuk);
  assert.deepEqual(await readdir(dizin), ['kasa.age']);
});

for (const alan of ['sha256', 'boyutBayt']) {
  test(`Doğrulama doğru şifrelenmiş kasada bozuk gömülü ${alan} alanını reddeder`, async t => {
    const { yol, kasa } = await ortam(t);
    if (alan === 'sha256') kasa.dosyalar[0].sha256 = '0'.repeat(64);
    else kasa.dosyalar[0].boyutBayt++;
    // Uygulama doğrulayıcısını atlayarak bozuk içeriği geçerli age zarfına koy.
    const age = new Encrypter(); age.setPassphrase(sifre); age.setScryptWorkFactor(hizli.isFaktoru);
    const ham = Buffer.from(JSON.stringify(kasa));
    try { await writeFile(yol, await age.encrypt(ham)); }
    finally { ham.fill(0); }
    const once = await readFile(yol);
    await assert.rejects(dogrula(yol, sifre), { kod: 'YANLIS_SIFRE' });
    assert.deepEqual(await readFile(yol), once);
  });
}

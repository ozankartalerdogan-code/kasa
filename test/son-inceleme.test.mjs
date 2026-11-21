import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, rmdir, mkdir, readFile, writeFile, readdir, open, unlink, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dilAyarYaz, dilAyarYolu, etkinDil, dilAyarla } from '../src/dil.mjs';
import { kasaYolu, kaydet, sinirliOku, dogrula, sifresizYaz, dosyaCikar } from '../src/kasa.mjs';
import { yeniKasa, dogrulaVeGoc } from '../src/sema.mjs';
import { gocHazirla } from '../src/goc.mjs';
import { PanoOturumu } from '../src/pano-oturumu.mjs';
import { hazirla, etkinlestir, kaldir, pathBetigi, ana as kurulumAna } from '../src/kurulum.mjs';
import { sifresizHedef } from '../src/yol.mjs';
import { envYaz } from '../src/env.mjs';
import { calistir } from '../src/cli.mjs';

const sifre = 'yalnız-deneme-ana-şifresi';
async function ortam(t) {
  const kok = await mkdtemp(join(tmpdir(), 'kasa-son-'));
  const once = Object.fromEntries(['LOCALAPPDATA', 'USERPROFILE', 'KASA_DOSYA', 'KASA_DIL'].map(k => [k, process.env[k]]));
  const dil = etkinDil();
  Object.assign(process.env, { LOCALAPPDATA: join(kok, 'yerel'), USERPROFILE: join(kok, 'profil'), KASA_DOSYA: join(kok, 'ozel.age'), KASA_DIL: 'tr' });
  dilAyarla('tr');
  t.after(async () => {
    for (const [k, v] of Object.entries(once)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    dilAyarla(dil); await rm(kok, { recursive: true, force: true });
  });
  return kok;
}

test('Son: dil ayarı sabit konumda, yabancı/bozuk dosya ve kasa kimliği korunur', async t => {
  const kok = await ortam(t), kasa = kasaYolu(), hedef = dilAyarYolu(kasa);
  assert.equal(hedef, join(process.env.LOCALAPPDATA, 'kasa', 'ayarlar.json'));
  assert.equal(dilAyarYolu(join(kok, 'baska.age')), hedef);
  delete process.env.LOCALAPPDATA;
  assert.equal(dilAyarYolu(kasa), join(process.env.USERPROFILE, 'AppData', 'Local', 'kasa', 'ayarlar.json'));
  process.env.LOCALAPPDATA = join(kok, 'yerel');
  await mkdir(join(process.env.LOCALAPPDATA, 'kasa'), { recursive: true });
  const uyarilar = []; t.mock.method(console, 'warn', x => uyarilar.push(x));
  for (const icerik of ['{bozuk', '{"proje":1}', '{"dil":"tr","baska":1}', 'age-encryption.org/v1']) {
    await writeFile(hedef, icerik);
    assert.equal(await dilAyarYaz(kasa, 'en'), false);
    assert.equal(await readFile(hedef, 'utf8'), icerik); assert.equal(etkinDil(), 'en');
  }
  await writeFile(hedef, '{"dil":"tr"}');
  assert.equal(await dilAyarYaz(hedef, 'en'), false);
  assert.equal(await readFile(hedef, 'utf8'), '{"dil":"tr"}');
  assert.equal(await dilAyarYaz(kasa, 'en'), true);
  assert.deepEqual(await readdir(join(process.env.LOCALAPPDATA, 'kasa')), ['ayarlar.json']);
  assert.equal(uyarilar.length, 5);
});

for (const degistir of ['sil', 'boz', 'yeniden-sifrele']) {
  test(`Son: göç silme onayında yeni kasa ${degistir}; eski kasa ve .bak korunur`, async t => {
    await ortam(t); delete process.env.KASA_DOSYA;
    const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age'), yeni = kasaYolu();
    await kaydet(eski, yeniKasa(), sifre, { isFaktoru: 4 });
    const once = await readFile(eski); await writeFile(`${eski}.bak`, once);
    const yanitlar = ['1', sifre];
    await assert.rejects(gocHazirla(async () => {
      if (yanitlar.length) return yanitlar.shift();
      if (degistir === 'sil') await unlink(yeni);
      else if (degistir === 'boz') await writeFile(yeni, 'bozuk');
      else await kaydet(yeni, yeniKasa(), sifre, { isFaktoru: 4 });
      return 'evet';
    }, () => {}), { kod: 'GOC_DOGRULAMA' });
    assert.deepEqual(await readFile(eski), once); assert.deepEqual(await readFile(`${eski}.bak`), once);
    await assert.rejects(readFile(`${eski}.kilit`), { code: 'ENOENT' });
    await assert.rejects(readFile(`${yeni}.kilit`), { code: 'ENOENT' });
  });
}

test('Son: göç tamamlanınca eski kilit hemen bırakılır', async t => {
  await ortam(t); delete process.env.KASA_DOSYA;
  const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age');
  await kaydet(eski, yeniKasa(), sifre, { isFaktoru: 4 });
  const yanitlar = ['1', sifre, ''];
  const sonuc = await gocHazirla(async () => yanitlar.shift(), () => {});
  try {
    await assert.rejects(readFile(`${eski}.kilit`), { code: 'ENOENT' });
    assert.ok(await readFile(`${sonuc.yol}.kilit`));
  } finally { await sonuc.kilidiBirak(); }
});

test('Son: bir kilit bırakılamasa da diğer kilit bırakılır', async t => {
  await ortam(t); delete process.env.KASA_DOSYA;
  const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age'), yeni = kasaYolu();
  await kaydet(eski, yeniKasa(), sifre, { isFaktoru: 4 });
  let sira = 0;
  await assert.rejects(gocHazirla(async () => {
    if (sira++ === 0) return '1';
    await unlink(`${yeni}.kilit`); await mkdir(`${yeni}.kilit`);
    throw new Error('deneme');
  }, () => {}), hata => hata.message === 'deneme' && hata.kilitUyarisi === true);
  await assert.rejects(readFile(`${eski}.kilit`), { code: 'ENOENT' });
});

test('Son: belirsiz ikinci pano yazımı ilk işareti zamanlayıcıda ve çıkışta korur', async () => {
  const isler = [], temizlenen = [], son = [];
  const pano = new PanoOturumu({ temizle: async x => { temizlenen.push(x); return x === 'B' ? 'YOK' : 'HATA'; },
    sonDene: x => { son.push(x); return 'TEMIZLENDI'; }, zamanla: f => { isler.push(f); return f; }, iptal() {} });
  pano.izle('A'); pano.izle('B', 5000, false);
  assert.deepEqual([...pano.isaretler], ['A', 'B']);
  await isler[1](); assert.deepEqual(temizlenen, ['A', 'B']);
  assert.deepEqual([...pano.isaretler], ['A']);
  assert.equal(pano.bitir(), 'TEMIZLENDI'); assert.deepEqual(son, ['A']);
  const hepsi = [];
  const cikis = new PanoOturumu({ sonDene: x => { hepsi.push(x); return 'HATA'; }, zamanla() {}, iptal() {} });
  cikis.izle('A'); cikis.izle('B', 5000, false); assert.equal(cikis.bitir(), 'HATA');
  assert.deepEqual(hepsi, ['A', 'B']);
});

test('Son: kurulum ayrı hazırlanır, tekrar denenir; kaldırma kullanıcı dosyalarını korur', async t => {
  const kok = await ortam(t), hedef = join(kok, 'Programs', 'kasa'), kaynak = resolve('.');
  const yeni = await hazirla(kaynak, hedef);
  const liste = JSON.parse(await readFile(join(yeni, 'kurulum-listesi.json'), 'utf8'));
  assert.ok(liste.includes('node_modules')); assert.ok(liste.some(x => x.replaceAll('\\', '/') === 'src/cli.mjs'));
  await hazirla(kaynak, hedef); // npm hatası/yarım kurulum tekrar denenebilir.
  await etkinlestir(hedef);
  await writeFile(join(hedef, 'kisisel.age'), 'kasa');
  await writeFile(join(hedef, 'yedek.age.bak'), 'yedek');
  await mkdir(join(hedef, 'src', 'kullanici')); await writeFile(join(hedef, 'src', 'kullanici', 'not.txt'), 'not');
  await hazirla(kaynak, hedef);
  assert.equal(await readFile(join(hedef, 'kisisel.age'), 'utf8'), 'kasa');
  await etkinlestir(hedef);
  assert.equal(await readFile(join(`${hedef}.eski`, 'kisisel.age'), 'utf8'), 'kasa');
  assert.equal(await readFile(join(`${hedef}.eski`, 'yedek.age.bak'), 'utf8'), 'yedek');
  await writeFile(join(hedef, 'kisisel.age'), 'yeni-kasa');
  await kaldir(hedef);
  assert.deepEqual(await readdir(hedef), ['kisisel.age']);
  assert.equal(await readFile(join(hedef, 'kisisel.age'), 'utf8'), 'yeni-kasa');
});

test('Son: boş/yarım etkin hedef kurulumu engellemez; doğrulanmayan yeni sürüm eskisini bozmaz', async t => {
  const kok = await ortam(t), hedef = join(kok, 'Programs', 'kasa');
  await mkdir(hedef, { recursive: true }); await writeFile(join(hedef, 'package.json'), 'yarim');
  const yeni = await hazirla(resolve('.'), hedef);
  await writeFile(join(yeni, 'package.json'), '{bozuk');
  await assert.rejects(etkinlestir(hedef));
  assert.equal(await readFile(join(hedef, 'package.json'), 'utf8'), 'yarim');
  await hazirla(resolve('.'), hedef); await etkinlestir(hedef);
  assert.equal(JSON.parse(await readFile(join(hedef, 'package.json'), 'utf8')).name, 'kasa');
});

test('Son: listesiz kaldırma kullanıcı dosyasını korur, yalnız tamamen boş hedefi siler', async t => {
  const kok = await ortam(t), hedef = join(process.env.LOCALAPPDATA, 'Programs', 'kasa');
  await hazirla(resolve('.'), hedef); await etkinlestir(hedef);
  await writeFile(join(hedef, 'not.txt'), 'koru');
  await kaldir(hedef);
  assert.deepEqual(await readdir(hedef), ['not.txt']);
  const satirlar = [], hatalar = [];
  t.mock.method(console, 'log', mesaj => satirlar.push(mesaj));
  t.mock.method(console, 'error', mesaj => hatalar.push(mesaj));
  const calistir = async islem => {
    const oncekiArgumanlar = process.argv, oncekiKod = process.exitCode;
    satirlar.length = 0; hatalar.length = 0;
    try {
      process.argv = [process.execPath, resolve('src/kurulum.mjs'), islem];
      process.exitCode = 0;
      await kurulumAna();
      assert.equal(process.exitCode, 0);
      assert.deepEqual(hatalar, []);
      return [...satirlar];
    } finally { process.argv = oncekiArgumanlar; process.exitCode = oncekiKod; }
  };
  await calistir('kaldirma-dogrula');
  assert.deepEqual(await calistir('kaldir'), [
    `Program klasöründe size ait dosyalar kaldı: ${hedef}`,
    `Your files remain in the program folder: ${hedef}`
  ]);
  assert.equal(await readFile(join(hedef, 'not.txt'), 'utf8'), 'koru');
  await mkdir(join(hedef, 'bos'));
  await calistir('kaldir');
  assert.deepEqual(await readdir(join(hedef, 'bos')), []);
  await unlink(join(hedef, 'not.txt'));
  await calistir('kaldir'); // Boş alt klasör bile listesiz hedefte korunur.
  assert.deepEqual(await readdir(hedef), ['bos']);
  await rmdir(join(hedef, 'bos'));
  await calistir('kaldirma-dogrula');
  await calistir('kaldir');
  await assert.rejects(readdir(hedef), { code: 'ENOENT' });
  await calistir('kaldirma-dogrula');
  await calistir('kaldir');
  assert.ok(hedef.startsWith(kok));
});

test('Son: yarım hazırlama listesi ve kullanıcı dosyası silinmeden yeniden hazırlanır', async t => {
  const kok = await ortam(t), hedef = join(kok, 'program'), yeni = `${hedef}.yeni`;
  await mkdir(yeni); await writeFile(join(yeni, 'kurulum-listesi.json'), '[yarim');
  await writeFile(join(yeni, 'ozel.age'), 'koru');
  await hazirla(resolve('.'), hedef);
  const saklanan = (await readdir(kok)).find(x => x.startsWith('program.yeni.'));
  assert.ok(saklanan);
  assert.equal(await readFile(join(kok, saklanan, 'ozel.age'), 'utf8'), 'koru');
  assert.equal(JSON.parse(await readFile(join(yeni, 'package.json'), 'utf8')).name, 'kasa');
});

test('Son: geçersiz kurulum listesi silme başlamadan reddedilir', async t => {
  const kok = await ortam(t), hedef = join(kok, 'program');
  await mkdir(hedef); await writeFile(join(hedef, 'package.json'), 'koru');
  await writeFile(join(kok, 'kullanici.age'), 'dis-kasa');
  for (const ad of ['../kullanici.age', 'src/../kullanici.age', 'src', 'node_modules/../kullanici.age']) {
    await writeFile(join(hedef, 'kurulum-listesi.json'), JSON.stringify(['kurulum-listesi.json', 'package.json', ad]));
    await assert.rejects(kaldir(hedef), { kod: 'KURULUM_GECERSIZ_HEDEF' });
    assert.equal(await readFile(join(hedef, 'package.json'), 'utf8'), 'koru');
    assert.equal(await readFile(join(kok, 'kullanici.age'), 'utf8'), 'dis-kasa');
  }
});

test('Son: junction hedefinde yeni şifresiz dosya ve kaldırma reddedilir', { skip: process.platform !== 'win32' }, async t => {
  const kok = await ortam(t), veri = join(kok, 'veri'), bag = join(kok, 'bag');
  await mkdir(veri);
  try { await symlink(veri, bag, 'junction'); }
  catch (hata) { if (['EPERM', 'EACCES'].includes(hata.code)) { t.skip('Junction oluşturma izni yok.'); return; } throw hata; }
  await assert.rejects(sifresizHedef(join(bag, 'kasa.age.bak'), join(veri, 'kasa.age')), { kod: 'SIFRESIZ_HEDEF_YASAK' });
  await assert.rejects(kaldir(bag), { kod: 'KURULUM_BAGLANTI' });
});

test('Son: okuma ve şema sınırları çözümden önce denetlenir', async t => {
  const kok = await ortam(t), yol = join(kok, 'buyuk');
  const dosya = await open(yol, 'wx'); await dosya.truncate(200 * 1024 * 1024 + 1); await dosya.close();
  await assert.rejects(dogrula(yol, sifre), { kod: 'OKUMA_BOYUT' });
  await assert.rejects(sinirliOku(yol, 1024 * 1024), { kod: 'OKUMA_BOYUT' });
  const kasa = yeniKasa();
  kasa.dosyalar = [{ id: '1', ad: 'a', kategori: '', not: '', guncellemeTarihi: kasa.guncellemeTarihi,
    boyutBayt: 25 * 1024 * 1024 + 1, icerikBase64: 'AAAA', sha256: '0'.repeat(64) }];
  assert.throws(() => dogrulaVeGoc(kasa), { kod: 'GECERSIZ_SEMA' });
  kasa.dosyalar[0].boyutBayt = 0;
  assert.throws(() => dogrulaVeGoc(kasa), { kod: 'GECERSIZ_SEMA' });
});

test('Son: .env karmaşık tırnak/dolar/ters bölü kombinasyonlarını güvenle reddeder', () => {
  for (const deger of [`a'b"c`, `p'w$100`, String.raw`p'w\100`]) {
    assert.throws(() => envYaz({ AD: deger }), { kod: 'GECERSIZ_ENV_BICIMI' });
  }
});

test('Son: şifresiz yayın hatasında önceki hedef ve geçici dosya temizliği', async t => {
  const kok = await ortam(t), hedef = join(kok, 'hedef');
  await writeFile(hedef, 'onceki');
  await assert.rejects(sifresizYaz(hedef, Buffer.from('yeni')), { code: 'EEXIST' });
  assert.equal(await readFile(hedef, 'utf8'), 'onceki');
  assert.deepEqual(await readdir(kok), ['hedef']);
  await sifresizYaz(hedef, Buffer.from('yeni'), { uzerineYaz: true });
  assert.equal(await readFile(hedef, 'utf8'), 'yeni');
  await assert.rejects(sifresizHedef(kok, kasaYolu()), { kod: 'HEDEF_KLASOR' });
  await assert.rejects(dosyaCikar({ icerikBase64: 'eA==', boyutBayt: 1, sha256: '0'.repeat(64) }, hedef, { uzerineYaz: true }), { kod: 'DOSYA_DOGRULAMA' });
  assert.equal(await readFile(hedef, 'utf8'), 'yeni');
});

test('Son: CLI ekran temizliğinden sonra göç çakışmasının iki dosyasını gösterir', async t => {
  await ortam(t); delete process.env.KASA_DOSYA;
  const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age'), yeni = kasaYolu();
  await kaydet(eski, yeniKasa(), sifre, { isFaktoru: 4 }); await kaydet(yeni, yeniKasa(), sifre, { isFaktoru: 4 });
  const olaylar = [], arg = process.argv, kod = process.exitCode;
  t.after(() => { process.argv = arg; process.exitCode = kod; });
  process.argv = process.argv.slice(0, 2); process.exitCode = 0;
  t.mock.method(console, 'log', x => olaylar.push(String(x)));
  t.mock.method(process.stdout, 'write', x => { olaylar.push(String(x)); return true; });
  await calistir({ girdiOlustur: () => ({ sor: () => assert.fail('Soru beklenmiyor'), kapat() {} }), pano: { bitir: () => 'YOK' } });
  const son = olaylar.at(-1);
  assert.ok(olaylar.at(-2).includes('\x1b[2J'));
  assert.ok(son.includes(eski) && son.includes(yeni) && son.includes('bayt') && son.includes('Son değişiklik:'));
});

test('Son: CLI hata kodu 1 pano/kilit uyarılarıyla ezilmez ve iki uyarı da görünür', async t => {
  await ortam(t);
  await kaydet(kasaYolu(), yeniKasa(), sifre, { isFaktoru: 4 });
  const arg = process.argv, kod = process.exitCode, satirlar = [];
  t.after(() => { process.argv = arg; process.exitCode = kod; });
  process.argv = process.argv.slice(0, 2); process.exitCode = 0;
  t.mock.method(console, 'log', x => satirlar.push(String(x)));
  t.mock.method(process.stdout, 'write', () => true);
  await calistir({ girdiOlustur: () => ({ async sor() {
    await unlink(`${kasaYolu()}.kilit`); await mkdir(`${kasaYolu()}.kilit`);
    throw new Error('deneme');
  }, kapat() {} }), pano: { bitir: () => 'HATA' } });
  assert.equal(process.exitCode, 1);
  assert.ok(satirlar.at(-1).includes('Kilit dosyası kaldırılamadı'));
  assert.ok(satirlar.at(-1).includes('Pano temizlenemedi'));
});

test('Son: boş silme listesi bir mesaj verir ve menü 10 uzunluğu trim eder', async t => {
  await ortam(t); await kaydet(kasaYolu(), yeniKasa(), sifre, { isFaktoru: 4 });
  const arg = process.argv, kod = process.exitCode, satirlar = [], kopyalar = [];
  t.after(() => { process.argv = arg; process.exitCode = kod; });
  process.argv = process.argv.slice(0, 2); process.exitCode = 0;
  t.mock.method(console, 'log', x => satirlar.push(String(x)));
  t.mock.method(process.stdout, 'write', () => true);
  const yanitlar = [sifre, '9', '1', '10', ' 24 ', '0'];
  await calistir({ girdiOlustur: () => ({ async sor() { assert.ok(yanitlar.length); return yanitlar.shift(); }, kapat() {} }),
    pano: { izle() {}, bitir: () => 'YOK' }, panoyaYaz: async x => { kopyalar.push(x); return 'deneme'; } });
  assert.equal(satirlar.filter(x => x === 'Henüz öğe yok.').length, 1);
  assert.equal(kopyalar[0].length, 24); assert.equal(process.exitCode, 0); assert.equal(yanitlar.length, 0);
});

test('Son: başlatıcı npm tam yolunu kopyalamadan önce denetler; komutlar argümanları yazdırmaz', async () => {
  const kur = await readFile(new URL('../kur.cmd', import.meta.url), 'utf8');
  assert.ok(kur.indexOf('if not exist "%NPM_CMD%"') < kur.indexOf('kurulum.mjs" hazirla'));
  assert.match(kur, /%%~dpInpm.cmd/);
  assert.match(kur, /call "%NPM_CMD%" ci --ignore-scripts --omit=dev/);
  assert.match(kur, /call "%NPM_CMD%" audit signatures/);
  assert.ok(kur.indexOf('audit signatures') < kur.indexOf('kurulum.mjs" etkinlestir'));
  const kaldirma = await readFile(new URL('../kaldir.cmd', import.meta.url), 'utf8');
  assert.ok(!/rmdir\s+\/s/i.test(kaldirma));
  assert.match(kaldirma, /kurulum.mjs" kaldir/);
  assert.ok(kaldirma.indexOf('kurulum.mjs" yol-cikar') < kaldirma.indexOf('kurulum.mjs" kaldirma-dogrula'));
  const kasa = await readFile(new URL('../kasa.cmd', import.meta.url), 'utf8');
  assert.match(kasa, /kurulum.mjs" arguman\s+exit \/b 1/);
  assert.ok(!/echo[^\n]*%[1*]/i.test(kasa));
});

test('Son: Windows PATH ham metin ve kayıt türü geçici HKCU anahtarında korunur', { skip: process.platform !== 'win32' }, t => {
  const anahtar = `Software\\KasaTest-${randomUUID()}`;
  const baslangic = `%JAVA_HOME%\\bin;;C:\\Other;`;
  const betik = `
$ErrorActionPreference='Stop'
$ad='${anahtar}'
try {
 foreach ($tur in @('String','ExpandString')) {
  $k=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($ad)
  $k.SetValue('Path','${baslangic}',[Microsoft.Win32.RegistryValueKind]::$tur); $k.Dispose()
  & { ${pathBetigi()} } -Anahtar $ad -Hedef 'C:\\Kasa Test' -Islem 'yol-ekle'
  & { ${pathBetigi()} } -Anahtar $ad -Hedef 'C:\\Kasa Test' -Islem 'yol-ekle'
  $k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($ad)
  if ($k.GetValue('Path',$null,'DoNotExpandEnvironmentNames') -cne '${baslangic};C:\\Kasa Test' -or $k.GetValueKind('Path').ToString() -ne $tur) { throw 'add/type' }; $k.Dispose()
  & { ${pathBetigi()} } -Anahtar $ad -Hedef 'C:\\Kasa Test' -Islem 'yol-cikar'
  $k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($ad)
  if ($k.GetValue('Path',$null,'DoNotExpandEnvironmentNames') -cne '${baslangic}' -or $k.GetValueKind('Path').ToString() -ne $tur) { throw 'remove/type' }; $k.Dispose()
 }
} finally { [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($ad,$false) }
`;
  const sonuc = spawnSync(join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(betik, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true });
  if (sonuc.error?.code === 'EPERM') { t.skip('Ortam alt süreç başlatmayı engelliyor; PowerShell testi ayrıca çalıştırılmalı.'); return; }
  assert.equal(sonuc.status, 0, sonuc.stderr || sonuc.error?.message);
});

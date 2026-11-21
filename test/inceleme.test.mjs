import { dilAyarla, t as cevirMetin } from '../src/dil.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, unlink, open, link, symlink } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { kayitSor, kartGoster, numaraylaSec, evet } from '../src/kayit-ui.mjs';
import { kasaYolu, kaydet, oku, oturumOku, sifreDegistir, yedekAl, dosyaHazirla, boyutDenetle } from '../src/kasa.mjs';
import { yeniKasa } from '../src/sema.mjs';
import { sifresizHedef, ayniYol, yolTemizle } from '../src/yol.mjs';
import { kilitAl } from '../src/kilit.mjs';
import { Girdi, OturumSonu } from '../src/gizli-girdi.mjs';
import { powershellYolu, panoBetigi, temizlemeSonucu, panoyaKopyala } from '../src/pano-win.mjs';
import { PanoOturumu } from '../src/pano-oturumu.mjs';
import { calistir } from '../src/cli.mjs';

// Metin ve menü beklentileri ortamın dilinden bağımsızdır.
process.env.KASA_DIL = 'tr';
dilAyarla('tr');

const sifre = 'yalnız-deneme-ana-şifresi';
const hizli = { isFaktoru: 4 };
const eski = { id: 'hesap-1', ad: 'Hesabım', tur: 'hesap', kategori: 'Hesaplar', not: 'gizli-not',
  kullanici: 'açık-kullanıcı', parola: 'eski-gizli-parola', adres: 'https://ornek.test', guncellemeTarihi: '2026-01-01T00:00:00Z' };
function sorucu(yanitlar) {
  const sorular = [];
  const sor = async (mesaj, gizli) => {
    sorular.push({ mesaj, gizli });
    assert.ok(yanitlar.length, `Beklenmeyen soru: ${mesaj}`);
    const yanit = yanitlar.shift();
    if (yanit instanceof Error) throw yanit;
    if (typeof yanit === 'function') return yanit(mesaj);
    return yanit;
  };
  return { sor, sorular };
}
async function ortam(t) {
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-inceleme-'));
  const once = process.env.KASA_DOSYA;
  const onceOrtam = { LOCALAPPDATA: process.env.LOCALAPPDATA, KASA_DIL: process.env.KASA_DIL };
  Object.assign(process.env, { LOCALAPPDATA: dizin, KASA_DIL: 'tr' });
  t.after(() => { for (const [ad, deger] of Object.entries(onceOrtam)) { if (deger === undefined) delete process.env[ad]; else process.env[ad] = deger; } });
  process.env.KASA_DOSYA = join(dizin, 'kasa.age');
  t.after(async () => {
    if (once === undefined) delete process.env.KASA_DOSYA; else process.env.KASA_DOSYA = once;
    await rm(dizin, { recursive: true, force: true });
  });
  const yol = kasaYolu(), kasa = yeniKasa();
  kasa.kayitlar.push(structuredClone(eski));
  const beklenenOzet = await kaydet(yol, kasa, sifre, hizli);
  return { yol, dizin, kasa, beklenenOzet };
}

test('1: Hesap güncellemede bütün boş alanlar ve parola korunur', async () => {
  const { sor, sorular } = sorucu(['', '', '', '', '', '', '']);
  const { kayit, uretilenParola } = await kayitSor(sor, eski.ad, eski);
  assert.deepEqual({ ...kayit, guncellemeTarihi: eski.guncellemeTarihi }, eski);
  assert.equal(uretilenParola, undefined);
  assert.ok(sorular.find(x => x.mesaj.includes('Yeni güçlü parola')));
  assert.equal(sorular.find(x => x.mesaj.startsWith('Kullanıcı')).gizli, false);
  assert.equal(sorular.find(x => x.mesaj.startsWith('Adres')).gizli, false);
});
test('1: Yeni hesap boş parolada üretir; güncelleme açık onayla üretir', async () => {
  for (const [onceki, yanitlar] of [[undefined, ['2', '', '', 'kişi', '', 'adres']], [eski, ['', '', '', '', '', ' EVET ', '']]]) {
    const { kayit, uretilenParola } = await kayitSor(sorucu(yanitlar).sor, 'ad', onceki);
    assert.equal(kayit.parola, uretilenParola);
    assert.equal(kayit.parola.length, 24);
    assert.notEqual(kayit.parola, eski.parola);
  }
});
test('1: Anahtar güncellemede boş değer korunur; tür değişince eski alan taşınmaz', async () => {
  const anahtar = { ...eski, tur: 'anahtar', deger: 'eski-değer' };
  assert.equal((await kayitSor(sorucu(['', '', '', '']).sor, 'ad', anahtar)).kayit.deger, 'eski-değer');
  const { kayit } = await kayitSor(sorucu(['1', '', '', 'yeni-değer']).sor, 'ad', eski);
  assert.equal(kayit.deger, 'yeni-değer'); assert.equal(kayit.parola, undefined);
  assert.equal(kayit.kategori, eski.kategori); assert.equal(kayit.not, eski.not);
});
test('1: Env elle girişte korur, aynı adı günceller ve tek tek siler', async () => {
  const env = { ...eski, tur: 'env', degerler: { KORU: 'aynı', DEGISTIR: 'eski', SIL: 'sil' } };
  const { kayit } = await kayitSor(sorucu(['', '', '', '', 'DEGISTIR', 'yeni', 'KORU', '', 'EKLE', 'ek', '', 'SIL', '']).sor, 'ad', env);
  assert.deepEqual({ ...kayit.degerler }, { KORU: 'aynı', DEGISTIR: 'yeni', EKLE: 'ek' });
  assert.equal(env.degerler.SIL, 'sil');
});
test('1: Env dosyasından yükleme tüm değerleri yalnız onayla değiştirir', async t => {
  const { dizin } = await ortam(t), kaynak = join(dizin, 'deneme.env');
  await writeFile(kaynak, 'YENI=deneme\n');
  const env = { ...eski, tur: 'env', degerler: { ESKI: 'deneme' } };
  assert.equal(await kayitSor(sorucu(['', '', '', kaynak, '']).sor, 'ad', env), undefined);
  const { kayit } = await kayitSor(sorucu(['', '', '', kaynak, ' Evet ']).sor, 'ad', env);
  assert.deepEqual({ ...kayit.degerler }, { YENI: 'deneme' });
});

test('2: Şifresiz hedef koruması kasa, yedek, geçici ve her .age yolunu reddeder', async t => {
  const { yol, dizin } = await ortam(t);
  for (const hedef of [yol, yol.toUpperCase(), `${yol}.bak`, `${yol}.tmp.abc`, join(dizin, 'BASKA.AGE'), resolve(dizin, '.', 'kasa.age')]) {
    await assert.rejects(sifresizHedef(hedef, yol), { kod: 'SIFRESIZ_HEDEF_YASAK' });
  }
  const hedef = join(dizin, 'cikan.env');
  assert.equal(await sifresizHedef(hedef, yol), resolve(hedef));
  assert.equal(await ayniYol(yol, yol.toUpperCase()), true);
});
test('2: Mevcut dosyanın farklı bağlantısı da kasa olarak tanınır', async t => {
  const { yol, dizin } = await ortam(t), bag = join(dizin, 'bag.env');
  await link(yol, bag);
  await assert.rejects(sifresizHedef(bag, yol), { kod: 'SIFRESIZ_HEDEF_YASAK' });
  const simge = join(dizin, 'simge.env');
  try { await symlink(yol, simge); }
  catch (hata) { if (hata.code === 'EPERM') { t.diagnostic('Simgesel bağlantı izni yok; sabit bağlantı denetlendi.'); return; } throw hata; }
  await assert.rejects(sifresizHedef(simge, yol), { kod: 'SIFRESIZ_HEDEF_YASAK' });
});
test('3: Yalnız sıra numarası seçilir; rakam olan kayıt adı seçimi değiştirmez', () => {
  const ogeler = [{ ad: 'ilk' }, { ad: '1' }];
  assert.equal(numaraylaSec(ogeler, ' 1 '), ogeler[0]);
  for (const girdi of ['ilk', '0', '3', '01', '1.0', '1e0', '']) assert.throws(() => numaraylaSec(ogeler, girdi), { kod: 'GECERSIZ_SECIM' });
});
test('4: Harici değişiklik ve kaybolma kaydetmeyi ve şifre değişimini durdurur', async t => {
  const { yol, kasa, beklenenOzet } = await ortam(t);
  const yeniOzet = await kaydet(yol, kasa, sifre, { ...hizli, beklenenOzet });
  assert.notEqual(yeniOzet, beklenenOzet);
  const once = await readFile(yol);
  for (const eylem of [() => kaydet(yol, kasa, sifre, { ...hizli, beklenenOzet }),
    () => sifreDegistir(yol, sifre, 'yeni-deneme-şifresi', { ...hizli, beklenenOzet })]) {
    await assert.rejects(eylem(), { kod: 'DIS_DEGISIKLIK' });
    assert.deepEqual(await readFile(yol), once);
  }
  await unlink(yol);
  await assert.rejects(kaydet(yol, kasa, sifre, { ...hizli, beklenenOzet: yeniOzet }), { kod: 'DIS_DEGISIKLIK' });
  await assert.rejects(sifreDegistir(yol, sifre, 'yeni-deneme-şifresi', { ...hizli, beklenenOzet: yeniOzet }), { kod: 'DIS_DEGISIKLIK' });
});
test('4: Şifreleme sürerken değişen dosya yazma öncesi son denetimde korunur', async t => {
  const { yol, kasa, beklenenOzet } = await ortam(t);
  const disaridan = Buffer.from('harici değişiklik');
  await assert.rejects(kaydet(yol, kasa, sifre, { beklenenOzet,
    get isFaktoru() { writeFileSync(yol, disaridan); return 4; } }), { kod: 'DIS_DEGISIKLIK' });
  assert.deepEqual(await readFile(yol), disaridan);
});
test('4: Şifre değişimi sonrası beklenen özet yenilenir ve sonraki kayıt çalışır', async t => {
  const { yol, kasa, beklenenOzet } = await ortam(t); let yeniOzet;
  await sifreDegistir(yol, sifre, 'yeni-deneme-şifresi', { ...hizli, beklenenOzet, ozetBildir: x => { yeniOzet = x; } });
  assert.equal((await oturumOku(yol, 'yeni-deneme-şifresi')).beklenenOzet, yeniOzet);
  await kaydet(yol, kasa, 'yeni-deneme-şifresi', { ...hizli, beklenenOzet: yeniOzet });
});
test('4: Kilit wx ile alınır, ret eski kilidi korur ve sahibi çıkınca siler', async t => {
  const { yol } = await ortam(t);
  const birak = await kilitAl(yol, () => assert.fail('İlk kilitte soru sorulmaz'));
  const once = await readFile(`${yol}.kilit`, 'utf8');
  assert.equal(JSON.parse(once).pid, process.pid); assert.ok(!once.includes(sifre));
  await assert.rejects(kilitAl(yol, () => assert.fail('Live lock')), { kod: 'KASA_ACIK' });
  assert.equal(await readFile(`${yol}.kilit`, 'utf8'), once);
  await birak();
  await writeFile(`${yol}.kilit`, JSON.stringify({ pid: 2147483647 }));
  assert.equal(await kilitAl(yol, async () => false), undefined);
  const ikinciBirak = await kilitAl(yol, async () => true);
  await ikinciBirak();
  await assert.rejects(readFile(`${yol}.kilit`), { code: 'ENOENT' });
});
test('5: PowerShell sistem tam yoluyla, başlatıcı güvenilir Node önceliğiyle çalışır', async () => {
  assert.equal(powershellYolu, join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'));
  const cmd = await readFile(new URL('../kasa.cmd', import.meta.url), 'utf8');
  assert.match(cmd, /%ProgramFiles%\\nodejs\\node.exe/);
  assert.match(cmd, /where.exe \$PATH:node.exe/);
  assert.match(cmd, /if errorlevel 1 pause/);
});
test('6: Pano sonuçları ayrılır; büyük bellek bloğunun ilk 32 baytı karşılaştırılır', () => {
  const betik = panoBetigi({ isaret: 'a'.repeat(32) });
  for (const sonuc of ['TEMIZLENDI', 'YOK', 'HATA']) assert.ok(betik.includes(`"${sonuc}"`));
  assert.match(betik, /GlobalSize\(bellek\).ToUInt64\(\) < \(ulong\)beklenen.Length/);
  assert.equal(temizlemeSonucu('TEMIZLENDI'), 'TEMIZLENDI');
  assert.equal(temizlemeSonucu('YOK'), 'YOK');
  for (const deger of ['HATA', '', undefined, 'bilinmeyen']) assert.equal(temizlemeSonucu(deger), 'HATA');
});
function sahtePano(sonuclar, son = 'TEMIZLENDI') {
  const isler = []; let deneme = 0, sonDeneme = 0;
  const pano = new PanoOturumu({ temizle: async () => { deneme++; return sonuclar.shift() ?? 'HATA'; },
    sonDene: () => { sonDeneme++; return son; }, zamanla: (is, sure) => { const zaman = { is, sure }; isler.push(zaman); return zaman; },
    iptal: zaman => { if (zaman) zaman.iptal = true; } });
  return { pano, isler, deneme: () => deneme, sonDeneme: () => sonDeneme };
}
test('6: Pano hatasında işaret korunur, 5 saniyede en fazla üç tekrar ve çıkış son denemesi yapılır', async () => {
  const { pano, isler, deneme, sonDeneme } = sahtePano([], 'HATA');
  pano.izle('a'); assert.equal(isler[0].sure, 30000);
  for (let i = 0; i < 4; i++) { await isler[i].is(); assert.equal(pano.isaret, 'a'); }
  assert.equal(deneme(), 4); assert.equal(isler.length, 4);
  assert.ok(isler.slice(1).every(x => x.sure === 5000));
  assert.equal(pano.bitir(), 'HATA'); assert.equal(sonDeneme(), 1);
});
test('6: YOK ve TEMIZLENDI işareti bırakır; yeni kopya eski zamanlayıcıyı iptal eder', async () => {
  for (const sonuc of ['YOK', 'TEMIZLENDI']) {
    const { pano, isler, sonDeneme } = sahtePano([sonuc]);
    pano.izle('a'); pano.izle('b'); assert.equal(isler[0].iptal, true);
    await isler[1].is(); assert.equal(pano.isaret, undefined);
    pano.bitir(); assert.equal(sonDeneme(), 0);
  }
});
test('7: Tarihli yedek doğrulanmadan yayımlanmaz; başarısızlıkta geçici dosya kalmaz', async t => {
  const { yol, dizin, kasa } = await ortam(t), once = await readFile(yol);
  await kaydet(yol, kasa, sifre, hizli);
  assert.deepEqual(await readFile(`${yol}.bak`), once);
  await assert.rejects(yedekAl(yol, 'yanlış'));
  assert.deepEqual((await readdir(dizin)).sort(), ['kasa.age', 'kasa.age.bak']);
  const bilgi = await yedekAl(yol, sifre);
  assert.deepEqual(await readFile(bilgi.yol), await readFile(yol));
  assert.ok(!(await readdir(dizin)).some(x => x.includes('.tmp.')));
});
test('8: Kart önce sırları gizler, yalnız seçilen alanı açar ve ekranı temizler', async () => {
  for (const secim of ['', '1', '2']) {
    const satirlar = []; let temiz = false;
    const { sor } = sorucu([() => { assert.ok(!satirlar.join('\n').includes(eski.parola)); assert.ok(!satirlar.join('\n').includes(eski.not)); return secim; }, '']);
    await kartGoster(eski, false, sor, x => satirlar.push(x), () => { temiz = true; });
    const metin = satirlar.join('\n');
    assert.equal(metin.includes(eski.parola), secim === '1'); assert.equal(metin.includes(eski.not), secim === '2');
    assert.ok(metin.includes(eski.kullanici)); assert.ok(metin.includes(eski.adres)); assert.ok(temiz);
  }
});
test('8: Env kartı adları, dosya kartı üst bilgiyi gösterir; not varsayılan gizlidir', async () => {
  let satirlar = [];
  await kartGoster({ ...eski, tur: 'env', degerler: { AD: 'env-sırrı' } }, false, sorucu(['', '']).sor, x => satirlar.push(x), () => {});
  assert.match(satirlar.join('\n'), /AD: GİZLİ/); assert.ok(!satirlar.join('\n').includes('env-sırrı'));
  satirlar = [];
  await kartGoster({ ...eski, tur: undefined, boyutBayt: 12, sha256: 'a'.repeat(64) }, true, sorucu(['1', '']).sor, x => satirlar.push(x), () => {});
  assert.match(satirlar.join('\n'), /Boyut: 12 bayt/); assert.match(satirlar.join('\n'), /SHA-256: a{64}/);
  assert.ok(satirlar.join('\n').includes(eski.not));
});

function terminal(t) {
  const giris = new PassThrough(); giris.isTTY = true; giris.setRawMode = x => { giris.isRaw = x; };
  let ekran = '';
  const cikis = new Writable({ write(ham, kod, bitti) { ekran += ham.toString(); bitti(); } }); cikis.isTTY = true;
  const girdi = new Girdi({ giris, cikis }); t.after(() => girdi.kapat());
  return { giris, girdi, ekran: () => ekran };
}
for (const veri of ['abc\r\nsonraki', 'abc\nsonraki\n', 'abc\rsonraki']) {
  test('10: Çok satırlı tek yapıştırma reddedilir ve sonraki soruya sızmaz', async t => {
    const { giris, girdi, ekran } = terminal(t);
    const bir = girdi.sor('Gizli: ', true); giris.write(veri);
    await assert.rejects(bir, { kod: 'COK_SATIR' });
    const iki = girdi.sor('Görünür: '); giris.write('yeni\r');
    assert.equal(await iki, 'yeni'); assert.ok(!ekran().includes('abc')); assert.ok(!ekran().includes('sonraki'));
  });
}
test('10: Sonda tek CRLF olan yapıştırma normal tek satırdır', async t => {
  const { giris, girdi } = terminal(t); const bir = girdi.sor('Gizli: ', true);
  giris.write('abc\r\n'); assert.equal(await bir, 'abc');
  const iki = girdi.sor('Sonraki: '); giris.write('devam\r'); assert.equal(await iki, 'devam');
});
test('11: Onaylar Türkçe harf ve boşluk duyarsız; PowerShell tek tırnak kaçışı yalnız dış tek tırnakta çözülür', () => {
  for (const metin of ['evet', ' EVET ', ' Evet ']) assert.equal(evet(metin), true);
  assert.equal(evet('evet değil'), false);
  assert.equal(yolTemizle("& 'C:\\Ali''nin dosyası'"), "C:\\Ali'nin dosyası");
  assert.equal(yolTemizle('"C:\\Ali\'\'nin"'), "C:\\Ali''nin");
  assert.equal(yolTemizle("C:\\Ali''nin"), "C:\\Ali''nin");
});
test('12: 25 MiB ve toplam 100 MiB sınırları dahildir, üstü reddedilir', async t => {
  const { dizin } = await ortam(t); const mib = 1024 * 1024;
  assert.doesNotThrow(() => boyutDenetle(25 * mib, 75 * mib));
  assert.throws(() => boyutDenetle(25 * mib + 1), { kod: 'DOSYA_COK_BUYUK' });
  assert.throws(() => boyutDenetle(1, 100 * mib), { kod: 'TOPLAM_BOYUT_ASIMI' });
  const yol = join(dizin, 'buyuk'); const dosya = await open(yol, 'wx');
  try { await dosya.truncate(25 * mib + 1); } finally { await dosya.close(); }
  await assert.rejects(dosyaHazirla(yol), { kod: 'DOSYA_COK_BUYUK' });
  const kucuk = join(dizin, 'kucuk'); await writeFile(kucuk, 'x');
  await assert.rejects(dosyaHazirla(kucuk, 'Genel', '', 100 * mib), { kod: 'TOPLAM_BOYUT_ASIMI' });
});

async function menu(yanitlar, bagimliliklar = {}) {
  const { sor, sorular } = sorucu(yanitlar);
  const eskiLog = console.log, eskiYaz = process.stdout.write, eskiKod = process.exitCode;
  const eskiArg = process.argv; process.argv = process.argv.slice(0, 2);
  let metin = '';
  console.log = (...args) => { metin += args.join(' ') + '\n'; };
  process.stdout.write = () => true;
  try {
    process.exitCode = 0;
    await calistir({ girdiOlustur: () => ({ sor, kapat() {} }), secenekler: hizli, ...bagimliliklar });
    assert.equal(yanitlar.length, 0, 'Tüm sorular yanıtlanmalı');
    return { metin, sorular, kod: process.exitCode };
  } finally { console.log = eskiLog; process.stdout.write = eskiYaz; process.exitCode = eskiKod; process.argv = eskiArg; }
}
test('9: Normal çıkış 0, otomatik kilit ve mesajlı oturum sonu 2 verir; kilit silinir', async t => {
  const { yol } = await ortam(t);
  assert.equal((await menu([sifre, '0'])).kod, 0);
  const sonuc = await menu([sifre, new OturumSonu('Otomatik kilitlendi')]);
  assert.equal(sonuc.kod, 2); assert.match(sonuc.metin, /Otomatik kilitlendi/);
  await assert.rejects(readFile(`${yol}.kilit`), { code: 'ENOENT' });
});
test('2, 11: Her iki çıkarma menüsü kasayı korur ve tam şifresiz hedefi gösterir', async t => {
  const { yol, kasa, dizin } = await ortam(t);
  kasa.kayitlar.push({ ...eski, id: 'env-1', ad: 'env', tur: 'env', degerler: { AD: 'deneme' } });
  const kaynak = join(dizin, 'deneme.bin'); await writeFile(kaynak, 'dosya');
  kasa.dosyalar.push(await dosyaHazirla(kaynak)); await kaydet(yol, kasa, sifre, hizli);
  const once = await readFile(yol);
  for (const islem of ['7', '8']) {
    const sonuc = await menu([sifre, islem, '1', yol, '0']);
    assert.ok(sonuc.metin.includes(cevirMetin('hata.SIFRESIZ_HEDEF_YASAK'))); assert.deepEqual(await readFile(yol), once);
    const hedef = join(dizin, `cikan-${islem}`);
    const yazim = await menu([sifre, islem, '1', hedef, '0']);
    assert.ok(yazim.metin.includes(`${resolve(hedef)} — Bu dosya ŞİFRESİZ yazılacak`));
    assert.ok((await readFile(hedef)).length);
  }
});
test('3, 11: Silme onayı seçilen adı gösterir, EVET kabul edilir; boş dosya menüsü dönülür', async t => {
  const { yol } = await ortam(t);
  const sonuc = await menu([sifre, ' 7 ', '9', ' 1 ', '1', ' EVET ', '0']);
  assert.match(sonuc.metin, /Henüz dosya yok/);
  assert.ok(sonuc.sorular.some(x => x.mesaj === "'Hesabım' silinsin mi? Onay için evet yazın: "));
  assert.deepEqual((await oku(yol, sifre)).kayitlar, []);
});
test('11: Doğrulama mevcut kasa ve yedek ayrımını tam yolla bildirir', async t => {
  const { yol } = await ortam(t); const yedek = await yedekAl(yol, sifre);
  const sonuc = await menu([sifre, '13', '', '13', yedek.yol, '0']);
  assert.ok(sonuc.metin.includes(`Mevcut kasa sağlam: ${resolve(yol)}`));
  assert.ok(sonuc.metin.includes(`Yedek sağlam: ${yedek.yol}`));
});
test('11: Şifre değişimi eski yerel yedek için açık soru sorar ve sonraki güncelleme çalışır', async t => {
  const { yol } = await ortam(t), yeni = 'yeni-deneme-ana-şifresi';
  const sonuc = await menu([sifre, '11', sifre, yeni, yeni, '', '5', eski.ad, 'EVET', '', '', '', '', '', '', '', '0']);
  assert.ok(sonuc.sorular.some(x => x.mesaj.includes(`${yol}.bak, ESKİ şifreyle açılır) silinsin mi?`) && x.mesaj.endsWith(' ')));
  assert.equal((await oku(yol, yeni)).kayitlar[0].parola, eski.parola);
  assert.match(sonuc.metin, /Kaydedildi/);
});

test('6: Yazıcı süreci hata verirse işaretle temizleme denenir; hata sürerse işaret çıkış için saklanır', async () => {
  // Gerçek alt süreç başlatılmaz, gerçek panoya hiçbir çağrı yapılmaz.
  for (const temizleme of ['TEMIZLENDI', 'HATA']) {
    let temizlenen, argumanlar;
    const baslat = (yol, args) => {
      assert.equal(yol, powershellYolu); argumanlar = args;
      const surec = new EventEmitter(); surec.stdout = new PassThrough();
      surec.stdin = new Writable({ write(veri, kod, bitti) { bitti(); } });
      surec.kill = () => {};
      setImmediate(() => surec.emit('close', 1));
      return surec;
    };
    await assert.rejects(panoyaKopyala('bellekteki-deneme-sırrı', { baslat,
      temizle: async isaret => { temizlenen = isaret; return temizleme; } }), hata => {
      assert.equal(hata.kod, 'PANO_HATASI');
      assert.match(temizlenen, /^[a-f0-9]{32}$/);
      assert.equal(hata.panoIsareti, temizleme === 'HATA' ? temizlenen : undefined);
      assert.ok(!argumanlar.join(' ').includes('bellekteki-deneme-sırrı'));
      return true;
    });
  }
});
test('3, 6, 9: Kopyalama seçilen adı bildirir; çıkışta pano temizlenemezse uyarı ve kod 2 verir', async t => {
  await ortam(t);
  const { pano } = sahtePano([], 'HATA'); let kopyalanan;
  const sonuc = await menu([sifre, '4', '1', ' 1 ', '0'], { pano,
    panoyaYaz: async deger => { kopyalanan = deger; return 'a'; } });
  assert.equal(kopyalanan, eski.parola);
  assert.ok(sonuc.metin.includes("Seçilen kayıt: 'Hesabım'"));
  assert.ok(sonuc.metin.includes('Pano temizlenemedi; başka bir şey kopyalayarak panoyu temizleyin.'));
  assert.equal(sonuc.kod, 2);
});
test('4: Kilit onayı reddedilirse mevcut kilit korunur ve oturum açılmaz', async t => {
  const { yol } = await ortam(t); const birak = await kilitAl(yol, () => false);
  const once = await readFile(`${yol}.kilit`);
  const sonuc = await menu([]);
  assert.equal(sonuc.kod, 1); assert.match(sonuc.metin, /Kasa başka pencerede açık/);
  assert.deepEqual(await readFile(`${yol}.kilit`), once); await birak();
});
test('9: Üç başarısız şifre sonrası mesaj görünür kalır; kasa ve kilit korunur', async t => {
  const { yol } = await ortam(t); const once = await readFile(yol);
  const sonuc = await menu(['yanlış', 'yanlış', 'yanlış']);
  assert.equal(sonuc.sorular.length, 3); assert.equal(sonuc.kod, 1);
  assert.match(sonuc.metin, /Kalan deneme: 2/); assert.match(sonuc.metin, /Kalan deneme: 1/);
  assert.deepEqual(await readFile(yol), once);
  await assert.rejects(readFile(`${yol}.kilit`), { code: 'ENOENT' });
});

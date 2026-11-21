import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join, delimiter } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { oku, kaydet, kasaYolu } from '../src/kasa.mjs';
import { envCoz } from '../src/env.mjs';
import { tarihBicimle } from '../src/tarih.mjs';
import { ortam, sur, sha, kur, anahtar, SIFRE, YENI, NOT, DEGER, PAROLA } from './yardimci/uctan-uca.mjs';

// Gerçek age şifrelemesi; yalnız scrypt maliyeti mevcut test seçeneğiyle düşürülür.
// Zararlı ad fikstürü dışında kasa değişiklikleri menülerden yapılır.
test('Uçtan uca A: ikili/metin/boş dosyalar ve sürüklenen yollar, yeniden açma ve güvenli çıkarma', async t => {
  const { kok, yol } = await ortam(t);
  const kaynak = join(kok, 'kaynak'), hedef = join(kok, 'cikan');
  await fs.mkdir(kaynak); await fs.mkdir(hedef);
  const dosyalar = [
    ['a b.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), randomBytes(8193)])],
    ['Fatura Şubat ğüçöıİ.pdf', Buffer.concat([Buffer.from('%PDF-1.7\n'), randomBytes(4097), Buffer.from('\n%%EOF')])],
    ['Türkçe metin.txt', Buffer.from('İstanbul ışık ğüçöıİ\nİkinci satır 😀\r\n', 'utf8')],
    ['bos.bin', Buffer.alloc(0)], ['suruklenen.bin', randomBytes(257)]
  ];
  const ekle = [...kur];
  for (const [i, [ad, veri]] of dosyalar.entries()) {
    const p = join(kaynak, ad); await fs.writeFile(p, veri);
    ekle.push('6', i === 0 ? `"${p}"` : i === 4 ? `& '${p}'` : p, 'Belgeler', NOT);
  }
  const ilk = await sur([...ekle, '0']);
  assert.equal(ilk.kod, 0); assert.equal(ilk.satirlar.filter(x => x === 'Kaydedildi.').length, 5);
  const once = sha(await fs.readFile(yol));
  const korunan = [yol, `${yol}.bak`, `${yol}.tmp`, `${yol}.tmp.deneme`, join(kok, 'baska.age'), `${yol}.kilit`];
  const yanitlar = [SIFRE];
  for (const p of korunan) yanitlar.push('7', '1', p);
  const varolan = join(hedef, 'varolan.png'); await fs.writeFile(varolan, 'eski-hedef');
  yanitlar.push('7', '1', varolan, '', '7', '1', varolan, 'hayır');
  for (const [i] of dosyalar.entries()) yanitlar.push('7', String(i + 1), `& '${hedef}'`);
  const ikinci = await sur([...yanitlar, '0']);
  assert.equal(ikinci.kod, 0);
  assert.equal(ikinci.satirlar.filter(x => x.includes('şifresiz içerik buraya yazılamaz')).length, 6);
  assert.ok(ikinci.ekran.includes(join(hedef, dosyalar[0][0])));
  assert.equal(await fs.readFile(varolan, 'utf8'), 'eski-hedef');
  assert.equal(sha(await fs.readFile(yol)), once);
  for (const [ad, veri] of dosyalar) {
    const cikan = await fs.readFile(join(hedef, ad));
    assert.equal(sha(cikan), sha(veri)); assert.deepEqual(cikan, veri);
  }
  await assert.rejects(fs.stat(`${yol}.tmp.deneme`), { code: 'ENOENT' });
  await assert.rejects(fs.stat(`${yol}.tmp`), { code: 'ENOENT' });
  await assert.rejects(fs.stat(join(kok, 'baska.age')), { code: 'ENOENT' });
  const onay = await sur([SIFRE, '7', '1', varolan, 'evet', '0']);
  assert.match(onay.ekran, /SHA-256 doğrulamasıyla çıkarıldı/);
  assert.deepEqual(await fs.readFile(varolan), dosyalar[0][1]);
  const ayniAd = join(hedef, dosyalar[0][0]);
  await fs.writeFile(ayniAd, 'korunacak');
  const red = await sur([SIFRE, '7', '1', hedef, '', '7', '1', hedef, 'hayır', '0']);
  assert.equal(red.sorular.filter(x => x.mesaj.includes('Üzerine yazmak')).length, 2);
  assert.equal(await fs.readFile(ayniAd, 'utf8'), 'korunacak');
  await sur([SIFRE, '7', '1', hedef, 'evet', '0']);
  assert.deepEqual(await fs.readFile(ayniAd), dosyalar[0][1]);
});

test('Uçtan uca: klasör hedefinde zararlı asıl adlar ve türetilen yol korumaları', async t => {
  const { kok, yol } = await ortam(t);
  const kaynak = join(kok, 'kaynak.bin'), hedef = join(kok, 'cikan');
  const veri = randomBytes(1031);
  await fs.mkdir(hedef); await fs.writeFile(kaynak, veri);
  await sur([...kur, '6', kaynak, '', NOT, '0']);
  const kasa = await oku(yol, SIFRE), ornek = kasa.dosyalar[0];
  const adlar = [
    ['..\\x', 'x'], ['a/b', 'b'], ['con', '_con'], ['NUL.txt', '_NUL.txt'],
    ['a:b?c*.txt. ', 'a_b_c_.txt'], ['..', '_'], ['a..b', 'a_b']
  ];
  const yasak = ['baska.age', 'kasa.age', 'kasa.age.bak', 'kasa.age.kilit', 'kasa.age.tmp.deneme'];
  kasa.dosyalar = [...adlar.map(([ad]) => ad), ...yasak].map((ad, i) => ({ ...ornek, id: `test-${i}`, ad }));
  await kaydet(yol, kasa, SIFRE, { isFaktoru: 4 });
  const once = await fs.readFile(yol);
  const yanitlar = [SIFRE];
  for (let i = 0; i < adlar.length; i++) yanitlar.push('7', String(i + 1), hedef);
  for (let i = 0; i < yasak.length; i++) yanitlar.push('7', String(adlar.length + i + 1), kok);
  const sonuc = await sur([...yanitlar, '0']);
  assert.equal(sonuc.kod, 0);
  for (const [, guvenliAd] of adlar) {
    assert.deepEqual(await fs.readFile(join(hedef, guvenliAd)), veri);
    assert.ok(sonuc.ekran.includes(join(hedef, guvenliAd)));
  }
  assert.deepEqual((await fs.readdir(hedef)).sort(), adlar.map(([, ad]) => ad).sort());
  await assert.rejects(fs.stat(join(kok, 'x')), { code: 'ENOENT' });
  assert.equal(sonuc.satirlar.filter(x => x.includes('şifresiz içerik buraya yazılamaz')).length, yasak.length);
  assert.deepEqual(await fs.readFile(yol), once);
});

test('Uçtan uca: .env klasöre kayıt adıyla çıkarılır ve onaysız ezilmez', async t => {
  const { kok } = await ortam(t), hedef = join(kok, 'masaustu');
  await fs.mkdir(hedef);
  const sonuc = await sur([...kur, '5', 'a/con', '3', '', NOT, '', 'TOKEN', DEGER, '',
    '8', '1', `"${hedef}"`, '0']);
  const dosya = join(hedef, '_con.env');
  assert.equal(sonuc.kod, 0); assert.ok(sonuc.ekran.includes(dosya));
  assert.deepEqual({ ...envCoz(await fs.readFile(dosya, 'utf8')) }, { TOKEN: DEGER });
  await fs.writeFile(dosya, 'korunacak');
  const red = await sur([SIFRE, '8', '1', hedef, '', '0']);
  assert.ok(red.sorular.some(x => x.mesaj.includes('Üzerine yazmak')));
  assert.equal(await fs.readFile(dosya, 'utf8'), 'korunacak');
  await sur([SIFRE, '8', '1', hedef, 'evet', '0']);
  assert.deepEqual({ ...envCoz(await fs.readFile(dosya, 'utf8')) }, { TOKEN: DEGER });
});

test('Uçtan uca A sınırlar: 25 MiB kabul, +1 red, 100 MiB kabul ve aşımı red; tek oturum', async t => {
  const { kok, yol } = await ortam(t), MiB = 1024 * 1024;
  const yanitlar = [...kur];
  // Dört ayrı gerçek 25 MiB dosya: sınırlar bellek içi sahte nesneyle geçilmez.
  for (let i = 0; i < 4; i++) {
    const p = join(kok, `sinir-${i}.bin`);
    await fs.writeFile(p, Buffer.alloc(25 * MiB, i + 1));
    yanitlar.push('6', p, 'Sınırlar', NOT);
  }
  const buyuk = join(kok, 'bir-fazla.bin'), bir = join(kok, 'bir.bin');
  const tutamac = await fs.open(buyuk, 'wx');
  try { await tutamac.truncate(25 * MiB + 1); } finally { await tutamac.close(); }
  await fs.writeFile(bir, Buffer.from([255]));
  yanitlar.push('6', buyuk, '', NOT, '6', bir, '', NOT, '1', '', '0');
  const sonuc = await sur(yanitlar);
  assert.equal(sonuc.kod, 0);
  assert.equal(sonuc.satirlar.filter(x => x === 'Kaydedildi.').length, 4);
  assert.match(sonuc.ekran, /Dosya çok büyük \(en fazla 25 MiB\)/);
  assert.match(sonuc.ekran, /Toplam dosya boyutu en fazla 100 MiB/);
  const kasa = await oku(yol, SIFRE);
  assert.equal(kasa.dosyalar.length, 4);
  assert.equal(kasa.dosyalar.reduce((n, x) => n + x.boyutBayt, 0), 100 * MiB);
  for (const dosya of kasa.dosyalar) assert.equal(dosya.sha256, sha(await fs.readFile(join(kok, dosya.ad))));
});

test('Uçtan uca B: ilk kurulum, tüm kayıt alanları, boş Enter ile güncelleme, silme ve kart gizliliği', async t => {
  const { yol } = await ortam(t);
  const ilk = await sur([...kur, ...anahtar(),
    '5', 'E-posta', '2', 'Kişisel', NOT, 'kullanici@example.test', PAROLA, 'https://example.test',
    '5', 'Silinecek', '1', 'Geçici', NOT, 'silinecek-gizli-deger', '0'], { gizliler: ['silinecek-gizli-deger'] });
  assert.match(ilk.ekran, /Dil \/ Language/); assert.match(ilk.ekran, /Yeni kasa kurulacak/);
  assert.equal(ilk.sorular.filter(x => x.gizli && /ana şifre|Ana şifre/.test(x.mesaj)).length, 2);
  for (const mesaj of ['Tür: 1 anahtar, 2 hesap, 3 env: ', 'Kategori (boş = Genel): ',
    'Not (gizli, boş = yok): ', 'Değer (gizli): ', 'Kullanıcı adı / e-posta: ', 'Adres (site): ']) {
    assert.ok(ilk.sorular.some(x => x.mesaj === mesaj));
  }
  assert.ok(!ilk.sorular.some(x => /koru|mevcut \/ Genel/.test(x.mesaj)));
  const once = await oku(yol, SIFRE);
  const guncel = await sur([SIFRE,
    '5', 'İstanbul ışık', 'evet', '', '', '', '',
    '5', 'E-posta', 'evet', '', '', '', '', '', '', '',
    '9', '1', '1', '', '1', '',
    '9', '1', '1', 'evet', '1', '',
    '3', '1', '1', '', '', '0']);
  // Güncelleme seçili kaydı sona taşır: Silinecek, İstanbul, E-posta.
  assert.equal(guncel.kod, 0);
  const sonra = await oku(yol, SIFRE);
  assert.equal(sonra.kayitlar.length, 2);
  for (const kayit of sonra.kayitlar) {
    const eski = once.kayitlar.find(x => x.id === kayit.id);
    assert.ok(eski);
    const { guncellemeTarihi: a, ...alanlar } = kayit;
    const { guncellemeTarihi: b, ...eskiAlanlar } = eski;
    assert.deepEqual(alanlar, eskiAlanlar);
  }
  assert.ok(!sonra.kayitlar.some(x => x.ad === 'Silinecek'));
  assert.match(guncel.ekran, /GİZLİ/);
  assert.ok(guncel.sorular.some(x => x.mesaj === 'Kullanıcı adı / e-posta (boş = koru): '));
  assert.ok(guncel.satirlar.includes(`Güncelleme tarihi: ${tarihBicimle(sonra.kayitlar[0].guncellemeTarihi, 'tr')}`));
  const acik = await sur([SIFRE, '3', '1', '1', '1', '', '0'], { acik: [DEGER] });
  assert.equal(acik.satirlar.filter(x => x === `Değer: ${DEGER}`).length, 1);
  assert.ok(!acik.ekran.includes(NOT));
});

test('Uçtan uca B: kategori, Türkçe arama, panoya kopyalama ve 30 saniyelik temizleme', async t => {
  await ortam(t);
  let bas = 0;
  const sonuc = await sur([...kur, ...anahtar(),
    '5', 'Diğer kayıt', '1', 'Başka', NOT, 'diger-gizli',
    d => { bas = d.satirlar.length; }, '1', 'iş',
    d => { const x = d.satirlar.slice(bas).join('\n'); assert.match(x, /İstanbul ışık \| anahtar \| İş/); assert.ok(!x.includes('Diğer kayıt |')); },
    ...['İstanbul', 'istanbul', 'ISTANBUL', 'ı'].flatMap(sorgu => [
      d => { bas = d.satirlar.length; }, '2', sorgu,
      d => { assert.match(d.satirlar.slice(bas).join('\n'), /İstanbul ışık \| anahtar/); }
    ]),
    '4', '1', async d => {
      assert.deepEqual(d.kopyalar, [DEGER]); assert.equal(d.zamanlar[0].ms, 30000);
      await d.zamanlar[0].is(); assert.deepEqual(d.temizlenen, ['sahte-pano-1']);
    }, '0'], { gizliler: ['diger-gizli'] });
  assert.match(sonuc.ekran, /Panoya kopyalandı/);
  assert.deepEqual(sonuc.son, []); assert.ok(sonuc.zamanlar[0].iptal);
});

test('Uçtan uca C: .env içe/dışa aktarma, yeniden içe okuma ve karma tırnak reddi', async t => {
  const { kok, yol } = await ortam(t);
  const kaynak = join(kok, 'girdi.env'), hedef = join(kok, 'cikti.env'), red = join(kok, 'red.env');
  const beklenen = { TOKEN: 'env-gizli-token', TEXT: 'env gizli boşluk ğüç', QUOTE: "env'gizli", DOUBLE: 'env"gizli', EMPTY: '' };
  await fs.writeFile(kaynak, `# açıklama\n\nTOKEN=${beklenen.TOKEN}\nTEXT="${beklenen.TEXT}"\nQUOTE="${beklenen.QUOTE}"\nDOUBLE='${beklenen.DOUBLE}'\nEMPTY=\n`);
  const karma = `karma'gizli"deger`;
  const sonuc = await sur([...kur,
    '5', 'Ortam', '3', 'Geliştirme', NOT, `"${kaynak}"`,
    '8', '1', hedef,
    '5', 'Geri okunan', '3', 'Geliştirme', NOT, hedef,
    '5', 'Karma tırnak', '3', 'Geliştirme', NOT, '', 'MIX', karma, '',
    '8', '3', red, '0'], { gizliler: [...Object.values(beklenen), karma] });
  assert.match(sonuc.ekran, /\.env biçimi desteklenmiyor/);
  assert.deepEqual({ ...envCoz(await fs.readFile(hedef, 'utf8')) }, beklenen);
  const kasa = await oku(yol, SIFRE);
  assert.deepEqual(kasa.kayitlar[0].degerler, kasa.kayitlar[1].degerler);
  assert.deepEqual({ ...kasa.kayitlar[0].degerler }, beklenen);
  assert.equal(kasa.kayitlar[2].degerler.MIX, karma);
  await assert.rejects(fs.stat(red), { code: 'ENOENT' });
});

test('Uçtan uca D: üretilen şifre uzunluğu, tüm karakter grupları, geçersiz uzunluklar', async t => {
  await ortam(t);
  const sonuc = await sur([...kur, ...['', '12', '128', ' 32 ', '11', '129', '2.5', '-1', 'abc'].flatMap(x => ['10', x]), '0']);
  assert.deepEqual(sonuc.kopyalar.map(x => x.length), [24, 12, 128, 32]);
  for (const sifre of sonuc.kopyalar) {
    assert.match(sifre, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789\-_.!@#%+=]+$/);
    for (const grup of [/[A-Z]/, /[a-z]/, /[2-9]/, /[\-_.!@#%+=]/]) assert.match(sifre, grup);
  }
  assert.equal(sonuc.satirlar.filter(x => x.includes('12–128 arasında')).length, 5);
  assert.deepEqual(sonuc.son, ['sahte-pano-4']);
});

for (const sil of [false, true]) test(`Uçtan uca E: ana şifre değişimi, .bak ${sil ? 'silinir' : 'saklanır'}`, async t => {
  const { yol } = await ortam(t);
  await sur([...kur, ...anahtar(), '0']);
  const once = await oku(yol, SIFRE);
  const sonuc = await sur([SIFRE, '11', SIFRE, YENI, YENI, sil ? 'evet' : '', '0']);
  assert.match(sonuc.ekran, /Ana şifre değiştirildi ve yeniden okunarak doğrulandı/);
  assert.ok(sonuc.sorular.some(x => x.mesaj.includes('ESKİ şifreyle açılır')));
  assert.deepEqual(await oku(yol, YENI), once);
  const yanlis = await sur([SIFRE, SIFRE, SIFRE]);
  assert.equal(yanlis.kod, 1); assert.match(yanlis.ekran, /Kalan deneme: 1/);
  const yeni = await sur([YENI, '1', '', '0']); assert.match(yeni.ekran, /İstanbul ışık \| anahtar/);
  if (sil) await assert.rejects(fs.stat(`${yol}.bak`), { code: 'ENOENT' });
  else assert.deepEqual(await oku(`${yol}.bak`, SIFRE), once);
});

test('Uçtan uca F: tarihli iki yedek, doğrulama sayıları ve yedeği ayrı kasa olarak açma', async t => {
  const { kok, yol } = await ortam(t), dosya = join(kok, 'belge.txt');
  await fs.writeFile(dosya, 'yedeklenecek belge');
  const sonuc = await sur([...kur, ...anahtar(), '6', dosya, 'Belgeler', NOT,
    '12', '', '12', '', '13', '', '0']);
  const adlar = (await fs.readdir(kok)).filter(x => /^kasa-\d{4}-\d{2}-\d{2}(?:-2)?\.age$/.test(x));
  assert.equal(adlar.length, 2);
  const ilk = adlar.find(x => !x.endsWith('-2.age'));
  assert.ok(adlar.includes(ilk.replace('.age', '-2.age')));
  // Yerel tarih: UTC ile gece yarısı etrafında yanlış gün karşılaştırılmaz.
  const tarih = new Date();
  assert.equal(ilk, `kasa-${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, '0')}-${String(tarih.getDate()).padStart(2, '0')}.age`);
  assert.match(sonuc.ekran, /Mevcut kasa sağlam:.*1 kayıt, 1 dosya/);
  assert.equal(sonuc.satirlar.filter(x => x.startsWith('Yedek alındı ve doğrulandı:')).length, 2);
  const kasa = await oku(yol, SIFRE);
  process.env.KASA_DOSYA = join(kok, ilk);
  const yedek = await sur([SIFRE, '13', '', '1', '', '0']);
  assert.match(yedek.ekran, /1 kayıt, 1 dosya/); assert.match(yedek.ekran, /belge.txt \| dosya/);
  assert.deepEqual(await oku(process.env.KASA_DOSYA, SIFRE), kasa);
});

test('Uçtan uca G: dil değiştirme, kalıcı İngilizce açılış ve yes onayı', async t => {
  const { yol } = await ortam(t);
  const ilk = await sur([...kur, ...anahtar(), '14', '2', '0']);
  assert.match(ilk.ekran, /1\) List entries/);
  const ikinci = await sur([[ /Master password/i, SIFRE ], '9', '1', '1', 'yes', '1', '', '0']);
  assert.match(ikinci.ekran, /0\) Exit/); assert.match(ikinci.ekran, /Saved\./);
  assert.ok(!ikinci.ekran.includes('1) Kayıtları listele'));
  assert.equal((await oku(yol, SIFRE)).kayitlar.length, 0);
});

test('Uçtan uca G: İngilizce yeni hesap soruları, güncelleme ve yerel kart tarihi', async t => {
  const { yol } = await ortam(t);
  process.env.KASA_DIL = 'en';
  const ilk = await sur([SIFRE, SIFRE, '5', 'Account',
    [/^Type: 1\) Key  2\) Account  3\) Env: $/, '2'],
    [/^Category \(blank = General\): $/, ''],
    [/^Note \(hidden, blank = none\): $/, ''],
    [/^Username \/ email: $/, 'user@example.test'],
    [/^Password \(hidden, blank = generate strong password\): $/, PAROLA],
    [/^Address \(website\): $/, 'https://example.test'], '0']);
  assert.equal(ilk.kod, 0);
  const once = (await oku(yol, SIFRE)).kayitlar[0];
  const sonuc = await sur([SIFRE, '5', 'Account', 'yes',
    [/blank when updating = keep/, ''], [/blank = current \/ General/, ''],
    [/blank = keep/, ''], [/blank = keep/, ''], [/blank = keep current/, ''], '',
    [/website, blank = keep/, ''], '3', '1', '1', '', '', '0']);
  assert.equal(sonuc.kod, 0);
  const sonra = (await oku(yol, SIFRE)).kayitlar[0];
  assert.deepEqual({ ...sonra, guncellemeTarihi: once.guncellemeTarihi }, once);
  assert.equal(new Date(sonra.guncellemeTarihi).toISOString(), sonra.guncellemeTarihi);
  assert.ok(sonuc.satirlar.includes(`Last updated: ${tarihBicimle(sonra.guncellemeTarihi, 'en')}`));
  assert.ok(!sonuc.ekran.includes(sonra.guncellemeTarihi));
});

test('Uçtan uca H: üç yanlış şifre, bozuk dosyanın korunması ve .bak üzerinden kurtarma', async t => {
  const { yol } = await ortam(t);
  await sur([...kur, ...anahtar(), '5', 'İkinci', '1', '', NOT, 'ikinci-gizli', '0'], { gizliler: ['ikinci-gizli'] });
  const once = sha(await fs.readFile(yol));
  const yanlis = 'deneme-ana-sifre-yanlis';
  const sonuc = await sur([yanlis, yanlis, yanlis], { gizliler: [yanlis] });
  assert.equal(sonuc.kod, 1); assert.equal(sonuc.sorular.length, 3);
  assert.match(sonuc.ekran, /Kalan deneme: 2/); assert.match(sonuc.ekran, /Kalan deneme: 1/);
  assert.equal(sha(await fs.readFile(yol)), once);
  await fs.writeFile(yol, Buffer.from('bozuk age kasa\x00\xff'));
  const bozukOzet = sha(await fs.readFile(yol));
  const bozuk = await sur([SIFRE, SIFRE, SIFRE]);
  assert.equal(bozuk.kod, 1); assert.match(bozuk.ekran, /Ana şifre yanlış veya dosya bozuk/);
  assert.equal(sha(await fs.readFile(yol)), bozukOzet);
  process.env.KASA_DOSYA = `${yol}.bak`;
  const kurtar = await sur([SIFRE, '1', '', '13', '', '0']);
  assert.equal(kurtar.kod, 0); assert.match(kurtar.ekran, /İstanbul ışık \| anahtar/);
  assert.match(kurtar.ekran, /1 kayıt, 0 dosya/);
  assert.equal((await oku(`${yol}.bak`, SIFRE)).kayitlar[0].deger, DEGER);
  assert.equal(sha(await fs.readFile(yol)), bozukOzet);
});

test('Uçtan uca H: canlı PID ile ikinci oturum engellenir, kilit korunur', async t => {
  const { yol } = await ortam(t);
  await sur([...kur, ...anahtar(), '0']);
  const once = sha(await fs.readFile(yol));
  // İlk CLI oturumu gerçekten açıkken ikinci calistir çağrısı yapılır.
  await sur([SIFRE, async () => {
    const kilit = await fs.readFile(`${yol}.kilit`);
    assert.equal(JSON.parse(kilit).pid, process.pid);
    const ikinci = await sur([]);
    assert.equal(ikinci.kod, 1); assert.match(ikinci.ekran, /Kasa başka pencerede açık/);
    assert.deepEqual(await fs.readFile(`${yol}.kilit`), kilit);
  }, '0']);
  assert.equal(sha(await fs.readFile(yol)), once);
  await assert.rejects(fs.stat(`${yol}.kilit`), { code: 'ENOENT' });
});

test('Uçtan uca H: atomik rename hatası önceki kasayı korur ve geçici dosyayı temizler', async t => {
  const { kok, yol } = await ortam(t);
  await sur([...kur, ...anahtar(), '0']);
  const once = await fs.readFile(yol), kasa = await oku(yol, SIFRE), rename = fs.rename;
  let sayi = 0;
  try {
    fs.rename = async (a, b) => {
      if (b === yol) { sayi++; throw Object.assign(new Error('sahte rename hatası'), { code: 'EACCES' }); }
      return rename(a, b);
    };
    syncBuiltinESMExports();
    const sonuc = await sur([SIFRE, ...anahtar('Kaydedilemeyen'), '1', '', '0']);
    assert.match(sonuc.ekran, /Dosyaya erişim izni yok/);
    assert.ok(!sonuc.ekran.includes('Kaydedilemeyen | anahtar'));
  } finally { fs.rename = rename; syncBuiltinESMExports(); }
  assert.equal(sayi, 1); assert.deepEqual(await fs.readFile(yol), once);
  assert.ok(!(await fs.readdir(kok)).some(x => x.includes('.tmp.')));
  const yeniden = await sur([SIFRE, '1', '', '0']); assert.match(yeniden.ekran, /İstanbul ışık \| anahtar/);
  assert.deepEqual(await oku(yol, SIFRE), kasa);
});

test('Uçtan uca H: oturum açıkken dış değişiklik kaydı reddeder', async t => {
  const { yol } = await ortam(t);
  await sur([...kur, ...anahtar(), '0']);
  const gecerli = await fs.readFile(yol);
  let disVeri;
  const sonuc = await sur([SIFRE, async () => {
    // Geçerli başka age dosyası üretmeden şifreli baytı değiştir: özet denetimi önce çalışmalı.
    disVeri = Buffer.from(gecerli); disVeri[disVeri.length - 1] ^= 1; await fs.writeFile(yol, disVeri);
  }, ...anahtar('Reddedilen'), '1', '', '0']);
  assert.match(sonuc.ekran, /bu oturum dışında değişti/);
  assert.ok(!sonuc.ekran.includes('Reddedilen | anahtar'));
  assert.deepEqual(await fs.readFile(yol), disVeri);
  await fs.writeFile(yol, gecerli);
  assert.equal((await oku(yol, SIFRE)).kayitlar.length, 1);
});

for (const secim of ['tasi-sil', 'tasi-sakla', 'eski', 'cakisma']) {
  test(`Uçtan uca I: göç ${secim}`, async t => {
    await ortam(t);
    const eski = join(process.env.USERPROFILE, 'Kasa', 'kasa.age');
    process.env.KASA_DOSYA = eski;
    await sur([...kur, ...anahtar(), '0']);
    const kasa = await oku(eski, SIFRE), once = await fs.readFile(eski);
    delete process.env.KASA_DOSYA;
    const yeni = kasaYolu();
    if (secim === 'cakisma') {
      await fs.mkdir(join(process.env.LOCALAPPDATA, 'kasa'), { recursive: true });
      await fs.writeFile(yeni, once);
      const tarih = new Date(2026, 10, 21, 23, 31, 38, 785);
      await fs.utimes(eski, tarih, tarih); await fs.utimes(yeni, tarih, tarih);
      for (const dil of ['tr', 'en']) {
        process.env.KASA_DIL = dil;
        const sonuc = await sur([]);
        assert.equal(sonuc.kod, 2);
        assert.match(sonuc.ekran, dil === 'tr' ? /İki konumda da kasa bulundu/ : /both locations/);
        const son = `${dil === 'tr' ? 'Son değişiklik: 21.11.2026' : 'Last modified: 2026-11-21'} 23:31`;
        for (const yol of [eski, yeni]) assert.ok(sonuc.satirlar.some(x => x.includes(yol) && x.endsWith(son)));
        assert.ok(!sonuc.ekran.includes(tarih.toISOString()));
      }
      assert.deepEqual(await fs.readFile(eski), once); assert.deepEqual(await fs.readFile(yeni), once);
    } else if (secim === 'eski') {
      const sonuc = await sur(['2', SIFRE, '1', '', '0']);
      assert.match(sonuc.ekran, /İstanbul ışık \| anahtar/);
      assert.deepEqual(await fs.readFile(eski), once);
      await assert.rejects(fs.stat(yeni), { code: 'ENOENT' });
    } else {
      const sil = secim === 'tasi-sil';
      const sonuc = await sur(['1', SIFRE, sil ? 'evet' : '', '1', '', '0']);
      assert.match(sonuc.ekran, /Yeni kopya SHA-256 ve ana şifreyle doğrulandı/);
      assert.match(sonuc.ekran, /İstanbul ışık \| anahtar/);
      assert.deepEqual(await oku(yeni, SIFRE), kasa);
      assert.deepEqual(await fs.readFile(yeni), once);
      if (sil) {
        await assert.rejects(fs.stat(eski), { code: 'ENOENT' });
        await assert.rejects(fs.stat(`${eski}.bak`), { code: 'ENOENT' });
        const tekrar = await sur([SIFRE, '1', '', '0']); assert.equal(tekrar.kod, 0);
      } else {
        assert.deepEqual(await fs.readFile(eski), once);
        assert.match(sonuc.ekran, /Eski kasa saklandı/);
      }
    }
  });
}

test('Uçtan uca J: resmi age.exe ve batchpass ile iki yönlü JSON uyumu', {
  skip: !(process.env.AGE_EXE && process.env.AGE_BATCHPASS_KLASOR)
    ? 'AGE_EXE ve AGE_BATCHPASS_KLASOR tanımlı değil; resmi araç uyumu isteğe bağlı.' : false
}, async t => {
  const { kok, yol } = await ortam(t), kaynak = join(kok, 'age-ikili.bin');
  await fs.writeFile(kaynak, randomBytes(1031));
  await sur([...kur, ...anahtar(), '6', kaynak, 'Uyum', NOT, '0']);
  const kasa = await oku(yol, SIFRE);
  // PATH yalnız alt sürecin ortamında genişletilir; process.env ve kullanıcı PATH'i korunur.
  const env = { ...process.env, AGE_PASSPHRASE: SIFRE,
    PATH: `${process.env.AGE_BATCHPASS_KLASOR}${delimiter}${process.env.PATH ?? ''}` };
  const resmi = (args, input) => {
    const sonuc = spawnSync(process.env.AGE_EXE, args, { env, input, windowsHide: true,
      timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(sonuc.error); assert.equal(sonuc.status, 0, sonuc.stderr?.toString());
    return sonuc.stdout;
  };
  const json = resmi(['-d', '-j', 'batchpass', yol]);
  assert.deepEqual(JSON.parse(json.toString('utf8')), kasa);
  const ters = join(kok, 'resmi.age');
  await fs.writeFile(ters, resmi(['-e', '-j', 'batchpass'], Buffer.from(JSON.stringify(kasa))));
  process.env.KASA_DOSYA = ters;
  const sonuc = await sur([SIFRE, '1', '', '13', '', '0']);
  assert.equal(sonuc.kod, 0); assert.match(sonuc.ekran, /İstanbul ışık \| anahtar/);
  assert.match(sonuc.ekran, /1 kayıt, 1 dosya/);
  assert.deepEqual(await oku(ters, SIFRE), kasa);
});

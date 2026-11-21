import test from 'node:test';
import assert from 'node:assert/strict';
import { envCoz, envYaz } from '../src/env.mjs';
import { ara, kategoriyeGore, kategoriler } from '../src/arama.mjs';
import { sifreUret } from '../src/uret.mjs';
import { panoBetigi, panoArgumanlari } from '../src/pano-win.mjs';

test('.env yazma ve okuma özel karakterleri kayıpsız korur', () => {
  const degerler = {
    BOSLUK: ' başta ortada sonda ', KARE: 'a#b', DOLAR: '$AD ${AD}',
    TEK: "bir'iki", CIFT: 'bir"iki', TURKCE: 'İstanbul ığüşöç',
    BOS: '', GUVENLI: 'AZaz09_-./:@+,', TERS: String.raw`C:\bir\iki`,
    __proto__: null,
  };
  Object.defineProperty(degerler, '__proto__', { value: 'değer', enumerable: true });
  const metin = envYaz(degerler);
  assert.deepEqual({ ...envCoz(metin) }, { ...degerler });
  assert.ok(metin.includes("DOLAR='$AD ${AD}'\n"));
  assert.ok(metin.includes('TEK="bir\'iki"\n'));
  assert.ok(metin.includes('BOS=\n'));
  assert.ok(metin.includes('GUVENLI=AZaz09_-./:@+,\n'));
  assert.equal(envYaz({}), '');
});

test('.env ayrıştırıcısının önceki davranışı korunur', () => {
  assert.deepEqual({ ...envCoz('\uFEFF# açıklama\r\n\r\nexport AD = " boşluk "\r\nKARE=a#b\nTEK=\'x\'\nBOS=') },
    { AD: ' boşluk ', KARE: 'a#b', TEK: 'x', BOS: '' });
  for (const metin of ['HATALI', '1AD=x', 'AD="eksik', "AD='"]) {
    assert.throws(() => envCoz(metin), { kod: 'GECERSIZ_ENV_BICIMI' });
  }
});

test('.env geçersiz adları ve satır sonlarını değeri hataya katmadan reddeder', () => {
  for (const ad of ['', '1AD', 'AD-X', 'AD\nYENI', 'ŞİFRE']) {
    assert.throws(() => envYaz({ [ad]: 'deneme' }), { kod: 'GECERSIZ_ENV_ADI' });
  }
  for (const deger of ['gizli\nsatır', 'gizli\rsatır', 'gizli\r\nsatır', 'gizli\u2028satır', 'gizli\u2029satır', 5]) {
    assert.throws(() => envYaz({ AD: deger }), { kod: 'GECERSIZ_ENV_BICIMI' });
  }
});

const ogeler = [
  { ad: 'GITHUB', kategori: 'Hesaplar', not: 'Kod deposu', deger: 'aranmayacak-sır' },
  { ad: 'İstanbul', kategori: 'Şehir', not: 'github bağlantısı' },
  { ad: 'Başka', kategori: 'API', not: 'İSTANBUL sunucusu' },
  { ad: 'Çeşme', kategori: 'şehir', not: '' },
];

test('Türkçe arama ad, kategori ve notta NFC ve I/İ eşitlemesi yapar', () => {
  for (const aranan of ['GITHUB', 'github', 'gıthub']) assert.deepEqual(ara(ogeler, aranan), ogeler.slice(0, 2));
  for (const aranan of ['İstanbul', 'istanbul', 'I\u0307stanbul']) assert.deepEqual(ara(ogeler, aranan), ogeler.slice(1, 3));
  assert.deepEqual(ara(ogeler, 'şehir'), [ogeler[1], ogeler[3]]);
  assert.deepEqual(ara(ogeler, 'C\u0327es\u0327me'), [ogeler[3]]);
  assert.deepEqual(ara(ogeler, 'aranmayacak-sır'), []);
  assert.deepEqual(ara(ogeler, ''), ogeler);
});

test('Kategori filtresi tam eşleşir; kategoriler Türkçe sıralı ve tekildir', () => {
  assert.deepEqual(kategoriyeGore(ogeler, 'ŞEHİR'), [ogeler[1], ogeler[3]]);
  assert.deepEqual(kategoriyeGore(ogeler, 'hesap'), []);
  assert.deepEqual(kategoriyeGore(ogeler, ''), ogeler);
  assert.deepEqual(kategoriler(ogeler), ['API', 'Hesaplar', 'Şehir']);
  assert.deepEqual(kategoriler([{ kategori: 'GITHUB' }, { kategori: 'github' }]), ['GITHUB']);
  assert.deepEqual(kategoriler([]), []);
});

test('Üretilen şifreler uzunluk, dört karakter grubu ve karışmayan alfabe koşullarını sağlar', () => {
  assert.equal(sifreUret().length, 24);
  for (const uzunluk of [12, 24, 128]) {
    for (let i = 0; i < 100; i++) {
      const sifre = sifreUret(uzunluk);
      assert.equal(sifre.length, uzunluk);
      assert.match(sifre, /[A-Z]/); assert.match(sifre, /[a-z]/);
      assert.match(sifre, /[2-9]/); assert.match(sifre, /[-_.!@#%+=]/);
      assert.doesNotMatch(sifre, /[IlO01]/);
      assert.match(sifre, /^[A-HJ-NP-Za-km-z2-9_.!@#%+=-]+$/);
    }
  }
});

test('Şifre üretici sınır dışı veya tam sayı olmayan uzunlukları reddeder', () => {
  for (const uzunluk of [0, 11, 129, -1, 12.5, NaN, Infinity, '24', null]) {
    assert.throws(() => sifreUret(uzunluk), { kod: 'GECERSIZ_SIFRE_UZUNLUGU' });
  }
});

// Gerçek panoya erişilmez; yalnızca kaynak/argüman üretimi incelenir.
test('Pano betikleri ve argümanları sır içermez; temizleyici yalnız işaret alır', () => {
  const sir = 'SADECE-BELLEKTE-deneme-9726';
  const isaret = '0123456789abcdef0123456789abcdef';
  for (const secenekler of [undefined, { isaret }]) {
    const betik = panoBetigi(secenekler), argumanlar = panoArgumanlari(secenekler);
    assert.deepEqual(argumanlar.slice(0, 3), ['-NoProfile', '-NonInteractive', '-EncodedCommand']);
    assert.equal(Buffer.from(argumanlar[3], 'base64').toString('utf16le'), betik);
    for (const bicim of [sir, Buffer.from(`${sir}\0`, 'utf16le').toString('base64')]) {
      assert.equal(betik.includes(bicim), false);
      assert.equal(argumanlar.some(x => x.includes(bicim)), false);
    }
    assert.doesNotMatch(betik, /clip\.exe|Set-Clipboard/i);
    assert.doesNotMatch(betik, /GetClipboardSequenceNumber|SIRA:|\bsira\b/);
  }
  const yazici = panoBetigi(), temizleyici = panoBetigi({ isaret });
  for (const bicim of ['ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory', 'CanUploadToCloudClipboard']) {
    assert.ok(yazici.includes(bicim));
  }
  assert.ok(yazici.includes('Console.OpenStandardInput()'));
  assert.ok(yazici.includes('byte[] isaret = new byte[32]'));
  assert.ok(yazici.includes('Koy(RegisterClipboardFormat("KasaPanoIsareti"), isaret)'));
  assert.ok(yazici.includes('Array.Clear(kod')); assert.ok(yazici.includes('Array.Clear(veri'));
  assert.ok(temizleyici.includes(`[Pano]::Temizle('${isaret}')`));
  assert.ok(temizleyici.includes('RegisterClipboardFormat("KasaPanoIsareti")'));
  assert.ok(temizleyici.includes('if (!IsClipboardFormatAvailable(bicim)) return "YOK";'));
  assert.ok(temizleyici.includes('GetClipboardData(bicim)'));
  assert.ok(temizleyici.includes('GlobalSize(bellek).ToUInt64() < (ulong)beklenen.Length'));
  assert.ok(temizleyici.includes('GlobalLock(bellek)'));
  assert.ok(temizleyici.includes('if (Marshal.ReadByte(veri, i) != beklenen[i]) return "YOK";'));
  assert.ok(temizleyici.includes('finally { GlobalUnlock(bellek); }'));
  assert.ok(temizleyici.includes('finally { CloseClipboard(); }'));
  assert.ok(temizleyici.includes('!EmptyClipboard()'));
  assert.doesNotMatch(temizleyici, /DateTime|long son|TAMAM/);
  assert.doesNotMatch(temizleyici, /OpenStandardInput|FromBase64|static void Koy|static void Yaz/);
  for (const isaret of ['komut', '', 'a'.repeat(31), 'a'.repeat(33), 'g'.repeat(32), "'".repeat(32), 'a'.repeat(32) + '\n', 123, null, {}]) {
    assert.throws(() => panoBetigi({ isaret }), { kod: 'PANO_HATASI' });
    assert.throws(() => panoArgumanlari({ isaret }), { kod: 'PANO_HATASI' });
  }
  for (const isaret of ['0'.repeat(32), 'f'.repeat(32)]) {
    assert.ok(panoBetigi({ isaret }).includes(`[Pano]::Temizle('${isaret}')`));
  }
});

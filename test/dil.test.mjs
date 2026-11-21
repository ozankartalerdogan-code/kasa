import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cevir, dilAyarla, dilAyarOku, dilAyarYaz, dilAyarYolu,
  dilSor, etkinDil, sozluk, t, varsayilanDil
} from '../src/dil.mjs';
import { calistir } from '../src/cli.mjs';
import { kasaYolu, kaydet } from '../src/kasa.mjs';
import { yeniKasa } from '../src/sema.mjs';
import { evet } from '../src/kayit-ui.mjs';
import { nodeSurumHatasi } from '../src/surum.mjs';

function yerTutucular(metin) {
  return [...new Set([...metin.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m => m[1]))].sort();
}

function geciciOrtam(tCtx) {
  const eskiYerel = process.env.LOCALAPPDATA;
  tCtx.after(() => { if (eskiYerel === undefined) delete process.env.LOCALAPPDATA; else process.env.LOCALAPPDATA = eskiYerel; });
  const eskiDosya = process.env.KASA_DOSYA;
  const eskiDil = process.env.KASA_DIL;
  const eskiAktif = etkinDil();
  tCtx.after(() => {
    if (eskiDosya === undefined) delete process.env.KASA_DOSYA; else process.env.KASA_DOSYA = eskiDosya;
    if (eskiDil === undefined) delete process.env.KASA_DIL; else process.env.KASA_DIL = eskiDil;
    dilAyarla(eskiAktif);
  });
}

test('tr ve en sözlükleri birebir aynı anahtarlara ve yer tutuculara sahiptir', () => {
  const trAnahtarlar = Object.keys(sozluk.tr).sort();
  const enAnahtarlar = Object.keys(sozluk.en).sort();
  assert.deepEqual(enAnahtarlar, trAnahtarlar);
  for (const anahtar of trAnahtarlar) {
    assert.equal(typeof sozluk.tr[anahtar], 'string');
    assert.equal(typeof sozluk.en[anahtar], 'string');
    assert.ok(sozluk.tr[anahtar].length > 0, `Boş tr değeri: ${anahtar}`);
    assert.ok(sozluk.en[anahtar].length > 0, `Boş en değeri: ${anahtar}`);
    assert.deepEqual(
      yerTutucular(sozluk.en[anahtar]),
      yerTutucular(sozluk.tr[anahtar]),
      `Yer tutucular eşleşmiyor: ${anahtar}`
    );
  }
});

test('t() değişkenleri yerleştirir ve eksik anahtarda Türkçeye düşer', tCtx => {
  geciciOrtam(tCtx);
  dilAyarla('en');
  assert.equal(etkinDil(), 'en');
  assert.equal(t('islem4.secilen', { ad: 'github' }), "Selected entry: 'github'");
  dilAyarla('tr');
  assert.equal(etkinDil(), 'tr');
  assert.equal(t('islem4.secilen', { ad: 'github' }), "Seçilen kayıt: 'github'");
  assert.equal(cevir({ tr: { ornek: 'Merhaba {ad}' }, en: {} }, 'en', 'ornek', { ad: 'kasa' }), 'Merhaba kasa');
});

test('varsayilanDil saf fonksiyonu locale değerine göre tr veya en döndürür', () => {
  assert.equal(varsayilanDil('tr'), 'tr');
  assert.equal(varsayilanDil('tr-TR'), 'tr');
  assert.equal(varsayilanDil('TR-tr'), 'tr');
  assert.equal(varsayilanDil('en-US'), 'en');
  assert.equal(varsayilanDil('de-DE'), 'en');
  assert.equal(varsayilanDil(''), 'en');
  assert.equal(varsayilanDil(null), 'en');
});

test('ayarlar.json okuma, yazma, bozuk dosya ve KASA_DIL önceliği', async tCtx => {
  geciciOrtam(tCtx);
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-dil-'));
  tCtx.after(() => rm(dizin, { recursive: true, force: true }));
  process.env.LOCALAPPDATA = dizin;
  process.env.KASA_DOSYA = join(dizin, 'kasa.age');
  delete process.env.KASA_DIL;

  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: null, kaynak: 'yok' });

  await dilAyarYaz(kasaYolu(), 'en');
  assert.equal(await readFile(dilAyarYolu(kasaYolu()), 'utf8'), '{"dil":"en"}');
  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: 'en', kaynak: 'dosya' });

  process.env.KASA_DIL = 'tr';
  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: 'tr', kaynak: 'ortam' });

  process.env.KASA_DIL = 'gecersiz';
  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: 'en', kaynak: 'dosya' });

  delete process.env.KASA_DIL;
  await writeFile(dilAyarYolu(kasaYolu()), '{bozuk json', 'utf8');
  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: null, kaynak: 'yok' });

  await writeFile(dilAyarYolu(kasaYolu()), '{"dil":"fr"}', 'utf8');
  assert.deepEqual(await dilAyarOku(kasaYolu()), { dil: null, kaynak: 'yok' });
});

test('dilSor varsayılanı locale göre gösterir ve geçersiz girişte yeniden sorar', async () => {
  const sorular = [];
  const yanitlar = ['', '9', '2'];
  const yazilan = [];
  const sor = async m => { sorular.push(m); return yanitlar.shift(); };
  const yaz = m => yazilan.push(m);

  assert.equal(await dilSor(sor, yaz, 'tr-TR'), 'tr');
  assert.equal(sorular[0], 'Seçim / Choice [1]: ');

  sorular.length = 0;
  assert.equal(await dilSor(sor, yaz, 'en-US'), 'en');
  assert.equal(sorular[0], 'Seçim / Choice [2]: ');
  assert.equal(sorular[1], 'Seçim / Choice [2]: ');
  assert.ok(yazilan.some(m => m.includes('Geçersiz seçim')));
});

test('evet() hem evet hem yes onaylarını kabul eder', () => {
  for (const deger of ['evet', 'EVET', ' evet ', 'yes', 'YES', ' Yes ']) {
    assert.equal(evet(deger), true);
  }
  for (const deger of ['', 'hayır', 'no', 'y']) {
    assert.equal(evet(deger), false);
  }
});

test('nodeSurumHatasi etkin dile göre mesaj üretir', tCtx => {
  geciciOrtam(tCtx);
  assert.equal(nodeSurumHatasi('v24.0.0'), '');
  dilAyarla('tr');
  assert.match(nodeSurumHatasi('v18.19.0'), /Node\.js 24 veya üstünü/);
  dilAyarla('en');
  assert.match(nodeSurumHatasi('v18.19.0'), /Node\.js 24 or later/);
});

async function dilOturumu(tCtx, yanitlar) {
  geciciOrtam(tCtx);
  const dizin = await mkdtemp(join(tmpdir(), 'kasa-dil-akis-'));
  tCtx.after(() => rm(dizin, { recursive: true, force: true }));
  process.env.LOCALAPPDATA = dizin;
  process.env.KASA_DOSYA = join(dizin, 'kasa.age');
  delete process.env.KASA_DIL;
  const sifre = 'yalnız-deneme-ana-şifresi';
  await kaydet(kasaYolu(), yeniKasa(), sifre, { isFaktoru: 4 });
  const sorular = [];
  const eskiKod = process.exitCode;
  tCtx.after(() => { process.exitCode = eskiKod; });
  tCtx.mock.method(console, 'log', () => {});
  tCtx.mock.method(process.stdout, 'write', () => true);
  // node --test dosya argümanlarını CLI seçeneği sanmasın.
  const eskiArg = process.argv;
  process.argv = process.argv.slice(0, 2);
  tCtx.after(() => { process.argv = eskiArg; });
  return { sifre, sorular, async calistir() {
    process.exitCode = 0;
    await calistir({
      girdiOlustur: () => ({ async sor(mesaj, gizli = false) {
        sorular.push({ mesaj, gizli });
        assert.ok(yanitlar.length, `Beklenmeyen soru: ${mesaj}`);
        return yanitlar.shift();
      }, kapat() {} }),
      pano: { bitir: () => 'YOK' },
      panoyaYaz: () => assert.fail('Gerçek panoya erişilmemeli')
    });
    assert.equal(process.exitCode, 0);
    assert.equal(yanitlar.length, 0);
  } };
}

for (const [locale, dil, numara] of [['tr-TR', 'tr', '1'], ['en-US', 'en', '2']]) {
  test(`İlk açılışta dil ana şifreden önce sorulur; Enter ${locale} için ${dil} kaydeder`, async tCtx => {
    const yanitlar = [];
    const oturum = await dilOturumu(tCtx, yanitlar);
    tCtx.mock.method(Intl, 'DateTimeFormat', () => ({ resolvedOptions: () => ({ locale }) }));
    yanitlar.push('', oturum.sifre, '0');
    await oturum.calistir();
    assert.deepEqual(oturum.sorular[0], { mesaj: `Seçim / Choice [${numara}]: `, gizli: false });
    assert.equal(oturum.sorular[1].gizli, true);
    assert.equal(etkinDil(), dil);
    assert.equal(await readFile(dilAyarYolu(kasaYolu()), 'utf8'), JSON.stringify({ dil }));
  });
}

test('Kaydedilmiş dil ilk açılış sorusunu atlatır', async tCtx => {
  const yanitlar = [];
  const oturum = await dilOturumu(tCtx, yanitlar);
  await dilAyarYaz(kasaYolu(), 'en');
  yanitlar.push(oturum.sifre, '0');
  await oturum.calistir();
  assert.deepEqual(oturum.sorular[0], { mesaj: 'Master password: ', gizli: true });
  assert.equal(etkinDil(), 'en');
});

test('KASA_DIL soruyu atlatır; menü 14 dili hemen değiştirip sonraki açılışa kaydeder', async tCtx => {
  const yanitlar = [];
  const oturum = await dilOturumu(tCtx, yanitlar);
  process.env.KASA_DIL = 'en';
  yanitlar.push(oturum.sifre, '14', '1', '0');
  await oturum.calistir();
  assert.deepEqual(oturum.sorular[0], { mesaj: 'Master password: ', gizli: true });
  assert.equal(oturum.sorular.at(-1).mesaj, 'Seçiminiz: ');
  assert.equal(etkinDil(), 'tr');
  assert.equal(await readFile(dilAyarYolu(kasaYolu()), 'utf8'), '{"dil":"tr"}');
  delete process.env.KASA_DIL;
  oturum.sorular.length = 0;
  yanitlar.push(oturum.sifre, '0');
  await oturum.calistir();
  assert.deepEqual(oturum.sorular[0], { mesaj: 'Ana şifre: ', gizli: true });
});

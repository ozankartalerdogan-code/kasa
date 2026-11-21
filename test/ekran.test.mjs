import test from 'node:test';
import assert from 'node:assert/strict';
import { tarihBicimle } from '../src/tarih.mjs';
import { dilAyarla, etkinDil, t } from '../src/dil.mjs';
import { kayitSor, kartGoster } from '../src/kayit-ui.mjs';

test('Tarih biçimleme yerel saati, gün/yıl geçişini ve iki dili korur', ctx => {
  const oncekiTZ = process.env.TZ;
  ctx.after(() => { if (oncekiTZ === undefined) delete process.env.TZ; else process.env.TZ = oncekiTZ; });
  for (const [TZ, tr, en] of [
    ['Europe/Istanbul', '21.11.2026 23:31', '2026-11-21 23:31'],
    ['UTC', '21.11.2026 20:31', '2026-11-21 20:31'],
    ['America/New_York', '21.11.2026 15:31', '2026-11-21 15:31']
  ]) {
    process.env.TZ = TZ;
    assert.deepEqual(['tr', 'en'].map(dil => tarihBicimle('2026-11-21T20:31:38.785Z', dil)), [tr, en]);
  }
  process.env.TZ = 'Europe/Istanbul';
  assert.equal(tarihBicimle('2026-12-31T21:05:59.999Z', 'tr'), '01.01.2027 00:05');
  const yerel = new Date(2027, 0, 1, 0, 5, 59, 999);
  const once = yerel.getTime();
  assert.equal(tarihBicimle(yerel.toISOString(), 'tr'), '01.01.2027 00:05');
  assert.equal(tarihBicimle(yerel, 'en'), '2027-01-01 00:05');
  assert.equal(yerel.getTime(), once);
  assert.equal(tarihBicimle('geçersiz', 'tr'), 'geçersiz');
});

for (const dil of ['tr', 'en']) test(`Soru metinleri ve kart tarihi: ${dil}`, async ctx => {
  const oncekiDil = etkinDil();
  ctx.after(() => dilAyarla(oncekiDil));
  dilAyarla(dil);
  for (const [tur, yanitlar, alanlar] of [
    ['anahtar', ['1', '', '', ''], ['turSor', 'kategoriSor', 'notSor', 'degerSor']],
    ['hesap', ['2', '', '', '', 'deneme', ''], ['turSor', 'kategoriSor', 'notSor', 'kullaniciSor', 'parolaUretSor', 'adresSor']],
    ['env', ['3', '', '', '', 'AD', '', ''], ['turSor', 'kategoriSor', 'notSor', 'envYolSor', 'envAdSor', 'envDegerSor', 'envAdSor']]
  ]) {
    const sorular = [];
    const { kayit } = await kayitSor(async (mesaj, gizli) => {
      sorular.push({ mesaj, gizli });
      assert.ok(yanitlar.length);
      return yanitlar.shift();
    }, 'Deneme');
    assert.equal(yanitlar.length, 0);
    const ortak = ['parolaUretSor', 'envYolSor', 'envAdSor'];
    assert.deepEqual(sorular.map(x => x.mesaj), alanlar.map(alan => t(`kayit.${ortak.includes(alan) ? '' : 'yeni.'}${alan}`)));
    assert.ok(sorular.every(x => !/koru|mevcut|güncelleme|keep|current|updating/.test(x.mesaj)));
    assert.equal(kayit.kategori, t('ortak.varsayilanKategori'));
    assert.equal(kayit.not, '');
    assert.equal(kayit.tur, tur);
    assert.equal(new Date(kayit.guncellemeTarihi).toISOString(), kayit.guncellemeTarihi);
    const guncelleSorular = [];
    const guncelleYanitlar = tur === 'env' ? ['', '', '', '', 'AD', '', '', ''] : [];
    await kayitSor(async mesaj => { guncelleSorular.push(mesaj); return guncelleYanitlar.shift() ?? ''; }, 'Deneme', kayit);
    for (const alan of alanlar.filter(x => !ortak.includes(x))) {
      assert.ok(guncelleSorular.includes(t(`kayit.${alan}`)));
    }
    for (const dosya of [false, true]) {
      const tarih = new Date(2026, 10, 21, 23, 31, 38, 785).toISOString();
      const oge = { ...kayit, tur: dosya ? undefined : tur, boyutBayt: 0, sha256: '', guncellemeTarihi: tarih };
      const satirlar = [];
      await kartGoster(oge, dosya, async () => '', x => satirlar.push(x), () => {});
      assert.ok(satirlar.includes(`${t('kart.guncelleme')}: ${dil === 'tr' ? '21.11.2026' : '2026-11-21'} 23:31`));
      assert.ok(!satirlar.some(x => x.includes(tarih)));
      assert.equal(oge.guncellemeTarihi, tarih);
    }
  }
});

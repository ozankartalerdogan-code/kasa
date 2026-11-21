import test from 'node:test';
import assert from 'node:assert/strict';
import { yolTemizle } from '../src/yol.mjs';

const yol = String.raw`C:\Users\x\Belgeler\kimlik foto.jpg`;

for (const [ad, girdi, beklenen] of [
  ['çift tırnaklı yol', `"${yol}"`, yol],
  ['tek tırnaklı yol', `'${yol}'`, yol],
  ['PowerShell öneki', `  & '${yol}'  `, yol],
  ['boşluklu Türkçe adlı yol', String.raw`  "C:\Belgeler\Öğrenci kimliği çığ.jpg"  `, String.raw`C:\Belgeler\Öğrenci kimliği çığ.jpg`],
  ['tırnaksız yol', `  ${yol}  `, yol],
  ['yalnız tek tırnak karakteri', "'", "'"],
  ['yalnız çift tırnak karakteri', '"', '"'],
  ['eşleşmeyen tırnaklar', `"${yol}'`, `"${yol}'`],
  ['iç tırnaklar ve ters bölüler', String.raw`"C:\Belgeler\Ali'nin "özel" resmi.jpg"`, String.raw`C:\Belgeler\Ali'nin "özel" resmi.jpg`],
  ['tırnak içindeki kenar boşlukları', '" yol "', ' yol '],
  ['önek olmayan ve işareti', '&dosya.txt', '&dosya.txt'],
  ['boş girdi', '   ', ''],
  ['boş dış tırnaklar', "''", ''],
]) {
  test(`Yol temizleme: ${ad}`, () => {
    assert.equal(yolTemizle(girdi), beklenen);
  });
}

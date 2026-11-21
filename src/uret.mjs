import { randomInt } from 'node:crypto';
import { kodluHata } from './dil.mjs';

const gruplar = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '-_.!@#%+='];
const harfler = gruplar.join('');

export function sifreUret(uzunluk = 24) {
  if (!Number.isInteger(uzunluk) || uzunluk < 12 || uzunluk > 128) {
    throw kodluHata('GECERSIZ_SIFRE_UZUNLUGU');
  }
  while (true) {
    let sifre = '';
    for (let i = 0; i < uzunluk; i++) sifre += harfler[randomInt(harfler.length)];
    if (gruplar.every(grup => [...sifre].some(harf => grup.includes(harf)))) return sifre;
  }
}

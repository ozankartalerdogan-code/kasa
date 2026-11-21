#!/usr/bin/env node
import { baslangicDiliHazirla } from './dil.mjs';
import { nodeSurumHatasi } from './surum.mjs';

baslangicDiliHazirla();
const hata = nodeSurumHatasi(process.version);
if (hata) {
  console.error(hata);
  process.exitCode = 1;
} else {
  const { calistir } = await import('./cli.mjs');
  await calistir();
}

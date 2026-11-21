// Yalnız kur.cmd / kaldir.cmd için dosya ve kullanıcı PATH işlemleri.
import { lstat, readdir, realpath, readFile, mkdir, copyFile, writeFile, unlink, rmdir, rm, rename } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { baslangicDiliHazirla, kodluHata, t, cevir, sozluk } from './dil.mjs';
import { nodeSurumHatasi } from './surum.mjs';


async function baglantiYok(yol, altlari = false) {
  const ust = dirname(yol);
  if (ust !== yol) await baglantiYok(ust);
  let bilgi;
  try { bilgi = await lstat(yol); }
  catch (hata) { if (hata.code === 'ENOENT') return; throw hata; }
  if (bilgi.isSymbolicLink()) throw kodluHata('KURULUM_BAGLANTI');
  if (altlari && bilgi.isDirectory()) {
    for (const ad of await readdir(yol)) await baglantiYok(join(yol, ad), true);
  }
}
async function kurulumDogrula(hedef) {
  await baglantiYok(hedef, true);
  if ((await realpath(hedef)).toLowerCase() !== hedef.toLowerCase()) throw kodluHata('KURULUM_HEDEF');
  const paket = JSON.parse(await readFile(join(hedef, 'package.json'), 'utf8'));
  if (paket.name !== 'kasa' || !(await lstat(join(hedef, 'src', 'cli.mjs'))).isFile()) {
    throw kodluHata('KURULUM_GECERSIZ_HEDEF');
  }
}
async function kopyala(kaynak, hedef) {
  const bilgi = await lstat(kaynak);
  if (bilgi.isSymbolicLink()) throw kodluHata('KURULUM_KAYNAK_BAGLANTI');
  if (bilgi.isDirectory()) {
    await mkdir(hedef, { recursive: true });
    for (const ad of await readdir(kaynak)) await kopyala(join(kaynak, ad), join(hedef, ad));
  } else if (bilgi.isFile()) await copyFile(kaynak, hedef);
  else throw kodluHata('KURULUM_DOSYA_TURU');
}

const manifesto = 'kurulum-listesi.json';
const dagitim = ['package.json', 'package-lock.json', 'src', 'kasa.cmd', 'kur.cmd', 'kaldir.cmd', 'README.md', 'README.tr.md', 'LICENSE', 'SECURITY.md'];
async function varMi(yol) { try { return await lstat(yol); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; } }
async function boslariSil(yol) {
  if (!await varMi(yol)) return;
  for (const ad of await readdir(yol)) { const alt = join(yol, ad); if ((await lstat(alt)).isDirectory()) await boslariSil(alt); }
  if (!(await readdir(yol)).length) await rmdir(yol);
}
async function listeOku(hedef) {
  hedef = resolve(hedef);
  await baglantiYok(hedef, true);
  const liste = JSON.parse(await readFile(join(hedef, manifesto), 'utf8'));
  if (!Array.isArray(liste) || !liste.includes(manifesto) || !liste.every(ad => {
    if (typeof ad !== 'string' || !ad || isAbsolute(ad) || ad.includes(':')) return false;
    if (ad.split(/[/\\]/).some(x => !x || x === '.' || x === '..')) return false;
    return !relative(hedef, resolve(hedef, ad)).startsWith('..') &&
      (ad === 'node_modules' || ad === manifesto || (ad !== 'src' && dagitim.includes(ad)) || ad.startsWith('src/') || ad.startsWith('src\\'));
  })) throw kodluHata('KURULUM_GECERSIZ_HEDEF');
  for (const ad of liste) {
    const bilgi = await varMi(resolve(hedef, ad));
    if (bilgi && !(ad === 'node_modules' ? bilgi.isDirectory() : bilgi.isFile())) throw kodluHata('KURULUM_GECERSIZ_HEDEF');
  }
  return [...new Set(liste)];
}
async function kaldirmaDogrula(hedef) {
  await baglantiYok(hedef, true);
  if (!await varMi(join(hedef, manifesto))) return null;
  return listeOku(hedef);
}
export async function kaldir(hedef) {
  hedef = resolve(hedef);
  if (!await varMi(hedef)) return;
  const liste = await kaldirmaDogrula(hedef);
  if (liste === null) {
    if (!(await readdir(hedef)).length) await rmdir(hedef);
    else kalanBildir(hedef);
    return;
  }
  const sonSira = ad => ad === 'kaldir.cmd' ? 2 : ad === manifesto ? 1 : 0;
  const yollar = liste.sort((a, b) => sonSira(a) - sonSira(b));
  for (const ad of yollar) {
    const yol = resolve(hedef, ad); await baglantiYok(yol, true);
    const bilgi = await varMi(yol); if (!bilgi) continue;
    if (ad === 'node_modules' && bilgi.isDirectory()) await rm(yol, { recursive: true });
    else if (bilgi.isFile()) await unlink(yol);
    else throw kodluHata('KURULUM_GECERSIZ_HEDEF');
  }
  await boslariSil(hedef);
  if (await varMi(hedef)) {
    kalanBildir(hedef);
  }
}
function kalanBildir(yol) {
  for (const dil of ['tr', 'en']) console.log(cevir(sozluk, dil, 'kurulum.kalan', { yol }));
}
export async function hazirla(kaynak, hedef) {
  const yeni = `${hedef}.yeni`;
  await baglantiYok(hedef, true); await baglantiYok(yeni, true);
  if (await varMi(yeni)) {
    if (!(await readdir(yeni)).length) await rmdir(yeni);
    else {
      try { await kaldir(yeni); }
      catch (hata) {
        if (!(hata instanceof SyntaxError) && hata.kod !== 'KURULUM_GECERSIZ_HEDEF' && hata.code !== 'ENOENT') throw hata;
      }
      // Kesilmiş liste veya kullanıcı dosyası varsa silmeden kenara ayır.
      if (await varMi(yeni)) {
        const sakla = `${yeni}.${Date.now()}`;
        await rename(yeni, sakla); kalanBildir(sakla);
      }
    }
  }
  if (await varMi(yeni)) throw kodluHata('KURULUM_HEDEF');
  await mkdir(yeni, { recursive: true });
  const liste = [manifesto, 'node_modules'];
  const say = async yol => {
    const bilgi = await lstat(yol);
    if (bilgi.isSymbolicLink()) throw kodluHata('KURULUM_KAYNAK_BAGLANTI');
    if (bilgi.isDirectory()) { for (const ad of await readdir(yol)) await say(join(yol, ad)); }
    else if (bilgi.isFile()) liste.push(relative(kaynak, yol));
    else throw kodluHata('KURULUM_DOSYA_TURU');
  };
  for (const ad of dagitim) await say(join(kaynak, ad));
  await writeFile(join(yeni, manifesto), JSON.stringify(liste), { flag: 'wx' });
  for (const ad of dagitim) await kopyala(join(kaynak, ad), join(yeni, ad));
  return yeni;
}
export async function etkinlestir(hedef) {
  const yeni = `${hedef}.yeni`, eski = `${hedef}.eski`;
  await kurulumDogrula(yeni); await baglantiYok(hedef, true); await baglantiYok(eski, true);
  await listeOku(yeni);
  if (await varMi(eski)) {
    if (await varMi(join(eski, manifesto))) await kaldir(eski);
    if (await varMi(eski)) {
      const sakla = `${eski}.${Date.now()}`; await rename(eski, sakla);
      kalanBildir(sakla);
    }
  }
  let tasindi = false;
  if (await varMi(hedef)) { await rename(hedef, eski); tasindi = true; }
  try { await rename(yeni, hedef); }
  catch (hata) { if (tasindi) await rename(eski, hedef); throw hata; }
  if (tasindi) {
    // Listesiz eski kurulum, kullanıcı dosyalarını korumak için bırakılır.
    if (await varMi(join(eski, manifesto))) await kaldir(eski);
    else if (!(await readdir(eski)).length) await rmdir(eski);
    else kalanBildir(eski);
  }
}
export function pathBetigi() { return `
param([string]$Anahtar='Environment', [string]$Hedef=$env:KASA_KURULUM_HEDEFI, [string]$Islem=$env:KASA_KURULUM_ISLEMI)
$ErrorActionPreference='Stop'
$k=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($Anahtar)
try {
 $eski=$k.GetValue('Path', $null, 'DoNotExpandEnvironmentNames')
 $tur=if ($null -eq $eski) { [Microsoft.Win32.RegistryValueKind]::ExpandString } else { $k.GetValueKind('Path') }
 $parcalar=@(); if ($null -ne $eski) { $parcalar=@($eski.Split(';')) }
 $esit={param($x) [Environment]::ExpandEnvironmentVariables($x.Trim().Trim([char]34)).TrimEnd([char]92) -ieq $Hedef.TrimEnd([char]92)}
 $yeni=$eski
 if ($Islem -eq 'yol-ekle') {
  if (@($parcalar | Where-Object { & $esit $_ }).Count -eq 0) {
   $yeni=if ([string]::IsNullOrEmpty($eski)) {$Hedef} else {$eski+';'+$Hedef}
  }
 } elseif ($Islem -eq 'yol-cikar') { $yeni=(@($parcalar | Where-Object { -not (& $esit $_) }) -join ';') }
 else { throw 'KURULUM_ISLEM' }
 if ($yeni -cne $eski) {
  $simdi=$k.GetValue('Path', $null, 'DoNotExpandEnvironmentNames')
  if ($simdi -cne $eski -or ($null -ne $eski -and $k.GetValueKind('Path') -ne $tur)) { throw 'KURULUM_PATH' }
  $k.SetValue('Path',$yeni,$tur)
  if (-not ('KasaBildirim' -as [type])) { Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class KasaBildirim { [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, UIntPtr w, string l, uint f, uint t, out UIntPtr r); }' }
  $r=[UIntPtr]::Zero
  [void][KasaBildirim]::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,'Environment',2,5000,[ref]$r)
 }
} finally { $k.Dispose() }
`; }
export async function ana() {
 baslangicDiliHazirla();
 try {
  const islem=process.argv[2];
  if (islem === 'npm-yok' || islem === 'arguman') {
    console.error(t(islem === 'npm-yok' ? 'kurulum.npmYok' : 'kurulum.arguman'));
    process.exitCode=1; return;
  }
  const hata = nodeSurumHatasi(process.version); if (hata) { console.error(hata); process.exitCode=1; return; }
  if (!process.env.LOCALAPPDATA) throw kodluHata('KURULUM_LOCALAPPDATA');
  const hedef=resolve(process.env.LOCALAPPDATA,'Programs','kasa');
  if (islem === 'hazirla') await hazirla(resolve(dirname(fileURLToPath(import.meta.url)), '..'), hedef);
  else if (islem === 'etkinlestir') await etkinlestir(hedef);
  else if (islem === 'kaldirma-dogrula') await kaldirmaDogrula(hedef);
  else if (islem === 'kaldir') await kaldir(hedef);
  else if (['yol-ekle','yol-cikar'].includes(islem)) {
    const sonuc=spawnSync(join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
      ['-NoProfile','-NonInteractive','-Command',pathBetigi()], {stdio:'inherit',windowsHide:true,env:{...process.env,KASA_KURULUM_HEDEFI:hedef,KASA_KURULUM_ISLEMI:islem}});
    if (sonuc.error || sonuc.status !== 0) throw kodluHata('KURULUM_PATH');
  }
  else throw kodluHata('KURULUM_ISLEM');
 } catch (hata) { console.error(hata.code || hata instanceof SyntaxError ? t('kurulum.dosyaHatasi') : (hata.kod ? t('hata.'+hata.kod) : t('kurulum.dosyaHatasi'))); process.exitCode=1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await ana();

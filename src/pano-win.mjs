import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { kodluHata } from './dil.mjs';

export const powershellYolu = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

// Bu kaynak ve üretilen komut satırları yalnız kod ve gizli olmayan işaret içerir.
const ortak = String.raw`
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
public static class Pano {
  [DllImport("user32.dll")] static extern bool OpenClipboard(IntPtr pencere);
  [DllImport("user32.dll")] static extern bool CloseClipboard();
  [DllImport("user32.dll")] static extern bool EmptyClipboard();
  [DllImport("user32.dll")] static extern IntPtr SetClipboardData(uint bicim, IntPtr veri);
  [DllImport("user32.dll")] static extern bool IsClipboardFormatAvailable(uint bicim);
  [DllImport("user32.dll")] static extern IntPtr GetClipboardData(uint bicim);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern uint RegisterClipboardFormat(string ad);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)] static extern IntPtr CreateWindowExW(uint ex, string sinif, string ad, uint stil, int x, int y, int w, int h, IntPtr ust, IntPtr menu, IntPtr ornek, IntPtr param);
  [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr pencere);
  [DllImport("kernel32.dll")] static extern IntPtr GlobalAlloc(uint bayrak, UIntPtr boyut);
  [DllImport("kernel32.dll")] static extern IntPtr GlobalLock(IntPtr bellek);
  [DllImport("kernel32.dll")] static extern UIntPtr GlobalSize(IntPtr bellek);
  [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr bellek);
  [DllImport("kernel32.dll")] static extern IntPtr GlobalFree(IntPtr bellek);
  static void Ac(IntPtr pencere) {
    for (int i = 0; i < 20; i++) {
      if (OpenClipboard(pencere)) return;
      Thread.Sleep(25);
    }
    throw new Exception();
  }
  public static string Temizle(string isaret) {
    byte[] beklenen = System.Text.Encoding.ASCII.GetBytes(isaret);
    try {
    Ac(IntPtr.Zero);
    try {
      uint bicim = RegisterClipboardFormat("KasaPanoIsareti");
      if (bicim == 0) throw new Exception();
      if (!IsClipboardFormatAvailable(bicim)) return "YOK";
      IntPtr bellek = GetClipboardData(bicim);
      if (bellek == IntPtr.Zero || GlobalSize(bellek).ToUInt64() < (ulong)beklenen.Length) return "HATA";
      IntPtr veri = GlobalLock(bellek);
      if (veri == IntPtr.Zero) return "HATA";
      try {
        for (int i = 0; i < beklenen.Length; i++) {
          if (Marshal.ReadByte(veri, i) != beklenen[i]) return "YOK";
        }
      } finally { GlobalUnlock(bellek); }
      if (!EmptyClipboard()) throw new Exception();
      return "TEMIZLENDI";
    } finally { CloseClipboard(); }
    } catch { return "HATA"; }
  }
`;

const yazici = String.raw`
  static void Koy(uint bicim, byte[] veri) {
    if (bicim == 0) throw new Exception();
    IntPtr bellek = GlobalAlloc(0x0042, (UIntPtr)veri.Length);
    if (bellek == IntPtr.Zero) throw new Exception();
    try {
      IntPtr hedef = GlobalLock(bellek);
      if (hedef == IntPtr.Zero) throw new Exception();
      try { Marshal.Copy(veri, 0, hedef, veri.Length); }
      finally { GlobalUnlock(bellek); }
      if (SetClipboardData(bicim, bellek) == IntPtr.Zero) throw new Exception();
      bellek = IntPtr.Zero; // Bundan sonra belleğin sahibi Windows'tur.
    } finally {
      if (bellek != IntPtr.Zero) {
        IntPtr hedef = GlobalLock(bellek);
        if (hedef != IntPtr.Zero) {
          for (int i = 0; i < veri.Length; i++) Marshal.WriteByte(hedef, i, 0);
          GlobalUnlock(bellek);
        }
        GlobalFree(bellek);
      }
    }
  }
  public static void Yaz() {
    Stream giris = Console.OpenStandardInput();
    char[] kod = null;
    byte[] veri = null;
    byte[] isaret = new byte[32];
    try {
      // Gizli olmayan 32 hex karakterlik işaret ilk satırda gelir.
      for (int i = 0; i < isaret.Length; i++) {
        int harf = giris.ReadByte();
        if (!((harf >= 48 && harf <= 57) || (harf >= 97 && harf <= 102))) throw new Exception();
        isaret[i] = (byte)harf;
      }
      if (giris.ReadByte() != 10) throw new Exception();
      // Uzunluk başlığı sır içermez; base64 metni değiştirilebilir dizide okunur.
      int boyut = 0, basamak = 0, b;
      while ((b = giris.ReadByte()) != 10) {
        if (b < 48 || b > 57 || ++basamak > 9) throw new Exception();
        boyut = checked(boyut * 10 + b - 48);
      }
      if (boyut < 4) throw new Exception();
      kod = new char[boyut];
      for (int i = 0; i < boyut; i++) {
        b = giris.ReadByte();
        if (b < 0 || b > 127) throw new Exception();
        kod[i] = (char)b;
      }
      veri = Convert.FromBase64CharArray(kod, 0, kod.Length);
      if (veri.Length < 2 || veri.Length % 2 != 0 || veri[veri.Length - 1] != 0 || veri[veri.Length - 2] != 0) throw new Exception();
      IntPtr pencere = CreateWindowExW(0, "STATIC", "", 0, 0, 0, 0, 0, new IntPtr(-3), IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
      if (pencere == IntPtr.Zero) throw new Exception();
      try {
        Ac(pencere);
        try {
          if (!EmptyClipboard()) throw new Exception();
          try {
            foreach (string ad in new string[] { "ExcludeClipboardContentFromMonitorProcessing", "CanIncludeInClipboardHistory", "CanUploadToCloudClipboard" }) {
              Koy(RegisterClipboardFormat(ad), new byte[4]);
            }
            Koy(13, veri); // CF_UNICODETEXT
            Koy(RegisterClipboardFormat("KasaPanoIsareti"), isaret);
          } catch { EmptyClipboard(); throw; }
        } finally { CloseClipboard(); }
      } finally { DestroyWindow(pencere); }
    } finally {
      if (kod != null) Array.Clear(kod, 0, kod.Length);
      if (veri != null) Array.Clear(veri, 0, veri.Length);
    }
  }
`;

export function panoBetigi({ isaret } = {}) {
  if (isaret !== undefined && (typeof isaret !== 'string' || !/^[0-9a-f]{32}$/.test(isaret))) {
    throw kodluHata('PANO_HATASI');
  }
  const temizleyici = isaret !== undefined;
  return `$ErrorActionPreference = 'Stop'\ntry {\nAdd-Type -TypeDefinition @'\n${ortak}${temizleyici ? '' : yazici}\n}\n'@\n${temizleyici
    ? `[Pano]::Temizle('${isaret}')`
    : '[Pano]::Yaz()'}\nexit 0\n} catch { exit 1 }`;
}

export function panoArgumanlari(secenekler) {
  return ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(panoBetigi(secenekler), 'utf16le').toString('base64')];
}

// Çıktı, süreç başarıyla kapandıktan sonra değerlendirilir.
function bitmesiniBekle(surec) {
  return new Promise((resolve, reject) => {
    let cikti = '';
    const zaman = setTimeout(() => {
      surec.kill();
      reject(kodluHata('PANO_HATASI'));
    }, 15000);
    surec.stdout?.on('data', veri => {
      cikti += veri.toString('ascii');
      if (cikti.length > 64) {
        surec.kill();
        clearTimeout(zaman);
        reject(kodluHata('PANO_HATASI'));
      }
    });
    surec.once('error', () => {
      clearTimeout(zaman);
      reject(kodluHata('PANO_HATASI'));
    });
    surec.once('close', kod => {
      clearTimeout(zaman);
      kod === 0 ? resolve(cikti.trim()) : reject(kodluHata('PANO_HATASI'));
    });
  });
}

export async function panoyaKopyala(metin, { baslat = spawn, temizle = panoyuTemizle } = {}) {
  if (process.platform !== 'win32' || typeof metin !== 'string' || metin.includes('\0')) {
    throw kodluHata('PANO_HATASI');
  }
  let yazan, ham, kod, bitti;
  const isaret = randomBytes(16).toString('hex');
  try {
    yazan = baslat(powershellYolu, panoArgumanlari(), { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    // Hataların içeriği veya alt süreç çıktısı kullanıcıya aktarılmaz.
    yazan.stdin.on('error', () => {});
    bitti = bitmesiniBekle(yazan);
    bitti.catch(() => {});
    ham = Buffer.from(`${metin}\0`, 'utf16le');
    kod = Buffer.from(ham.toString('base64'), 'ascii');
    yazan.stdin.write(`${isaret}\n${kod.length}\n`);
    // Tampon, stdin yazımı tamamlanmadan sıfırlanmaz.
    await Promise.race([bitti.then(() => { if (!yazan.stdin.writableFinished) throw kodluHata('PANO_HATASI'); }),
      new Promise((resolve, reject) => yazan.stdin.end(kod, hata => hata ? reject(hata) : resolve()))]);
    ham.fill(0); kod.fill(0);
    await bitti;
    return isaret;
  } catch {
    yazan?.kill();
    await bitti?.catch(() => {});
    const hata = kodluHata('PANO_HATASI');
    if (yazan && await temizle(isaret) === 'HATA') hata.panoIsareti = isaret;
    throw hata;
  } finally { ham?.fill(0); kod?.fill(0); }
}

function temizlemeArgumanlari(isaret) {
  if (process.platform !== 'win32' || isaret === undefined) throw kodluHata('PANO_HATASI');
  return panoArgumanlari({ isaret });
}

export async function panoyuTemizle(isaret) {
  try {
    const surec = spawn(powershellYolu, temizlemeArgumanlari(isaret),
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    return temizlemeSonucu(await bitmesiniBekle(surec));
  } catch { return 'HATA'; }
}

export function panoyuTemizleSenkron(isaret) {
  try {
    const sonuc = spawnSync(powershellYolu, temizlemeArgumanlari(isaret),
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 });
    return sonuc.error || sonuc.status !== 0 ? 'HATA' : temizlemeSonucu(sonuc.stdout?.toString('ascii').trim());
  } catch { return 'HATA'; }
}

export const temizlemeSonucu = sonuc => ['TEMIZLENDI', 'YOK'].includes(sonuc) ? sonuc : 'HATA';

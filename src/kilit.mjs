import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { kodluHata, t } from './dil.mjs';

export async function kilitAl(yol, onay) {
  const kilit = `${yol}.kilit`;
  await mkdir(dirname(yol), { recursive: true, mode: 0o700 });
  const icerik = JSON.stringify({ pid: process.pid, zaman: new Date().toISOString(), kimlik: randomUUID() });
  while (true) {
    let dosya;
    try { dosya = await open(kilit, 'wx', 0o600); }
    catch (hata) {
      if (hata.code !== 'EEXIST') throw hata;
      let eski;
      try { eski = await readFile(kilit, 'utf8'); } catch (hata) { if (hata.code === 'ENOENT') continue; throw hata; }
      let pid; try { pid = JSON.parse(eski).pid; } catch {}
      if (Number.isInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); throw kodluHata('KASA_ACIK'); }
        catch (hata) { if (hata.code !== 'ESRCH') throw hata.code === 'EPERM' ? kodluHata('KASA_ACIK') : hata; }
      }
      if (!await onay(t('kilit.eskiKilitSil'))) return;
      try { if (await readFile(kilit, 'utf8') === eski) await unlink(kilit); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
      continue;
    }
    try { await dosya.writeFile(icerik); await dosya.sync(); }
    catch (hata) { await dosya.close(); dosya = undefined; await unlink(kilit).catch(() => {}); throw hata; }
    finally { await dosya?.close(); }
    return async () => {
      try { if (await readFile(kilit, 'utf8') === icerik) await unlink(kilit); }
      catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
    };
  }
}

import { emitKeypressEvents } from 'node:readline';
import { kodluHata, t } from './dil.mjs';

export class OturumSonu extends Error {
  constructor(mesaj = '', kod) {
    super(mesaj);
    if (kod) this.kod = kod;
  }
}

// Açık ve gizli sorular aynı okuyucuyu kullanır; gizli sorularda yankılama yapılmaz.
export class Girdi {
  constructor({ giris = process.stdin, cikis = process.stdout, sure = 5 * 60 * 1000 } = {}) {
    if (!giris.isTTY || !cikis.isTTY || typeof giris.setRawMode !== 'function') {
      throw kodluHata('TTY_GEREKLI');
    }
    this.giris = giris; this.cikis = cikis; this.sure = sure;
    this.eskiRaw = Boolean(giris.isRaw);
    this.veri = ham => {
      const metin = ham.toString('utf8');
      const son = /\r\n|\r|\n/.exec(metin);
      this.yut = Boolean(son && son.index + son[0].length < metin.length);
      if (this.yut && this.bekleyen) {
        const soru = this.bekleyen; this.bekleyen = undefined;
        this.cikis.write('\n');
        soru.reject(kodluHata('COK_SATIR'));
      }
    };
    // Parça sınırını keypress olaylarına ayrılmadan önce denetle.
    giris.prependListener('data', this.veri);
    emitKeypressEvents(giris);
    giris.setRawMode(true); giris.resume();
    this.tus = (metin, tus = {}) => {
      this.kur();
      if (this.yut) return;
      if (tus.ctrl && tus.name === 'c') { this.bitir(new OturumSonu()); return; }
      const soru = this.bekleyen;
      if (!soru) return;
      if (tus.name === 'return' || tus.name === 'enter') {
        this.bekleyen = undefined; this.cikis.write('\n'); soru.resolve(soru.deger); return;
      }
      if (tus.name === 'backspace') {
        const harfler = Array.from(soru.deger);
        if (harfler.length) { harfler.pop(); soru.deger = harfler.join(''); if (!soru.gizli) this.cikis.write('\b \b'); }
        return;
      }
      if (metin && !tus.ctrl && !tus.meta && !/[\x00-\x1f\x7f-\x9f]/u.test(metin)) {
        soru.deger += metin;
        if (!soru.gizli) this.cikis.write(metin);
      }
    };
    this.son = () => this.bitir(new OturumSonu());
    process.on('SIGINT', this.son); process.on('SIGTERM', this.son);
    giris.on('keypress', this.tus); giris.on('end', this.son);
    this.kur();
  }
  kur() {
    clearTimeout(this.zaman);
    this.zaman = setTimeout(() => this.bitir(new OturumSonu(t('hata.OTOMATIK_KILIT'), 'OTOMATIK_KILIT')), this.sure);
  }
  sor(mesaj, gizli = false) {
    if (this.hata) return Promise.reject(this.hata);
    this.cikis.write(mesaj);
    return new Promise((resolve, reject) => { this.bekleyen = { resolve, reject, gizli, deger: '' }; });
  }
  bitir(hata) {
    if (this.hata) return;
    this.hata = hata;
    const soru = this.bekleyen; this.bekleyen = undefined;
    soru?.reject(hata); this.kapat();
    // İşlem sırasında da kilitlenme ekranı hemen örter.
    this.cikis.write('\x1b[2J\x1b[3J\x1b[H');
    if (hata.message) this.cikis.write(`${hata.message}\n`);
  }
  kapat() {
    clearTimeout(this.zaman);
    this.giris.removeListener('keypress', this.tus); this.giris.removeListener('end', this.son);
    this.giris.removeListener('data', this.veri);
    process.removeListener('SIGINT', this.son); process.removeListener('SIGTERM', this.son);
    this.giris.setRawMode(this.eskiRaw); this.giris.pause();
  }
}

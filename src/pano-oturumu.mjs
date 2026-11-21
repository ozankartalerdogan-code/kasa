import { panoyuTemizle, panoyuTemizleSenkron } from './pano-win.mjs';
export class PanoOturumu {
  constructor({ temizle = panoyuTemizle, sonDene = panoyuTemizleSenkron,
    zamanla = setTimeout, iptal = clearTimeout } = {}) {
    Object.assign(this, { temizle, sonDene, zamanla, iptal });
    this.isaretler = new Set();
  }
  get isaret() { return [...this.isaretler].at(-1); }
  izle(isaret, sure = 30000, basarili = true) {
    this.iptal(this.zaman);
    if (basarili) this.isaretler.clear();
    this.isaretler.add(isaret);
    this.zaman = this.zamanla(() => this.dene(), sure);
  }
  async dene(_isaret, tekrar = 0) {
    for (const isaret of [...this.isaretler]) {
      let sonuc;
      try { sonuc = await this.temizle(isaret); } catch { sonuc = 'HATA'; }
      if (this.bitti) return;
      if (sonuc === 'TEMIZLENDI' || sonuc === 'YOK') this.isaretler.delete(isaret);
    }
    if (this.isaretler.size && tekrar < 3) this.zaman = this.zamanla(() => this.dene(undefined, tekrar + 1), 5000);
  }
  bitir() {
    this.bitti = true; this.iptal(this.zaman);
    let sonuc = 'YOK';
    for (const isaret of this.isaretler) {
      try { const s = this.sonDene(isaret); if (s === 'HATA') sonuc = 'HATA'; else if (sonuc !== 'HATA' && s === 'TEMIZLENDI') sonuc = s; }
      catch { sonuc = 'HATA'; }
    }
    this.isaretler.clear(); return sonuc;
  }
}

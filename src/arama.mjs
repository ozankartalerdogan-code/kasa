const esitle = metin => metin.normalize('NFC').toLocaleLowerCase('tr-TR').replaceAll('ı', 'i');

export function ara(ogeler, metin) {
  const aranan = esitle(metin);
  return ogeler.filter(oge => [oge.ad, oge.kategori, oge.not].some(alan => esitle(alan).includes(aranan)));
}

export function kategoriyeGore(ogeler, kategori) {
  return kategori === '' ? ogeler : ogeler.filter(oge => esitle(oge.kategori) === esitle(kategori));
}

export function kategoriler(ogeler) {
  const tekil = new Map();
  for (const oge of ogeler) {
    const anahtar = esitle(oge.kategori);
    if (!tekil.has(anahtar)) tekil.set(anahtar, oge.kategori.normalize('NFC'));
  }
  return [...tekil.values()].sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

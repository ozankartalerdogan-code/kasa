// Dil açıkça verilir; saat dilimi sistemin yerel saat dilimidir.
export function tarihBicimle(deger, dil) {
  const tarih = new Date(deger);
  if (Number.isNaN(tarih.getTime())) return String(deger);
  const iki = sayi => String(sayi).padStart(2, '0');
  const yil = String(tarih.getFullYear()).padStart(4, '0');
  const ay = iki(tarih.getMonth() + 1), gun = iki(tarih.getDate());
  const saat = `${iki(tarih.getHours())}:${iki(tarih.getMinutes())}`;
  return `${dil === 'tr' ? `${gun}.${ay}.${yil}` : `${yil}-${ay}-${gun}`} ${saat}`;
}

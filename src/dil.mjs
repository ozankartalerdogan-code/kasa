import { readFileSync } from 'node:fs';
import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ayniYol } from './yol.mjs';
import { dirname, join } from 'node:path';

const tr = {
  'dil.kaydedilemedi': 'Dil ayarı kaydedilemedi; mevcut dosya korundu. Dil bu oturumda geçerli.',
  'hata.KASA_ACIK': 'Kasa başka pencerede açık.',
  'hata.OKUMA_BOYUT': 'Dosya okuma sınırını aşıyor (kasa: 200 MiB, .env: 1 MiB).',
  'hata.HEDEF_KLASOR': 'Hedef bir klasör; dosya yolu seçin.',
  'kurulum.kalan': 'Program klasöründe size ait dosyalar kaldı: {yol}',
  'kurulum.npmYok': 'Node.js ile aynı klasörde npm.cmd bulunamadı. / npm.cmd was not found beside Node.js.',
  'kurulum.arguman': 'Program argüman kabul etmez. / The program does not accept arguments.',

  'dil.secenekler': 'Dil / Language:\n1) Türkçe\n2) English',
  'dil.secimSor': 'Seçim / Choice [{numara}]: ',
  'dil.gecersizSecim': 'Geçersiz seçim. / Invalid choice.',
  'acilis.surum': 'Kasa v{surum}',
  'surum.yetersiz': 'Bu program Node.js 24 veya üstünü gerektirir. Şu an: {surum}. https://nodejs.org adresinden Node.js 24 LTS kurun.',
  'ortak.seciminiz': 'Seçiminiz: ',
  'ortak.varsayilanKategori': 'Genel',
  'ortak.dosyalarBaslik': 'Dosyalar:',
  'ortak.kayitVeyaDosya': '1 kayıt, 2 dosya: ',
  'ortak.henuzDosyaYok': 'Henüz dosya yok.',
  'ortak.henuzKayitYok': 'Henüz kayıt yok.',
  'ortak.sifresizUyari': '{hedef} — Bu dosya ŞİFRESİZ yazılacak',
  'ortak.uzerineYazOnay': 'Hedef var. Üzerine yazmak için evet yazın: ',
  'ortak.kaydedildi': 'Kaydedildi.',
  'ortak.parolaKopyalaOnay': 'Parola panoya kopyalansın mı? (evet) ',
  'giris.anaSifre': 'Ana şifre: ',
  'giris.yanlisKalan': '{mesaj} Kalan deneme: {kalan}',
  'sifre.ipucu': 'Rastgele seçilmiş 4–5 Türkçe kelimeyle bir parola cümlesi oluşturun.',
  'sifre.yeni': 'Yeni ana şifre: ',
  'sifre.tekrar': 'Ana şifreyi tekrar girin: ',
  'sifre.uyusmuyor': 'Şifreler aynı değil. Yeniden deneyin.',
  'kasa.yeni1': 'Yeni kasa kurulacak. En az 12 karakter kullanın.',
  'kasa.yeni2': 'Bu şifreyi kâğıda yazıp saklayın, unutulursa kasa açılamaz.',
  'ozet.boyutSema': 'Boyut: {boyut} bayt | Şema sürümü: {sema}',
  'ozet.guncelleme': 'Son güncelleme: {tarih}',
  'ozet.sha256': 'SHA-256 (şifreli dosya): {sha256}',
  'pano.kopyalandi': 'Panoya kopyalandı. 30 saniye sonra veya kasadan çıkınca silinecek.',
  'pano.temizlenemedi': 'Pano temizlenemedi; başka bir şey kopyalayarak panoyu temizleyin.',
  'kilit.eskiKilitSil': 'Kasa başka bir pencerede açık görünüyor. O pencereyi kapatın. Eski bir kilitse silmek için evet yazın: ',
  'kilit.kaldirilamadi': 'Kilit dosyası kaldırılamadı; sonraki açılışta eski kilidi denetleyin.',
  'liste.numaraSor': 'Listedeki numara: ',
  'menu.liste': '\n1) Kayıtları listele\n2) Ara\n3) Kayıt göster\n4) Panoya kopyala (30 sn sonra silinir)\n5) Yeni kayıt ekle / güncelle\n6) Dosya ekle\n7) Dosya çıkar\n8) .env dosyası olarak çıkar\n9) Kayıt / dosya sil\n10) Şifre üret (panoya kopyalanır)\n11) Ana şifre değiştir\n12) Yedek al\n13) Yedeği doğrula\n14) Dil / Language\n0) Çık',
  'islem1.kategoriler': 'Kategoriler: {liste}',
  'islem1.henuzYok': 'Henüz yok.',
  'islem1.kategoriSor': 'Kategori (boş = hepsi): ',
  'islem2.aranacak': 'Aranacak metin: ',
  'islem4.secilen': "Seçilen kayıt: '{ad}'",
  'islem4.alanSor': '1 parola, 2 kullanıcı adı: ',
  'islem5.adSor': 'Kayıt adı: ',
  'islem5.guncelleOnay': 'Kayıt güncellenecek. Onay için evet yazın: ',
  'islem6.yolSor': 'Eklenecek dosya yolu (dosyayı pencereye sürükleyebilirsiniz): ',
  'islem6.kategoriSor': 'Kategori (boş: Genel): ',
  'islem6.notSor': 'Not (gizli): ',
  'islem7.hedefSor': 'Hedef klasör veya dosya yolu (klasörü pencereye sürükleyebilirsiniz; klasör verirseniz dosya kendi adıyla kaydedilir): ',
  'islem7.cikarildi': 'Dosya SHA-256 doğrulamasıyla çıkarıldı.',
  'islem8.envYok': 'Henüz env kaydı yok.',
  'islem8.hedefSor': 'Hedef klasör veya .env dosya yolu (klasörü pencereye sürükleyebilirsiniz; klasör verirseniz dosya kayıt adıyla kaydedilir): ',
  'islem8.uyari': "Bu dosya şifresizdir; işin bitince sil, git'e ekleme.",
  'islem9.silOnay': "'{ad}' silinsin mi? Onay için evet yazın: ",
  'islem10.uzunlukSor': 'Şifre uzunluğu (boş = 24): ',
  'islem11.mevcutSifre': 'Mevcut ana şifre: ',
  'islem11.degisti': 'Ana şifre değiştirildi ve yeniden okunarak doğrulandı.',
  'islem11.eskiBakUyari': 'Eski yedek ({yol}) hâlâ ESKİ şifreyle açılır.',
  'islem11.bulutUyari': 'Buluttaki veya dış ortamdaki eski yedekler de eski şifreyle açılır; yeni yedeği alıp doğruladıktan sonra eskileri silin.',
  'islem11.kagidaYaz': 'Yeni şifreyi kâğıda yazın.',
  'islem11.bakSilOnay': 'Bu bilgisayardaki eski kasa yedeği ({yol}, ESKİ şifreyle açılır) silinsin mi? Silmek için evet, saklamak için Enter: ',
  'islem11.bakSilindi': 'Eski .bak yedeği silindi.',
  'islem12.hedefSor': 'Hedef klasör (boş = kasa dosyasının klasörü): ',
  'islem12.yedekAlindi': 'Yedek alındı ve doğrulandı: {yol}',
  'islem13.hedefSor': 'Doğrulanacak dosya yolu (boş = mevcut kasa) (dosyayı pencereye sürükleyebilirsiniz): ',
  'islem13.eskiSifreOnay': 'Bu dosya mevcut ana şifreyle açılmadı. Farklı (eski) şifreyle denemek için evet yazın: ',
  'islem13.dosyaSifreSor': 'Dosyanın ana şifresi: ',
  'islem13.mevcutSaglam': 'Mevcut kasa sağlam: {yol} | {kayitSayisi} kayıt, {dosyaSayisi} dosya, tüm dosya özetleri doğru.',
  'islem13.yedekSaglam': 'Yedek sağlam: {yol} | {kayitSayisi} kayıt, {dosyaSayisi} dosya, tüm dosya özetleri doğru.',
  'kayit.yeni.turSor': 'Tür: 1 anahtar, 2 hesap, 3 env: ',
  'kayit.yeni.kategoriSor': 'Kategori (boş = Genel): ',
  'kayit.yeni.notSor': 'Not (gizli, boş = yok): ',
  'kayit.yeni.degerSor': 'Değer (gizli): ',
  'kayit.yeni.kullaniciSor': 'Kullanıcı adı / e-posta: ',
  'kayit.yeni.adresSor': 'Adres (site): ',
  'kayit.yeni.envDegerSor': 'Değer (gizli): ',
  'kayit.turSor': 'Tür: 1 anahtar, 2 hesap, 3 env (güncellemede boş = koru): ',
  'kayit.kategoriSor': 'Kategori (boş = mevcut / Genel): ',
  'kayit.notSor': 'Not (gizli, boş = koru): ',
  'kayit.degerSor': 'Değer (gizli, boş = koru): ',
  'kayit.kullaniciSor': 'Kullanıcı adı / e-posta (boş = koru): ',
  'kayit.parolaKoruSor': 'Parola (gizli, boş = eski parolayı koru): ',
  'kayit.parolaUretSor': 'Parola (gizli, boş = güçlü parola üret): ',
  'kayit.yeniParolaOnay': 'Yeni güçlü parola üretilsin mi? (evet) ',
  'kayit.adresSor': 'Adres (site, boş = koru): ',
  'kayit.envYolSor': '.env dosya yolu (elle giriş için boş): ',
  'kayit.envDegistirOnay': 'Dosyadan yükleme tüm mevcut değişkenleri değiştirecek. Onay için evet yazın: ',
  'kayit.envAdSor': 'Değişken adı (bitirmek için boş): ',
  'kayit.envDegerSor': 'Değer (gizli, boş = mevcut değeri koru): ',
  'kayit.envSilSor': 'Silinecek değişken adı (bitirmek için boş): ',
  'kart.ad': 'Ad',
  'kart.tur': 'Tür',
  'kart.kategori': 'Kategori',
  'kart.boyut': 'Boyut',
  'kart.boyutDeger': '{boyut} bayt',
  'kart.sha256': 'SHA-256',
  'kart.kullanici': 'Kullanıcı',
  'kart.adres': 'Adres',
  'kart.guncelleme': 'Güncelleme tarihi',
  'kart.deger': 'Değer',
  'kart.parola': 'Parola',
  'kart.not': 'Not',
  'kart.gizli': 'GİZLİ',
  'kart.alanSecSor': 'Gizli alanı göstermek için numarasını yazın (boş = hiçbiri): ',
  'kart.temizleSor': "Enter'a basınca ekran temizlenir",
  'tur.dosya': 'Dosya',
  'tur.anahtar': 'Anahtar',
  'tur.hesap': 'Hesap',
  'tur.env': 'Ortam değişkenleri',
  'turKisa.dosya': 'dosya',
  'turKisa.anahtar': 'anahtar',
  'turKisa.hesap': 'hesap',
  'turKisa.env': 'env',
  'turKisa.degisken': 'değişken',
  'goc.ikiKonum': 'İki konumda da kasa bulundu. Hiçbiri seçilmedi.',
  'goc.dosyaBilgi': '{yol} | {boyut} bayt | Son değişiklik: {tarih}',
  'goc.eskiKonum': 'Eski konumda kasa bulundu: {yol}',
  'goc.yeniKonum': 'Yeni varsayılan konum: {yol}',
  'goc.secenekler': '1) Güvenli taşı (önerilen)\n2) Şimdilik eski yerden aç',
  'goc.dogrulandi': 'Yeni kopya SHA-256 ve ana şifreyle doğrulandı.',
  'goc.eskiSilOnay': 'Eski konumdaki kasa ve .bak silinsin mi? Yedek: {yol} (evet / Enter = sakla) ',
  'goc.eskiSaklandi': 'Eski kasa saklandı. Sonraki açılışta çakışmayı çözmek için KASA_DOSYA kullanın veya eski kopyayı başka yere taşıyın.',
  'kurulum.dosyaHatasi': 'Dosya işlemi başarısız; kurulum klasörünü ve izinleri kontrol edin.',
  'hata.fs.EEXIST': 'Hedef zaten var; üzerine yazılmadı.',
  'hata.fs.ENOENT': 'Dosya veya klasör bulunamadı.',
  'hata.fs.IZIN': 'Dosyaya erişim izni yok. Dosyanın açık veya korumalı olmadığını kontrol edin.',
  'hata.fs.ENOSPC': 'Diskte yeterli boş alan yok.',
  'hata.fs.GENEL': 'Dosya işlemi tamamlanamadı. Yol ve erişim izinlerini kontrol edin.',
  'hata.GENEL': 'İşlem tamamlanamadı. Kasa kaydedilemediyse işlem geri alındı.',
  'hata.SIFRESIZ_HEDEF_YASAK': 'Bu hedef şifreli kasa/yedek dosyası; şifresiz içerik buraya yazılamaz.',
  'hata.DIS_DEGISIKLIK': 'Kasa dosyası bu oturum dışında değişti (başka pencere?). Değişiklik kaydedilmedi; kasayı kapatıp yeniden açın.',
  'hata.YENI_SURUM': 'Bu kasa daha yeni bir Kasa sürümüyle oluşturulmuş; programı güncelleyin.',
  'hata.GOC_ESKI_DEGISTI': 'Göç sırasında eski kasa değişti; işlem durduruldu.',
  'hata.GOC_DOGRULAMA': 'Göç kopyasının SHA-256 doğrulaması başarısız.',
  'hata.DOSYA_COK_BUYUK': 'Dosya çok büyük (en fazla 25 MiB).',
  'hata.TOPLAM_BOYUT_ASIMI': 'Toplam dosya boyutu en fazla 100 MiB olabilir.',
  'hata.COK_SATIR': 'Birden fazla satır yapıştırıldı; tek satır girin.',
  'hata.YOL_BOS': 'Dosya yolu boş bırakılamaz.',
  'hata.OGE_YOK': 'Henüz öğe yok.',
  'hata.YANLIS_SIFRE': 'Ana şifre yanlış veya dosya bozuk.',
  'hata.GECERSIZ_SEMA': 'Kasa şeması geçersiz veya desteklenmiyor.',
  'hata.MEVCUT_SIFRE_YANLIS': 'Ana şifre yanlış.',
  'hata.KISA_SIFRE': 'Ana şifre en az 12 karakter olmalı.',
  'hata.AYNI_SIFRE': 'Yeni ana şifre eskisiyle aynı olamaz.',
  'hata.YEDEK_DOGRULAMA': 'Yedek kopyanın SHA-256 doğrulaması başarısız.',
  'hata.DOGRULANAMADI': 'Şifre değişimi yazıldı ancak yeniden doğrulanamadı. Oturum kapatılıyor; kasa ve .bak dosyasını koruyun.',
  'hata.DOSYA_DOGRULAMA': 'Dosyanın SHA-256 veya boyut doğrulaması başarısız.',
  'hata.GECERSIZ_SECIM': 'Geçersiz seçim.',
  'hata.AD_BOS': 'Ad boş bırakılamaz.',
  'hata.DOSYA_ZATEN_VAR': 'Bu adda bir dosya zaten var.',
  'hata.GECERSIZ_ENV_ADI': 'Ortam değişkeni adı geçersiz.',
  'hata.GECERSIZ_ENV_BICIMI': '.env biçimi desteklenmiyor; tek satırlık AD=değer kullanın.',
  'hata.TTY_GEREKLI': 'Güvenli girdi için PowerShell veya Windows Terminal içinde çalıştırın.',
  'hata.GECERSIZ_SIFRE_UZUNLUGU': 'Şifre uzunluğu 12–128 arasında bir tam sayı olmalı.',
  'hata.PANO_HATASI': 'Pano kullanılamadı.',
  'hata.KULLANICI_KLASORU_YOK': 'Kullanıcı klasörü bulunamadı. KASA_DOSYA değişkenini ayarlayın.',
  'hata.KASA_ACILMADI': 'Kasa açılmadı.',
  'hata.GOC_CAKISMA': 'Kullanacağınız dosyayı KASA_DOSYA ile seçin veya diğer kasayı başka yere taşıyın.',
  'hata.OTOMATIK_KILIT': 'Otomatik kilitlendi',
  'hata.KURULUM_BAGLANTI': 'Bağlantı veya junction içinde işlem yapılmaz.',
  'hata.KURULUM_HEDEF': 'Kurulum hedefi doğrulanamadı.',
  'hata.KURULUM_GECERSIZ_HEDEF': 'Hedef klasör doğrulanmış bir Kasa kurulumu değil.',
  'hata.KURULUM_KAYNAK_BAGLANTI': 'Kaynakta bağlantı veya junction var.',
  'hata.KURULUM_DOSYA_TURU': 'Kaynak dosya türü desteklenmiyor.',
  'hata.KURULUM_LOCALAPPDATA': 'LOCALAPPDATA bulunamadı; işlem durduruldu.',
  'hata.KURULUM_PATH': 'Kullanıcı PATH ayarı güncellenemedi.',
  'hata.KURULUM_ISLEM': 'Geçersiz kurulum işlemi.'
};

const en = {
  'dil.kaydedilemedi': 'Could not save language settings; the existing file was preserved. Language applies to this session.',
  'hata.KASA_ACIK': 'The vault is open in another window.',
  'hata.OKUMA_BOYUT': 'File exceeds the read limit (vault: 200 MiB, .env: 1 MiB).',
  'hata.HEDEF_KLASOR': 'Target is a folder; choose a file path.',
  'kurulum.kalan': 'Your files remain in the program folder: {yol}',
  'kurulum.npmYok': 'Node.js ile aynı klasörde npm.cmd bulunamadı. / npm.cmd was not found beside Node.js.',
  'kurulum.arguman': 'Program argüman kabul etmez. / The program does not accept arguments.',

  'dil.secenekler': 'Dil / Language:\n1) Türkçe\n2) English',
  'dil.secimSor': 'Seçim / Choice [{numara}]: ',
  'dil.gecersizSecim': 'Geçersiz seçim. / Invalid choice.',
  'acilis.surum': 'Kasa v{surum}',
  'surum.yetersiz': 'This program requires Node.js 24 or later. Current version: {surum}. Install Node.js 24 LTS from https://nodejs.org.',
  'ortak.seciminiz': 'Your choice: ',
  'ortak.varsayilanKategori': 'General',
  'ortak.dosyalarBaslik': 'Files:',
  'ortak.kayitVeyaDosya': '1) Entry  2) File: ',
  'ortak.henuzDosyaYok': 'No files yet.',
  'ortak.henuzKayitYok': 'No entries yet.',
  'ortak.sifresizUyari': '{hedef} — This file will be written UNENCRYPTED',
  'ortak.uzerineYazOnay': 'Target exists. Type yes to overwrite: ',
  'ortak.kaydedildi': 'Saved.',
  'ortak.parolaKopyalaOnay': 'Copy password to clipboard? (yes) ',
  'giris.anaSifre': 'Master password: ',
  'giris.yanlisKalan': '{mesaj} Attempts left: {kalan}',
  'sifre.ipucu': 'Create a passphrase using 4–5 randomly chosen words.',
  'sifre.yeni': 'New master password: ',
  'sifre.tekrar': 'Re-enter master password: ',
  'sifre.uyusmuyor': 'Passwords do not match. Try again.',
  'kasa.yeni1': 'A new vault will be created. Use at least 12 characters.',
  'kasa.yeni2': 'Write this password down and keep it safe; if forgotten, the vault cannot be opened.',
  'ozet.boyutSema': 'Size: {boyut} bytes | Schema version: {sema}',
  'ozet.guncelleme': 'Last updated: {tarih}',
  'ozet.sha256': 'SHA-256 (encrypted file): {sha256}',
  'pano.kopyalandi': 'Copied to clipboard. It will be cleared in 30 seconds or when you exit.',
  'pano.temizlenemedi': 'Could not clear the clipboard; copy something else to clear it.',
  'kilit.eskiKilitSil': 'The vault appears to be open in another window. Close that window first. If this is an old lock, type yes to remove it: ',
  'kilit.kaldirilamadi': 'Could not remove the lock file; check for a stale lock on next launch.',
  'liste.numaraSor': 'Number from list: ',
  'menu.liste': '\n1) List entries\n2) Search\n3) Show entry\n4) Copy to clipboard (clears in 30s)\n5) Add / update entry\n6) Add file\n7) Export file\n8) Export as .env file\n9) Delete entry / file\n10) Generate password (copies to clipboard)\n11) Change master password\n12) Create backup\n13) Verify backup\n14) Dil / Language\n0) Exit',
  'islem1.kategoriler': 'Categories: {liste}',
  'islem1.henuzYok': 'None yet.',
  'islem1.kategoriSor': 'Category (blank = all): ',
  'islem2.aranacak': 'Search text: ',
  'islem4.secilen': "Selected entry: '{ad}'",
  'islem4.alanSor': '1) Password  2) Username: ',
  'islem5.adSor': 'Entry name: ',
  'islem5.guncelleOnay': 'Entry will be updated. Type yes to confirm: ',
  'islem6.yolSor': 'File path to add (you can drag and drop the file): ',
  'islem6.kategoriSor': 'Category (blank: General): ',
  'islem6.notSor': 'Note (hidden): ',
  'islem7.hedefSor': 'Destination folder or file path (you can drag the folder into this window; if you choose a folder, the file is saved with its own name): ',
  'islem7.cikarildi': 'File exported with SHA-256 verification.',
  'islem8.envYok': 'No env entries yet.',
  'islem8.hedefSor': 'Destination folder or .env file path (you can drag the folder into this window; if you choose a folder, the file is saved with the entry name): ',
  'islem8.uyari': 'This file is unencrypted; delete it when done and do not commit it to git.',
  'islem9.silOnay': "Delete '{ad}'? Type yes to confirm: ",
  'islem10.uzunlukSor': 'Password length (blank = 24): ',
  'islem11.mevcutSifre': 'Current master password: ',
  'islem11.degisti': 'Master password changed and verified by re-reading.',
  'islem11.eskiBakUyari': 'The old backup ({yol}) still uses your OLD password.',
  'islem11.bulutUyari': 'Older backups in cloud storage or on external media still use the old password; create and verify a new backup before deleting old copies.',
  'islem11.kagidaYaz': 'Write down the new password on paper.',
  'islem11.bakSilOnay': 'Delete the old local backup ({yol}, encrypted with the OLD password)? Type yes to delete, or press Enter to keep: ',
  'islem11.bakSilindi': 'Old .bak backup deleted.',
  'islem12.hedefSor': 'Destination folder (blank = vault folder): ',
  'islem12.yedekAlindi': 'Backup created and verified: {yol}',
  'islem13.hedefSor': 'File path to verify (blank = current vault) (you can drag and drop): ',
  'islem13.eskiSifreOnay': 'This file could not be opened with the current master password. Type yes to try a different (old) password: ',
  'islem13.dosyaSifreSor': 'File master password: ',
  'islem13.mevcutSaglam': 'Current vault verified: {yol} | {kayitSayisi} entries, {dosyaSayisi} files, all file checksums valid.',
  'islem13.yedekSaglam': 'Backup verified: {yol} | {kayitSayisi} entries, {dosyaSayisi} files, all file checksums valid.',
  'kayit.yeni.turSor': 'Type: 1) Key  2) Account  3) Env: ',
  'kayit.yeni.kategoriSor': 'Category (blank = General): ',
  'kayit.yeni.notSor': 'Note (hidden, blank = none): ',
  'kayit.yeni.degerSor': 'Value (hidden): ',
  'kayit.yeni.kullaniciSor': 'Username / email: ',
  'kayit.yeni.adresSor': 'Address (website): ',
  'kayit.yeni.envDegerSor': 'Value (hidden): ',
  'kayit.turSor': 'Type: 1) Key  2) Account  3) Env (blank when updating = keep): ',
  'kayit.kategoriSor': 'Category (blank = current / General): ',
  'kayit.notSor': 'Note (hidden, blank = keep): ',
  'kayit.degerSor': 'Value (hidden, blank = keep): ',
  'kayit.kullaniciSor': 'Username / email (blank = keep): ',
  'kayit.parolaKoruSor': 'Password (hidden, blank = keep current): ',
  'kayit.parolaUretSor': 'Password (hidden, blank = generate strong password): ',
  'kayit.yeniParolaOnay': 'Generate a new strong password? (yes) ',
  'kayit.adresSor': 'Address (website, blank = keep): ',
  'kayit.envYolSor': '.env file path (blank to enter manually): ',
  'kayit.envDegistirOnay': 'Loading from a file will replace all existing variables. Type yes to confirm: ',
  'kayit.envAdSor': 'Variable name (blank to finish): ',
  'kayit.envDegerSor': 'Value (hidden, blank = keep current): ',
  'kayit.envSilSor': 'Variable name to delete (blank to finish): ',
  'kart.ad': 'Name',
  'kart.tur': 'Type',
  'kart.kategori': 'Category',
  'kart.boyut': 'Size',
  'kart.boyutDeger': '{boyut} bytes',
  'kart.sha256': 'SHA-256',
  'kart.kullanici': 'Username',
  'kart.adres': 'Address',
  'kart.guncelleme': 'Last updated',
  'kart.deger': 'Value',
  'kart.parola': 'Password',
  'kart.not': 'Note',
  'kart.gizli': 'HIDDEN',
  'kart.alanSecSor': 'Enter the number of a hidden field to reveal it (blank = none): ',
  'kart.temizleSor': 'Press Enter to clear the screen',
  'tur.dosya': 'File',
  'tur.anahtar': 'Key',
  'tur.hesap': 'Account',
  'tur.env': 'Environment variables',
  'turKisa.dosya': 'file',
  'turKisa.anahtar': 'key',
  'turKisa.hesap': 'account',
  'turKisa.env': 'env',
  'turKisa.degisken': 'variable',
  'goc.ikiKonum': 'A vault was found in both locations. Neither was opened.',
  'goc.dosyaBilgi': '{yol} | {boyut} bytes | Last modified: {tarih}',
  'goc.eskiKonum': 'Vault found at old location: {yol}',
  'goc.yeniKonum': 'New default location: {yol}',
  'goc.secenekler': '1) Move safely (recommended)\n2) Open from the old location for now',
  'goc.dogrulandi': 'The new copy was verified with SHA-256 and your master password.',
  'goc.eskiSilOnay': 'Delete the old vault and .bak file? Backup: {yol} (yes / Enter = keep) ',
  'goc.eskiSaklandi': 'Old vault kept. Next time, set KASA_DOSYA or move the old copy elsewhere to avoid a conflict.',
  'kurulum.dosyaHatasi': 'File operation failed; check the installation folder and permissions.',
  'hata.fs.EEXIST': 'Target already exists; nothing was overwritten.',
  'hata.fs.ENOENT': 'File or folder not found.',
  'hata.fs.IZIN': 'Permission denied. Make sure the file is not open or protected.',
  'hata.fs.ENOSPC': 'Not enough free space on disk.',
  'hata.fs.GENEL': 'File operation failed. Check the path and permissions.',
  'hata.GENEL': 'Operation failed. If the vault could not be saved, no changes were made.',
  'hata.SIFRESIZ_HEDEF_YASAK': 'This target is an encrypted vault or backup file; unencrypted data cannot be written here.',
  'hata.DIS_DEGISIKLIK': 'The vault file was modified outside this session (another window?). Changes were not saved; close and reopen the vault.',
  'hata.YENI_SURUM': 'This vault was created with a newer version of Kasa; please update the program.',
  'hata.GOC_ESKI_DEGISTI': 'The old vault changed during migration; operation stopped.',
  'hata.GOC_DOGRULAMA': 'SHA-256 verification of the migrated copy failed.',
  'hata.DOSYA_COK_BUYUK': 'File is too large (maximum 25 MiB).',
  'hata.TOPLAM_BOYUT_ASIMI': 'Total embedded file size cannot exceed 100 MiB.',
  'hata.COK_SATIR': 'Multiple lines were pasted; enter a single line.',
  'hata.YOL_BOS': 'File path cannot be blank.',
  'hata.OGE_YOK': 'No items yet.',
  'hata.YANLIS_SIFRE': 'Master password is wrong or the file is corrupted.',
  'hata.GECERSIZ_SEMA': 'Vault schema is invalid or not supported.',
  'hata.MEVCUT_SIFRE_YANLIS': 'Master password is wrong.',
  'hata.KISA_SIFRE': 'Master password must be at least 12 characters.',
  'hata.AYNI_SIFRE': 'New master password cannot be the same as the current one.',
  'hata.YEDEK_DOGRULAMA': 'SHA-256 verification of the backup copy failed.',
  'hata.DOGRULANAMADI': 'The password change was written but could not be verified again. Closing session; keep both the vault and .bak files safe.',
  'hata.DOSYA_DOGRULAMA': 'File SHA-256 or size verification failed.',
  'hata.GECERSIZ_SECIM': 'Invalid choice.',
  'hata.AD_BOS': 'Name cannot be blank.',
  'hata.DOSYA_ZATEN_VAR': 'A file with this name already exists.',
  'hata.GECERSIZ_ENV_ADI': 'Invalid environment variable name.',
  'hata.GECERSIZ_ENV_BICIMI': '.env format is not supported; use single-line NAME=value entries.',
  'hata.TTY_GEREKLI': 'Run inside PowerShell or Windows Terminal for secure input.',
  'hata.GECERSIZ_SIFRE_UZUNLUGU': 'Password length must be a whole number between 12 and 128.',
  'hata.PANO_HATASI': 'Could not access the clipboard.',
  'hata.KULLANICI_KLASORU_YOK': 'User home folder not found. Set the KASA_DOSYA environment variable.',
  'hata.KASA_ACILMADI': 'Vault was not opened.',
  'hata.GOC_CAKISMA': 'Choose the file to use with KASA_DOSYA or move the other vault elsewhere.',
  'hata.OTOMATIK_KILIT': 'Auto-locked due to inactivity',
  'hata.KURULUM_BAGLANTI': 'Cannot run inside a symlink or junction.',
  'hata.KURULUM_HEDEF': 'Could not verify installation target.',
  'hata.KURULUM_GECERSIZ_HEDEF': 'The target folder is not a verified Kasa installation.',
  'hata.KURULUM_KAYNAK_BAGLANTI': 'The source contains a symlink or junction.',
  'hata.KURULUM_DOSYA_TURU': 'Unsupported source file type.',
  'hata.KURULUM_LOCALAPPDATA': 'LOCALAPPDATA was not found; operation stopped.',
  'hata.KURULUM_PATH': 'Could not update the user PATH setting.',
  'hata.KURULUM_ISLEM': 'Invalid setup action.'
};

export const sozluk = { tr, en };

const gecerliDil = dil => (dil === 'tr' || dil === 'en' ? dil : null);

export function ortamDili() {
  return gecerliDil(process.env.KASA_DIL);
}

let aktifDil = ortamDili() ?? 'tr';

export function dilAyarla(dil) {
  const secilen = gecerliDil(dil);
  if (!secilen) throw kodluHata('GECERSIZ_SECIM');
  aktifDil = secilen;
  return aktifDil;
}

export function etkinDil() {
  return aktifDil;
}

export function varsayilanDil(yerelAyar = Intl.DateTimeFormat().resolvedOptions().locale) {
  return typeof yerelAyar === 'string' && yerelAyar.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export function cevir(kaynak, dil, anahtar, degiskenler = {}) {
  const tablo = kaynak[dil] || kaynak.tr;
  const metin = Object.hasOwn(tablo, anahtar)
    ? tablo[anahtar]
    : (Object.hasOwn(kaynak.tr, anahtar) ? kaynak.tr[anahtar] : anahtar);
  return String(metin).replace(/\{([a-zA-Z0-9_]+)\}/g, (tam, ad) => (
    Object.hasOwn(degiskenler, ad) ? String(degiskenler[ad]) : tam
  ));
}

export function t(anahtar, degiskenler) {
  return cevir(sozluk, aktifDil, anahtar, degiskenler);
}

export function kodluHata(kod, degiskenler) {
  const hata = new Error(t(`hata.${kod}`, degiskenler));
  hata.kod = kod;
  return hata;
}

export function bilinenHataKodu(kod) {
  return typeof kod === 'string'
    && kod !== 'GENEL'
    && !kod.startsWith('fs.')
    && Object.hasOwn(tr, `hata.${kod}`);
}

export function dilAyarYolu(kasaDosyaYolu) {
  const yerel = process.env.LOCALAPPDATA || (process.env.USERPROFILE && join(process.env.USERPROFILE, 'AppData', 'Local'));
  if (!yerel) throw kodluHata('KULLANICI_KLASORU_YOK');
  return join(yerel, 'kasa', 'ayarlar.json');
}

function ayarMetnindenDil(ham) {
  const veri = JSON.parse(ham);
  if (!veri || typeof veri !== 'object' || Array.isArray(veri)) return null;
  return Object.keys(veri).length === 1 ? gecerliDil(veri.dil) : null;
}

export async function dilAyarOku(kasaDosyaYolu) {
  const ortam = ortamDili();
  if (ortam) return { dil: ortam, kaynak: 'ortam' };
  try {
    const dil = ayarMetnindenDil(await readFile(dilAyarYolu(kasaDosyaYolu), 'utf8'));
    return dil ? { dil, kaynak: 'dosya' } : { dil: null, kaynak: 'yok' };
  } catch {
    return { dil: null, kaynak: 'yok' };
  }
}

export async function dilAyarYaz(kasaDosyaYolu, dil) {
  const secilen = gecerliDil(dil);
  if (!secilen) throw kodluHata('GECERSIZ_SECIM');
  dilAyarla(secilen);
  let dosya, gecici;
  try {
    const hedef = dilAyarYolu(kasaDosyaYolu);
    gecici = `${hedef}.tmp.${randomUUID()}`;
    if (await ayniYol(hedef, kasaDosyaYolu)) throw new Error();
    let onceki;
    try { onceki = await readFile(hedef, 'utf8'); if (!ayarMetnindenDil(onceki)) throw new Error(); }
    catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
    await mkdir(dirname(hedef), { recursive: true, mode: 0o700 });
    dosya = await open(gecici, 'wx', 0o600);
    await dosya.writeFile(JSON.stringify({ dil: secilen })); await dosya.sync();
    await dosya.close(); dosya = undefined;
    let simdiki;
    try { simdiki = await readFile(hedef, 'utf8'); } catch (hata) { if (hata.code !== 'ENOENT') throw hata; }
    if (simdiki !== onceki || await ayniYol(hedef, kasaDosyaYolu)) throw new Error();
    await rename(gecici, hedef);
    return true;
  } catch { console.warn(t('dil.kaydedilemedi')); return false; }
  finally { await dosya?.close(); if (gecici) await unlink(gecici).catch(() => {}); }
}

export async function dilSor(sor, yaz = console.log, yerelAyar) {
  const varsayilan = varsayilanDil(yerelAyar);
  const varsayilanNo = varsayilan === 'tr' ? '1' : '2';
  yaz(t('dil.secenekler'));
  while (true) {
    const secim = (await sor(t('dil.secimSor', { numara: varsayilanNo }))).trim();
    if (secim === '') return varsayilan;
    if (secim === '1') return 'tr';
    if (secim === '2') return 'en';
    yaz(t('dil.gecersizSecim'));
  }
}

export function baslangicDiliHazirla() {
  const ortam = ortamDili();
  if (ortam) return dilAyarla(ortam);
  const kasaDosya = process.env.KASA_DOSYA
    || (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'kasa', 'kasa.age'))
    || (process.env.USERPROFILE && join(process.env.USERPROFILE, 'AppData', 'Local', 'kasa', 'kasa.age'));
  if (kasaDosya) {
    try {
      const dil = ayarMetnindenDil(readFileSync(dilAyarYolu(kasaDosya), 'utf8'));
      if (dil) return dilAyarla(dil);
    } catch {
      // Yoksayılır; yerel ayar varsayılanına düşülür.
    }
  }
  return dilAyarla(varsayilanDil());
}

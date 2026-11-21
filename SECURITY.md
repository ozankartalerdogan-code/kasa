# Security Policy / Güvenlik Politikası

## English

### Reporting a vulnerability

Report security vulnerabilities privately through GitHub **Security → Advisories → Report a vulnerability**. Do not share secrets, master passwords, decrypted JSON, real vault files, or personal information in public issues or comments.

Include the affected Kasa and Node.js versions, Windows version, expected vs. actual behavior, and reproduction steps using synthetic data only. Fixed response or patch timelines are not guaranteed.

### Scope & known boundaries

The latest tagged release covers encryption, master-password handling, data integrity, migration, backups, file export, clipboard handling, and setup scripts. Kasa provides local encrypted storage; it does not protect against active malware, keyloggers, screen capture, or memory inspection in an unlocked session. Forgotten master passwords cannot be recovered, clipboard cleanup is best-effort, and exported files are unencrypted. Keep regular encrypted backups on separate media and verify them.

---

# Güvenlik politikası

## Açık bildirme

Güvenlik açıklarını bu GitHub deposunun **Security → Advisories → Report a vulnerability** alanından özel olarak bildirin. Genel issue veya yorumlarda sır, ana şifre, açık JSON, gerçek kasa dosyası ya da kişisel bilgi paylaşmayın. Özel bildirim seçeneği kullanılamıyorsa hassas ayrıntıları herkese açık yayımlamayın.

Etkilenen Kasa ve Node.js sürümlerini, Windows sürümünü, beklenen ve gerçekleşen davranışı ve yalnız sahte verilerle hazırlanmış yeniden üretme adımlarını ekleyin. Varsa önerilen düzeltmeyi açıklayın. Yanıt veya düzeltme için sabit süre taahhüdü verilmez.

## Kapsam

En güncel etiketli sürümde şifreleme, ana şifre işleme, veri bütünlüğü, göç, yedekleme, dosya çıkarma, pano ve dağıtım betiklerindeki güvenlik sorunları kapsam içindedir. Eski sürüm kullanıyorsanız önce şifreli yedek alıp güncel sürümle sahte veriler üzerinde doğrulayın. Bağımlılık kaynaklı sorunları da Kasa üzerindeki etkisiyle bildirebilirsiniz.

## Bilinen sınırlar

Kasa yerel şifreli depolama sağlar; açık oturumdaki zararlı yazılıma, klavye kaydediciye, ekran veya bellek okumaya karşı güvenli ortam oluşturmaz. JavaScript metinleri, takas dosyası ve kütüphane kopyalarının kesin temizlenmesi garanti edilmez. Unutulan ana şifre kurtarılamaz.

Pano temizleme en iyi çabayla yapılır; zorla kapanma, engellenen PowerShell veya başka uygulamanın panoyu kilitlemesi temizlemeyi engelleyebilir. Pano geçmişi işaretleri üçüncü tarafların okumasını engellemez. Dışa çıkarılan dosyalar şifresizdir.

Oturum kilidi işletim sistemi dosya kilidi değildir. Windows ACL izinleri, donanım arızaları ve güç kesintileri ayrıca değerlendirilmelidir. Göç ve tarihli yedekler sabit bağlantı desteği gerektirir. Eski `.bak` ve yedekler eski şifreyi ve silinmiş kayıtları koruyabilir; normal silme güvenli silme garantisi vermez.

Kurulum ve imza doğrulama ağ erişimi gerektirir. ZIP SHA-256 karşılaştırması indirdiğiniz dosyanın yayımlanan özetle eşleşmesini denetler; yayın hesabının veya bilgisayarın ele geçirilmesine karşı tek başına yeterli değildir. Güncelleme başarısızlığında otomatik geri alma yoktur. Düzenli olarak ayrı ortamda şifreli yedek tutun ve geri okuma doğrulaması yapın.

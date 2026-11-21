Türkçe | [English](README.md)

# Kasa

Windows için Türkçe ve İngilizce menülü, yerel ve şifreli parola kasası. Parolaları, API anahtarlarını, `.env` değişkenlerini ve küçük dosyaları tek bir `.age` dosyasında saklar. Kasa çalışırken internete bağlanmaz; kurulum sırasında npm paketleri ve imzaları internetten doğrulanır.

## Güvenlik modeli

Kasa, `age-encryption` ile standart age parola şifrelemesi kullanır. Şifre çözülmüş kasa içeriği bellekte tutulur. İstenen şifresiz dışa aktarma, hedefin yanındaki geçici dosyaya yazılıp yerine konur; hata olursa geçici dosya silinir. Ana şifre gizli girilir; unutulursa kurtarılamaz. En az 12 karakter, tercihen rastgele seçilmiş 4–5 kelimelik uzun bir parola cümlesi kullanın. Şifreyi güvenli bir yerde saklayın.

Değişiklikler hemen kaydedilir. Atomik yazma ve önceki sürümün `.bak` yedeği, oturum kilidi ve dışarıdan değişiklik denetimi bulunur. Bunlar düzenli, ayrı ortamda tutulan yedeğin yerini tutmaz.

## Kurulum

Windows 10/11, PowerShell veya Windows Terminal ve **Node.js 24 veya üstü** gerekir.

Adım adım indirme, SHA-256 kontrolü ve kurulum için [İlk kullanım](#ilk-kullanım) bölümünü izleyin.

Kurulum yeni sürümü `%LOCALAPPDATA%\Programs\kasa.yeni` altında hazırlar, kilitli bağımlılıkları `npm ci --ignore-scripts --omit=dev` ile kurar ve `npm audit signatures` sonucunu gösterir. Seçilen `node.exe` ile aynı klasördeki `npm.cmd` kullanılır; yoksa hiçbir dosya kopyalanmaz. İki denetim de geçince eski kurulum `kasa.eski` olarak saklanır ve yeni sürüm `kasa` adıyla etkinleştirilir. Hazırlama hatasında eski kurulum çalışır kalır; etkinleştirme hatasında eski klasör yerine alınır. Eski program dosyaları `kurulum-listesi.json` üzerinden kaldırılır. Yönetici yetkisi gerekmez. Kullanıcı PATH'ine yalnız program klasörü eklenir; ham kayıt değeri ve türü korunur. Masaüstü/Başlat kısayolu ve Uninstall kaydı oluşturulmaz. `.ps1` dosyası kurulmaz.

## İlk kullanım

Bu rehberde Türkçe ekranlar kullanılır. Her seçimde numarayı yazıp **Enter** tuşuna basın. Kod blokları ekrandan kısa kesitlerdir; gizli şifreler gösterilmez.

### 1. Kurulumu yapın

1. [nodejs.org](https://nodejs.org) adresini açın. **LTS** düğmesini seçin. İndirme sayfasında sürümü **24 LTS**, sistemi **Windows**, dosyayı **Windows Installer (.msi)** seçin. Başka bir LTS sürümü gösterilirse sürüm listesinden 24'ü seçebilirsiniz. İnen dosyayı açın. Varsayılanları değiştirmeden **İleri / Next** ile ilerleyin; lisansı kabul edip kurulumu bitirin.
2. [Kasa'nın GitHub deposunda](https://github.com/ozankartalerdogan-code/kasa) [Releases](https://github.com/ozankartalerdogan-code/kasa/releases) sayfasını açın. Seçtiğiniz sürümün **Assets** listesinden `kasa-v1.0.0.zip` ve `SHA256SUMS.txt` dosyalarını aynı klasöre indirin. Başka sürüm seçtiyseniz aşağıdaki komutta ZIP adını değiştirin. `Source code` dosyalarını seçmeyin.
3. İndirdiğiniz klasörü Dosya Gezgini'nde açın. Üstteki adres çubuğuna `powershell` yazıp Enter'a basın. Açılan pencereye şu komutu yazın:

   ```powershell
   (Get-FileHash .\kasa-v1.0.0.zip -Algorithm SHA256).Hash
   ```

   Ekranda uzun bir harf ve rakam dizisi çıkar. `SHA256SUMS.txt` dosyasını Not Defteri ile açın. ZIP adının yanındaki diziyle ekrandakini karşılaştırın. Büyük/küçük harf farkı önemli değildir; **bütün karakterler aynı olmalıdır**. Fark varsa devam etmeyin; dosyaları yeniden indirin.
4. ZIP'e sağ tıklayın → **Tümünü ayıkla** → **Ayıkla**. Açılan klasörde `kur.cmd` dosyasına çift tıklayın. Windows **“Bilinmeyen yayımcı”** veya **“Windows kişisel bilgisayarınızı korudu”** uyarısı gösterebilir. Resmi sürümü indirip yukarıdaki doğrulamayı yaptıysanız **Ek bilgi → Yine de çalıştır** seçeneğini kullanın. Kurulum sırasında internet bağlantısı gerekir. Şu mesajı bekleyin:

   ```text
   Yeni bir PowerShell penceresi açıp kasa yazın.
   ```

### 2. Kasayı ilk kez açın

1. Windows **Başlat** düğmesine basın. `PowerShell` yazıp çıkan uygulamayı açın. Yeni pencerede `kasa` yazıp Enter'a basın. Dil ekranında Türkçe için `1` yazıp Enter'a basın. Köşeli parantezdeki varsayılan numara bilgisayara göre 1 veya 2 olabilir:

   ```text
   Dil / Language:
   1) Türkçe
   2) English
   Seçim / Choice [1]: 1
   ```

2. En az 12 karakterlik bir ana şifre belirleyin. Rastgele seçilmiş 4–5 kelime kullanabilirsiniz. Şifreyi iki kez aynı şekilde yazın. Güvenli bir yerde, örneğin kâğıtta saklayın:

   ```text
   Yeni kasa kurulacak. En az 12 karakter kullanın.
   Bu şifreyi kâğıda yazıp saklayın, unutulursa kasa açılamaz.
   Rastgele seçilmiş 4–5 Türkçe kelimeyle bir parola cümlesi oluşturun.
   Yeni ana şifre:
   Ana şifreyi tekrar girin:
   ```

   > [!CAUTION]
   > **Ana şifreyi unutursanız kasa HİÇBİR şekilde açılamaz. Şifre sıfırlama veya kurtarma yoktur. Yedek de bu şifreyi gerektirir.**

   > [!IMPORTANT]
   > **Bunlar normal, şaşırmayın**
   >
   > - Şifre yazarken ekranda hiçbir şey görünmez. Yıldız veya nokta da çıkmaz. Yazıp Enter'a basın.
   > - Ctrl+V ile yapıştırma çalışır; gizli alana yapıştırılan şifre yine görünmez.
   > - Kullanıcı adı ve adres görünür. Şifre ve gizli not gibi gizli alanlar yazarken görünmez.
   > - Kopyalanan şifre 30 saniye sonra veya kasadan çıkınca panodan silinir. Pano temizlenemezse program uyarır.
   > - 5 dakika işlem yapmazsanız kasa kendini kilitler. Yeniden `kasa` yazıp ana şifreyle açın.
   > - Kasayı açarken birkaç saniye beklemek normaldir. Bu güvenlik önlemi, şifre tahmin saldırılarını yavaşlatır.

Sonraki açılışlarda aynı ana şifreyi girersiniz:

```text
Ana şifre:
```

### 3. İlk hesabınızı kaydedin, bulun ve kullanın

1. Ana menüde **5** seçin. Kayıt adı olarak `ornek-hesap`, tür olarak hesap için **2** yazın. Kategori ve notu boş bırakmak için Enter'a basabilirsiniz. Kullanıcı adınızı, o hesaba ait şifreyi ve site adresini sırayla girin. Hesabın şifresi ana şifreden ayrıdır. Şifreyi boş bırakırsanız program güçlü bir şifre üretir; üretilen şifreyi ilgili sitede ayrıca ayarlamanız gerekir. Kasa sitedeki şifreyi kendiliğinden değiştirmez.

   ```text
   Seçiminiz: 5
   Kayıt adı: ornek-hesap
   Tür: 1 anahtar, 2 hesap, 3 env (güncellemede boş = koru): 2
   Kategori (boş = mevcut / Genel):
   Not (gizli, boş = koru):
   Kullanıcı adı / e-posta (boş = koru): ornek-kullanici
   Parola (gizli, boş = güçlü parola üret):
   Adres (site, boş = koru): https://example.com
   Kaydedildi.
   ```

   Güçlü şifre üretildiyse `Parola panoya kopyalansın mı? (evet)` sorusu gelir. Kopyalamak için `evet`, geçmek için Enter kullanın. Değişiklikler hemen kaydedilir.
2. Bulmak için menü **2** seçin. Kayıt adının bir kısmını yazın:

   ```text
   Seçiminiz: 2
   Aranacak metin: ornek-hesap
   1) ornek-hesap | hesap | Genel
   ```

3. Şifreyi kullanmak için menü **4** seçin. Listede hesabın yanındaki numarayı girin; ardından parola için **1** seçin. İlgili uygulamanın şifre alanına Ctrl+V ile yapıştırın:

   ```text
   Seçiminiz: 4
   1) ornek-hesap | hesap | Genel
   Listedeki numara: 1
   Seçilen kayıt: 'ornek-hesap'
   1 parola, 2 kullanıcı adı: 1
   Panoya kopyalandı. 30 saniye sonra veya kasadan çıkınca silinecek.
   ```

4. Ekranda görmek için menü **3**, kayıt için **1**, sonra listedeki hesap numarasını seçin. Şifre önce gizlidir. Gizli alan sorusunda **1** yazınca görünür. İşiniz bitince Enter'a basın; ekran temizlenir:

   ```text
   1) Parola: GİZLİ
   2) Not: GİZLİ
   Gizli alanı göstermek için numarasını yazın (boş = hiçbiri): 1
   ```

### 4. Küçük bir dosyayı saklayın ve geri çıkarın

1. Menü **6** seçin. Dosya yolu sorulunca Dosya Gezgini'ndeki dosyayı PowerShell penceresine sürükleyip bırakın, sonra Enter'a basın. Kategori ve notu Enter ile boş geçebilirsiniz:

   ```text
   Eklenecek dosya yolu (dosyayı pencereye sürükleyebilirsiniz):
   Kategori (boş: Genel):
   Not (gizli):
   Kaydedildi.
   ```

   Kasa şifreli bir kopya saklar; dışarıdaki asıl dosyayı silmez. Bir dosya en fazla 25 MiB olabilir. Ayrıntılar için [Kullanım](README.tr.md#kullanım) bölümüne bakın.
2. Geri almak için menü **7** seçin. Listedeki dosyanın numarasını girin. Masaüstü klasörünü pencereye sürükleyip bırakın ve Enter'a basın; örneğin `C:\Users\Ali\Desktop`. Dosya bu klasöre kendi adıyla kaydedilir; ekranda yazılacak tam yol gösterilir. İsterseniz `C:\Belgeler\ornek-dosya.txt` gibi tam dosya yolu da yazabilirsiniz (klasörün bilgisayarınızda var olması gerekir). Aynı adda dosya varsa üzerine yazmak için `evet` onayı istenir. Çıkarılan dosya şifresizdir; onu açabilen herkes içeriğini okuyabilir. Ekrandan iki kısa kesit:

   ```text
   Hedef klasör veya dosya yolu (klasörü pencereye sürükleyebilirsiniz; klasör verirseniz dosya kendi adıyla kaydedilir): "C:\Users\Ali\Desktop"
   C:\Users\Ali\Desktop\ornek-dosya.txt — Bu dosya ŞİFRESİZ yazılacak
   ```

   ```text
   Dosya SHA-256 doğrulamasıyla çıkarıldı.
   ```

### 5. Yedek alın ve kontrol edin

1. Menü **12** seçin. Hedef olarak USB bellekte var olan bir klasörün yolunu yazın. Enter ile boş geçerseniz yedek kasayla aynı klasöre yazılır; bu kopyayı daha sonra USB'ye veya güvendiğiniz bulut depolamaya taşıyın. Aynı bilgisayardaki tek kopya, bilgisayar bozulursa yeterli olmaz.

   ```text
   Seçiminiz: 12
   Hedef klasör (boş = kasa dosyasının klasörü):
   ```

   Program `Yedek alındı ve doğrulandı:` yazısından sonra tarihli yedek dosyasının tam yolunu gösterir. Bu dosyayı saklayın. Buluta yüklemeyi sizin yapmanız gerekir. **Yedek de alındığı andaki ana şifreyle açılır.**
2. Menü **13** seçin. Sakladığınız yedek dosyasını pencereye sürükleyip Enter'a basın:

   ```text
   Seçiminiz: 13
   Doğrulanacak dosya yolu (boş = mevcut kasa) (dosyayı pencereye sürükleyebilirsiniz):
   ```

   Sonuçta `Yedek sağlam:` ile başlayan satırda seçtiğiniz dosyanın yolunu görmelisiniz. Boş geçerseniz yedeği değil, açık kasayı kontrol edersiniz. Ana şifre değişikliğinden sonraki yedekler için [Yedek rutini](README.tr.md#yedek-rutini) bölümüne bakın.

### 6. Sık sorulanlar

**Ana şifremi unuttum.** Kurtarılamaz. Kasa ve yedekler ilgili ana şifre olmadan açılamaz. Kurulumu tekrarlamak şifreyi sıfırlamaz.

**Bilgisayarım bozuldu / yeni bilgisayara nasıl taşırım?** Yeni bilgisayara Kasa'yı kurun. Henüz `kasa` komutunu çalıştırmayın. Dosya Gezgini'nin adres çubuğuna `%LOCALAPPDATA%` yazın. İçinde `kasa` klasörü yoksa oluşturun. Şifreli yedeğin bir kopyasını bu klasöre koyun ve dosya adını **kasa.age** yapın. Gezginde **Görünüm → Göster → Dosya adı uzantıları** seçeneğini açın (Windows 10'da **Görünüm → Dosya adı uzantıları**); adın `kasa.age.age` veya `kasa.age.bak` kalmadığını kontrol edin. Mevcut `kasa.age` varsa üzerine yazmayın; Kasa kapalıyken önce başka güvenli bir yere taşıyın. Sonra yeni PowerShell'de `kasa` yazın. Yedeği aldığınız zamanki ana şifreyle açın:

```text
Ana şifre:
```

Özel konum veya eski bilgisayardan kalan kasa çakışması için [Kasa konumu ve eski kasanın taşınması](README.tr.md#kasa-konumu-ve-eski-kasanın-taşınması) bölümüne bakın.

**Program açılmıyor.** Node.js eskiyse aşağıdaki gibi bir uyarı çıkar; sürüm numarası bilgisayarınıza göre değişir. Node.js 24 LTS kurun:

```text
Bu program Node.js 24 veya üstünü gerektirir. Şu an: v22.0.0. https://nodejs.org adresinden Node.js 24 LTS kurun.
```

`kasa` komutu bulunamıyorsa PowerShell'i kapatıp **yeni pencere** açın. Devam ederse `kur.cmd` sonucunu kontrol edin. Kurulumdan sonra yeni pencere açmak gerekir.

**Kasa programı olmadan kasamı açabilir miyim?** Evet; ana şifreyi biliyorsanız [resmi age.exe](https://github.com/FiloSottile/age/releases) ile açabilirsiniz. Bu işlem bütün sırları şifresiz bir JSON dosyasına çıkarır. Komut ve ayrıntılar: [Kaçış yolu](README.tr.md#kaçış-yolu-resmi-ageexe-ile-kurtarma).

## Kasa konumu ve eski kasanın taşınması

Varsayılan veri dosyası `%LOCALAPPDATA%\kasa\kasa.age` konumundadır. Program klasörü ile veri klasörü ayrıdır. `LOCALAPPDATA` yoksa `%USERPROFILE%\AppData\Local\kasa\kasa.age` kullanılır. Özel konum için aynı PowerShell penceresinde:

```powershell
$env:KASA_DOSYA = 'D:\Belgeler\kasa.age'
kasa
```

Ana şifreyi veya sırları komut satırına yazmayın. Program argüman kabul etmez.

`KASA_DOSYA` seçilmemişse eski `%USERPROFILE%\Kasa\kasa.age` denetlenir. Yalnız eski yerde kasa bulunduğunda boş kasa kurulmaz; **Güvenli taşı** veya **Şimdilik eski yerden aç** seçenekleri sunulur. Yalnız yanlış şifrede, en fazla üç kez yeniden sorulur. Kaynak doğrulanır, mevcut hedefi ezmeyen şifreli kopya yazılır, SHA-256 karşılaştırılır ve yeni kopya şifreyle yeniden açılır. Ardından eski kasa ile `.bak` dosyasını silmek için gerçek yedek yolunu gösteren ayrı `evet` onayı istenir. Onaydan sonra yeni kopya yeniden açılıp göç anındaki SHA-256 ile karşılaştırılır; hata varsa eski dosyalar silinmez. Enter eski kopyaları saklar. Göç bitince eski kilit hemen bırakılır. Kilidin sahibi hâlâ çalışıyorsa devralma reddedilir; yalnız eski, sahibi kapanmış kilit için silme onayı sorulur.

İki yerde de kasa varsa program yolları, boyutları ve son değişiklik zamanlarını gösterip durur. İstediğiniz kasayı `KASA_DOSYA` ile açıkça seçin veya diğer kopyayı başka yere taşıyın. Eski kopyayı göç sonunda sakladıysanız sonraki açılışta da bu karar gerekir.

## Kullanım

İlk açılışta, ana şifreden önce arayüz dili sorulur (**Türkçe** veya **English**). Sistem yerel ayarı Türkçeyse varsayılan 1 (Türkçe), değilse 2 (English) olur; Enter varsayılanı seçer. Seçim `KASA_DOSYA` konumundan bağımsız olarak `%LOCALAPPDATA%\kasa\ayarlar.json` dosyasına atomik kaydedilir. `LOCALAPPDATA` yoksa `%USERPROFILE%\AppData\Local\kasa\ayarlar.json` kullanılır. Mevcut dosya geçerli Kasa ayarı değilse veya kasa dosyasıyla aynıysa korunur ve uyarı verilir; dil oturum içinde geçerli kalır. İstendiğinde `KASA_DIL=tr` veya `KASA_DIL=en` ortam değişkeniyle dil geçici olarak zorlanabilir. Dili sonradan değiştirmek için ana menüdeki **14) Dil / Language** seçeneğini kullanabilirsiniz.

İlk açılışta yeni ana şifre iki kez sorulur. Gizli girişte karakter veya yıldız görünmez; Enter ile tamamlayın. Açılışta `Kasa v1.0.0` gibi sürüm bilgisi gösterilir.

```text
1) Kayıtları listele
2) Ara
3) Kayıt göster
4) Panoya kopyala (30 sn sonra silinir)
5) Yeni kayıt ekle / güncelle
6) Dosya ekle
7) Dosya çıkar
8) .env dosyası olarak çıkar
9) Kayıt / dosya sil
10) Şifre üret (panoya kopyalanır)
11) Ana şifre değiştir
12) Yedek al
13) Yedeği doğrula
14) Dil / Language
0) Çık
```

Seçimleri numarayla yapın. Listelemede kategori boşsa tümü gösterilir. Arama ad, kategori ve not alanlarında yapılır; değerlerde arama yapılmaz. Ad, kategori, kullanıcı adı ve adres görünür alanlardır; buralara sır yazmayın. Kartta gizli alanlar ancak numarasını seçtiğinizde görünür; Enter ekranı temizler.

Kayıt eklerken anahtar, hesap veya env türünü seçin. Aynı ad güncellemedir ve onay sorulur. Güncellemede boş alanlar mevcut değeri korur. Yeni hesapta boş parola güçlü parola üretir; güncellemede yeni parola üretmek ayrıca onay gerektirir. `.env` dosyasından yükleme tüm değişkenleri değiştirir; elle giriş mevcut değişkenleri korur. Env biçimi tek satırlık `AD=değer` satırlarıdır; çok satır, değişken genişletme ve genel dotenv kaçış dili desteklenmez. Dışa aktarmada tek tırnakla birlikte çift tırnak, ters bölü veya dolar içeren değerler reddedilir. `.env` içe aktarma sınırı 1 MiB, şifreli kasa ve yedek okuma sınırı 200 MiB'dir. Çıkarılan env dosyasını hedef uygulamada kontrol edin.

Dosyalar SHA-256 ve boyut bilgisiyle kasaya gömülür. Tek dosya en fazla **25 MiB**, toplam gömülü dosyalar **100 MiB** olabilir. Dosya yolunu sürükleyip bırakabilirsiniz. Dosya çıkarma ve `.env` çıkarma **şifresiz dosya oluşturur**; hedef varsa ayrıca onay gerekir. Etkin kasa, `.bak`, `.kilit`, `.tmp.*` ve `.age` hedefleri reddedilir. Açık dosyaları güvenli yerde tutun, Git'e veya buluta eklemeyin.

Panodaki sır yaklaşık 30 saniye sonra veya oturum kapanırken temizlenir. Arada başka içerik kopyalanmışsa o içerik korunur. Pano geçmişi ve bulut eşitlemesini engelleyen Windows işaretleri kullanılır. Beş dakika tuşa basılmazsa oturum kapanır. Normal çıkış için **0** kullanın; pencereyi X ile kapatmak pano temizliğini engelleyebilir.

## Yedekleme düzeni

Haftada bir ve önemli değişikliklerden sonra:

1. Menü **12** ile tarihli şifreli yedek alın; tercihen başka disk veya USB klasörü seçin. FAT32/exFAT için sabit bağlantı gerekmez: benzersiz dosya oluşturulur, yazılıp diske eşitlenir ve doğrulanır. Doğrulama başarısızsa yeni kopya silinir. Boş hedef mevcut kasanın klasörünü kullanır. Mevcut yedek ezilmez.
2. Gösterilen şifreli dosyanın SHA-256 değerini saklayın. Yedeği başka bir ortama kopyalayın; isterseniz şifreli kopyayı güvendiğiniz bulut depolamaya yükleyin.
3. Kopyayı ayrı bir klasöre geri alın, menü **13** ile doğrulayın ve SHA-256 değerlerinin eşleştiğini kontrol edin.

`.bak` yalnız bir önceki kayıt sürümüdür; silinen sırlar orada bulunabilir. Ana şifre değişikliği eski `.bak` ve tarihli yedeklerin şifresini değiştirmez. Yeni şifreyle yeni yedek alıp doğrulayın; eski kopyaları saklama veya silme kararını buna göre verin. Eski yedekler için eski şifre gerekir. Program buluta otomatik yedek yüklemez.

## Kaçış yolu: resmi age.exe ile kurtarma

Kasa programı çalışmasa da standart age dosyasını [resmi age sürümlerindeki](https://github.com/FiloSottile/age/releases) Windows `age.exe` aracıyla açabilirsiniz. Güvenli bir yerel klasörde, hedefte `kasa-acik.json` bulunmadığından emin olarak:

```powershell
.\age.exe -d -o kasa-acik.json "$env:LOCALAPPDATA\kasa\kasa.age"
```

Özel kasa veya yedek kullanıyorsanız yolu değiştirin. Ana şifreyi araç kendisi sorar. **Bu komut tüm sırları açık JSON dosyasına çıkarır.** JSON içinde kayıtlar ve dosyaların `icerikBase64`, `boyutBayt`, `sha256` bilgileri bulunur. Gömülü dosyayı geri oluştururken base64 çözümü, boyut ve SHA-256 doğrulaması gerekir. Açık JSON'u buluta yüklemeyin; işiniz bitince silin. Normal silme SSD ve yedeklerden güvenli silme garantisi vermez.

## Güncelleme

Önce menü 12 ile yedek alın. Kasa pencerelerini kapatın. Yeni etiketli sürümün ZIP'ini [Kasa sürümlerinden](https://github.com/ozankartalerdogan-code/kasa/releases) indirin, SHA-256 doğrulayın, ayrı klasöre açın ve yeni `kur.cmd` dosyasını çalıştırın. Program dosyaları yenilenir; `%LOCALAPPDATA%\kasa` içindeki kasa verisi korunur. Yeni PowerShell'de açılış sürümünü kontrol edin. Bağımlılık veya imza denetimi başarısızsa eski sürüm çalışır kalır; sorunu giderip yeniden kurun. Boş veya yarım klasörler yeniden kurulumu engellemez; yarım hazırlama klasörü veya listelenmemiş dosyalar gerekirse zaman damgalı adla korunur. Eski program klasöründeki kullanıcı dosyaları `kasa.eski` içinde bırakılır; sonraki güncellemede gerekirse bu klasöre zaman damgası eklenir ve konumu bildirilir. Listesiz eski kurulumlar da güvenlik için burada korunur.

Daha yeni bir şema içeren kasa, doğru şifreyle açılınca programı güncellemeniz gerektiğini bildirir. Yanlış şifre ve bozuk dosya aynı hatayı verir; şifre çözülmeden şema bilgisi açıklanmaz.

## Kaldırma

ZIP'teki `kaldir.cmd` dosyasını çalıştırın veya PowerShell'de:

```powershell
& "$env:LOCALAPPDATA\Programs\kasa\kaldir.cmd"
```

Yalnız `kurulum-listesi.json` içindeki dosyalar, bütün `node_modules` klasörü ve programın kullanıcı PATH girdisi kaldırılır; ardından boş klasörler silinir. Listede olmayan dosyalar (program klasöründeki özel kasa ve yedekler dahil) korunur ve kalan klasör iki dilde bildirilir. Liste yoksa yalnız tamamen boş program klasörü silinir; içerik varsa hiçbir şey silinmez ve kalan klasör tekrar iki dilde bildirilir. Geçersiz listede dosya kaldırma durur. PATH girdisi dosya denetiminden önce kaldırılır. Bağlantı/junction içindeki kurulumda işlem durur. Node.js kaldırma için de gereklidir. **Kasa verisi `%LOCALAPPDATA%\kasa` içinde kalır. Kasanızı silmek istiyorsanız önce yedeğiniz olduğundan emin olun, sonra bu klasörü elle silin.** Özel konumlar ve eski konumdaki kopyalar da korunur.

## Bilinen sınırlar

- Zararlı yazılım, klavye kaydedici, ekran görüntüsü ve açık oturumda belleğin okunmasına karşı koruma sağlamaz. JavaScript metinlerinin bellekten kesin silinmesi garanti edilemez; takas dosyasında iz kalabilir.
- Pano işaretleri başka uygulamaların okumasını engellemez. Zorla kapatma veya kilitli pano temizlemeyi engelleyebilir. Terminalin kendi kayıtları bütünüyle silinemez.
- Kilit, diğer Kasa oturumları içindir; dış programların yazmasını engelleyen işletim sistemi kilidi değildir. Windows ACL ve disk güvenliği ayrıca yönetilmelidir.
- Güç kesintisi dayanıklılığı mutlak değildir. Zorla kapatmada göç/yedek kopyası veya geçici şifresiz dışa aktarma dosyası kalabilir. Sabit bağlantı desteği gerekmez.
- Tüm kasa belleğe alınır ve her kayıtta yeniden şifrelenir. Büyük dosya arşivi ve eşzamanlı bulut eşitlemesi için tasarlanmamıştır.

## Lisans ve güvenlik bildirimi

[MIT lisansı](LICENSE) ile sunulur. Güvenlik açığı bildirimi için [güvenlik politikasını](SECURITY.md) okuyun.

## Testler

Geliştirici kopyasında `npm test` çalıştırılır. Testler alt süreç yalıtımı olmadan sırayla, geçici kasa ve ayar dosyaları ve sahte pano işlemleriyle çalışır. Kurulum dosya işlemleri geçici klasörlerde sınanır. Windows PATH testi yalnız rastgele bir `HKCU\Software\KasaTest-*` anahtarı kullanır ve sonunda siler; ortam alt süreçleri engelliyorsa atlanır. Gerçek pano ve tam çevrimiçi kurulum ayrıca elle doğrulanmalıdır.

Resmi `age.exe` uyumluluk testi isteğe bağlıdır: çalıştırmak için `AGE_EXE` değişkenini çalıştırılabilir dosyanın yoluna, `AGE_BATCHPASS_KLASOR` değişkenini batchpass eklentisinin bulunduğu klasöre ayarlayın. Her iki değişken birlikte tanımlanmamışsa test atlanır.

Filippo Valsorda'nın [age](https://age-encryption.org) aracı ve `age-encryption` TypeScript kütüphanesi üzerine kurulmuştur; emeği geçenlere teşekkürler.

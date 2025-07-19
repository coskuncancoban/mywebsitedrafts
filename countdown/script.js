
// GERİ SAYIM HEDEF TARİHİ
// Format: "Ay Adı Gün, Yıl Saat:Dakika:Saniye"
const hedefTarih = new Date("September 22, 2025 00:00:00").getTime();



// HTML elementlerini seçme
const countdownElement = document.getElementById('countdown');
const bodyElement = document.body;

// Geri sayımı güncelleyen fonksiyon
function updateCountdown() {
    const simdi = new Date().getTime();
    const kalanSure = hedefTarih - simdi;

    if (kalanSure < 0) {
        countdownElement.innerHTML = "00:00:00:00";
        clearInterval(countdownInterval); // Geri sayım bittiğinde interval'ı durdur
        return;
    }

    // Zaman hesaplamaları
    const gun = Math.floor(kalanSure / (1000 * 60 * 60 * 24));
    const saat = Math.floor((kalanSure % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const dakika = Math.floor((kalanSure % (1000 * 60 * 60)) / (1000 * 60));
    const saniye = Math.floor((kalanSure % (1000 * 60)) / 1000);

    // Tek haneli sayıların başına '0' ekleme
    const formatliGun = gun.toString().padStart(2, '0');
    const formatliSaat = saat.toString().padStart(2, '0');
    const formatliDakika = dakika.toString().padStart(2, '0');
    const formatliSaniye = saniye.toString().padStart(2, '0');
    
    // Ekrana yazdırma
    countdownElement.innerHTML = `${formatliGun}:${formatliSaat}:${formatliDakika}:${formatliSaniye}`;
}

// Arkaplanı güncelleyen fonksiyon
function updateBackground() {
    const now = new Date();
    let saat = now.getHours().toString().padStart(2, '0');
    let dakika = now.getMinutes().toString().padStart(2, '0');
    let saniye = now.getSeconds().toString().padStart(2, '0');
    const hexRenk = `#${saat}${dakika}${saniye}`;
    bodyElement.style.backgroundColor = hexRenk;
}


// Fonksiyonları belirli aralıklarla çalıştırma
const countdownInterval = setInterval(updateCountdown, 1000); // Geri sayımı her saniye güncelle
const backgroundInterval = setInterval(updateBackground, 1000); // Arkaplanı her saniye güncelle

// Sayfa ilk yüklendiğinde fonksiyonların hemen çalışmasını sağla
updateCountdown();
updateBackground();
// Firebase SDK'lerinden gerekli fonksiyonları import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- KENDİ FIREBASE BİLGİLERİNİZİ BURAYA YAPIŞTIRIN ---
const firebaseConfig = {
    apiKey: "AIzaSyC02gtpAVVPjugLBo2POxaxl6hHq8n9Ofg",
    authDomain: "github-mywebsitedrafts.firebaseapp.com",
    projectId: "github-mywebsitedrafts",
    storageBucket: "github-mywebsitedrafts.firebasestorage.app",
    messagingSenderId: "554051400137",
    appId: "1:554051400137:web:16a5ebde5deb7b0b187818",
    measurementId: "G-7R6G23563M"
};
// ----------------------------------------------------

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elementleri ve Değişkenler
const quizContainer = document.getElementById('quiz-container');
const shuffleBtn = document.getElementById('shuffle-btn');
const adminIcon = document.getElementById('admin-icon');
const addQuestionForm = document.getElementById('add-question-form');
const adminModal = document.getElementById('admin-modal');
const adminCodeInput = document.getElementById('admin-code-input');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSubmitBtn = document.getElementById('modal-submit-btn');

const ADMIN_CODE_HASH = "a2dd933588052c16311d153be5693101811c776df67af5cd7244172a0430b221";
let isAdminMode = false;
let localQuestions = [];

// Girilen metni hash'leyen yardımcı fonksiyon
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Soruları veritabanından dinle ve işle
onSnapshot(collection(db, 'questions'), (snapshot) => {
    localQuestions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    // YENİ SATIR: Soruları rastgele karıştırır.
    localQuestions.sort(() => Math.random() - 0.5);
    renderQuestions(localQuestions);
});

// Tüm soruları ekrana çizen ana fonksiyon
const renderQuestions = (questionsToRender) => {
    quizContainer.innerHTML = '';
    if (questionsToRender.length === 0) {
        quizContainer.innerHTML = '<p id="loading-message">Henüz soru eklenmemiş. Yönetici panelinden ekleyebilirsiniz.</p>';
        return;
    }
    questionsToRender.forEach((q) => {
        const quizItemWrapper = document.createElement('div');
        quizItemWrapper.className = 'quiz-item-wrapper';
        quizItemWrapper.id = `quiz-item-${q.id}`;
        const questionCard = createQuestionCard(q);
        quizItemWrapper.appendChild(questionCard);
        quizContainer.appendChild(quizItemWrapper);
    });
    feather.replace({ width: '18px', height: '18px' });
};


// GÜNCELLENDİ: Soru kartı HTML'ini oluşturan yardımcı fonksiyon
function createQuestionCard(q) {
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';

    // YENİ: Metindeki alt satır karakterlerini (\n) HTML'in anlayacağı <br> etiketine çeviriyoruz.
    const formattedQuestion = q.question.replace(/\n/g, '<br>');
    const formattedExplanation = q.explanation ? q.explanation.replace(/\n/g, '<br>') : '';

    questionCard.innerHTML = `
        <div class="question-header">
            <div class="question-content">
                <h3>${formattedQuestion}</h3>
            </div>
            <div class="admin-actions">
                ${isAdminMode ? `<button class="delete-btn" onclick="deleteQuestion('${q.id}')">Sil</button>` : ''}
            </div>
        </div>
        <ul class="options-list">
            ${q.options.map(option => `<li class="option" onclick="checkAnswer(this, '${q.id}', '${option.replace(/'/g, "\\'")}')">${option}</li>`).join('')}
        </ul>
        ${q.explanation ? `<div class="explanation-box hidden" id="explanation-${q.id}">${formattedExplanation}</div>` : ''}
    `;
    return questionCard;
}

// --- GLOBAL FONKSİYONLAR ---
window.checkAnswer = (selectedElement, questionId, selectedAnswer) => {
    const question = localQuestions.find(q => q.id === questionId);
    if (!question) return;
    const questionCard = selectedElement.closest('.question-card');
    if (questionCard.dataset.answered === 'true') return;
    const isCorrect = question.correctAnswer === selectedAnswer;
    selectedElement.classList.add(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
        questionCard.dataset.answered = 'true';
        questionCard.querySelectorAll('.option').forEach(opt => {
            opt.style.cursor = 'not-allowed';
            opt.onclick = null;
        });
        const explanationBox = document.getElementById(`explanation-${questionId}`);
        if (explanationBox) {
            explanationBox.classList.remove('hidden');
        }
    } else {
        setTimeout(() => selectedElement.classList.remove('incorrect'), 1000);
    }
};
window.deleteQuestion = async (questionId) => {
    if (confirm('Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        await deleteDoc(doc(db, 'questions', questionId));
    }
};

// --- YÖNETİCİ PANELİ VE DİĞER OLAY DİNLEYİCİLER ---
addQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const questionText = document.getElementById('question-text').value.trim();
    const explanationText = document.getElementById('question-explanation').value.trim();
    const options = Array.from(document.querySelectorAll('#add-question-form input[name="option"]')).map(i => i.value.trim());
    const correctIndex = document.querySelector('#add-question-form input[name="correct-answer"]:checked').value;
    if (!questionText || options.some(opt => opt === '') || !explanationText) {
        alert('Lütfen tüm alanları doldurun.');
        return;
    }
    await addDoc(collection(db, 'questions'), {
        question: questionText,
        options,
        correctAnswer: options[correctIndex],
        explanation: explanationText,
        createdAt: serverTimestamp()
    });
    addQuestionForm.reset();
});

const toggleAdminMode = (isAuthenticated) => {
    if (isAuthenticated) {
        isAdminMode = !isAdminMode;
        document.getElementById('admin-panel').classList.toggle('hidden', !isAdminMode);
        adminIcon.classList.toggle('active', isAdminMode);
        renderQuestions(localQuestions);
    } else {
        alert('Yanlış kod!');
    }
    adminCodeInput.value = '';
    adminModal.classList.add('hidden');
};

shuffleBtn.addEventListener('click', () => renderQuestions([...localQuestions].sort(() => Math.random() - 0.5)));

adminIcon.addEventListener('click', () => {
    if (isAdminMode) {
        toggleAdminMode(true);
    } else {
        adminModal.classList.remove('hidden');
        adminCodeInput.focus();
    }
});

modalCancelBtn.addEventListener('click', () => adminModal.classList.add('hidden'));

modalSubmitBtn.addEventListener('click', async () => {
    const enteredCode = adminCodeInput.value;
    const enteredCodeHash = await sha256(enteredCode);
    toggleAdminMode(enteredCodeHash === ADMIN_CODE_HASH);
});

adminCodeInput.addEventListener('keyup', e => e.key === 'Enter' && modalSubmitBtn.click());

// =========================================================================
// YENİ: ANLIK KULLANICI GÖSTERGESİ SİSTEMİ
// =========================================================================

// Gerekli Realtime Database fonksiyonlarını Firebase'den import ediyoruz
import { getDatabase, ref, onValue, onDisconnect, set, push } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// --- HAZIRLIK: Kendi Varlıklarınızı (Assets) Buraya Girin ---

// Yapay zeka ile ürettiğiniz ikonların linklerini bu diziye ekleyin.
// Örnek: 'images/icon1.png' veya tam URL 'https://.../icon1.png'
const profileIcons = [
    'https://coskuncancoban.github.io/mywebsitedrafts/images/1.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/2.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/3.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/4.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/5.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/6.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/7.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/8.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/9.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/10.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/11.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/12.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/13.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/14.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/15.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/16.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/17.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/18.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/19.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/20.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/21.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/22.png',
    'https://coskuncancoban.github.io/mywebsitedrafts/images/23.png'
];

// Gösterilecek rastgele kullanıcı adlarını bu diziye ekleyin
const userNames = ['Pufpuf', 'Gıcık', 'Tırtıl', 'Zıpır', 'Laklak', 'Fırt', 'Şapşik', 'Çıtpıt', 'Pıtırtı', 'Uykucu', 'Hışır', 'Zıpzıp', 'Köpük', 'Minnoş', 'Vızvız', 'Yumuş', 'Fırfır', 'Kıpır', 'Hınzır', 'Şaşkın', 'Bıcır', 'Fıstık', 'Mırıltı', 'Pıtırcık', 'Gıdık', 'Pofidik', 'Bıcırık', 'Mırnav', 'Böcük', 'Fışfış', 'Cingil', 'Pofidik', 'Gıtır', 'Hışırtı', 'Kıvırcık', 'Pırsık', 'Dımbık', 'Uçarı', 'Bıcırık', 'Fındık', 'Hışır', 'Uykulu', 'Zıpçık', 'Cırtlak', 'Boncuk', 'Kütür', 'Şanslı', 'Püskül', 'Sinsi', 'Şirin'];
// ----------------------------------------------------


// Realtime Database'i (rtdb) başlatıyoruz
const rtdb = getDatabase(app);

// Her dersin kendi anlık kullanıcı sayacının olması için yolu dinamik olarak alıyoruz
// Örneğin /python/ sayfası için 'python' kelimesini alır
const coursePath = window.location.pathname.replace(/\//g, '') || 'anasayfa';
const presenceRef = ref(rtdb, `presence/${coursePath}`);

// HTML'e eklediğimiz elementleri seçiyoruz
const userListElement = document.getElementById('presence-user-list');
const notificationElement = document.getElementById('presence-notification');

// Sayfaya giren her kullanıcı için rastgele bir isim ve ikon seçiyoruz
const myRandomName = userNames[Math.floor(Math.random() * userNames.length)];
const myRandomIcon = profileIcons[Math.floor(Math.random() * profileIcons.length)];

// Online kullanıcıların anlık listesini tutmak için bir değişken
let currentUsers = {};

// 1. Kullanıcı online olduğunda çalışacak mantık
const myConnectionRef = push(presenceRef); // Veritabanında bu kullanıcı için benzersiz bir yer oluştur
onDisconnect(myConnectionRef).remove();      // Tarayıcı kapandığında veya bağlantı koptuğunda, bu kaydı otomatik sil
set(myConnectionRef, { name: myRandomName, icon: myRandomIcon }); // Veritabanına kendi rastgele bilgilerimizi yaz

// 2. Bildirim gösterme ve gizleme fonksiyonu
let notificationTimeout;
function showNotification(message, type = 'join') {
    if (!notificationElement) return;
    
    clearTimeout(notificationTimeout); // Önceki bildirimi temizle

    notificationElement.textContent = message;
    notificationElement.className = type; // CSS'te '.join' veya '.leave' stilini uygular
    
    // 4 saniye sonra bildirimi gizle
    notificationTimeout = setTimeout(() => {
        notificationElement.className = 'hidden';
    }, 4000);
}

// 3. Online kullanıcı listesini ekrana çizen fonksiyon
function renderUserList(users) {
    if (!userListElement) return;
    userListElement.innerHTML = ''; // Her güncellemede listeyi temizle
    
    // Kullanıcı objesindeki her bir kişi için HTML oluştur
    for (const key in users) {
        const user = users[key];
        const userDiv = document.createElement('div');
        userDiv.className = 'presence-user';
        userDiv.innerHTML = `
            <img src="${user.icon}" alt="Kullanıcı İkonu" class="presence-icon">
            <span class="presence-name">${user.name}</span>
        `;
        userListElement.appendChild(userDiv);
    }
}

// 4. Ana Dinleyici: Veritabanındaki 'presence' listesindeki her değişikliği dinle
onValue(presenceRef, (snapshot) => {
    const newUsers = snapshot.val() || {}; // Gelen yeni kullanıcı listesi
    
    // Gelen ve ayrılan kullanıcıları tespit et ve bildirimi göster
    // Yeni bir kullanıcı gelmişse:
    for (const key in newUsers) {
        if (!currentUsers[key]) {
            // Sayfayı açan kişinin kendisi için "geldi" bildirimi gösterme
            if (key !== myConnectionRef.key) {
                 showNotification(`${newUsers[key].name} geldi`, 'join');
            }
        }
    }
    // Bir kullanıcı ayrılmışsa:
    for (const key in currentUsers) {
        if (!newUsers[key]) {
            showNotification(`${currentUsers[key].name} ayrıldı`, 'leave');
        }
    }
    
    // Lokal kullanıcı listemizi ve ekrandaki görüntüyü güncelle
    currentUsers = newUsers;
    renderUserList(currentUsers);
});

// =========================================================================
// BÖLÜM 1: FIREBASE KURULUMU
// =========================================================================

// --- KENDİ FIREBASE BİLGİLERİNİZİ BURAYA YAPIŞTIRIN ---

const firebaseConfig = {
    apiKey: "AIzaSyC02gtpAVVPjugLBo2POxaxl6hHq8n9Ofg",
    authDomain: "github-mywebsitedrafts.firebaseapp.com",
    projectId: "github-mywebsitedrafts",
    storageBucket: "github-mywebsitedrafts.firebasestorage.app",
    messagingSenderId: "554051400137",
    appId: "1:554051400137:web:16a5ebde5deb7b0b187818",
    measurementId: "G-7R6G23563M",
    databaseURL: "https://github-mywebsitedrafts-default-rtdb.europe-west1.firebasedatabase.app/"
};
// ----------------------------------------------------

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const booksCollection = db.collection('books');


// =========================================================================
// BÖLÜM 2: UYGULAMA MANTIĞI
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const bookContainer = document.querySelector('.book-container');
    const addBookBtn = document.getElementById('add-book-btn');

    let books = []; // Verileri yerel olarak tutmak için dizi

    // Kitapları arayüze döken ana fonksiyon
    const renderBooks = () => {
        bookContainer.innerHTML = '';
        books.forEach(book => {
            const bookWrapper = createBookWrapper(book);
            bookContainer.appendChild(bookWrapper);
        });
        addEventListeners();
        updateAllProgressBars();
    };

    // Her bir kitap için HTML yapısını oluşturan fonksiyon
    const createBookWrapper = (book) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'book-wrapper';
        wrapper.dataset.id = book.id; // Firestore'dan gelen ID'yi kullanıyoruz

        let totalPagesHTML;
        if (book.totalPages > 0) {
            totalPagesHTML = `<span>Total: ${book.totalPages}</span>`;
        } else {
            totalPagesHTML = `Total: <input type="number" class="total-pages-input" placeholder="###">`;
        }

        wrapper.innerHTML = `
            <div class="book-slot">
                <button class="delete-btn" aria-label="Delete book">×</button>
                <div class="drop-zone">
                    <img class="book-cover" src="${book.imgSrc || ''}" alt="Book Cover" style="${book.imgSrc ? '' : 'display:none;'}">
                </div>
                <div class="page-tracker">
                    <button class="btn minus" aria-label="Decrease page count">-</button>
                    <span class="page-count">${book.pages}</span>
                    <button class="btn plus" aria-label="Increase page count">+</button>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-bar-fill"></div>
                </div>
                <div class="total-pages-container">
                    ${totalPagesHTML}
                </div>
            </div>
        `;
        return wrapper;
    };

    // [YENİ] Firestore'a yeni bir kitap ekler
    const addBook = () => {
        const newBook = {
            imgSrc: '',
            pages: 0,
            totalPages: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Sıralama için oluşturma tarihi
        };
        booksCollection.add(newBook); // .then() ve .catch() ile hata kontrolü eklenebilir
    };

    // [YENİ] Firestore'daki bir kitabı günceller
    const updateBook = (bookId, data) => {
        booksCollection.doc(bookId).update(data);
    };

    // [YENİ] Firestore'dan bir kitabı siler
    const deleteBook = (bookId) => {
        booksCollection.doc(bookId).delete();
    };
    
    // İlerleme çubuğunu günceller (Bu fonksiyon aynı kalabilir)
    const updateProgressBar = (bookId) => {
        const book = books.find(b => b.id === bookId);
        const wrapper = document.querySelector(`.book-wrapper[data-id='${bookId}']`);
        if (book && wrapper) {
            const fill = wrapper.querySelector('.progress-bar-fill');
            const progress = (book.totalPages > 0) ? (book.pages / book.totalPages) * 100 : 0;
            fill.style.width = `${Math.min(progress, 100)}%`;
        }
    };

    const updateAllProgressBars = () => books.forEach(book => updateProgressBar(book.id));

    // Olay dinleyicilerini ekler
    const addEventListeners = () => {
        document.querySelectorAll('.book-wrapper').forEach(wrapper => {
            const bookId = wrapper.dataset.id;
            if (!bookId) return;
            
            const book = books.find(b => b.id === bookId);
            if(!book) return;

            // Silme butonu
            wrapper.querySelector('.delete-btn').addEventListener('click', () => {
                deleteBook(bookId);
            });

            // Sayfa artırma
            wrapper.querySelector('.plus').addEventListener('click', () => {
                updateBook(bookId, { pages: book.pages + 1 });
            });

            // Sayfa azaltma
            wrapper.querySelector('.minus').addEventListener('click', () => {
                if (book.pages > 0) {
                    updateBook(bookId, { pages: book.pages - 1 });
                }
            });

            // Toplam sayfa sayısı girişi
            const totalPagesInput = wrapper.querySelector('.total-pages-input');
            if (totalPagesInput) {
                totalPagesInput.addEventListener('change', (e) => {
                    const newTotal = parseInt(e.target.value);
                    if (newTotal > 0) {
                        updateBook(bookId, { totalPages: newTotal });
                    }
                });
            }

            // Resim sürükle-bırak
            const dropZone = wrapper.querySelector('.drop-zone');
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        updateBook(bookId, { imgSrc: reader.result });
                    };
                    reader.readAsDataURL(file);
                }
            });

            dropZone.addEventListener('dragover', e => e.preventDefault());
        });
    };
    
    addBookBtn.addEventListener('click', addBook);

    // [ANA DEĞİŞİKLİK] Firestore'daki değişiklikleri dinle
    booksCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBooks();
    });
});
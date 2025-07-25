document.addEventListener('DOMContentLoaded', () => {
    const bookContainer = document.querySelector('.book-container');
    const addBookBtn = document.getElementById('add-book-btn');
    let books = JSON.parse(localStorage.getItem('books')) || [];

    const saveBooks = () => localStorage.setItem('books', JSON.stringify(books));

    const renderBooks = () => {
        bookContainer.innerHTML = '';
        books.forEach(book => {
            const bookWrapper = createBookWrapper(book);
            bookContainer.appendChild(bookWrapper);
        });
        addEventListeners();
        updateAllProgressBars();
    };

    const createBookWrapper = (book) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'book-wrapper';
        wrapper.dataset.id = book.id;

        // Determine if total pages input should be shown or just text
        let totalPagesHTML;
        if (book.totalPages > 0) {
            // New, cleaner display for total pages
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

    const addBook = () => {
        const newBook = { id: Date.now(), imgSrc: '', pages: 0, totalPages: 0 };
        books.push(newBook);
        saveBooks();
        renderBooks();
    };

    const updateBook = (bookId, property, value) => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            book[property] = value;
            saveBooks();
        }
    };

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

    const addEventListeners = () => {
        document.querySelectorAll('.book-wrapper').forEach(wrapper => {
            const bookId = parseInt(wrapper.dataset.id);
            if (!bookId) return;

            wrapper.querySelector('.delete-btn').addEventListener('click', () => {
                books = books.filter(book => book.id !== bookId);
                saveBooks();
                renderBooks();
            });

            const pageCountEl = wrapper.querySelector('.page-count');
            wrapper.querySelector('.plus').addEventListener('click', () => {
                const book = books.find(b => b.id === bookId);
                book.pages++;
                pageCountEl.textContent = book.pages;
                updateProgressBar(bookId);
                saveBooks();
            });

            wrapper.querySelector('.minus').addEventListener('click', () => {
                const book = books.find(b => b.id === bookId);
                if (book.pages > 0) {
                    book.pages--;
                    pageCountEl.textContent = book.pages;
                    updateProgressBar(bookId);
                    saveBooks();
                }
            });

            const totalPagesInput = wrapper.querySelector('.total-pages-input');
            if (totalPagesInput) {
                totalPagesInput.addEventListener('change', (e) => {
                    const newTotal = parseInt(e.target.value);
                    if (newTotal > 0) {
                        updateBook(bookId, 'totalPages', newTotal);
                        renderBooks();
                    }
                });
            }

            wrapper.querySelector('.drop-zone').addEventListener('drop', (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        updateBook(bookId, 'imgSrc', reader.result);
                        const currentBook = books.find(b => b.id === bookId);
                        renderBooks();
                    };
                    reader.readAsDataURL(file);
                }
            });

            wrapper.querySelector('.drop-zone').addEventListener('dragover', e => e.preventDefault());
        });
    };

    addBookBtn.addEventListener('click', addBook);
    renderBooks();
});
// Gerekli Firebase servislerini import et
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase yapılandırma bilginizi buraya yapıştırın.
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const notesCollection = collection(db, 'notes');

// DOM Elemanları
const canvas = document.getElementById('canvas');
const addNoteBtn = document.getElementById('add-note-btn');
const focusModal = document.getElementById('focus-modal');
const focusEditor = document.getElementById('focus-editor');
const modalCloseBtn = focusModal.querySelector('.modal-close-btn');

// Lokal Durum Yönetimi
let localNotes = new Map();
let activeDrag = null;
let activeFocus = null;

// ===================================
// SADELEŞTİRİLMİŞ RENK MANTIĞI
// ===================================
// 'neutral' durumu kaldırıldı. Palet doğrudan renklerle başlıyor.
const NOTE_COLORS = ['#4B5563', '#38BDF8', '#4ADE80', '#FACC15', '#F472B6', '#A78BFA'];

// Yardımcı fonksiyon: Hex rengini alır ve şeffaflıkla yeni bir rgba rengi döndürür.
function colorWithTransparency(color, alpha) {
    if (!color || !color.startsWith('#')) return 'var(--note-bg)';
    
    let r, g, b;
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    
    // Arka plan rengini, ana note-bg rengi üzerine bir katman olarak ekle.
    // Bu, daha tutarlı bir görünüm sağlar.
    const baseBg = 'rgba(30, 30, 30, 0.6)'; // --note-bg'den gelen değer
    return `linear-gradient(0deg, rgba(${r}, ${g}, ${b}, ${alpha}), rgba(${r}, ${g}, ${b}, ${alpha})), ${baseBg}`;
}

/**
 * Bir notun rengini ve arkaplanını uygular.
 * @param {HTMLElement} element - Stil uygulanacak not elementi.
 * @param {string} color - Bir hex renk kodu.
 */
function applyNoteStyle(element, color) {
    const effectiveColor = color || NOTE_COLORS[0];
    element.style.borderColor = effectiveColor;
    
    // Arka planı, 'background' özelliği ile ayarla (daha esnek).
    // colorWithTransparency fonksiyonu artık gradient döndürüyor.
    element.style.background = colorWithTransparency(effectiveColor, 0.125);
    // Backdrop filter'ın çalışması için bu gereklidir.
    element.style.backdropFilter = 'blur(12px)';
    element.style.webkitBackdropFilter = 'blur(12px)';
}

const debounce = (func, delay = 500) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

const createNoteElement = (noteData) => {
    const noteEl = document.createElement('div');
    noteEl.id = noteData.id;
    noteEl.classList.add('note');
    noteEl.style.left = noteData.position.x;
    noteEl.style.top = noteData.position.y;
    noteEl.style.width = noteData.size.width;
    noteEl.style.height = noteData.size.height;
    
    applyNoteStyle(noteEl, noteData.color);

    const header = document.createElement('div');
    header.className = 'note-header';
    header.addEventListener('mousedown', startDrag);

    const colorPalette = document.createElement('div');
    colorPalette.className = 'color-palette';
    NOTE_COLORS.forEach(colorValue => {
        const colorDot = document.createElement('div');
        colorDot.className = 'color-dot';
        colorDot.dataset.color = colorValue;
        colorDot.style.borderColor = colorValue;

        if (colorValue === (noteData.color || NOTE_COLORS[0])) {
            colorDot.classList.add('selected');
        }

        colorDot.addEventListener('click', (e) => {
            e.stopPropagation();
            changeNoteColor(noteData.id, colorValue);
        });
        colorPalette.appendChild(colorDot);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Notu Sil';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(noteData.id);
    });
    
    header.appendChild(colorPalette);
    header.appendChild(deleteBtn);

    const content = document.createElement('div');
    content.className = 'note-content';
    content.contentEditable = true;
    content.innerHTML = noteData.content;
    content.addEventListener('input', debounce((e) => updateNoteContent(noteData.id, e.target.innerHTML)));

    noteEl.appendChild(header);
    noteEl.appendChild(content);

    const resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (entry?.borderBoxSize) {
            const borderBox = entry.borderBoxSize[0];
            debouncedUpdateSize(noteData.id, borderBox);
        }
    });
    resizeObserver.observe(noteEl);
    
    noteEl.addEventListener('dblclick', () => openFocusMode(noteData.id));

    canvas.appendChild(noteEl);
    localNotes.set(noteData.id, { element: noteEl, data: noteData, observer: resizeObserver });
};

const updateNoteElement = (noteData) => {
    const existing = localNotes.get(noteData.id);
    if (!existing) return;

    const { element } = existing;

    if (!activeDrag || activeDrag.id !== noteData.id) {
        element.style.left = noteData.position.x;
        element.style.top = noteData.position.y;
    }
    
    element.style.width = noteData.size.width;
    element.style.height = noteData.size.height;

    const noteColor = noteData.color || NOTE_COLORS[0];
    applyNoteStyle(element, noteColor);

    const dots = element.querySelectorAll('.color-dot');
    dots.forEach(dot => {
        dot.classList.toggle('selected', dot.dataset.color === noteColor);
    });

    const contentEl = element.querySelector('.note-content');
    if (document.activeElement !== contentEl && contentEl.innerHTML !== noteData.content) {
        contentEl.innerHTML = noteData.content;
        highlightCodeIn(contentEl);
    }
    
    existing.data = noteData;
};

const removeNoteElement = (noteId) => {
    const existing = localNotes.get(noteId);
    if (existing) {
        existing.observer.disconnect();
        existing.element.remove();
        localNotes.delete(noteId);
    }
};

const addNewNote = () => {
    const defaultNote = {
        content: '<div>Yeni not...</div>',
        position: { x: '50px', y: '80px' },
        size: { width: '280px', height: '180px' },
        // Yeni notlar artık paletin ilk rengiyle başlıyor.
        color: NOTE_COLORS[0], 
        createdAt: serverTimestamp()
    };
    addDoc(notesCollection, defaultNote).catch(err => console.error("Not eklenirken hata oluştu: ", err));
};

const updateNoteContent = async (id, newContent) => {
    const noteRef = doc(db, 'notes', id);
    await updateDoc(noteRef, { content: newContent });
    const noteEl = localNotes.get(id)?.element;
    if (noteEl) highlightCodeIn(noteEl.querySelector('.note-content'));
};

const updateNotePosition = debounce(async (id, newPosition) => {
    const noteRef = doc(db, 'notes', id);
    await updateDoc(noteRef, { position: newPosition });
}, 100);

const debouncedUpdateSize = debounce(async (id, borderBox) => {
    const noteRef = doc(db, 'notes', id);
    if(borderBox){
        await updateDoc(noteRef, {
            size: { 
                width: `${borderBox.inlineSize}px`, 
                height: `${borderBox.blockSize}px` 
            }
        });
    }
}, 500);

const changeNoteColor = async (id, newColor) => {
    const noteRef = doc(db, 'notes', id);
    await updateDoc(noteRef, { color: newColor });
};

const deleteNote = (id) => {
    if (confirm("Bu notu kalıcı olarak silmek istediğinizden emin misiniz?")) {
        deleteDoc(doc(db, 'notes', id)).catch(err => console.error("Not silinirken hata: ", err));
    }
};

const highlightCodeIn = (element) => {
    element.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });
};

const startDrag = (e) => {
    e.preventDefault();
    const noteEl = e.target.closest('.note');
    if (!noteEl) return;
    
    noteEl.classList.add('is-dragging');
    
    const rect = noteEl.getBoundingClientRect();
    activeDrag = {
        id: noteEl.id,
        element: noteEl,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
    };

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
};

const drag = (e) => {
    if (!activeDrag) return;
    e.preventDefault();

    let newX = e.clientX - activeDrag.offsetX;
    let newY = e.clientY - activeDrag.offsetY;

    newX = Math.max(0, Math.min(newX, canvas.clientWidth - activeDrag.element.offsetWidth));
    newY = Math.max(0, Math.min(newY, canvas.clientHeight - activeDrag.element.offsetHeight));

    activeDrag.element.style.left = `${newX}px`;
    activeDrag.element.style.top = `${newY}px`;
};

const endDrag = () => {
    if (!activeDrag) return;
    
    activeDrag.element.classList.remove('is-dragging');
    
    const newPosition = {
        x: activeDrag.element.style.left,
        y: activeDrag.element.style.top
    };
    updateNotePosition(activeDrag.id, newPosition);

    activeDrag = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
};

const openFocusMode = (id) => {
    const note = localNotes.get(id);
    if (!note) return;
    
    activeFocus = id;
    focusEditor.innerHTML = note.data.content;
    highlightCodeIn(focusEditor);
    focusModal.style.display = 'flex';
    focusEditor.focus();
    
    document.addEventListener('keydown', handleEscKey);
};

const closeFocusMode = async () => {
    if (!activeFocus) return;

    const newContent = focusEditor.innerHTML;
    const note = localNotes.get(activeFocus);
    if (note && newContent !== note.data.content) {
        await updateNoteContent(activeFocus, newContent);
    }

    focusModal.style.display = 'none';
    focusEditor.innerHTML = '';
    activeFocus = null;
    document.removeEventListener('keydown', handleEscKey);
};

const handleEscKey = (e) => {
    if (e.key === 'Escape') {
        closeFocusMode();
    }
};

modalCloseBtn.addEventListener('click', closeFocusMode);
focusModal.addEventListener('click', (e) => {
    if (e.target === focusModal) {
        closeFocusMode();
    }
});

onSnapshot(notesCollection, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        const docData = { id: change.doc.id, ...change.doc.data() };

        if (change.type === "added") {
            if (!localNotes.has(docData.id)) {
                createNoteElement(docData);
            }
        }
        if (change.type === "modified") {
            updateNoteElement(docData);
        }
        if (change.type === "removed") {
            removeNoteElement(docData.id);
        }
    });
});

addNoteBtn.addEventListener('click', addNewNote);

window.addEventListener('load', () => {
    document.querySelectorAll('.note-content').forEach(contentEl => {
        highlightCodeIn(contentEl);
    });
});
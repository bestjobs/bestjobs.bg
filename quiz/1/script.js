/**
 * Интерактивна Подготовка за Медицински Университети | BestJobs.BG
 * Военно AES-256-GCM криптографско ядро с локална RAM изолация
 */

let quizData = [];
let currentIdx = 0, score = 0;
let lastClickTime = 0;
let urlPassphrase = "";

const setupBox = document.querySelector("#setup-box");
const quizEl = document.querySelector("#quiz");
const questionEl = document.querySelector("#question");
const optionsEl = document.querySelector("#options");
const progressEl = document.querySelector("#progress");
const nextBtn = document.querySelector("#next-btn");
const resultEl = document.querySelector("#result-box");
const scoreEl = document.querySelector("#score");
const totalEl = document.querySelector("#total-questions");
const explanationEl = document.querySelector("#explanation");
const syllabusWrapper = document.querySelector("#syllabus-wrapper");
const syllabusText = document.querySelector("#syllabus-text");
const printBtn = document.querySelector("#print-btn");

const uniSelect = document.querySelector("#uni-select");
const subjectSelect = document.querySelector("#subject-select");
const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");

window.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        urlPassphrase = decodeURIComponent(window.location.hash.substring(1)).trim();
    }
});

const decryptBook = async (encryptedObj, passphrase) => {
    const iv = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBytes = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));
    
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("BestJobsStaticSalt2026"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encryptedBytes
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
};

const loadDatabase = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastClickTime < 350) {
        alert("Засечена е автоматизирана активност.");
        window.location.reload();
        return;
    }
    lastClickTime = now;

    let activeKey = urlPassphrase;
    if (!activeKey) {
        activeKey = prompt("Въведете секретен ключ за достъп до справочника:");
        if (activeKey === null) return;
        activeKey = activeKey.trim();
    }

    if (!activeKey) return alert("Ключът не може да бъде празен.");

    const selectedUni = uniSelect?.value;
    const selectedSubject = subjectSelect?.value;
    let module;

    try {
        module = await import(`./${selectedUni}.js`);
    } catch (err) {
        alert("Справочникът за избрания университет все още не е достъпен.");
        resetToMenu();
        return;
    }

    try {
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        
        if (quizData.length === 0) {
            alert("Няма намерени въпроси за този предмет.");
            resetToMenu();
            return;
        }

        if (window.location.hash) {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            urlPassphrase = "";
        }

        activeKey = null;
        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (err) {
        alert("Грешка: Невалиден ключ за достъп.");
        resetToMenu();
    }
};

const resetToMenu = (e) => {
    if (e) e.preventDefault();
    urlPassphrase = "";
    if (window.location.hash) history.replaceState(null, document.title, window.location.pathname + window.location.search);
    quizEl?.classList.add("hidden");
    resultEl?.classList.add("hidden");
    setupBox?.classList.remove("hidden");
};

const startQuiz = () => { currentIdx = 0; score = 0; resultEl?.classList.add("hidden"); loadQuestion(); };

/**
 * 🔢 ОПТИМИЗИРАНО ЗАРЕЖДАНЕ НА КАРТАТА С ЦИФРОВА НОМЕРАЦИЯ (1, 2, 3, 4)
 */
const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    explanationEl?.classList.add("hidden");
    syllabusWrapper?.classList.add("hidden");
    optionsEl?.replaceChildren();
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q;
    progressEl.textContent = `${currentIdx + 1} / ${quizData.length}`;

    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");
        link.setAttribute("title", `Вариант ${idx + 1}: ${opt}`);

        // 1. Създаване на дигиталното кръгче отляво (Индекс + 1 осигурява номерация 1, 2, 3, 4)
        const numSpan = document.createElement("span");
        numSpan.classList.add("option-number");
        numSpan.textContent = idx + 1;

        // 2. Текстово поле за отговора
        const textSpan = document.createElement("span");
        textSpan.classList.add("option-text");
        textSpan.textContent = opt;

        // Композиране на картата
        link.appendChild(numSpan);
        link.appendChild(textSpan);

        link.addEventListener("click", (evt) => { 
            evt.preventDefault(); 
            checkAnswer(idx, link); 
        });
        optionsEl?.appendChild(link);
    });
};

const checkAnswer = (selectedIdx, selectedLink) => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];

    if (selectedIdx === current.c) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[current.c]?.classList.add("correct");
    }

    links.forEach(l => { 
        l.classList.add("disabled"); 
        l.removeAttribute("href"); 
    });

    if (explanationEl && current.e) {
        explanationEl.textContent = `💡 Разяснение: ${current.e}`;
        explanationEl.classList.remove("hidden");
    }
    if (syllabusText && syllabusWrapper && current.s) {
        syllabusText.textContent = current.s;
        syllabusWrapper.classList.remove("hidden");
    }

    nextBtn?.classList.remove("hidden");
};

printBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    window.print();
});

nextBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    currentIdx++;
    currentIdx < quizData.length ? loadQuestion() : showResults();
});

const showResults = () => { 
    quizEl?.classList.add("hidden"); 
    resultEl?.classList.remove("hidden"); 
    scoreEl.textContent = score; 
    totalEl.textContent = quizData.length; 
};

startBtn?.addEventListener("click", loadDatabase);
restartBtn?.addEventListener("click", resetToMenu);

document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
    if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85)
    ) {
        e.preventDefault();
        return false;
    }
});

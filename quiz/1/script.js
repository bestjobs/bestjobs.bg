/**
 * Интерактивна Медицинска Академия | BestJobs.BG
 * Военно AES-256-GCM криптографско ядро с локална RAM изолация
 */

let quizData = [];
let currentIdx = 0, score = 0;
let lastClickTime = 0;
let urlPassphrase = "";

// Кеширане на елементи от уеб интерфейса
const setupBox = document.querySelector("#setup-box");
const quizEl = document.querySelector("#quiz");
const questionEl = document.querySelector("#question");
const optionsEl = document.querySelector("#options");
const progressEl = document.querySelector("#progress");
const nextBtn = document.querySelector("#next-btn");
const resultEl = document.querySelector("#result-box");
const scoreEl = document.querySelector("#score");
const totalEl = document.querySelector("#total-questions");
const syllabusWrapper = document.querySelector("#syllabus-wrapper");
const syllabusText = document.querySelector("#syllabus-text");
const printBtn = document.querySelector("#print-btn");
const helperZone = document.querySelector("#helper-zone");
const showAnswerBtn = document.querySelector("#show-answer-btn");
const skipBtn = document.querySelector("#skip-btn");

const uniSelect = document.querySelector("#uni-select");
const subjectSelect = document.querySelector("#subject-select");
const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");

// 🔑 Прихващане на ключа от адреса в паметта преди заличаването му
window.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        urlPassphrase = decodeURIComponent(window.location.hash.substring(1)).trim();
    }
});

/**
 * Хардуерно ускорено AES-256-GCM декриптиране в оперативната памет (RAM)
 */
const decryptBook = async (encryptedObj, passphrase) => {
    const iv = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBytes = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));
    const enc = new TextEncoder();
    
    // Извличане на ключ през PBKDF2 (100k итерации за защита от суперкомпютри)
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode("BestJobsStaticSalt2026"), iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBytes);
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
};

/**
 * Динамично и изолирано извикване на избраната университетска книга
 */
const loadDatabase = async (e) => {
    e.preventDefault();
    const now = Date.now();
    
    // 🛡️ АНТИ-БОТ: Времеви филтър против софтуерно кликане и скрайпинг
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

    try { module = await import(`./${selectedUni}.js`); } 
    catch (err) { alert("Избраният справочник все още не е качен на сървъра."); resetToMenu(); return; }

    try {
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        if (quizData.length === 0) { alert("Няма намерени въпроси."); resetToMenu(); return; }
        
        // 🔒 ИЗЧИСТВАНЕ НА URL: Изтрива паролата от екрана в същата милисекунда
        if (window.location.hash) { 
            history.replaceState(null, document.title, window.location.pathname); 
            urlPassphrase = ""; 
        }
        
        activeKey = null; // Почистване на локалния шифър от RAM паметта
        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (err) { alert("Грешка: Невалиден ключ или повреден файл."); resetToMenu(); }
};
/**
 * Изпитен мениджмънт, Вертикален рендеринг, Навигация и Печат
 */

const resetToMenu = (e) => {
    if (e) e.preventDefault();
    urlPassphrase = "";
    quizEl?.classList.add("hidden");
    resultEl?.classList.add("hidden");
    setupBox?.classList.remove("hidden");
};

const startQuiz = () => { currentIdx = 0; score = 0; resultEl?.classList.add("hidden"); loadQuestion(); };

/**
 * 🛠️ ВЕРТИКАЛЕН РЕНДЕРИНГ: Изграждане на карти с вградени индивидуални разяснения
 */
const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    syllabusWrapper?.classList.add("hidden");
    helperZone?.classList.remove("hidden");
    optionsEl?.replaceChildren(); // Мигновено олекотено изчистване на DOM
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q; // XSS Филтрация
    progressEl.textContent = `Тема ${currentIdx + 1} от ${quizData.length}`;

    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        
        const headerBlock = document.createElement("div");
        headerBlock.classList.add("option-header-block");
        
        const numSpan = document.createElement("span");
        numSpan.classList.add("option-number");
        numSpan.textContent = idx + 1;

        const textSpan = document.createElement("span");
        textSpan.classList.add("option-text");
        textSpan.textContent = opt;

        headerBlock.appendChild(numSpan);
        headerBlock.appendChild(textSpan);
        link.appendChild(headerBlock);

        // Инжектиране на скритото индивидуално разяснение под текста на отговора
        const expDiv = document.createElement("div");
        expDiv.classList.add("option-individual-explanation");
        expDiv.textContent = current.e_all ? current.e_all[idx] : (idx === current.c ? "Правилен избор." : "Грешен избор.");
        link.appendChild(expDiv);

        link.addEventListener("click", (evt) => { evt.preventDefault(); checkAnswer(idx, link); });
        optionsEl?.appendChild(link);
    });
};

const checkAnswer = (selectedIdx, selectedLink) => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];

    helperZone?.classList.add("hidden"); // Скрива навигационните линкове

    if (selectedIdx === current.c) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[current.c]?.classList.add("correct"); // Разкрива верния при грешка
    }

    // Блокиране на картите и разкриване на разясненията по всички редове
    links.forEach(l => { 
        l.classList.add("disabled"); 
        l.classList.add("reveal-passive");
    });

    if (syllabusText && syllabusWrapper && current.s) {
        syllabusText.textContent = current.s; // Зареждане на мащабната лекция
        syllabusWrapper.classList.remove("hidden");
    }
    nextBtn?.classList.remove("hidden");
};

// 🔍 ПОМОЩНА ВРЪЗКА: Показване на верния вариант без добавяне на точка
showAnswerBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];
    helperZone?.classList.add("hidden");
    links[current.c]?.classList.add("correct");
    links.forEach(l => { l.classList.add("disabled"); l.classList.add("reveal-passive"); });
    if (syllabusText && syllabusWrapper && current.s) { 
        syllabusText.textContent = current.s; 
        syllabusWrapper.classList.remove("hidden"); 
    }
    nextBtn?.classList.remove("hidden");
});

// ➡️ ПОМОЩНА ВРЪЗКА: Пропускане (Избутва въпроса най-отзад в опашката за учене)
skipBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const skippedItem = quizData.splice(currentIdx, 1)[0]; 
    quizData.push(skippedItem); 
    loadQuestion(); 
});

printBtn?.addEventListener("click", (e) => { e.preventDefault(); window.print(); });

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

// Закачане на главни събития
startBtn?.addEventListener("click", loadDatabase);
restartBtn?.addEventListener("click", resetToMenu);

// 🛡️ ИНТЕРФЕЙСНА ЗАЩИТА ОТ КОПИРАНЕ И ИНСПЕКТИРАНЕ
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        return false;
    }
});

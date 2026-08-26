/**
 * Интерактивна Медицинска Академия | BestJobs.BG
 * Военно AES-256-GCM криптографско ядро с локална RAM изолация
 */

let quizData = [];
let currentIdx = 0, score = 0;
let lastClickTime = 0;
let urlPassphrase = "";

// Кеширане на елементи от широкоекранния интерфейс
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

const uniSelect = document.querySelector("#uni-select");
const subjectSelect = document.querySelector("#subject-select");
const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");

// 🔑 Прихващане на ключа от адреса в паметта преди моменталното му заличаване
window.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        urlPassphrase = decodeURIComponent(window.location.hash.substring(1)).trim();
    }
});

/**
 * Дешифриране в оперативната памет (RAM) чрез хардуерните инструкции на процесора
 */
const decryptBook = async (encryptedObj, passphrase) => {
    const iv = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBytes = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));
    const enc = new TextEncoder();
    
    // Ключова деривация през PBKDF2 (100 000 итерации за тежест срещу скрапери)
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
 * Динамично зареждане на кодирания университетски справочник при поискване
 */
const loadDatabase = async (e) => {
    e.preventDefault();
    const now = Date.now();
    
    // 🛡️ АНТИ-БОТ: Времеви филтър (Rate Limiting) против софтуерни кликове
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
    if (!activeKey) return alert("Ключът за достъп не може да бъде празен.");

    const selectedUni = uniSelect?.value;
    const selectedSubject = subjectSelect?.value;
    let module;

    try { module = await import(`./${selectedUni}.js`); } 
    catch (err) { alert("Справочникът за избрания университет все още не е достъпен на сървъра."); resetToMenu(); return; }

    try {
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        if (quizData.length === 0) { alert("Няма намерени въпроси за този предмет."); resetToMenu(); return; }
        
        // 🔒 ИЗЧИСТВАНЕ НА URL: Заличава ключа от адресната лента веднага след декриптирането
        if (window.location.hash) { 
            history.replaceState(null, document.title, window.location.pathname); 
            urlPassphrase = ""; 
        }
        
        activeKey = null; // Пълно заличаване на локалния шифър от RAM паметта
        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (err) { alert("Грешка: Невалиден ключ за достъп или повреден пакет."); resetToMenu(); }
};
/**
 * Изпитен мениджмънт, CSS Subgrid инжектиране, Навигация и Печат
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
 * 🖥️ CSS SUBGRID РЕНДЕРИРАНЕ: Инжектиране на отговорите и помощната лента вътре в решетката
 */
const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    syllabusWrapper?.classList.add("hidden");
    optionsEl?.replaceChildren(); // Мигновено и чисто изчистване на DOM дървото
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q; // Анти-XSS нативна филтрация
    progressEl.textContent = `Тема ${currentIdx + 1} от ${quizData.length}`;

    // 1. Изграждане на четирите едноредови Subgrid карти с отговори и разяснения
    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");

        // Дете 1 ➔ Колона 1 на Subgrid (Цифров номер)
        const numSpan = document.createElement("span");
        numSpan.classList.add("option-number");
        numSpan.textContent = idx + 1;

        // Дете 2 ➔ Колона 2 на Subgrid (Текст на отговора)
        const textSpan = document.createElement("span");
        textSpan.classList.add("option-text");
        textSpan.textContent = opt;

        // Дете 3 ➔ Колона 3 на Subgrid (Изравнено хоризонтално разяснение)
        const expDiv = document.createElement("span");
        expDiv.classList.add("option-individual-explanation");
        expDiv.textContent = current.e_all ? current.e_all[idx] : (idx === current.c ? "ВЕРНО." : "ГРЕШНО.");

        link.appendChild(numSpan);
        link.appendChild(textSpan);
        link.appendChild(expDiv);

        link.addEventListener("click", (evt) => { evt.preventDefault(); checkAnswer(idx, link); });
        optionsEl?.appendChild(link);
    });

    // 2. 🛠️ НАВИГАЦИОННА ПОПРАВКА: Изграждане на помощната лента ВЪТРЕ в дънния ред на Grid-а
    const helperContainer = document.createElement("div");
    helperContainer.classList.add("helper-links-container");

    const showAnswerBtnLocal = document.createElement("a");
    showAnswerBtnLocal.classList.add("helper-btn");
    showAnswerBtnLocal.id = "show-answer-btn";
    showAnswerBtnLocal.href = "javascript:void(0)";
    showAnswerBtnLocal.textContent = "🔍 Покажи верния отговор";
    showAnswerBtnLocal.addEventListener("click", (e) => { e.preventDefault(); revealTrueAnswer(); });

    const skipBtnLocal = document.createElement("a");
    skipBtnLocal.classList.add("helper-btn");
    skipBtnLocal.href = "javascript:void(0)";
    skipBtnLocal.textContent = "➡️ Пропусни въпроса";
    skipBtnLocal.addEventListener("click", (e) => { e.preventDefault(); skipCurrentQuestion(); });

    helperContainer.appendChild(showAnswerBtnLocal);
    helperContainer.appendChild(skipBtnLocal);
    optionsEl?.appendChild(helperContainer); // Поставя я на дъното на решетката, задействайки събитията
};

const checkAnswer = (selectedIdx, selectedLink) => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];
    
    // Скрива лентата с помощни линкове веднага след избор, за да изолира разсейването
    document.querySelector(".helper-links-container")?.classList.add("hidden");

    if (selectedIdx === current.c) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[current.c]?.classList.add("correct"); // Разкрива верния вариант
    }

    // Блокиране на кликовете и разкриване на разясненията по всички редове едновременно
    links.forEach(l => { 
        l.classList.add("disabled"); 
        l.classList.add("reveal-passive"); 
    });

    if (syllabusText && syllabusWrapper && current.s) {
        syllabusText.textContent = current.s; // Зареждане на мащабната теория
        syllabusWrapper.classList.remove("hidden");
    }
    nextBtn?.classList.remove("hidden");
};

// 🔍 ФУНКЦИЯ: Разкриване на верния отговор без добавяне на изпитна точка
const revealTrueAnswer = () => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];
    document.querySelector(".helper-links-container")?.classList.add("hidden");
    links[current.c]?.classList.add("correct");
    links.forEach(l => { l.classList.add("disabled"); l.classList.add("reveal-passive"); });
    if (syllabusText && syllabusWrapper && current.s) { 
        syllabusText.textContent = current.s; 
        syllabusWrapper.classList.remove("hidden"); 
    }
    nextBtn?.classList.remove("hidden");
};

// ➡️ ФУНКЦИЯ: Пропускане (Премахва текущия въпрос и го прехвърля в края на опашката)
const skipCurrentQuestion = () => {
    if (quizData.length <= 1) return;
    const skippedItem = quizData.splice(currentIdx, 1)[0]; 
    quizData.push(skippedItem); 
    loadQuestion(); 
};

printBtn?.addEventListener("click", (e) => { e.preventDefault(); window.print(); });
nextBtn?.addEventListener("click", (e) => { e.preventDefault(); currentIdx++; currentIdx < quizData.length ? loadQuestion() : showResults(); });
const showResults = () => { quizEl?.classList.add("hidden"); resultEl?.classList.remove("hidden"); scoreEl.textContent = score; totalEl.textContent = quizData.length; };

// Закачане на главни събития
startBtn?.addEventListener("click", loadDatabase);
restartBtn?.addEventListener("click", resetToMenu);

// 🛡️ ИНТЕРФЕЙСНА АНТИ-ХАКЕР ЗАЩИТА (Забрана на копиране и отваряне на конзола)
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        return false;
    }
});

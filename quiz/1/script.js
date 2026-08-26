/**
 * Интерактивна Подготовка за Медицински Университети | BestJobs.BG
 * Военно AES-256-GCM криптографско ядро с локална RAM изолация
 */

let quizData = [];
let currentIdx = 0, score = 0;
let lastClickTime = 0;
let urlPassphrase = "";

// Селектиране на DOM елементи
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

// 🔑 Прихващане на ключа от адреса в момента на първоначално зареждане
window.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        urlPassphrase = decodeURIComponent(window.location.hash.substring(1)).trim();
    }
});

/**
 * Нативно AES-256-GCM декриптиране през Web Crypto API
 * Използва хардуерно ускорение (AES-NI) на мобилния процесор
 */
const decryptBook = async (encryptedObj, passphrase) => {
    // 1. Преобразуване на Hex IV вектор обратно в масив от байтове
    const iv = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    // 2. Преобразуване на Base64 ciphertext в байтове
    const encryptedBytes = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));
    
    // 3. Деривация на криптографски ключ чрез PBKDF2 (100k итерации)
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("BestJobsStaticSalt2026"), // Статична сол за тежест
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    // 4. Декриптиране и проверка на интегритета (GCM) в RAM
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encryptedBytes
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
};

/**
 * Асинхронно извикване на съответната книга и отключване на съдържанието
 */
const loadDatabase = async (e) => {
    e.preventDefault();
    
    // 🛡️ АНТИ-БОТ: Ограничение на скоростта (Rate Limiting) срещу автоматично кликане
    const now = Date.now();
    if (now - lastClickTime < 350) {
        alert("Засечена е необичайна активност. Сесията е рестартирана.");
        window.location.reload();
        return;
    }
    lastClickTime = now;

    let activeKey = urlPassphrase;
    
    // Ако няма препратен ключ в URL адреса, системата изисква ръчно въвеждане с prompt
    if (!activeKey) {
        activeKey = prompt("Въведете секретен ключ за достъп до справочника:");
        if (activeKey === null) return; // Потребителят е натиснал Отказ (Cancel)
        activeKey = activeKey.trim();
    }

    if (!activeKey) return alert("Ключът за достъп не може да бъде празен.");

    const selectedUni = uniSelect?.value;
    const selectedSubject = subjectSelect?.value;
    let module;

    // 🛡️ Безопасно извикване на университетския файл от сървъра на GitHub
    try {
        module = await import(`./${selectedUni}.js`);
    } catch (err) {
        alert("Избраният справочник все още не е достъпен на сървъра.");
        resetToMenu();
        return;
    }

    // 🛡️ Безопасно декриптиране на пакетните данни
    try {
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        
        if (quizData.length === 0) {
            alert("Няма намерени въпроси за този предмет.");
            resetToMenu();
            return;
        }

        // 🔒 ИЗЧИСТВАНЕ НА URL: Заличава паролата от адресната лента веднага след входа
        if (window.location.hash) {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            urlPassphrase = ""; // Премахване от летливата памет
        }

        activeKey = null; // Изчистване на локалния шифър от RAM паметта

        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (err) {
        alert("Грешка: Невалиден ключ за достъп или повредени криптографски данни.");
        resetToMenu();
    }
};

const resetToMenu = (e) => {
    if (e) e.preventDefault();
    urlPassphrase = "";
    if (window.location.hash) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
    quizEl?.classList.add("hidden");
    resultEl?.classList.add("hidden");
    setupBox?.classList.remove("hidden");
};

const startQuiz = () => { 
    currentIdx = 0; 
    score = 0; 
    resultEl?.classList.add("hidden"); 
    loadQuestion(); 
};

/**
 * Рендериране на текущия въпрос и опции с XSS филтрация
 */
const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    explanationEl?.classList.add("hidden");
    syllabusWrapper?.classList.add("hidden");
    optionsEl?.replaceChildren(); // Мигновено изчистване на стари бутони
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q; // Защита от инжектиране на зловреден HTML код
    progressEl.textContent = `${currentIdx + 1} / ${quizData.length}`;

    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.textContent = opt;
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");
        link.setAttribute("title", `Избери: ${opt}`);
        link.addEventListener("click", (evt) => { 
            evt.preventDefault(); 
            checkAnswer(idx, link); 
        });
        optionsEl?.appendChild(link);
    });
};

/**
 * Оценка на направения избор и разкриване на поясненията
 */
const checkAnswer = (selectedIdx, selectedLink) => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];

    if (selectedIdx === current.c) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[current.c]?.classList.add("correct"); // Маркиране на верния вариант при грешка
    }

    // Деактивиране на опциите за предотвратяване на повторен клик
    links.forEach(l => { 
        l.classList.add("disabled"); 
        l.removeAttribute("href"); 
    });

    // Изваждане на съответното разяснение и теория (XSS филтрирани)
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

// Извикване на нативния системен печат (Save as PDF) за учебния конспект
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

// Активиране на събития
startBtn?.addEventListener("click", loadDatabase);
restartBtn?.addEventListener("click", resetToMenu);

// 🛡️ АНТИ-ХАКЕР И АНТИ-СКРЕЙПЪР (Защита на ниво интерфейс в браузъра)
document.addEventListener("contextmenu", (e) => e.preventDefault()); // Блокира десен бутон

document.addEventListener("keydown", (e) => {
    // Блокира клавиши: F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U (Преглед на изходен код)
    if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85)
    ) {
        e.preventDefault();
        return false;
    }
});

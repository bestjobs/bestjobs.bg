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

const uniSelect = document.querySelector("#uni-select");
const subjectSelect = document.querySelector("#subject-select");
const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");

// Прихващане на ключа от адреса (преди да бъде изтрит)
window.addEventListener("DOMContentLoaded", () => {
    if (window.location.hash) {
        urlPassphrase = decodeURIComponent(window.location.hash.substring(1)).trim();
    }
});

// Нативно AES-256-GCM декриптиране през Web Crypto API
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

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
};

const loadDatabase = async () => {
    // 🛡️ Анти-бот защита (Rate Limiting)
    const now = Date.now();
    if (now - lastClickTime < 250) { 
        alert("Засечено е твърде бързо кликане. Моля, изчакайте.");
        return;
    }
    lastClickTime = now;

    let activeKey = urlPassphrase;
    
    // Ако няма ключ в линка, изискваме го с prompt
    if (!activeKey) {
        activeKey = prompt("Въведете секретен ключ за достъп до справочника:");
        if (activeKey === null) return; // Потребителят е натиснал Отказ
        activeKey = activeKey.trim();
    }

    if (!activeKey) {
        alert("Ключът не може да бъде празен.");
        return;
    }

    const selectedUni = uniSelect?.value;
    const selectedSubject = subjectSelect?.value;
    let module;

    // 🛡️ СТЪПКА 1: Безопасно изтегляне на файла от GitHub (Грешка 404 / Липсващ файл)
    try {
        module = await import(`./${selectedUni}.js`);
    } catch (importError) {
        alert(`Справочникът за избрания университет (${uniSelect.options[uniSelect.selectedIndex].text}) все още не е качен или е недостъпен.`);
        resetToMenu();
        return;
    }

    // 🛡️ СТЪПКА 2: Безопасно декриптиране (Грешна парола или повреден файл)
    try {
        if (!module?.encryptedData) throw new Error("Missing encryptedData");
        
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        
        if (quizData.length === 0) {
            alert("Няма намерени въпроси за този конкретен предмет в базата.");
            resetToMenu();
            return;
        }

        // 🔒 ИЗЧИСТВАНЕ НА URL: Заличава ключа от адресната лента веднага след успеха
        if (window.location.hash) {
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            urlPassphrase = ""; 
        }

        activeKey = null; // Заличаване от RAM

        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();

    } catch (cryptoError) {
        alert("Грешка: Грешен ключ за достъп или данните във файла са повредени.");
        resetToMenu();
    }
};

// 🛡️ Помощна функция за безопасно връщане в начално състояние без презареждане
const resetToMenu = () => {
    urlPassphrase = ""; // Нулира грешния ключ от URL лентата
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

const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    optionsEl?.replaceChildren();
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q; // Защита от XSS
    progressEl.textContent = `${currentIdx + 1} / ${quizData.length}`;

    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.textContent = opt;
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");
        link.setAttribute("title", `Избери: ${opt}`);
        
        link.addEventListener("click", (e) => {
            e.preventDefault();
            checkAnswer(idx, link);
        });
        optionsEl?.appendChild(link);
    });
};

const checkAnswer = (selectedIdx, selectedLink) => {
    const correctIdx = quizData[currentIdx].c;
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];

    if (selectedIdx === correctIdx) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[correctIdx]?.classList.add("correct");
    }

    links.forEach(l => {
        l.classList.add("disabled");
        l.removeAttribute("href");
    });
    nextBtn?.classList.remove("hidden");
};

nextBtn?.addEventListener("click", () => {
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

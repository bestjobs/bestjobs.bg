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

const loadDatabase = async () => {
    const now = Date.now();
    if (now - lastClickTime < 250) return;
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
    } catch (e) {
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

        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (e) {
        alert("Грешка: Невалиден ключ за достъп.");
        resetToMenu();
    }
};

const resetToMenu = () => {
    urlPassphrase = "";
    if (window.location.hash) history.replaceState(null, document.title, window.location.pathname + window.location.search);
    quizEl?.classList.add("hidden");
    resultEl?.classList.add("hidden");
    setupBox?.classList.remove("hidden");
};

const startQuiz = () => { currentIdx = 0; score = 0; resultEl?.classList.add("hidden"); loadQuestion(); };

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
        link.textContent = opt;
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");
        link.setAttribute("title", `Избери: ${opt}`);
        link.addEventListener("click", (e) => { e.preventDefault(); checkAnswer(idx, link); });
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

    links.forEach(l => { l.classList.add("disabled"); l.removeAttribute("href"); });

    // Показване на обяснението и конспекта (XSS Защитени)
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

nextBtn?.addEventListener("click", () => {
    currentIdx++;
    currentIdx < quizData.length ? loadQuestion() : showResults();
});

const showResults = () => { quizEl?.classList.add("hidden"); resultEl?.classList.remove("hidden"); scoreEl.textContent = score; totalEl.textContent = quizData.length; };
startBtn?.addEventListener("click", loadDatabase);
restartBtn?.addEventListener("click", resetToMenu);

/**
 * Интерактивна Медицинска Академия | BestJobs.BG
 * Криптографско ядро с вградена изолация на счупени бази данни
 */

let quizData = [];
let currentIdx = 0, score = 0;
let lastClickTime = 0;
let urlPassphrase = "";

// Селектиране на всички широкоекранни DOM обекти
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
 * Хардуерно ускорено AES-256-GCM декриптиране в оперативната памет (RAM)
 */
const decryptBook = async (encryptedObj, passphrase) => {
    const iv = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedBytes = Uint8Array.from(atob(encryptedObj.ciphertext), c => c.charCodeAt(0));
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]);
    const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode("BestJobsStaticSalt2026"), iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBytes);
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
};

/**
 * Динамично и изолирано извикване на университетските справочници
 */
const loadDatabase = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastClickTime < 350) return;
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
    const uniName = uniSelect.options[uniSelect.selectedIndex].text;
    let module;

    // 🛡️ СТЪПКА 1: Проверка за липсващ уеб файл (Грешка 404) – Отключва веднага сайта за нов избор
    try { 
        module = await import(`./${selectedUni}.js`); 
    } catch (err) { 
        alert(`Справочникът за "${uniName}" все още не е качен или е недостъпен. Моля, изберете друг университет.`);
        resetToMenu();
        return;
    }

    // 🛡️ СТЪПКА 2: Проверка за грешен ключ или счупен шифър – Не блокира интерфейса
    try {
        const decryptedData = await decryptBook(module.encryptedData, activeKey);
        quizData = decryptedData[selectedSubject] ?? [];
        if (quizData.length === 0) throw new Error("Празен справочник");
        
        if (window.location.hash) { history.replaceState(null, document.title, window.location.pathname); urlPassphrase = ""; }
        activeKey = null;
        setupBox?.classList.add("hidden");
        quizEl?.classList.remove("hidden");
        startQuiz();
    } catch (err) { 
        alert(`Грешка при достъпа до "${uniName}": Въвели сте грешен секретен ключ или данните във файла са повредени. Опитайте отново.`);
        resetToMenu();
    }
};
/**
 * Изпитен мениджмънт, CSS Subgrid рендериране, Пълна навигация и Защити
 */

const resetToMenu = (e) => {
    if (e) e.preventDefault();
    urlPassphrase = "";
    quizEl?.classList.add("hidden");
    resultEl?.classList.add("hidden");
    setupBox?.classList.remove("hidden"); // Връща безопасно потребителя в главното меню
};

const startQuiz = () => { currentIdx = 0; score = 0; resultEl?.classList.add("hidden"); loadQuestion(); };

const loadQuestion = () => {
    nextBtn?.classList.add("hidden");
    syllabusWrapper?.classList.add("hidden");
    optionsEl?.replaceChildren(); // Почистване на паметта (RAM)
    
    const current = quizData[currentIdx];
    questionEl.textContent = current.q; // Филтрация против XSS атаки
    progressEl.textContent = `Тема ${currentIdx + 1} от ${quizData.length}`;

    // Изграждане на хоризонталните едноредови Subgrid карти
    current.o.forEach((opt, idx) => {
        const link = document.createElement("a");
        link.classList.add("option-link");
        link.href = "javascript:void(0)";
        link.setAttribute("rel", "noopener noreferrer");

        const numSpan = document.createElement("span");
        numSpan.classList.add("option-number");
        numSpan.textContent = idx + 1;

        const textSpan = document.createElement("span");
        textSpan.classList.add("option-text");
        textSpan.textContent = opt;

        const expDiv = document.createElement("span");
        expDiv.classList.add("option-individual-explanation");
        expDiv.textContent = current.e_all ? current.e_all[idx] : (idx === current.c ? "ВЕРНО." : "ГРЕШНО.");

        link.appendChild(numSpan);
        link.appendChild(textSpan);
        link.appendChild(expDiv);

        link.addEventListener("click", (evt) => { evt.preventDefault(); checkAnswer(idx, link); });
        optionsEl?.appendChild(link);
    });

    // Инжектиране на работещите навигационни връзки в дънния ред на Grid-а
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
    optionsEl?.appendChild(helperContainer);
};

const checkAnswer = (selectedIdx, selectedLink) => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];
    document.querySelector(".helper-links-container")?.classList.add("hidden");

    if (selectedIdx === current.c) {
        selectedLink.classList.add("correct");
        score++;
    } else {
        selectedLink.classList.add("wrong");
        links[current.c]?.classList.add("correct");
    }

    links.forEach(l => { l.classList.add("disabled"); l.classList.add("reveal-passive"); });
    if (syllabusText && syllabusWrapper && current.s) { syllabusText.textContent = current.s; syllabusWrapper.classList.remove("hidden"); }
    nextBtn?.classList.remove("hidden");
};

const revealTrueAnswer = () => {
    const current = quizData[currentIdx];
    const links = optionsEl?.querySelectorAll(".option-link") ?? [];
    document.querySelector(".helper-links-container")?.classList.add("hidden");
    links[current.c]?.classList.add("correct");
    links.forEach(l => { l.classList.add("disabled"); l.classList.add("reveal-passive"); });
    if (syllabusText && syllabusWrapper && current.s) { syllabusText.textContent = current.s; syllabusWrapper.classList.remove("hidden"); }
    nextBtn?.classList.remove("hidden");
};

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

// 🛡️ АНТИ-ХАКЕР КЛЕТКА
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        return false;
    }
});

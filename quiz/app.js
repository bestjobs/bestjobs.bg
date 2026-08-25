// 🔒 Пасивен мениджър на изпитното състояние (МУ Кампания 2027)
var activePool = [];
var activeIdx = 0;
var correctCnt = 0;
var startTime = 0;
var currentBookDatabase = null;

// 🛡️ Антибот регистри и времеви контроли (Rate Limiting)
var lastClickTime = 0;
var botDetectionsCount = 0;

// 🛡️ Военен асинхронен AES-256-GCM декриптор (Нативно Web Crypto API)
async function decryptAES256(encryptedBase64, saltBase64, ivBase64, secretKey) {
    if (!encryptedBase64) return "";
    try {
        var rawData = atob(encryptedBase64);
        var encryptedBuffer = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; i++) encryptedBuffer[i] = rawData.charCodeAt(i);

        var salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));
        var iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));

        var enc = new TextEncoder();
        var keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(secretKey), { name: "PBKDF2" }, false, ["deriveKey"]
        );

        var key = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
        );

        var decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv }, key, encryptedBuffer
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
        return "";
    }
}
async function initStaticQuiz() {
    var uni = document.getElementById('university-select').value;
    var sub = document.getElementById('subject-select').value;
    
    // 🛡️ Проверка за наличие на ключ в URL адреса (след знака #)
    var cryptoSecretPass = window.location.hash.substring(1);
    
    if (!cryptoSecretPass) {
        cryptoSecretPass = prompt("🔒 Моля, въведете Вашия официален Лицензен Ключ за достъп до справочника:");
        if (!cryptoSecretPass || cryptoSecretPass.trim() === "") {
            alert("🔒 Грешка: Достъпът е отказан поради липса на лицензен ключ!");
            return;
        }
    }

    var oldScript = document.getElementById("dynamic-db-script");
    if (oldScript) oldScript.remove();

    // 🔄 Преди старт на ново зареждане, изчистваме остатъчните RAM данни от предходни опити
    if (typeof quizDatabase !== 'undefined') {
        try { quizDatabase = undefined; } catch(e) {}
    }

    var scriptSrc = "db_" + uni + ".js";
    var script = document.createElement('script');
    script.id = "dynamic-db-script";
    script.src = scriptSrc;
    
    // 🛡️ СТРИКТНА ПОПРАВКА: Прихващане на грешки при липсващ или дефектен файл на сървъра
    script.onerror = function() {
        alert("⚠️ Избраният изпитен справочник (" + scriptSrc + ") в момента не е наличен на сървъра.");
    };
    
    script.onload = async function() {
        // Проверка дали променливата е дефинирана и съдържа данни в RAM паметта
        if (typeof quizDatabase === 'undefined' || quizDatabase === null) {
            alert("❌ Грешка: Базата данни е повредена или не съдържа валидна изпитна структура.");
            return;
        }

        currentBookDatabase = quizDatabase; 
        var rawEncryptedPool = quizDatabase[sub] || [];
        activePool = [];

        if (rawEncryptedPool.length === 0) {
            alert("⚠️ В този справочник все още няма въведени въпроси за избрания предмет.");
            return;
        }

        try {
            for (var i = 0; i < rawEncryptedPool.length; i++) {
                var item = rawEncryptedPool[i];
                var decryptedTopic = await decryptAES256(item.t, item.salt, item.iv, cryptoSecretPass);
                var decryptedQuestion = await decryptAES256(item.q, item.salt, item.iv, cryptoSecretPass);
                var decryptedSolution = await decryptAES256(item.s, item.salt, item.iv, cryptoSecretPass);

                if (!decryptedQuestion) {
                    alert("🔒 Неуспешно декриптиране. Въведеният лицензен ключ е грешен.");
                    return;
                }

                var decryptedOptions = [];
                for (var j = 0; j < item.o.length; j++) {
                    decryptedOptions.push({
                        x: await decryptAES256(item.o[j].x, item.salt, item.iv, cryptoSecretPass),
                        c: item.o[j].c,
                        r: await decryptAES256(item.o[j].r, item.salt, item.iv, cryptoSecretPass)
                    });
                }

                activePool.push({ t: decryptedTopic, q: decryptedQuestion, k: item.k, s: decryptedSolution, o: decryptedOptions });
            }
        } catch (err) {
            alert("❌ Криптографска грешка при декриптиране. Проверете ключа."); 
            return;
        }
        
        // 🎲 Разбъркват се ЕДИНСТВЕНО ВЪПРОСИТЕ (Картите), отговорите остават 100% твърди по книжното издание
        for (var i = activePool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = activePool[i]; activePool[i] = activePool[j]; activePool[j] = tmp;
        }

        document.getElementById('g-pdf').style.display = "block";
        var infoPanel = document.getElementById('info-panel');
        if (infoPanel) infoPanel.style.display = 'none';

        activeIdx = 0; correctCnt = 0;
        startTime = performance.now(); 
        
        buildQuizDOM();
        showQuestion(0);

        try {
            window.history.replaceState(null, document.title, window.location.origin + "/quiz/" + window.location.search);
        } catch (e) {
            window.location.hash = ""; 
        }

        var statusBox = document.getElementById('crypto-status-indicator');
        if (statusBox) {
            statusBox.innerHTML = '<div class="crypto-secure-badge">🛡️ Справочникът е декриптиран: AES-256-GCM (Локална RAM среда) | Локация: /quiz/</div>';
        }
    };
    document.head.appendChild(script);
}

function buildQuizDOM() {
    var space = document.getElementById('quiz-space');
    var html = '';
    for (var i = 0; i < activePool.length; i++) {
        var q = activePool[i];
        html += '<div id="q-idx-' + i + '" class="q-card"><small style="font-weight:600; color:#64748b; text-transform:uppercase;">' + q.t + ' (Въпрос ' + (i + 1) + '/' + activePool.length + ')</small><h3>' + q.q + '</h3>';
        // Рендиране без разместване - подредбата следва точно въведеното по учебник
        for (var j = 0; j < q.o.length; j++) {
            html += '<div class="opt" data-c="' + q.o[j].c + '" onclick="evalOpt(this, ' + i + ')">' + q.o[j].x + '<div class="reason">ℹ️ ' + q.o[j].r + '</div></div>';
        }
        html += '<div class="card-nav"><span class="btn-lbl" onclick="revealAns(' + i + ')">👁️ Виж отговора</span><span class="btn-lbl" style="color:#d35400;" onclick="skipQ(' + i + ')">➡️ Пропусни</span>';
        if (q.k) {
            html += '<span class="btn-lbl" style="color:#3b82f6;" onclick="toggleS(this)">💡 Теория</span><span class="btn-lbl" style="color:#e74c3c;" onclick="printL(' + i + ')">📥 PDF</span><div class="sol-box">' + q.s + '</div>';
        }
        html += '</div></div>';
    }
    space.innerHTML = html;
}
function showQuestion(idx) {
    var cards = document.getElementsByClassName('q-card');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('active');
    if (idx >= activePool.length) {
        var totalTime = ((performance.now() - startTime) / 1000).toFixed(0);
        var min = Math.floor(totalTime / 60); var sec = totalTime % 60;
        var pct = activePool.length ? (correctCnt / activePool.length) : 0;
        var grade = pct < 0.5 ? "2.00" : (2 + 4 * pct).toFixed(2);
        document.getElementById('quiz-space').innerHTML = '<div class="menu-box" style="text-align:center;"><h3>Тестът приключи!</h3><p>Резултат: <b>' + correctCnt + ' от ' + activePool.length + '</b></p><p>Време: <b>' + min + 'м ' + sec + 'с</b></p><h2 style="color:#cb4335;">Оценка: ' + grade + '</h2></div>';
        return;
    }
    var target = document.getElementById('q-idx-' + idx); if (target) target.classList.add('active');
}

function evalOpt(el, qIdx) {
    // 🛡️ Антибот Rate Limiting филтър срещу бързо кликане
    var currentTime = Date.now();
    if (currentTime - lastClickTime < 250) {
        botDetectionsCount++;
        if (botDetectionsCount > 3) {
            alert("Сесията е заключена поради съмнително бърза активност.");
            window.location.reload();
            return;
        }
        return;
    }
    lastClickTime = currentTime;

    var card = document.getElementById('q-idx-' + qIdx); if (card.getAttribute('data-answered')) return;
    card.setAttribute('data-answered', 'true');
    var opts = card.getElementsByClassName('opt'); if (el.getAttribute('data-c') === 'true') correctCnt++;
    for (var i = 0; i < opts.length; i++) {
        opts[i].style.pointerEvents = 'none';
        if (opts[i].getAttribute('data-c') === 'true') opts[i].classList.add('correct');
        opts[i].querySelector('.reason').style.display = 'block';
    }
    if (el.getAttribute('data-c') !== 'true') el.classList.add('incorrect');
    setTimeout(function() { activeIdx++; showQuestion(activeIdx); }, 1200);
}

function revealAns(qIdx) {
    var card = document.getElementById('q-idx-' + qIdx); if (card.getAttribute('data-answered')) return;
    card.setAttribute('data-answered', 'true');
    var opts = card.getElementsByClassName('opt');
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].getAttribute('data-c') === 'true') opts[i].classList.add('correct');
        opts[i].querySelector('.reason').style.display = 'block';
    }
    setTimeout(function() { activeIdx++; showQuestion(activeIdx); }, 2000);
}

function skipQ(qIdx) {
    var card = document.getElementById('q-idx-' + qIdx); if (card.getAttribute('data-answered')) return;
    // 🔄 Кръгов SKIP алгоритъм: Премества елемента в края на опашката без загуба
    var skipped = activePool.splice(qIdx, 1)[0]; activePool.push(skipped);
    buildQuizDOM(); showQuestion(activeIdx);
}

function toggleS(btn) { var box = btn.nextElementSibling.nextElementSibling; box.style.display = (box.style.display === 'block') ? 'none' : 'block'; }
function printL(qIdx) { document.getElementById('print-area').innerHTML = '<div class="print-l">' + activePool[qIdx].s + '</div>'; window.print(); }

// 📋 Глобален износ на целия справочник (Раздел I и Раздел II наведнъж)
async function printAllLectures() {
    var cryptoSecretPass = window.location.hash.substring(1) || prompt("Въведете лицензен ключ за достъп до пълния справочник:");
    if (!cryptoSecretPass || !currentBookDatabase) return;

    var out = '<h1 style="text-align:center; font-size:20pt; margin-bottom:30px;">ОФИЦИАЛЕН КАНДИДАТСТУДЕНТСКИ СБОРНИК 2027</h1>';
    var subjects = ["biology", "chemistry"];
    var titles = { "biology": "РАЗДЕЛ I: БИОЛОГИЯ", "chemistry": "РАЗДЕЛ II: ХИМИЯ" };

    for (var s = 0; s < subjects.length; s++) {
        var subKey = subjects[s];
        var list = currentBookDatabase[subKey] || [];
        if (list.length > 0) {
            out += '<h2 style="page-break-before: always; text-align:center; margin-top:50px; font-size:16pt; color:#0f766e; border-bottom: 2px solid #e2e8f0; padding-bottom:10px;">' + titles[subKey] + '</h2>';
            for (var i = 0; i < list.length; i++) {
                if (list[i].k) {
                    var decTopic = await decryptAES256(list[i].t, list[i].salt, list[i].iv, cryptoSecretPass);
                    var decSol = await decryptAES256(list[i].s, list[i].salt, list[i].iv, cryptoSecretPass);
                    out += '<div class="print-l">';
                    out += '<small style="color:#7f8c8d; font-weight:bold; text-transform:uppercase;">ТЕМА: ' + decTopic + '</small>';
                    out += '<div style="margin-top:10px;">' + decSol + '</div>';
                    out += '</div>';
                }
            }
        }
    }
    document.getElementById('print-area').innerHTML = out;
    window.print();
    document.getElementById('print-area').innerHTML = '';
}

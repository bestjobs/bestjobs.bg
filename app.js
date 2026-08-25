// 🔒 Директен мениджър на изпитното състояние (МУ Кампания 2027)
var activePool = [];
var activeIdx = 0;
var correctCnt = 0;
var startTime = 0;
var currentBookDatabase = null;

// 🛡️ Антибот регистри и времеви контроли (Rate Limiting)
var lastClickTime = 0;
var botDetectionsCount = 0;
// 🎯 Основна зареждаща функция с автоматично скриване на селекторите
function initStaticQuiz() {
    var uni = document.getElementById('university-select').value;
    var sub = document.getElementById('subject-select').value;
    
    // Автоматична проверка на Мастер Лиценза през URL фрагмент
    var cryptoSecretPass = window.location.hash.substring(1);
    var targetKey = "BestJobsBG_Sec_GCM_2027_v2_9fA3kX8pQ2mL5zW";
    
    if (!cryptoSecretPass) {
        cryptoSecretPass = prompt("🔒 Моля, въведете Вашия официален Лицензен Ключ за достъп до справочника:");
    }

    if (!cryptoSecretPass || cryptoSecretPass.trim() !== targetKey) {
        alert("🔒 Неуспешно декриптиране. Въведеният лицензен ключ е грешен.");
        return;
    }

    var oldScript = document.getElementById("dynamic-db-script");
    if (oldScript) oldScript.remove();

    if (typeof quizDatabase !== 'undefined') {
        try { quizDatabase = undefined; } catch(e) {}
    }

    var scriptSrc = "db_" + uni + ".js";
    var script = document.createElement('script');
    script.id = "dynamic-db-script";
    script.src = scriptSrc;
    
    script.onerror = function() {
        alert("⚠️ Избраният изпитен справочник (" + scriptSrc + ") в момента не е наличен на сървъра.");
    };
    
    script.onload = function() {
        if (typeof quizDatabase === 'undefined' || quizDatabase === null) {
            alert("❌ Грешка: Базата данни е повредена или липсва структура.");
            return;
        }

        currentBookDatabase = quizDatabase; 
        var rawPool = quizDatabase[sub] || [];
        activePool = [];

        if (rawPool.length === 0) {
            alert("⚠️ В този справочник все още няма въведени въпроси за избрания предмет.");
            return;
        }

        // Локално прехвърляне на чистите текстови данни в RAM паметта
        for (var i = 0; i < rawPool.length; i++) {
            activePool.push({
                t: rawPool[i].t,
                q: rawPool[i].q,
                k: rawPool[i].k,
                s: rawPool[i].s,
                o: rawPool[i].o
            });
        }
        
        // 🎲 Разбъркват се ЕДИНСТВЕНО ВЪПРОСИТЕ (Картите), отговорите остават твърди по книгата
        for (var i = activePool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = activePool[i]; activePool[i] = activePool[j]; activePool[j] = tmp;
        }

        // 🎯 АВТОМАТИЧНО СКРИВАНЕ: Изчистване на екрана от менюта за пълен фокус върху изпита
        var setupMenu = document.getElementById('setup-menu');
        if (setupMenu) setupMenu.style.display = 'none';
        
        var infoPanel = document.getElementById('info-panel');
        if (infoPanel) infoPanel.style.display = 'none';

        var pdfBtn = document.getElementById('g-pdf');
        if (pdfBtn) pdfBtn.style.display = "block";

        activeIdx = 0; correctCnt = 0;
        startTime = performance.now(); 
        
        buildQuizDOM();
        showQuestion(0);

        try {
            window.history.replaceState(null, document.title, window.location.origin + window.location.search);
        } catch (e) {
            window.location.hash = ""; 
        }

        var statusBox = document.getElementById('crypto-status-indicator');
        if (statusBox) {
            statusBox.innerHTML = '<div class="crypto-secure-badge">🛡️ Справочникът е зареден успешно: 100% Съвместимост | Локация: /</div>';
        }
    };
    document.head.appendChild(script);
}

// 🏛️ DOM Генератор на изпитни карти с фиксиран ред на опциите
function buildQuizDOM() {
    var space = document.getElementById('quiz-space');
    var html = '';
    for (var i = 0; i < activePool.length; i++) {
        var q = activePool[i];
        html += '<div id="q-idx-' + i + '" class="q-card"><small style="font-weight:600; color:#64748b; text-transform:uppercase;">' + q.t + ' (Въпрос ' + (i + 1) + '/' + activePool.length + ')</small><h3>' + q.q + '</h3>';
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
    // 🔄 Кръгов SKIP алгоритъм: Премества елемента в края на опашката без загуба на данни
    var skipped = activePool.splice(qIdx, 1); activePool.push(skipped[0]);
    buildQuizDOM(); showQuestion(activeIdx);
}

function toggleS(btn) { var box = btn.nextElementSibling.nextElementSibling; box.style.display = (box.style.display === 'block') ? 'none' : 'block'; }
function printL(qIdx) { document.getElementById('print-area').innerHTML = '<div class="print-l">' + activePool[qIdx].s + '</div>'; window.print(); }

// 📋 Глобален износ на целия справочник (Раздел I и Раздел II наведнъж)
async function printAllLectures() {
    var cryptoSecretPass = window.location.hash.substring(1) || prompt("Въведете лицензен ключ за достъп до пълния справочник:");
    var targetKey = "BestJobsBG_Sec_GCM_2027_v2_9fA3kX8pQ2mL5zW";
    
    if (!cryptoSecretPass || cryptoSecretPass.trim() !== targetKey || !currentBookDatabase) return;

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
                    out += '<div class="print-l">';
                    out += '<small style="color:#7f8c8d; font-weight:bold; text-transform:uppercase;">ТЕМА: ' + list[i].t + '</small>';
                    out += '<div style="margin-top:10px;">' + list[i].s + '</div>';
                    out += '</div>';
                }
            }
        }
    }
    document.getElementById('print-area').innerHTML = out;
    window.print();
    document.getElementById('print-area').innerHTML = '';
}

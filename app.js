// 🔒 Локален RAM мениджър на изпитното състояние (МУ Кампания 2027)
var activePool = [];
var activeIdx = 0;
var correctCnt = 0;
var startTime = 0;
var currentBookDatabase = null;
var lastClickTime = 0;
var botDetectionsCount = 0;

// 🛡️ Бърз нативен дешифратор без криптографски сривове
function decodeBase64Text(str) {
    if (!str) return "";
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return "";
    }
}

function initStaticQuiz() {
    var uni = document.getElementById('university-select').value;
    var sub = document.getElementById('subject-select').value;
    
    // Автоматично улавяне на ключа от адреса след знака #
    var cryptoSecretPass = window.location.hash.substring(1);
    var targetKey = "BestJobsBG_Sec_GCM_2027_v2_9fA3kX8pQ2mL5zW";
    
    if (!cryptoSecretPass) {
        cryptoSecretPass = prompt("🔒 Моля, въведете Вашия официален Лицензен Ключ за достъп до справочника:");
    }

    // Директна проверка за точно текстово съвпадение в RAM паметта
    if (!cryptoSecretPass || cryptoSecretPass.trim() !== targetKey) {
        alert("🔒 Неуспешно декриптиране. Въведеният лицензен ключ е грешен.");
        return;
    }

    var oldScript = document.getElementById("dynamic-db-script");
    if (oldScript) oldScript.remove();
    if (typeof quizDatabase !== 'undefined') { try { quizDatabase = undefined; } catch(e) {} }

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

        // Дешифриране в оперативната памет при On-Demand извикване
        for (var i = 0; i < rawPool.length; i++) {
            var item = rawPool[i];
            var decTopic = decodeBase64Text(item.t);
            var decQuestion = decodeBase64Text(item.q);
            var decSolution = decodeBase64Text(item.s);

            var decOptions = [];
            for (var j = 0; j < item.o.length; j++) {
                decOptions.push({
                    x: decodeBase64Text(item.o[j].x),
                    c: item.o[j].c,
                    r: decodeBase64Text(item.o[j].r)
                });
            }
            activePool.push({ t: decTopic, q: decQuestion, k: item.k, s: decSolution, o: decOptions });
        }
        
        // 🎲 Разбъркват се ЕДИНСТВЕНО ВЪПРОСИТЕ, отговорите остават 100% твърди по книгата
        for (var i = activePool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = activePool[i]; activePool[i] = activePool[j]; activePool[j] = tmp;
        }

        document.getElementById('setup-menu').style.display = 'none';
        document.getElementById('info-panel').style.display = 'none';
        document.getElementById('g-pdf').style.display = "block";

        activeIdx = 0; correctCnt = 0;
        startTime = performance.now(); 
        buildQuizDOM();
        showQuestion(0);

        try {
            window.history.replaceState(null, document.title, window.location.origin + window.location.search);
        } catch (e) {
            window.location.hash = ""; 
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
        for (var j = 0; j < q.o.length; j++) {
            html += '<div class="opt" data-c="' + q.o[j].c + '" onclick="evalOpt(this, ' + i + ')">' + q.o[j].x + '<div class="reason">ℹ️ ' + q.o[j].r + '</div></div>';
        }
        html += '<div class="card-nav" style="gap: 15px; font-size: 0.9rem;">' +
                '<a href="#" onclick="revealAns(' + i + '); return false;" style="color: var(--primary); font-weight: 600; text-decoration: none;">👁️ Виж отговора</a> / ' +
                '<a href="#" onclick="skipQ(' + i + '); return false;" style="color: #d35400; font-weight: 600; text-decoration: none;">➡️ Пропусни</a>';
        if (q.k) {
            html += ' / <a href="#" onclick="toggleS(this); return false;" style="color: #3b82f6; font-weight: 600; text-decoration: none;">💡 Теория</a> / ' +
                    '<a href="#" onclick="printL(' + i + '); return false;" style="color: #e74c3c; font-weight: 600; text-decoration: none;">📥 PDF</a>' +
                    '<div class="sol-box">' + q.s + '</div>';
        }
        html += '<a href="#" onclick="window.location.reload(); return false;" style="color: #64748b; font-weight: 600; text-decoration: none; margin-left: auto;">🔄 Рестарт</a>' +
                '</div></div>';
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
        document.getElementById('quiz-space').innerHTML = '<div class="menu-box" style="text-align:center;"><h3>Тестът приключи!</h3><p>Резултат: <b>' + correctCnt + ' от ' + activePool.length + '</b></p><p>Време: <b>' + min + 'м ' + sec + 'с</b></p><h2 style="color:#cb4335;">Оценка: ' + grade + '</h2><a href="#" onclick="window.location.reload(); return false;" style="display: inline-block; color: var(--primary); font-weight: 700; text-decoration: none; margin-top:10px;">🔄 Нов изпит</a></div>';
        return;
    }
    var target = document.getElementById('q-idx-' + idx); if (target) target.classList.add('active');
}

function evalOpt(el, qIdx) {
    var currentTime = Date.now();
    if (currentTime - lastClickTime < 250) { if (++botDetectionsCount > 3) { window.location.reload(); } return; }
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
    var skipped = activePool.splice(qIdx, 1); activePool.push(skipped);
    buildQuizDOM(); showQuestion(activeIdx);
}

function toggleS(btn) { var box = btn.nextElementSibling.nextElementSibling; box.style.display = (box.style.display === 'block') ? 'none' : 'block'; }
function printL(qIdx) { document.getElementById('print-area').innerHTML = '<div class="print-l">' + activePool[qIdx].s + '</div>'; window.print(); }

async function printAllLectures() {
    if (!currentBookDatabase) return;
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
                    out += '<small style="color:#7f8c8d; font-weight:bold; text-transform:uppercase;">ТЕМА: ' + decodeBase64Text(list[i].t) + '</small>';
                    out += '<div style="margin-top:10px;">' + decodeBase64Text(list[i].s) + '</div>';
                    out += '</div>';
                }
            }
        }
    }
    document.getElementById('print-area').innerHTML = out; window.print(); document.getElementById('print-area').innerHTML = '';
}

var activePool = [];
var activeIdx = 0;
var correctCnt = 0;
var startTime = 0;
var currentBookDatabase = null;
var lastClickTime = 0;
var botDetectionsCount = 0;

// 🛡️ Нативен AES-256-GCM декриптор през Web Crypto API
async function decryptAES256(encryptedBase64, saltBase64, ivBase64, secretKey) {
    if (!encryptedBase64) return "";
    try {
        var rawData = atob(encryptedBase64);
        var encryptedBuffer = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; i++) encryptedBuffer[i] = rawData.charCodeAt(i);
        var salt = new Uint8Array(atob(saltBase64).split("").map(c => c.charCodeAt(0)));
        var iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
        var enc = new TextEncoder();
        var keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(secretKey), { name: "PBKDF2" }, false, ["deriveKey"]);
        var key = await window.crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
        var decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBuffer);
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return ""; }
}

async function initStaticQuiz() {
    var uni = document.getElementById('university-select').value;
    var sub = document.getElementById('subject-select').value;
    var cryptoSecretPass = window.location.hash.substring(1);
    
    if (!cryptoSecretPass) {
        cryptoSecretPass = prompt("🔒 Въведете официален Лицензен Ключ:");
        if (!cryptoSecretPass) return;
    }

    var oldScript = document.getElementById("dynamic-db-script");
    if (oldScript) oldScript.remove();
    if (typeof quizDatabase !== 'undefined') { try { quizDatabase = undefined; } catch(e) {} }

    var scriptSrc = "db_" + uni + ".js";
    var script = document.createElement('script');
    script.id = "dynamic-db-script";
    script.src = scriptSrc;
    
    script.onerror = function() { alert("⚠️ Справочникът не е наличен на сървъра."); };
    script.onload = async function() {
        if (typeof quizDatabase === 'undefined' || quizDatabase === null) return;
        currentBookDatabase = quizDatabase; 
        var rawEncryptedPool = quizDatabase[sub] || [];
        activePool = [];

        try {
            for (var i = 0; i < rawEncryptedPool.length; i++) {
                var item = rawEncryptedPool[i];
                var decTopic = await decryptAES256(item.t, item.salt, item.iv, cryptoSecretPass);
                var decQuestion = await decryptAES256(item.q, item.salt, item.iv, cryptoSecretPass);
                var decSolution = await decryptAES256(item.s, item.salt, item.iv, cryptoSecretPass);

                if (!decQuestion) {
                    alert("🔒 Неуспешно декриптиране. Въведеният лицензен ключ е грешен.");
                    return;
                }

                var decOptions = [];
                for (var j = 0; j < item.o.length; j++) {
                    decOptions.push({
                        x: await decryptAES256(item.o[j].x, item.salt, item.iv, cryptoSecretPass),
                        c: item.o[j].c,
                        r: await decryptAES256(item.o[j].r, item.salt, item.iv, cryptoSecretPass)
                    });
                }
                activePool.push({ t: decTopic, q: decQuestion, k: item.k, s: decSolution, o: decOptions });
            }
        } catch (err) { alert("🔒 Криптографска грешка."); return; }
        
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
        try { window.history.replaceState(null, document.title, window.location.origin + window.location.search); } catch (e) { window.location.hash = ""; }
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
    var skipped = activePool.splice(qIdx, 1); activePool.push(skipped[0]);
    buildQuizDOM(); showQuestion(activeIdx);
}

function toggleS(btn) { var box = btn.nextElementSibling.nextElementSibling; box.style.display = (box.style.display === 'block') ? 'none' : 'block'; }
function printL(qIdx) { document.getElementById('print-area').innerHTML = '<div class="print-l">' + activePool[qIdx].s + '</div>'; window.print(); }

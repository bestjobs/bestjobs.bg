const quizData = [
    {
      question: "1. Изотопите на водорода ¹H, ²H, ³H имат:",
      options: ["а) еднакви химични свойства;", "6) различни химични свойства;", "в) еднакъв брой неутрони", "г) различен брой протони."],
      answer: "6) различни химични свойства;",
      help: "Водородът има три основни изотопа: протий, деутерий и тритий, всеки с различен брой неутрони и уникални свойства.
Основни изотопи на водорода
Протий (¹H):
Това е най-разпространеният изотоп на водорода, който има един протон и нито един неутрон.
Съставлява около 99.99% от целия водород в природата и е стабилен 
puntomarinero.com
puntomarinero.com
+1
.
Деутерий (²H):
Деутерият има един протон и един неутрон, което му придава масово число 2.
Той е известен и като "тежък водород" и представлява около 0.015% от водорода в природата. Деутерият е стабилен и се използва в различни научни и индустриални приложения 
puntomarinero.com
puntomarinero.com
+1
.
Тритий (³H):
Тритият има един протон и два неутрона, което му придава масово число 3.
Той е радиоактивен изотоп с период на полуразпад от около 12.3 години и се използва в ядрени реакции и в приложения, свързани с радиация 
puntomarinero.com
puntomarinero.com
+1
.
Приложения на изотопите на водорода
Протий: Използва се в химията и биологията, а също така е основен компонент в термоядрените реакции в звездите.
Деутерий: Използва се в ядрено-магнитен резонанс (ЯМР) и в производството на тежка вода, която е важна за ядрени реактори.
Тритий: Използва се в ядрени реактори и в производството на светлинни устройства, като например в часовници и компаси.
Тези изотопи на водорода играят важна роля в науката и индустрията, като всеки от тях има уникални свойства и приложения.
"   
    },
    {
       question: "2. Броят на поделоевете на даден слой с равен на::",
      options: ["а) n;", "б) 2n;", "в) 2n2;", "г) n2;"],
      answer: "в) 2n2;"
    },
    // Add more questions here...
  ];
  
  const questionElement = document.getElementById("question");
  const optionsElement = document.getElementById("options");
  // const submitButton = document.getElementById("submit");
  
  let currentQuestion = 0;
  let score = 0;
  
  function showQuestion() {
    const question = quizData[currentQuestion];
    questionElement.innerText = question.question;
  
    optionsElement.innerHTML = "";
    question.options.forEach(option => {
      const button = document.createElement("button");
      button.innerText = option;
      optionsElement.appendChild(button);
      button.addEventListener("click", selectAnswer);
    });
  }
  
  function selectAnswer(e) {
    const selectedButton = e.target;
    const answer = quizData[currentQuestion].answer;
  
    if (selectedButton.innerText === answer) {
      score++;
    }
  
    currentQuestion++;
  
    if (currentQuestion < quizData.length) {
      showQuestion();
    } else {
      showResult();
    }
  }
  
  function showResult() {
    quiz.innerHTML = `
      <h1>ПРИКЛЮЧЕН / Quiz Completed!</h1>
      <h2>РЕЗУЛТАТ / Your score: ${score}/${quizData.length}</h2>
    `;
  }
  
  showQuestion();

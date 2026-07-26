const quizData = [
    {
      question: "1. Изотопите на водорода ¹H, ²H, ³H имат: HELP: Химичните свойства на атома зависят практически само от строежа на електронната обвивка, която от своя страна се определя от заряда на ядрото Z (броя на протоните) и почти не зависи от неговото масово число A (сумата на протоните Z и неутроните N). Всички изотопи на един и същ елемент имат еднакъв заряд на ядрото и се отличават само по броя на неутроните, следователно имат еднакви химични свойства.",
      options: ["а) еднакви химични свойства;", "6) различни химични свойства;", "в) еднакъв брой неутрони", "г) различен брой протони."],
      answer: "а) еднакви химични свойства;",
      help: "ПОМОЩ: Химичните свойства на атома зависят практически само от строежа на електронната обвивка, която от своя страна се определя от заряда на ядрото Z (броя на протоните) и почти не зависи от неговото масово число A (сумата на протоните Z и неутроните N). Всички изотопи на един и същ елемент имат еднакъв заряд на ядрото и се отличават само по броя на неутроните, следователно имат еднакви химични свойства."
    },
    {
      question: "2. Броят на подслоевете на даден слой е равен на: HELP: Общата формула е, че n-ият слой може да съдържа до 2n2 електрона.",
      options: ["а) n;", "б) 2n;", "в) 2n2;", "г) n2;"],
      answer: "в) 2n2;"
    },
    // Add more questions here...
  ];
  
  const questionElement = document.getElementById("question");
  const optionsElement = document.getElementById("options");
  const optionsElement = document.getElementById("help");
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

  function showHelp() {
    const help = quizData[currentQuestion];
    questionElement.innerText = question.question;
  
    optionsElement.innerHTML = "";
    question.options.forEach(option => {
      const button = document.createElement("button");
      button.innerText = option;
      optionsElement.appendChild(button);
      button.addEventListener("click", selectAnswer);
    });
  }

  function showResult() {
    quiz.innerHTML = `
      <h1>ПРИКЛЮЧЕН / Quiz Completed!</h1>
      <h2>РЕЗУЛТАТ / Your score: ${score}/${quizData.length}</h2>
    `;
  }
  
  showQuestion();

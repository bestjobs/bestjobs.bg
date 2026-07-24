const quizData = [
    {
      question: "1. Изотопите на водорода ¹H, ²H, ³H имат:",
      options: ["а) еднакви химични свойства;", "6) различни химични свойства;", "в) еднакъв брой неутрони", "г) различен брой протони."],
      answer: "6) различни химични свойства;"
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

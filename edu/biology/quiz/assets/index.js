const quizData = [
    {
      question: "Съединителната тъкан изгражда:",
      options: ["1. костите, хрушялите и кръвта", "2. костите и мускулите", "3. костите, крущялите и епидермиса", "4. костите, хрущялите и алвеолите"],
      answer: "1. костите, хрушялите и кръвта"
    },
    {
      question: "Гръбначният стълб съдържа:",
      options: ["1. 8 шийни, 11 гръдни и 5 поясни прешлена", "2. 7 шийни, 12 гръдни и 5 поясни прешлена", "3. 7 шийни, 11 гръдни и б поясни прешлена", "4. 7 шийни, 13 гръдни и поясни прешлена"],
      answer: "2. 7 шийни, 12 гръдни и 5 поясни прешлена"
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

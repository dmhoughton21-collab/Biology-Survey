
// ═══════════════════════════════════ STATE & STORAGE (API-backed)

async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, data: await r.json().catch(()=>({})) };
}

async function apiGet(url) {
  const r = await fetch(url);
  return { ok: r.ok, status: r.status, data: await r.json().catch(()=>({})) };
}

async function apiDelete(url) {
  const r = await fetch(url, { method: 'DELETE' });
  return { ok: r.ok, status: r.status, data: await r.json().catch(()=>({})) };
}

async function addResponse(data) {
  await apiPost('/api/responses', data);
}

// ═══════════════════════════════════ SURVEY DEFINITION
// Each question: { id, section, sectionTitle, sectionNote, type, text, options, sub, isAI, required }
// types: radio, checkbox, likert, textarea, number, sub_likert

const SECTIONS = [
  { num: 1, title: "Respondent Background", note: "Background information used to compare responses across institution types, disciplines, and experience levels." },
  { num: 2, title: "Overall Academic Preparedness", note: "Rate your observations based on students beginning your introductory biology course — regardless of whether they took AP Biology." },
  { num: 3, title: "Foundational Biology Knowledge", note: "Rate how well students demonstrate each competency upon arrival. Scale: 1 = Very Poor · 2 = Below Average · 3 = Average · 4 = Above Average · 5 = Excellent" },
  { num: 4, title: "Critical Thinking & Scientific Reasoning", note: "Rate student competencies on the same 1–5 scale." },
  { num: 5, title: "Laboratory Skills & Scientific Practice", note: "" },
  { num: 6, title: "Academic & Study Skills", note: "" },
  { num: 7, title: "Recommendations — What AP Teachers Can Do", note: "Your perspectives on what high school AP Biology teachers could do to better prepare students for college. Focus on what is within a teacher's direct control." },
  { num: 8, title: "College Classroom Policies", note: "Your own classroom practices and policies — helps high school teachers understand how college biology is typically structured." },
  { num: 9, title: "Final Reflections", note: "" },
];

const QUESTIONS = [
  // SECTION 1
  { id:'q1', sec:1, type:'radio', text:'What type of institution do you teach at?', options:['R1/R2 Doctoral University (high or very high research activity)','Master\'s University','Liberal Arts College / Baccalaureate College','Community College or Two-Year Institution','Other'] },
  { id:'q2', sec:1, type:'radio', text:'How many years have you taught introductory biology courses at the college level?', options:['Fewer than 3 years','3–7 years','8–15 years','More than 15 years'] },
  { id:'q3', sec:1, type:'radio', text:'What is your primary teaching area within biology?', options:['Cell and Molecular Biology','Genetics / Genomics','Ecology / Environmental Biology','Physiology / Anatomy','Evolution / Organismal Biology','Biochemistry','General / Introductory Biology (broad)','Other'] },
  { id:'q4', sec:1, type:'radio', text:'Approximately what percentage of students in your introductory biology course arrive having taken AP Biology in high school?', options:['Less than 10%','10–25%','26–50%','51–75%','More than 75%','I do not know / do not have this information'] },
  { id:'q5', sec:1, type:'likert', isAI:true, text:'How comfortable are you personally with using technology and AI tools in an academic or instructional setting?', options:['Very Uncomfortable','Somewhat Uncomfortable','Neutral','Somewhat Comfortable','Very Comfortable'] },

  // SECTION 2
  { id:'q6', sec:2, type:'likert', text:'How would you rate the overall academic preparedness of incoming students for college-level biology?', options:['Very Underprepared','Somewhat Underprepared','Adequately Prepared','Well Prepared','Exceptionally Prepared'] },
  { id:'q7', sec:2, type:'radio', text:'How would you describe the trend in incoming student preparedness over the past five years?', options:['Students have become noticeably more prepared','Students have become somewhat more prepared','Preparedness has remained about the same','Students have become somewhat less prepared','Students have become noticeably less prepared','I have not been teaching long enough to observe a trend'] },
  { id:'q8', sec:2, type:'textarea', text:'Please describe any specific changes in student preparedness you have observed over time:' },
  { id:'q9', sec:2, type:'radio', isAI:true, text:'Have you noticed changes — positive or negative — in student preparedness that you believe may be related to increased use of AI tools (such as ChatGPT, Claude, Gemini, or similar) in high school?', options:['Yes, I have noticed changes I believe are positively related to AI tool use','Yes, I have noticed changes I believe are negatively related to AI tool use','I have noticed changes but cannot attribute them to AI tool use specifically','I have not noticed any changes I would attribute to AI tool use','I do not have enough information to assess this'] },
  { id:'q10', sec:2, type:'textarea', isAI:true, text:'Please describe any observations you have made about how AI tool use may be affecting student preparedness:' },

  // SECTION 3
  { id:'q11', sec:3, type:'likert', text:'Core cell biology concepts (cell structure, membranes, organelles, cell cycle):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q12', sec:3, type:'likert', text:'Genetics and heredity (Mendelian genetics, gene expression, mutations):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q13', sec:3, type:'likert', text:'Biochemistry fundamentals (macromolecules, enzyme function, metabolism pathways):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q14', sec:3, type:'likert', text:'Understanding of evolution and natural selection:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q15', sec:3, type:'likert', text:'Understanding of ecology and biological systems:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q16', sec:3, type:'likert', text:'Breadth and retention of biological vocabulary (ability to recall and apply key terms):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q17', sec:3, type:'textarea', text:'Are there specific content areas where you consistently observe significant knowledge gaps? If so, please describe them:' },
  { id:'q18', sec:3, type:'radio', isAI:true, text:'Do you believe students are using AI tools to look up biology content instead of deeply learning it? If so, how does this affect their foundational knowledge?', options:['Yes, and I believe it is reducing the depth of their content knowledge','Yes, but I believe it has little effect on the depth of their knowledge','Possibly, but I have no strong evidence either way','No, I do not believe this is a significant pattern','I have not observed this'] },
  { id:'q19', sec:3, type:'textarea', isAI:true, text:'Please describe any specific observations about AI use and student content knowledge:' },

  // SECTION 4
  { id:'q20', sec:4, type:'likert', text:'Ability to design a simple experiment (identify variables, controls, hypotheses):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q21', sec:4, type:'likert', text:'Ability to interpret graphical and tabular data (graphs, charts, tables):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q22', sec:4, type:'likert', text:'Ability to evaluate evidence and draw scientifically valid conclusions:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q23', sec:4, type:'likert', text:'Ability to apply biological concepts to novel or unfamiliar scenarios:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q24', sec:4, type:'likert', text:'Ability to synthesize information from multiple sources or readings:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q25', sec:4, type:'radio', text:'In your experience, how do students who took AP Biology compare to non-AP students in terms of scientific reasoning and critical thinking?', options:['AP Biology students demonstrate noticeably stronger critical thinking skills','AP Biology students demonstrate somewhat stronger critical thinking skills','There is no consistent difference between the two groups','AP Biology students demonstrate somewhat weaker critical thinking in some areas','AP Biology students demonstrate noticeably weaker critical thinking in some areas','I have not observed a pattern I am confident about'] },
  { id:'q26', sec:4, type:'textarea', text:'Please elaborate on any critical thinking patterns you have observed (AP vs. non-AP students):' },
  { id:'q27', sec:4, type:'likert', isAI:true, text:'In your observation, how does student reliance on AI tools appear to affect critical thinking and scientific reasoning?', options:['Strongly Negative','Somewhat Negative','No Effect','Somewhat Positive','Strongly Positive'] },
  { id:'q28', sec:4, type:'radio', isAI:true, text:'Have you observed students submitting work you believe was generated or substantially assisted by AI?', options:['Yes, frequently (more than 25% of submitted work)','Yes, occasionally (roughly 10–25% of submitted work)','Yes, but rarely (fewer than 10% of submitted work)','No, I have not observed this','I do not assess work in a way that would allow me to detect this'] },
  { id:'q29', sec:4, type:'textarea', isAI:true, text:'When you encounter work you suspect was AI-assisted, how does it differ from authentic student work in terms of biological reasoning quality?' },

  // SECTION 5
  { id:'q30', sec:5, type:'likert', text:'Ability to use standard laboratory equipment (pipettes, microscopes, centrifuges, etc.):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q31', sec:5, type:'likert', text:'Ability to follow multi-step laboratory protocols accurately:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q32', sec:5, type:'likert', text:'Ability to record, organize, and present laboratory data in a scientific format:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q33', sec:5, type:'likert', text:'Understanding of laboratory safety protocols:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q34', sec:5, type:'radio', text:'Are students who completed AP Biology laboratory investigations better prepared for college lab work than those who did not?', options:['Yes, considerably better prepared','Yes, somewhat better prepared','Generally about the same','In some areas better, in other areas not','Generally not better prepared','I do not have enough information to assess this'] },
  { id:'q35', sec:5, type:'textarea', text:'What specific laboratory skills are most underdeveloped in incoming students, regardless of AP Biology background?' },
  { id:'q36', sec:5, type:'checkbox', isAI:true, text:'Do you use any technology or AI-based tools in your laboratory courses? (Select all that apply)', options:['Virtual laboratory simulations (e.g., Labster, PhET)','AI-assisted data analysis or visualization tools','Computer-based microscopy or imaging software','Bioinformatics tools or genomic databases (e.g., NCBI, BLAST)','General AI assistants (e.g., ChatGPT, Claude) for pre/post-lab work','I do not use technology-based or AI tools in laboratory instruction','Other'] },
  { id:'q37', sec:5, type:'radio', isAI:true, text:'Should AP Biology courses incorporate more technology-based or AI-assisted laboratory simulations to supplement or replace physical lab work?', options:['Yes, technology-based labs can be as effective as physical labs for most skills','Yes, as a supplement but not a replacement for hands-on physical labs','No, physical laboratory experience is essential and should not be reduced','I do not have a strong opinion on this','Other'] },

  // SECTION 6
  { id:'q38', sec:6, type:'likert', text:'Ability to read and comprehend primary scientific literature (journal articles, research papers):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q39', sec:6, type:'likert', text:'Ability to write clearly and scientifically (lab reports, essays, short-answer responses):', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q40', sec:6, type:'likert', text:'Ability to manage time and study effectively for college-level biology coursework:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q41', sec:6, type:'likert', text:'Persistence and willingness to work through problems without immediately seeking the answer:', options:['1 – Very Poor','2 – Below Avg','3 – Average','4 – Above Avg','5 – Excellent'] },
  { id:'q42', sec:6, type:'radio', text:'How well do students demonstrate comfort with academic struggle and productive failure in your course?', options:['Most students show healthy persistence and resilience when challenged','Some students persist but many become discouraged quickly','Most students struggle to persist when faced with difficulty or ambiguity','Student resilience varies widely and I have observed notable changes recently','Other'] },
  { id:'q43', sec:6, type:'radio', isAI:true, text:'How has access to AI tools affected students\' approach to studying and independent problem-solving?', options:['Students are more likely to use AI to immediately find answers rather than working through problems','Students use AI as a study aid in productive ways (e.g., concept explanation, practice problems)','I see both productive and unproductive AI use in roughly equal measure','AI use does not appear to significantly affect how students study','I do not have enough information to assess this'] },
  { id:'q44', sec:6, type:'radio', isAI:true, text:'What is your institution\'s current policy on student use of AI tools in introductory biology coursework?', options:['AI tools are prohibited for all coursework','AI tools are prohibited for some assignments but permitted for others','AI tool use is permitted with proper disclosure/citation','AI tool use is unrestricted','My institution has no formal policy; it is left to individual instructors','I am not aware of a formal institution policy'] },
  { id:'q45', sec:6, type:'textarea', isAI:true, text:'What do you believe the policy on student AI tool use in introductory college biology should be?' },
  { id:'q46', sec:6, type:'radio', isAI:true, text:'Should AP Biology courses explicitly teach students how to use AI tools responsibly as a study and research aid?', options:['Yes, this should be a formal part of the curriculum','Yes, informally as good academic practice','Only if paired with explicit instruction on limitations and academic integrity','No, AI tool use should be discouraged in high school science courses','No opinion'] },

  // SECTION 7
  { id:'q47', sec:7, type:'sub_likert', text:'How important is it for AP Biology courses to emphasize the following? (1 = Not Important, 5 = Critically Important)', subs:[
    'Conceptual understanding over memorization of facts',
    'Practice interpreting and analyzing data from graphs and tables',
    'Open-ended, inquiry-based laboratory investigations',
    'Scientific writing (formal lab reports, written explanations)',
    'Application of concepts to novel real-world or experimental scenarios',
    'Reading and summarizing scientific literature or articles',
    'Practicing exam strategies for long-answer and free-response questions',
    'Developing persistence and tolerance for academic challenge',
    'Teaching responsible and effective use of technology and AI tools',
    'Critical evaluation of AI-generated content for accuracy and scientific validity',
  ], options:['1','2','3','4','5'] },
  { id:'q48', sec:7, type:'textarea', text:'What are the most valuable things a high school biology teacher can do to prepare students for college-level biology? Be as specific as possible:' },
  { id:'q49', sec:7, type:'textarea', text:'What do high school biology teachers most commonly do that inadvertently leaves students underprepared for college biology? Be as specific as possible:' },
  { id:'q50', sec:7, type:'checkbox', isAI:true, text:'Should AP Biology teachers integrate AI tools into instruction in any of the following ways? (Select all that apply)', options:['Using AI to generate hypotheses or brainstorm experimental designs (with critical evaluation)','Assigning students to use and critically evaluate AI-generated biology content','Using AI tools for personalized practice and concept review','Demonstrating how AI tools can produce inaccurate scientific content','Teaching students how to cite and disclose AI tool use appropriately','None — AI tools should not be integrated into AP Biology instruction','Other'] },
  { id:'q51', sec:7, type:'textarea', isAI:true, text:'What specific guidance would you give to an AP Biology teacher on preparing students to navigate AI tools responsibly in a college biology environment?' },

  // SECTION 8
  { id:'q52', sec:8, type:'checkbox', text:'How is the final grade in your introductory biology course primarily determined? (Select all that apply)', options:['Lecture exams / written tests','Laboratory practicals or lab reports','Quizzes (announced or unannounced)','Written assignments or research papers','Participation / in-class activities','Final project or presentation','Standardized or cumulative final exam','Other'] },
  { id:'q53', sec:8, type:'radio', text:'Approximately what percentage of the final grade is determined by major exams (midterms and/or finals)?', options:['Less than 25%','25–40%','41–60%','61–75%','More than 75%'] },
  { id:'q54', sec:8, type:'radio', text:'Do you offer opportunities for students to retake or reassess major exams?', options:['Yes, students may retake full major exams','Yes, but only certain portions or selected questions','Yes, in certain circumstances (e.g., documented illness or emergency only)','No, major exams are not retaken but other work can substitute for a low score','No, major exams cannot be retaken or replaced under any circumstance'] },
  { id:'q55', sec:8, type:'textarea', text:'If you offer any form of exam reassessment or grade recovery, please describe the policy (conditions, score caps, effort requirements):' },
  { id:'q56', sec:8, type:'radio', text:'Do students receive ongoing formative feedback throughout the term?', options:['Yes, frequently — students receive regular formative feedback throughout the course','Yes, occasionally — some formative feedback is provided but not consistently','Rarely — most feedback comes from major graded assessments','No — graded assessments are the primary means by which students gauge their progress'] },
  { id:'q57', sec:8, type:'radio', text:'How do you handle late work in your course?', options:['Late work is accepted with no penalty','Late work is accepted with a point deduction','Late work is accepted within a set window (e.g., 24–72 hours) with or without penalty','Late work is generally not accepted except under documented extenuating circumstances','Late work is never accepted','Policy varies by assignment type'] },
  { id:'q58', sec:8, type:'radio', isAI:true, text:'Do you use any AI-based tools to detect AI-generated student work?', options:['Yes, routinely for all submitted work','Yes, selectively when I have reason to suspect AI use','No, but I am considering it','No, and I do not plan to use AI detection tools','My institution prohibits or discourages third-party AI detection tools'] },
  { id:'q59', sec:8, type:'likert', isAI:true, text:'How confident are you in your ability to identify AI-generated or AI-assisted work without detection software?', options:['Not at all Confident','Slightly Confident','Moderately Confident','Very Confident','Extremely Confident'] },
  { id:'q60', sec:8, type:'textarea', isAI:true, text:'Are there other classroom policies regarding technology or AI tool use that AP Biology teachers should be aware of?' },

  // SECTION 9
  { id:'q61', sec:9, type:'number', text:'On a scale of 1–10 (1 = Not at all prepared, 10 = Exceptionally prepared), what number best represents the average preparedness of students entering your introductory biology course?' },
  { id:'q62', sec:9, type:'textarea', text:'If you could send one message to every AP Biology teacher in the country about preparing students for college-level biology, what would you say?' },
  { id:'q63', sec:9, type:'textarea', isAI:true, text:'Looking broadly at the future of biology education, how do you think AI tools will most significantly change what students need to know and be able to do when they arrive in college?' },
  { id:'q64', sec:9, type:'textarea', isAI:true, text:'Are there AI or technology-related skills you now consider essential for incoming biology students? If so, what are they?' },
  { id:'q65', sec:9, type:'textarea', text:'Is there anything important about student preparedness or the high school to college transition that this survey did not address? Please share any additional thoughts:' },
];

// ═══════════════════════════════════ SURVEY STATE
let currentSection = 1;
let responses = {};

function getSectionQuestions(secNum) {
  return QUESTIONS.filter(q => q.sec === secNum);
}

function startSurvey() {
  showView('survey');
  currentSection = 1;
  responses = {};
  renderSection(currentSection);
}

function renderSection(secNum) {
  const section = SECTIONS.find(s => s.num === secNum);
  const questions = getSectionQuestions(secNum);
  let html = `<div class="section-header animate-in">
    <div class="section-num-badge">Section ${secNum} of ${SECTIONS.length}</div>
    <h2>${section.title}</h2>
    ${section.note ? `<p class="section-note">${section.note}</p>` : ''}
  </div>`;

  questions.forEach((q, idx) => {
    const qNum = QUESTIONS.indexOf(q) + 1;
    const aiClass = q.isAI ? ' ai-question' : '';
    html += `<div class="question-block${aiClass}" id="block-${q.id}">`;
    if (q.isAI) html += `<div class="ai-tag">⬡ Technology &amp; AI</div>`;
    html += `<div class="q-num">Q${qNum}</div>`;
    html += `<div class="q-text">${q.text}</div>`;

    if (q.type === 'radio') {
      html += `<div class="options-list">`;
      q.options.forEach(opt => {
        const checked = responses[q.id] === opt ? 'checked' : '';
        html += `<label class="option-label${responses[q.id]===opt?' selected':''}">
          <input type="radio" name="${q.id}" value="${opt}" ${checked} onchange="recordResponse('${q.id}', this.value)">
          ${opt}
        </label>`;
      });
      html += `</div>`;

    } else if (q.type === 'checkbox') {
      html += `<div class="options-list">`;
      q.options.forEach(opt => {
        const stored = responses[q.id] || [];
        const checked = stored.includes(opt) ? 'checked' : '';
        html += `<label class="option-label${stored.includes(opt)?' selected':''}">
          <input type="checkbox" name="${q.id}" value="${opt}" ${checked} onchange="recordCheckbox('${q.id}', this.value, this.checked)">
          ${opt}
        </label>`;
      });
      html += `</div>`;

    } else if (q.type === 'likert') {
      html += `<div class="likert-wrap"><table class="likert-table"><thead><tr>`;
      q.options.forEach(opt => { html += `<th>${opt}</th>`; });
      html += `</tr></thead><tbody><tr>`;
      q.options.forEach((opt, i) => {
        const checked = responses[q.id] == (i+1) ? 'checked' : '';
        html += `<td><input type="radio" name="${q.id}" value="${i+1}" ${checked} onchange="recordResponse('${q.id}', this.value)"></td>`;
      });
      html += `</tr></tbody></table></div>`;

    } else if (q.type === 'textarea') {
      const val = responses[q.id] || '';
      html += `<textarea class="survey-textarea" rows="4" onchange="recordResponse('${q.id}', this.value)" oninput="recordResponse('${q.id}', this.value)">${val}</textarea>`;

    } else if (q.type === 'number') {
      const val = responses[q.id] || '';
      html += `<input type="number" min="1" max="10" value="${val}" style="border:1px solid var(--border);padding:12px 16px;font-size:20px;font-family:'Cormorant Garamond',serif;width:100px;background:var(--cream);outline:none;" onchange="recordResponse('${q.id}', this.value)">
      <span style="font-size:13px;color:var(--text-light);margin-left:12px;">Enter a number from 1 to 10</span>`;

    } else if (q.type === 'sub_likert') {
      html += `<div style="overflow-x:auto;"><table class="likert-table" style="min-width:520px;">
        <thead><tr><th style="text-align:left;width:55%;">Area</th>`;
      q.options.forEach(o => { html += `<th>${o}</th>`; });
      html += `</tr></thead><tbody>`;
      q.subs.forEach((sub, si) => {
        html += `<tr style="border-bottom:1px solid var(--cream-dark);">
          <td style="text-align:left;padding:10px 12px;font-size:13px;color:var(--text-mid);">${sub}</td>`;
        q.options.forEach((opt, oi) => {
          const stored = responses[q.id] || {};
          const checked = stored[si] == (oi+1) ? 'checked' : '';
          html += `<td><input type="radio" name="${q.id}_${si}" value="${oi+1}" ${checked} onchange="recordSubLikert('${q.id}', ${si}, this.value)"></td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }

    html += `</div>`;
  });

  // Navigation
  const isFirst = secNum === 1;
  const isLast = secNum === SECTIONS.length;
  html += `<div class="survey-nav">`;
  if (!isFirst) {
    html += `<button class="nav-btn nav-btn-prev" onclick="goSection(${secNum-1})">← Previous</button>`;
  } else {
    html += `<button class="nav-btn nav-btn-prev" onclick="showView('home')">← Back to Home</button>`;
  }
  html += `<span class="section-pill">Section ${secNum} of ${SECTIONS.length}</span>`;
  if (!isLast) {
    html += `<button class="nav-btn nav-btn-next" onclick="goSection(${secNum+1})">Next →</button>`;
  } else {
    html += `<button class="nav-btn nav-btn-submit" onclick="submitSurvey()">Submit Survey ✓</button>`;
  }
  html += `</div>`;

  document.getElementById('survey-body').innerHTML = html;
  document.getElementById('survey-body').scrollTop = 0;
  window.scrollTo(0, 0);

  // Update progress
  const pct = Math.round((secNum / SECTIONS.length) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `Section ${secNum} of ${SECTIONS.length}`;
  document.getElementById('current-section-label').textContent = section.title;
}

function recordResponse(id, val) {
  responses[id] = val;
}

function recordCheckbox(id, val, checked) {
  if (!responses[id]) responses[id] = [];
  if (checked) {
    if (!responses[id].includes(val)) responses[id].push(val);
  } else {
    responses[id] = responses[id].filter(v => v !== val);
  }
  // Update selected class
  document.querySelectorAll(`input[name="${id}"]`).forEach(inp => {
    inp.closest('.option-label').classList.toggle('selected', inp.checked);
  });
}

function recordSubLikert(id, subIdx, val) {
  if (!responses[id]) responses[id] = {};
  responses[id][subIdx] = val;
}

function goSection(num) {
  currentSection = num;
  renderSection(num);
}

async function submitSurvey() {
  const btn = document.querySelector('.nav-btn-submit');
  if (btn) { btn.textContent = 'Submitting…'; btn.disabled = true; }
  try {
    await addResponse({...responses});
    renderSuccess();
  } catch(e) {
    if (btn) { btn.textContent = 'Submit Survey ✓'; btn.disabled = false; }
    alert('There was an error submitting your response. Please try again.');
  }
}

function renderSuccess() {
  document.getElementById('survey-body').innerHTML = `
    <div class="success-screen animate-in">
      <div class="success-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2>Thank You!</h2>
      <p>Your response has been recorded. Your insights are greatly valued and will contribute to improving how AP Biology teachers prepare students for college-level biology.</p>
      <p>All responses are anonymous and will be reported only in aggregate. If you would like to discuss the results or your perspectives on science education, please contact:</p>
      <p style="background:var(--cream-dark);padding:16px 24px;font-family:'DM Mono',monospace;font-size:13px;color:var(--navy);margin-top:8px;">
        Dustin Houghton, PhD · AP Biology Teacher<br>dhoughto@ccs.k12.in.us
      </p>
      <br>
      <button class="nav-btn nav-btn-prev" onclick="showView('home')" style="margin-top:16px;">← Return to Homepage</button>
    </div>`;
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════ VIEWS
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  if (name === 'admin') {
    document.getElementById('admin').style.display = 'block';
  } else {
    document.getElementById('admin').style.display = 'none';
  }
}

// ═══════════════════════════════════ ADMIN AUTH
function openAdminModal() {
  document.getElementById('admin-modal').classList.add('open');
  document.getElementById('admin-pw-input').value = '';
  document.getElementById('login-error').style.display = 'none';
  setTimeout(() => document.getElementById('admin-pw-input').focus(), 100);
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('open');
}

async function checkAdminLogin() {
  const pw = document.getElementById('admin-pw-input').value;
  const btn = document.querySelector('#admin-modal .btn-primary');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  const result = await apiPost('/api/admin/login', { password: pw });
  btn.textContent = 'Log In'; btn.disabled = false;
  if (result.ok) {
    closeAdminModal();
    openAdmin();
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('admin-pw-input').value = '';
    document.getElementById('admin-pw-input').focus();
  }
}

function openAdmin() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('admin').style.display = 'block';
  document.getElementById('admin').classList.add('active');
  showAdminTab('dashboard');
  loadDashboard();
}

async function adminLogout() {
  await apiPost('/api/admin/logout', {});
  document.getElementById('admin').classList.remove('active');
  document.getElementById('admin').style.display = 'none';
  document.getElementById('home').classList.add('active');
}

// ═══════════════════════════════════ ADMIN TABS
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.admin-nav-item').forEach(n => {
    if (n.textContent.trim().toLowerCase().startsWith(tab === 'dashboard' ? 'dash' : tab === 'responses' ? 'indiv' : 'set')) {
      n.classList.add('active');
    }
  });
  if (tab === 'responses') loadResponses();
  if (tab === 'dashboard') loadDashboard();
}

// ═══════════════════════════════════ DASHBOARD
async function loadDashboard() {
  const result = await apiGet('/api/admin/aggregate');
  if (!result.ok) return;
  const agg = result.data;

  document.getElementById('stat-total').textContent = agg.total || 0;
  document.getElementById('stat-avg-prep').textContent = agg.avgPrep || '—';

  // Top trend label
  const trendLabels = {
    'Students have become noticeably more prepared': '↑ More Prepared',
    'Students have become somewhat more prepared':   '↑ More Prepared',
    'Preparedness has remained about the same':      '→ Same',
    'Students have become somewhat less prepared':   '↓ Less Prepared',
    'Students have become noticeably less prepared': '↓ Less Prepared',
  };
  if (agg.topTrend) {
    document.getElementById('stat-trend').textContent = trendLabels[agg.topTrend[0]] || agg.topTrend[0].substring(0,14);
  } else {
    document.getElementById('stat-trend').textContent = '—';
  }
  document.getElementById('stat-ai-detect').textContent = agg.detectYesPct !== null ? agg.detectYesPct + '%' : '—';

  if (agg.total === 0) {
    document.getElementById('aggregate-charts').innerHTML = `<div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      <h3>No responses yet</h3><p>Aggregate charts will appear here once responses are submitted.</p></div>`;
    return;
  }

  let chartsHtml = '';
  const c = agg.charts;
  chartsHtml += buildBarChartFromCounts('Institution Type Distribution', 'Q1: What type of institution do you teach at?', c.q1, ['R1/R2 Doctoral University (high or very high research activity)','Master\'s University','Liberal Arts College / Baccalaureate College','Community College or Two-Year Institution','Other'], agg.total);
  chartsHtml += buildBarChartFromCounts('Preparedness Trend (Past 5 Years)', 'Q7: How would you describe the trend in incoming student preparedness?', c.q7, ['Students have become noticeably more prepared','Students have become somewhat more prepared','Preparedness has remained about the same','Students have become somewhat less prepared','Students have become noticeably less prepared'], agg.total);
  chartsHtml += buildBarChartFromCounts('Overall Preparedness Rating', 'Q6: Rate overall preparedness of incoming students:', c.q6, ['1','2','3','4','5'], agg.total, ['Very Underprepared','Somewhat Underprepared','Adequately Prepared','Well Prepared','Exceptionally Prepared']);
  chartsHtml += buildBarChartFromCounts('AP vs Non-AP: Critical Thinking', 'Q25: How do AP Biology students compare to non-AP students in critical thinking?', c.q25, ['AP Biology students demonstrate noticeably stronger critical thinking skills','AP Biology students demonstrate somewhat stronger critical thinking skills','There is no consistent difference between the two groups','AP Biology students demonstrate somewhat weaker critical thinking in some areas','AP Biology students demonstrate noticeably weaker critical thinking in some areas','I have not observed a pattern I am confident about'], agg.total);
  chartsHtml += buildBarChartFromCounts('AI Impact on Study Habits', 'Q43: How has AI access affected students\' approach to studying?', c.q43, ['Students are more likely to use AI to immediately find answers rather than working through problems','Students use AI as a study aid in productive ways (e.g., concept explanation, practice problems)','I see both productive and unproductive AI use in roughly equal measure','AI use does not appear to significantly affect how students study','I do not have enough information to assess this'], agg.total);
  chartsHtml += buildBarChartFromCounts('Major Exam Reassessment Policy', 'Q54: Do you offer opportunities for students to retake or reassess major exams?', c.q54, ['Yes, students may retake full major exams','Yes, but only certain portions or selected questions','Yes, in certain circumstances (e.g., documented illness or emergency only)','No, major exams are not retaken but other work can substitute for a low score','No, major exams cannot be retaken or replaced under any circumstance'], agg.total);
  chartsHtml += buildBarChartFromCounts('AI Detection Tool Usage', 'Q58: Do you use AI-based tools to detect AI-generated student work?', c.q58, ['Yes, routinely for all submitted work','Yes, selectively when I have reason to suspect AI use','No, but I am considering it','No, and I do not plan to use AI detection tools','My institution prohibits or discourages third-party AI detection tools'], agg.total);

  document.getElementById('aggregate-charts').innerHTML = chartsHtml;
}

function buildBarChartFromCounts(title, question, counts, options, total, optionLabels) {
  const labels = optionLabels || options;
  const effectiveTotal = Object.values(counts || {}).reduce((a,b)=>a+b,0) || 1;
  let html = `<div class="agg-section"><h3>${title}</h3><div class="agg-q">${question}</div><div class="bar-chart">`;
  options.forEach((opt, i) => {
    const count = (counts && counts[opt]) || 0;
    const pct = Math.round(count / effectiveTotal * 100);
    html += `<div class="bar-row">
      <div class="bar-row-label">${labels[i] || opt}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-count">${count} <span style="color:#bbb;">(${pct}%)</span></div>
    </div>`;
  });
  html += `</div></div>`;
  return html;
}

// ═══════════════════════════════════ RESPONSES
let allResponsesCache = [];
let filteredResponses = [];

async function loadResponses() {
  const result = await apiGet('/api/admin/responses');
  if (!result.ok) return;
  allResponsesCache = result.data;
  filteredResponses = [...allResponsesCache];
  renderResponsesTable(filteredResponses);
}

function filterResponses() {
  const term = document.getElementById('response-search').value.toLowerCase();
  filteredResponses = allResponsesCache.filter(r => {
    const ts = new Date(r.created).toLocaleDateString();
    const inst = (r.q1 || '').toLowerCase();
    return ts.includes(term) || inst.includes(term);
  });
  renderResponsesTable(filteredResponses);
}

function renderResponsesTable(responses) {
  document.getElementById('response-count-label').textContent = `${responses.length} response${responses.length!==1?'s':''}`;

  if (responses.length === 0) {
    document.getElementById('responses-table-wrap').innerHTML = `<div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <h3>No responses found</h3><p>Submitted responses will appear here.</p></div>`;
    return;
  }

  let html = `<table class="responses-table"><thead><tr>
    <th>#</th><th>Submitted</th><th>Institution Type</th><th>Teaching Area</th><th>Prep Score</th><th>Actions</th>
  </tr></thead><tbody>`;

  responses.forEach((r, i) => {
    const ts = new Date(r.created).toLocaleString();
    const inst = r.q1 ? r.q1.split('(')[0].trim().substring(0,30) : '—';
    const area = r.q3 ? r.q3.substring(0,25) : '—';
    const prep = r.q61 || '—';
    html += `<tr>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-light);">${r.id}</td>
      <td style="white-space:nowrap;">${ts}</td>
      <td>${inst}</td>
      <td>${area}</td>
      <td><strong style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--navy);">${prep}</strong>/10</td>
      <td>
        <button class="view-response-btn" onclick="viewResponse(${r.id})">View</button>
        <button class="delete-btn" onclick="deleteResponse(${r.id})">Delete</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById('responses-table-wrap').innerHTML = html;
}

async function viewResponse(id) {
  const result = await apiGet(`/api/admin/responses/${id}`);
  if (!result.ok) return;
  const r = result.data;

  let html = `<h3>Response #${r.id}</h3>
    <div class="response-meta">${new Date(r.created).toLocaleString()} · ${r.data.q1 || 'Institution not specified'}</div>`;

  QUESTIONS.forEach((q, i) => {
    const val = r.data[q.id];
    if (!val || (Array.isArray(val) && val.length === 0)) return;
    let displayVal = '';
    if (Array.isArray(val)) {
      displayVal = val.join('; ');
    } else if (typeof val === 'object') {
      displayVal = Object.entries(val).map(([k,v]) => `${q.subs ? q.subs[k] : k}: ${v}`).join('<br>');
    } else {
      displayVal = String(val);
    }
    html += `<div class="response-item">
      <div class="r-q">Q${i+1}. ${q.text}</div>
      <div class="r-a">${displayVal}</div>
    </div>`;
  });

  document.getElementById('response-detail-content').innerHTML = html;
  document.getElementById('response-modal').classList.add('open');
}

function closeResponseModal() {
  document.getElementById('response-modal').classList.remove('open');
}

async function deleteResponse(id) {
  if (!confirm('Delete this response? This cannot be undone.')) return;
  const result = await apiDelete(`/api/admin/responses/${id}`);
  if (result.ok) {
    loadResponses();
    loadDashboard();
  }
}

// ═══════════════════════════════════ SETTINGS
async function changePassword() {
  const curr  = document.getElementById('settings-current-pw').value;
  const newPw = document.getElementById('settings-new-pw').value;
  const conf  = document.getElementById('settings-confirm-pw').value;
  const errEl = document.getElementById('settings-error');

  errEl.style.display = 'none';
  document.getElementById('settings-success').style.display = 'none';

  if (newPw !== conf) {
    errEl.textContent = 'New passwords do not match.';
    errEl.style.display = 'block'; return;
  }
  if (newPw.length < 6) {
    errEl.textContent = 'New password must be at least 6 characters.';
    errEl.style.display = 'block'; return;
  }

  const result = await apiPost('/api/admin/password', { current: curr, newPassword: newPw, confirm: conf });
  if (!result.ok) {
    errEl.textContent = result.data.error || 'An error occurred.';
    errEl.style.display = 'block'; return;
  }

  document.getElementById('settings-current-pw').value = '';
  document.getElementById('settings-new-pw').value = '';
  document.getElementById('settings-confirm-pw').value = '';
  document.getElementById('settings-success').style.display = 'block';
}

function exportData() {
  window.location.href = '/api/admin/export';
}

async function confirmDeleteAll() {
  if (confirm('This will permanently delete ALL survey responses. This action cannot be undone. Are you absolutely sure?')) {
    if (confirm('Final confirmation: delete all responses?')) {
      await apiDelete('/api/admin/responses');
      loadResponses();
      loadDashboard();
    }
  }
}

// Close modals on outside click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

// Option label click styling
document.addEventListener('change', e => {
  if (e.target.type === 'radio' && e.target.closest('.options-list')) {
    const name = e.target.name;
    document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
      inp.closest('.option-label').classList.toggle('selected', inp.checked);
    });
  }
});

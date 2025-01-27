// State management
const state = {
    currentLevel: 'grade',
    selectedGrade: null,
    selectedSubject: null,
    selectedChapter: null,
    selectedWorksheet: null,
    currentQuestionIndex: 0,
    apiKey: null
};

// OpenAI service management
const assistantId = 'asst_zEq6AiDuyJBlDnCHKKNuKNSv';

const contentData = [];

// DOM elements
const contentElement = document.getElementById('content');
const backButton = document.getElementById('backBtn');
const breadcrumbElement = document.getElementById('breadcrumb');

// Move all function definitions here...

// Then at the bottom of the file, after all functions are defined:
// Make functions available globally
function initializeGlobalFunctions() {
    window.selectGrade = selectGrade;
    window.selectSubject = selectSubject;
    window.selectChapter = selectChapter;
    window.selectWorksheet = selectWorksheet;
    window.toggleModelAnswer = toggleModelAnswer;
    window.toggleCircleWord = toggleCircleWord;
    window.toggleAnswer = toggleAnswer;
    window.closeAnswerModal = closeAnswerModal;
    window.resetAnswer = resetAnswer;
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    initializeGlobalFunctions();
    document.getElementById('apiKeyForm').addEventListener('submit', handleApiKeySubmit);
    init();
});

// Update the API key submission handler
function handleApiKeySubmit(event) {
    event.preventDefault();
    
    try {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        
        // Validate API key format
        if (!apiKey.startsWith('sk-')) {
            throw new Error('Invalid API key format. Key should start with "sk-"');
        }
        
        // Store the API key
        state.apiKey = apiKey;
        
        // Hide the API key form and show main content
        document.getElementById('apiKeyForm').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        // Initialize the app
        init();
        
    } catch (error) {
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'api-key-error';
        errorDiv.textContent = error.message;
        
        // Remove any existing error message
        const existingError = document.querySelector('.api-key-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Insert error message after the input
        const apiKeyInput = document.getElementById('apiKeyInput');
        apiKeyInput.parentNode.insertBefore(errorDiv, apiKeyInput.nextSibling);
    }
}

// Initialize the application
async function init() {
    try {
        // Check if API key is set
        if (!state.apiKey) {
            // Show API key form, hide main content
            document.getElementById('apiKeyForm').style.display = 'block';
            document.getElementById('mainContent').style.display = 'none';
            return;
        }

        // Hide breadcrumb initially
        breadcrumbElement.style.display = 'none';

        contentElement.innerHTML = '<div class="loading">Loading content...</div>';

        // Load the data
        const [worksheetsResponse, chapterWorksheetsResponse, booksResponse] = await Promise.all([
            fetch('./data/AIGeneratedWorksheets.json'),
            fetch('./data/ChapterWorksheets.json'),
            fetch('./data/BookChapters.json')
        ]);

        if (!worksheetsResponse.ok || !chapterWorksheetsResponse.ok || !booksResponse.ok) {
            throw new Error('Failed to fetch data');
        }

        const worksheetsData = await worksheetsResponse.json();
        const chapterWorksheetsData = await chapterWorksheetsResponse.json();
        const booksData = await booksResponse.json();

        console.log('Loaded data:', { worksheetsData, chapterWorksheetsData, booksData });

        // Transform the data
        const transformedData = transformData(worksheetsData, chapterWorksheetsData, booksData);
        
        console.log('Transformed data:', transformedData);

        // Update contentData
        contentData.length = 0;
        contentData.push(...transformedData);

        // Display initial view
        displayGrades();
        setupBackButton();
    } catch (error) {
        console.error('Error initializing application:', error);
        contentElement.innerHTML = `<div class="error">Error loading content: ${error.message}</div>`;
    }
}

// Display functions
function displayGrades() {
    const html = contentData.map(grade => `
        <div class="list-item" data-grade="${grade.grade}">
            Grade ${grade.grade}
        </div>
    `).join('');
    
    contentElement.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            selectGrade(parseInt(item.dataset.grade));
        });
    });
    
    updateBreadcrumb();
}

function displaySubjects(gradeId) {
    const grade = contentData.find(g => g.grade === gradeId);
    const html = grade.subjects.map(subject => `
        <div class="list-item" data-subject="${subject.subject}">
            ${subject.subject}
        </div>
    `).join('');
    
    contentElement.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            selectSubject(item.dataset.subject);
        });
    });
    
    updateBreadcrumb();
}

function displayChapters(subjectName) {
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === subjectName);
    const html = subject.chapters.map(chapter => `
        <div class="list-item" data-chapter="${chapter.chapterNumber}">
            Chapter ${chapter.chapterNumber}: ${chapter.chapterName}
        </div>
    `).join('');
    
    contentElement.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            selectChapter(parseInt(item.dataset.chapter));
        });
    });
    
    updateBreadcrumb();
}

function displayWorksheets(chapterNumber) {
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
    const chapter = subject.chapters.find(c => c.chapterNumber === chapterNumber);
    console.log(chapter);
    const html = chapter.worksheets.map(worksheet => `
        <div class="list-item" data-worksheet="${worksheet.id}">
            <div class="worksheet-header">
                <span class="worksheet-title">${worksheet.title}</span>
                <span class="worksheet-type">${worksheet.worksheetType}</span>
            </div>
            <div class="worksheet-meta">
                <span class="question-count">${worksheet.questions.length} Questions</span>
            </div>
        </div>
    `).join('');
    
    contentElement.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.list-item').forEach(item => {
        item.addEventListener('click', () => {
            selectWorksheet(item.dataset.worksheet);
        });
    });
    
    updateBreadcrumb();
}

function displayWorksheet(worksheetId) {
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
    const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
    const worksheet = chapter.worksheets.find(w => w.id === worksheetId);
    
    const totalQuestions = worksheet.questions.length;
    state.currentQuestionIndex = 0;
    
    const html = `
        <div class="worksheet">
            <h2>${worksheet.title}</h2>
            <div class="questions">
                ${renderSingleQuestion(worksheet.questions[0], 0, totalQuestions)}
            </div>
        </div>
    `;
    
    contentElement.innerHTML = html;
    setupQuestionInteractions();
    updateBreadcrumb();
}

// Update renderSingleQuestion to use modal for answer section
function renderSingleQuestion(question, index, totalQuestions) {
    return `
        <div class="question ${question.type.toLowerCase()}">
            <div class="question-header">
                <div class="question-info">
                    <div class="question-navigation">
                        <span class="question-counter">Question ${index + 1} of ${totalQuestions}</span>
                        <div class="question-tags">
                            <span class="question-type">${question.type}</span>
                            <span class="question-difficulty">${question.difficulty || 'Not Set'}</span>
                        </div>
                        <div class="navigation-buttons">
                            <button class="nav-button prev" onclick="previousQuestion()" ${index === 0 ? 'disabled' : ''}>← Previous</button>
                            <button class="nav-button next" onclick="nextQuestion()" ${index === totalQuestions - 1 ? 'disabled' : ''}>Next →</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="question-content-wrapper">
                ${renderQuestionContent(question)}
                <div class="feedback" style="display: none;"></div>
            </div>

            <div class="question-controls-container">
                <div class="question-actions">
                    <button class="button button-primary submit-answer" onclick="submitAnswer(this)">Submit Answer</button>
                    <button class="button button-secondary reset-answer" onclick="resetAnswer(this)" style="display: none;">Try Again</button>
                </div>
                <div class="answer-controls">
                    <button class="toggle-answer" onclick="toggleAnswer(this)">Show Answer</button>
                </div>
            </div>

            <!-- Add modal structure -->
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Answer</h3>
                        <button class="modal-close" onclick="closeAnswerModal(this)">&times;</button>
                    </div>
                    <div class="answer-section">
                        ${question.content.rubrics ? `
                            <div class="rubrics">
                                <h4>Rubrics:</h4>
                                ${question.content.rubrics.map(rubric => `
                                    <div class="rubric">
                                        <span class="rubric-title">${rubric.title}</span>
                                        <span class="rubric-score">${rubric.maxScore}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="model-answer">
                            <h4>Example Answer:</h4>
                            <p>${getModelAnswer(question)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// New function to render just the question content without actions
function renderQuestionContent(question) {
    switch (question.type) {
        case 'FillInTheBlanks':
            return renderFillInBlanks(question.content);
        case 'SimpleMCQ':
            return renderSimpleMCQ(question.content);
        case 'ShortAnswer':
            return renderShortAnswer(question.content);
        case 'TrueOrFalse':
            return renderTrueOrFalse(question.content);
        case 'MatchTheFollowing':
            return renderMatchTheFollowing(question.content);
        case 'Crossword':
            return renderCrossword(question.content);
        case 'Draw':
            return renderDraw(question.content);
        case 'LabelTheDiagrams':
            return renderLabelDiagrams(question.content);
        case 'Circle':
            return renderCircle(question.content);
        default:
            return `<div class="question-content">${question.content.question || ''}</div>`;
    }
}

// Update renderQuestion to not include the actions
function renderQuestion(question) {
    return renderQuestionContent(question);
}

// Question type rendering functions
function renderFillInBlanks(content) {
    return `
        <div class="question-content">
            ${content.partitions.map(part => 
                part.isBlank 
                    ? `<input type="text" class="blank" data-answer="${part.text}" placeholder="_____">`
                    : `<span>${part.text}</span>`
            ).join('')}
        </div>
    `;
}

function renderSimpleMCQ(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="options">
                ${content.options.map((option, index) => `
                    <div class="option">
                        <input type="radio" id="option${index}" name="mcq${content.question.slice(0,10)}" value="${index}">
                        <label for="option${index}">${option}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Update renderShortAnswer function to use new class names
function renderShortAnswer(content) {
    return `
        <div class="question-text-wrapper">
            <div class="question-text">${content.question}</div>
            <textarea 
                class="short-answer" 
                placeholder="Type your answer here..."
                aria-label="Your answer"
            ></textarea>
        </div>
    `;
}

function renderTrueOrFalse(content) {
    return `
        <div class="question-content">
            <div class="statement">${content.statement}</div>
            <div class="true-false-options">
                <label>
                    <input type="radio" name="tf${content.statement.slice(0,10)}" value="true"> True
                </label>
                <label>
                    <input type="radio" name="tf${content.statement.slice(0,10)}" value="false"> False
                </label>
            </div>
        </div>
    `;
}

function renderMatchTheFollowing(content) {
    return `
        <div class="question-text-wrapper">
            <div class="question-text">${content.question}</div>
            <div class="matching-container">
                <div class="matching-items">
                    ${content.pairs.map((pair, index) => `
                        <div class="matching-pair">
                            <div class="matching-left">${pair.left}</div>
                            <select class="matching-select" data-index="${index}">
                                <option value="">Select a match...</option>
                                ${content.pairs.map((p, i) => `
                                    <option value="${i}">${p.right}</option>
                                `).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderCrossword(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="crossword-container">
                <div class="crossword-hints">
                    ${content.wordPlacements.map((placement, index) => `
                        <div class="hint">
                            <span class="hint-number">${placement.position}.</span>
                            <span class="hint-direction">${placement.across ? 'Across' : 'Down'}</span>
                            <span class="hint-text">${placement.hint}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="crossword-grid">
                    <!-- Grid would be dynamically generated based on wordPlacements -->
                </div>
            </div>
        </div>
    `;
}

function renderDraw(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="drawing-area">
                <canvas class="drawing-canvas" width="400" height="300"></canvas>
                <div class="drawing-tools">
                    <button class="tool" data-tool="pencil">✏️</button>
                    <button class="tool" data-tool="eraser">🧹</button>
                    <button class="clear-canvas">Clear</button>
                </div>
            </div>
        </div>
    `;
}

function renderLabelDiagrams(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="diagram-container">
                ${content.diagrams.map(diagram => `
                    <div class="diagram">
                        <img src="data/illustrations/${diagram.url}" alt="Diagram to label">
                        <div class="label-points">
                            <!-- Label points would be added dynamically -->
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderCircle(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="circle-text">
                ${content.text.split('\n').map(word => `
                    <span class="circle-word" onclick="toggleCircleWord(this)">${word}</span>
                `).join(' ')}
            </div>
        </div>
    `;
}

// Helper functions for interactivity
function toggleModelAnswer(button) {
    const answerDiv = button.nextElementSibling;
    if (answerDiv.style.display === 'none') {
        answerDiv.style.display = 'block';
        button.textContent = 'Hide Model Answer';
    } else {
        answerDiv.style.display = 'none';
        button.textContent = 'Show Model Answer';
    }
}

function toggleCircleWord(wordSpan) {
    wordSpan.classList.toggle('circled');
}

// Selection handlers
function selectGrade(gradeId) {
    state.currentLevel = 'subject';
    state.selectedGrade = gradeId;
    displaySubjects(gradeId);
    backButton.style.display = 'block';
    // Show breadcrumb when grade is selected
    breadcrumbElement.style.display = 'block';
}

function selectSubject(subjectName) {
    state.currentLevel = 'chapter';
    state.selectedSubject = subjectName;
    displayChapters(subjectName);
}

function selectChapter(chapterNumber) {
    state.currentLevel = 'worksheet';
    state.selectedChapter = chapterNumber;
    displayWorksheets(chapterNumber);
}

function selectWorksheet(worksheetId) {
    state.currentLevel = 'questions';
    state.selectedWorksheet = worksheetId;
    displayWorksheet(worksheetId);
}

// Navigation
function setupBackButton() {
    backButton.addEventListener('click', handleBack);
}

function handleBack() {
    switch (state.currentLevel) {
        case 'subject':
            state.currentLevel = 'grade';
            state.selectedGrade = null;
            displayGrades();
            backButton.style.display = 'none';
            // Hide breadcrumb when returning to grade selection
            breadcrumbElement.style.display = 'none';
            break;
        case 'chapter':
            state.currentLevel = 'subject';
            state.selectedSubject = null;
            displaySubjects(state.selectedGrade);
            break;
        case 'worksheet':
            state.currentLevel = 'chapter';
            state.selectedChapter = null;
            displayChapters(state.selectedSubject);
            break;
        case 'questions':
            state.currentLevel = 'worksheet';
            state.selectedWorksheet = null;
            displayWorksheets(state.selectedChapter);
            break;
    }
}

// Breadcrumb
function updateBreadcrumb() {
    let breadcrumb = '';
    
    if (state.selectedGrade) {
        const grade = contentData.find(g => g.grade === state.selectedGrade);
        breadcrumb += `Grade ${grade.grade}`;
        
        if (state.selectedSubject) {
            const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
            breadcrumb += ` > ${subject.subject}`;
            
            if (state.selectedChapter) {
                const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
                breadcrumb += ` > Chapter ${chapter.chapterNumber}: ${chapter.chapterName}`;
                
                if (state.selectedWorksheet) {
                    const worksheet = chapter.worksheets.find(w => w.id === state.selectedWorksheet);
                    breadcrumb += ` > ${worksheet.title}`;
                }
            }
        }
    }
    
    breadcrumbElement.textContent = breadcrumb;
}

// Add function to setup question interactions
function setupQuestionInteractions() {
    // Setup model answer toggles
    document.querySelectorAll('.show-answer').forEach(button => {
        button.addEventListener('click', () => toggleModelAnswer(button));
    });
    
    // Setup circle words
    document.querySelectorAll('.circle-word').forEach(word => {
        word.addEventListener('click', () => toggleCircleWord(word));
    });
    
    // Setup drag and drop for matching
    setupMatchingDragAndDrop();
}

// Add function to setup matching drag and drop
function setupMatchingDragAndDrop() {
    const matchItems = document.querySelectorAll('.match-item[draggable="true"]');
    matchItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    
    const dropZones = document.querySelectorAll('.right-column .match-item');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
    });
}

// Add navigation functions
window.previousQuestion = function() {
    if (state.currentQuestionIndex > 0) {
        navigateToQuestion(state.currentQuestionIndex - 1);
    }
};

window.nextQuestion = function() {
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
    const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
    const worksheet = chapter.worksheets.find(w => w.id === state.selectedWorksheet);
    
    if (state.currentQuestionIndex < worksheet.questions.length - 1) {
        navigateToQuestion(state.currentQuestionIndex + 1);
    }
};

function navigateToQuestion(index) {
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
    const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
    const worksheet = chapter.worksheets.find(w => w.id === state.selectedWorksheet);
    
    state.currentQuestionIndex = index;
    const totalQuestions = worksheet.questions.length;
    
    // Update question content
    document.querySelector('.questions').innerHTML = renderSingleQuestion(worksheet.questions[index], index, totalQuestions);
    
    // Update counter
    document.querySelector('.question-counter').textContent = `Question ${index + 1} of ${totalQuestions}`;
    
    // Update navigation buttons
    document.querySelector('.nav-button.prev').disabled = index === 0;
    document.querySelector('.nav-button.next').disabled = index === totalQuestions - 1;
    
    setupQuestionInteractions();
}

// Transform data function
function transformData(worksheetsData, chapterWorksheetsData, booksData) {
    try {
        // Group worksheets by grade, subject, and chapter
        const gradeMap = new Map();

        // Process books data first to create the structure
        booksData.forEach(book => {
            const { grade, subject, curriculum, chapterNumber, chapterName, book: bookName, pdfPath } = book.metadata;
            const bookId = book.id;

            
            // Skip supplementary books (those with bookId starting with 'fepw')
            if (bookId.startsWith('fepw')) {
                return; // Skip this iteration
            }
            
            // Create grade if doesn't exist
            if (!gradeMap.has(grade)) {
                gradeMap.set(grade, {
                    grade,
                    subjects: new Map()
                });
            }
            
            const gradeData = gradeMap.get(grade);
            
            // Create subject if doesn't exist
            if (!gradeData.subjects.has(subject)) {
                gradeData.subjects.set(subject, {
                    subject,
                    curriculum,
                    chapters: new Map()
                });
            }
            
            const subjectData = gradeData.subjects.get(subject);
            
            // Create chapter if doesn't exist
            if (!subjectData.chapters.has(bookId)) {
                subjectData.chapters.set(bookId, {
                    bookId: bookId,
                    chapterNumber,
                    chapterName,
                    pdfPath,
                    book: bookName,
                    worksheets: new Map()
                });
            }
        });

        // Process AI Worksheets
        worksheetsData.forEach(worksheet => {
            const { grade, subject, curriculum, chapterNumber, chapterName, book, worksheetName } = worksheet.document.worksheet;
            const { bookId } = worksheet.metadata;
            const worksheetId = worksheet.id;

            // Skip worksheets from supplementary books
            if (bookId.startsWith('fepw')) {
                return;
            }

            const gradeData = gradeMap.get(grade);
            if (!gradeData) return;

            const subjectData = gradeData.subjects.get(subject);
            if (!subjectData) return;

            const chapterData = subjectData.chapters.get(bookId);
            // Only add worksheet if it belongs to this chapter's book
            if (!chapterData || chapterData.bookId !== bookId) return;

            // Add worksheet
            chapterData.worksheets.set(worksheetId, {
                worksheetType: "AI",
                id: worksheetId,
                title: worksheetName,
                questions: worksheet.document.worksheet.questions
            });
        });

        // Process Chapter Worksheets
        chapterWorksheetsData.forEach(worksheet => {
            const { grade, subject, curriculum, chapterNumber, chapterName, book, worksheetName } = worksheet.document.worksheet;
            const { bookId } = worksheet.metadata;
            const worksheetId = worksheet.id;

            // Skip worksheets from supplementary books
            if (bookId.startsWith('fepw')) {
                return;
            }

            const gradeData = gradeMap.get(grade);
            if (!gradeData) return;

            const subjectData = gradeData.subjects.get(subject);
            if (!subjectData) return;

            const chapterData = subjectData.chapters.get(bookId);
            // Only add worksheet if it belongs to this chapter's book
            if (!chapterData || chapterData.bookId !== bookId) return;

            // Add worksheet
            chapterData.worksheets.set(worksheetId, {
                worksheetType: "Chapter",
                id: worksheetId,
                title: worksheetName,
                questions: worksheet.document.worksheet.questions
            });
        });

        // Convert Maps to arrays for final structure
        return Array.from(gradeMap.values()).map(grade => ({
            grade: grade.grade,
            subjects: Array.from(grade.subjects.values()).map(subject => ({
                subject: subject.subject,
                curriculum: subject.curriculum,
                chapters: Array.from(subject.chapters.values()).map(chapter => ({
                    chapterNumber: chapter.chapterNumber,
                    chapterName: chapter.chapterName,
                    pdfPath: chapter.pdfPath,
                    book: chapter.book,
                    worksheets: Array.from(chapter.worksheets.values())
                }))
            }))
        }));

    } catch (error) {
        console.error('Error transforming data:', error);
        return [];
    }
}

// Add the submit answer function to window
window.submitAnswer = submitAnswer;

/**
 * Runs an OpenAI "assistant" thread using the private/beta `/v1/threads/runs` endpoint.
 * This function:
 *  1) Creates and runs a new thread (with user prompt).
 *  2) Polls the run status until it completes or fails.
 *  3) Retrieves the final assistant message from the thread.
 *
 * @param {string} apiKey         Your OpenAI API key
 * @param {string} assistantId    The ID of the assistant you want to invoke
 * @param {string} userPrompt     The user's prompt/message for the assistant
 * @returns {Promise<string>}     The assistant's final response text
 */
async function runAssistant(apiKey, assistantId, userPrompt) {
    try {
      // 1. CREATE & RUN THE THREAD (inferred from your snippet)
      const createRunResponse = await fetch('https://api.openai.com/v1/threads/runs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          thread: {
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          },
        }),
      });
  
      if (!createRunResponse.ok) {
        const errBody = await createRunResponse.json().catch(() => ({}));
        throw new Error(
          `Failed to createAndRun thread: ${errBody.error?.message || createRunResponse.statusText}`
        );
      }
  
      const runData = await createRunResponse.json();
      const threadId = runData.thread_id;
      const runId = runData.id;
      let status = runData.status || 'running';
  
      // 2. POLL UNTIL RUN IS COMPLETED OR FAILS`
      while (status !== 'completed') {
        if (status === 'failed') {
          throw new Error('Assistant run failed');
        }
  
        // Wait a bit before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
  
        const statusResp = await fetch(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          }
        );
  
        if (!statusResp.ok) {
          const errBody = await statusResp.json().catch(() => ({}));
          throw new Error(
            `Error retrieving run status: ${errBody.error?.message || statusResp.statusText}`
          );
        }
  
        const statusData = await statusResp.json();
        status = statusData.status;
      }
  
      // 3. RETRIEVE THE FINAL ASSISTANT MESSAGE
      const messagesResp = await fetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );
  
      if (!messagesResp.ok) {
        const errBody = await messagesResp.json().catch(() => ({}));
        throw new Error(
          `Error retrieving final messages: ${errBody.error?.message || messagesResp.statusText}`
        );
      }
  
      const messagesData = await messagesResp.json();
      const assistantMessageObj = messagesData.data.find((m) => m.role === 'assistant');
      const assistantText =
        assistantMessageObj?.content?.[0]?.text?.value || 'No assistant response found';
      return assistantText;
    } catch (error) {
      console.error('Error running assistant:', error);
      throw error;
    }
  }

// Update the evaluateAnswer function to parse the response
async function evaluateAnswer(question, userAnswer, questionScreenshot) {
    userAnswer = userAnswer === "" ? "No answer provided" : userAnswer;
    try {
        console.log("Evaluating answer...");
        const userPrompt = `
        question: ${question.content.question}
        hand written submission: ${userAnswer} 
        rubrics: ${JSON.stringify(question.content.rubrics)}`;

        // ${questionScreenshot}

        const response = await runAssistant(
            state.apiKey,
            assistantId,
            userPrompt
        );

        // Parse the response string into an array of criteria
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Error parsing evaluation response:', error);
            // Fallback format if parsing fails
            return {
                score: 0,
                maxScore: question.content.rubrics[0].maxScore,
                criteria: [
                    {
                        title: 'Overall',
                        score: 0,
                        maxScore: question.content.rubrics[0].maxScore,
                        feedback: response
                    }
                ]
            };
        }
    } catch (error) {
        console.error('Error evaluating answer:', error);
        return null;
    }
}

// Update submitAnswer function to show feedback
async function submitAnswer(button) {
    const questionDiv = button.closest('.question');
    const feedbackDiv = questionDiv.querySelector('.feedback');
    const resetButton = button.nextElementSibling;
    const questionType = questionDiv.className.split(' ')[1];
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Evaluating...';
    
    // Show feedback div with loading message
    feedbackDiv.style.display = 'block';
    feedbackDiv.innerHTML = '<div class="loading">Evaluating your answer...</div>';
    
    // Get the answer based on question type
    let userAnswer;
    let isCorrect = false;
    let evaluation = null;

    switch (questionType) {
        case 'shortanswer':
            userAnswer = questionDiv.querySelector('textarea').value;
            
            // Get the current question being displayed
            const grade = contentData.find(g => g.grade === state.selectedGrade);
            const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
            const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
            const worksheet = chapter.worksheets.find(w => w.id === state.selectedWorksheet);
            const question = worksheet.questions[state.currentQuestionIndex];
            
            console.log("Current question:", question);
            
            if (question.content.rubrics) {
                console.log("Starting evaluation...");
                let screenshotDataUrl = 'Screenshot unavailable';
                
                // Capture screenshot of question div
                try {
                    const questionScreenshot = await html2canvas(questionDiv);
                    screenshotDataUrl = questionScreenshot.toDataURL('image/png');
                } catch (error) {
                    console.error('Error capturing screenshot:', error);
                }
                evaluation = await evaluateAnswer(question, userAnswer, screenshotDataUrl);
                console.log("Evaluation:", evaluation);
            }
            break;
        case 'draw':
            userAnswer = 'Drawing submission';
            break;
        case 'fillintheblank':
            const inputs = Array.from(questionDiv.querySelectorAll('input.blank'));
            userAnswer = inputs.map(input => input.value).join(', ');
            const correctAnswers = inputs.map(input => input.dataset.answer);
            isCorrect = inputs.every((input, i) => input.value.trim().toLowerCase() === correctAnswers[i].toLowerCase());
            break;
        case 'trueorfalse':
            const selectedValue = questionDiv.querySelector('input[type="radio"]:checked')?.value;
            userAnswer = selectedValue ? (selectedValue === 'true' ? 'True' : 'False') : 'Not answered';
            isCorrect = selectedValue === questionDiv.querySelector('.model-answer').textContent.trim().toLowerCase();
            break;
        case 'simplemcq':
            const selectedOption = questionDiv.querySelector('input[type="radio"]:checked');
            if (selectedOption) {
                userAnswer = selectedOption.nextElementSibling.textContent;
                const correctAnswer = questionDiv.querySelector('.model-answer p').textContent;
                isCorrect = userAnswer.trim() === correctAnswer.trim();
            } else {
                userAnswer = 'Not answered';
            }
            break;
        case 'matchthefollowing':
            const selects = Array.from(questionDiv.querySelectorAll('.matching-select'));
            const answers = selects.map(select => select.value);
            userAnswer = answers.map((answer, index) => {
                const pair = question.content.pairs[index];
                const selectedRight = question.content.pairs[answer]?.right || 'Not selected';
                return `${pair.left} → ${selectedRight}`;
            }).join('\n');
            isCorrect = answers.every((answer, index) => answer === index.toString());
            break;
        default:
            userAnswer = 'Answer submitted';
    }

    // Update feedback display
    updateFeedbackDisplay(feedbackDiv, userAnswer, evaluation, isCorrect);

    // Update button states
    button.disabled = true;
    button.textContent = 'Submitted';
    resetButton.style.display = 'inline-block';

    // Automatically show the answer
    const toggleAnswerButton = questionDiv.querySelector('.toggle-answer');
    const answerSection = toggleAnswerButton.nextElementSibling;
    answerSection.style.display = 'block';
    toggleAnswerButton.textContent = 'Hide Answer';
}

// Update the feedback display function
function updateFeedbackDisplay(feedbackDiv, userAnswer, evaluation, isCorrect) {
    console.log("Updating feedback display...");
    
    // Ensure feedback div is visible
    feedbackDiv.style.display = 'block';
    
    feedbackDiv.innerHTML = `
        <div class="feedback-content">
            <div class="answer-section">
                <h4>Your Response</h4>
                <p class="user-answer">${userAnswer === "" ? 'No answer provided' : userAnswer}</p>
                ${evaluation ? `
                    <div class="evaluation-results">
                        <h4>AI Evaluated Score: ${evaluation.score}/${evaluation.maxScore}</h4>
                        ${evaluation.criteria ? 
                            evaluation.criteria.map(criterion => `
                                <div class="rubric-score">
                                    <div>
                                        <h4>${criterion.title}</h4>
                                        <span class="score">${criterion.score}/${criterion.maxScore}</span>
                                        <div class="feedback">${criterion.feedback}</div>
                                    </div>
                                </div>
                            `).join('') 
                            : `<div class="evaluation-feedback">${evaluation}</div>`
                        }
                    </div>
                ` : isCorrect !== undefined ? `
                    <div class="feedback-status ${isCorrect ? 'correct' : 'incorrect'}">
                        ${isCorrect ? '✓ Correct!' : '✗ Incorrect, try again'}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Add reset answer function
window.resetAnswer = function(button) {
    const questionDiv = button.closest('.question');
    const submitButton = button.previousElementSibling;
    const feedbackDiv = questionDiv.querySelector('.feedback');
    const questionType = questionDiv.className.split(' ')[1];

    // Reset form elements based on question type
    switch (questionType) {
        case 'shortanswer':
            questionDiv.querySelector('textarea').value = '';
            break;
        case 'fillintheblank':
            questionDiv.querySelectorAll('input.blank').forEach(input => input.value = '');
            break;
        case 'trueorfalse':
        case 'simplemcq':
            questionDiv.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
            break;
        // Add other question types as needed
    }

    // Hide feedback
    feedbackDiv.style.display = 'none';

    // Hide answer section and reset toggle button
    const toggleAnswerButton = questionDiv.querySelector('.toggle-answer');
    const answerSection = toggleAnswerButton.nextElementSibling;
    answerSection.style.display = 'none';
    toggleAnswerButton.textContent = 'Show Answer';

    // Enable submit button and hide reset button
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Answer';
    button.style.display = 'none';
};

// Add helper function to get model answer based on question type
function getModelAnswer(question) {
    switch (question.type) {
        case 'FillInTheBlanks':
            return question.content.partitions
                .filter(part => part.isBlank)
                .map(part => part.text)
                .join(', ');
        case 'TrueOrFalse':
            return question.content.isTrue ? 'True' : 'False';
        case 'ShortAnswer':
        case 'Draw':
            return question.content.answer;
        case 'SimpleMCQ':
            return question.content.options[question.content.correctAnswer];
        default:
            return question.content.answer || 'Answer not available';
    }
}

// Update toggleAnswer function to handle modal
function toggleAnswer(button) {
    const questionDiv = button.closest('.question');
    const modalOverlay = questionDiv.querySelector('.modal-overlay');
    modalOverlay.classList.add('active');
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Update closeAnswerModal function
function closeAnswerModal(closeButton) {
    const modalOverlay = closeButton.closest('.modal-overlay');
    modalOverlay.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Add click outside to close
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeAnswerModal(event.target.querySelector('.modal-close'));
    }
});

// Add escape key to close
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            closeAnswerModal(activeModal.querySelector('.modal-close'));
        }
    }
}); 
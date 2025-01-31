import { Langfuse } from 'https://esm.sh/langfuse';

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

// Add Langfuse initialization near the top of the file, after state management
let langfuse;

// Initialize Langfuse after DOM content loads
document.addEventListener('DOMContentLoaded', () => {
    langfuse = new Langfuse({
        publicKey: 'pk-lf-fca16579-d265-4d37-aaa6-3f5275f9fdf2',
        secretKey: 'sk-lf-01b3e8f3-20ca-4b78-84ee-3ab1a7adc557',
        baseUrl: 'https://cloud.langfuse.com'
    });
    initializeGlobalFunctions();
    document.getElementById('apiKeyForm').addEventListener('submit', handleApiKeySubmit);
    init();
});

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

// Update the API key submission handler
function handleApiKeySubmit(event) {
    event.preventDefault();
    
    try {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiKey = apiKeyInput.value.trim();
        
        // Allow empty API key
        if (apiKey === '') {
            state.apiKey = null;
        } else {
            // Validate API key format if provided
            if (!apiKey.startsWith('sk-')) {
                throw new Error('Invalid API key format. Key should start with "sk-"');
            }
            state.apiKey = apiKey;
        }
        
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

        // Transform the data
        const transformedData = transformData(worksheetsData, chapterWorksheetsData, booksData);
        
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
        <div class="questions">
            ${renderSingleQuestion(worksheet.questions[0], 0, totalQuestions)}
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
    // Create a shuffled array of right answers
    const shuffledRight = [...content.pairs]
        .map(pair => pair.right)
        .sort(() => Math.random() - 0.5);

    return `
        <div class="question-text-wrapper">
            <div class="question-text">${content.question}</div>
            <div class="matching-container">
                <div class="matching-left-column">
                    ${content.pairs.map(pair => `
                        <div class="matching-item">${pair.left}</div>
                    `).join('')}
                </div>
                <div class="matching-right-column" data-pairs='${JSON.stringify(content.pairs)}'>
                    ${shuffledRight.map(right => `
                        <div class="matching-item draggable" draggable="true">${right}</div>
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
                <canvas class="drawing-canvas"></canvas>
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
    
    // Setup drag and drop for matching questions
    const rightColumns = document.querySelectorAll('.matching-right-column');
    rightColumns.forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            const notDragging = [...column.querySelectorAll('.matching-item:not(.dragging)')];
            
            const closest = notDragging.reduce((closest, item) => {
                const box = item.getBoundingClientRect();
                const offset = e.clientY - (box.top + box.height / 2);
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: item };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            
            if (closest) {
                column.insertBefore(dragging, closest);
            } else {
                column.appendChild(dragging);
            }
        });

        const items = column.querySelectorAll('.matching-item');
        items.forEach(item => {
            item.addEventListener('dragstart', () => item.classList.add('dragging'));
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
        });
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
    // Create a new trace for this interaction
    const trace = langfuse.trace({
        name: 'Assistant Interaction',
        userId: 'anonymous', // You can add user identification if available
        metadata: {
            assistantId,
            promptType: 'evaluation'
        }
    });

    try {
        // Create a generation for the initial prompt
        const generation = trace.generation({
            name: 'Assistant Run',
            model: 'gpt-4o',  // Update with actual model if known
            modelParameters: {
                assistantId,
                temperature: 0.5  // Add actual parameters if known
            },
            input: userPrompt,
        });

        // 1. CREATE & RUN THE THREAD
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
            const error = new Error(
                `Failed to createAndRun thread: ${errBody.error?.message || createRunResponse.statusText}`
            );
            generation.end({ error });
            throw error;
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
        const assistantText = assistantMessageObj?.content?.[0]?.text?.value || 'No assistant response found';

        // End the generation with success
        generation.end({
            output: assistantText,
        });

        return assistantText;
    } catch (error) {
        console.error('Error running assistant:', error);
        // End the trace with error
        trace.end({ 
            status: 'error',
            statusMessage: error.message
        });
        throw error;
    }
}

// Update the evaluateAnswer function to parse the response
async function evaluateAnswer(question, userAnswer, questionScreenshot, questionType) {
    userAnswer = userAnswer === "" ? "No answer provided" : userAnswer;
    try {
        console.log("Evaluating answer...");
        const userPrompt = `
        question: ${question.content.question}
        hand written submission: ${userAnswer} 
        rubrics: ${JSON.stringify(question.content.rubrics)}
        ${questionType} === "ShortAnswer" ? "" : ${questionScreenshot}
        `;

        const response = await runAssistant(
            state.apiKey,
            assistantId,
            userPrompt
        );

        try {
            const parsedResponse = JSON.parse(response);
            trace.end({ 
                status: 'success',
                metadata: {
                    score: parsedResponse.score,
                    maxScore: parsedResponse.maxScore
                }
            });
            return parsedResponse;
        } catch (error) {
            console.error('Error parsing evaluation response:', error);
            const fallbackResponse = {
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
            return fallbackResponse;
        }
    } catch (error) {
        console.error('Error evaluating answer:', error);
        trace.end({ 
            status: 'error',
            statusMessage: error.message
        });
        return null;
    }
}

// Update submitAnswer function to check for API key
async function submitAnswer(button) {
    const questionDiv = button.closest('.question');
    const feedbackDiv = questionDiv.querySelector('.feedback');
    const resetButton = button.nextElementSibling;
    const questionType = questionDiv.className.split(' ')[1];
    
    // Get the current question
    const grade = contentData.find(g => g.grade === state.selectedGrade);
    const subject = grade.subjects.find(s => s.subject === state.selectedSubject);
    const chapter = subject.chapters.find(c => c.chapterNumber === state.selectedChapter);
    const worksheet = chapter.worksheets.find(w => w.id === state.selectedWorksheet);
    const question = worksheet.questions[state.currentQuestionIndex];

    // Capture only the question content div
    let screenshotDataUrl = 'Screenshot unavailable';
    try {
        const questionContentDiv = questionDiv.querySelector('.question-content-wrapper');
        const questionScreenshot = await html2canvas(questionContentDiv);
        screenshotDataUrl = questionScreenshot.toDataURL('image/png');
        console.log("Screenshot data URL:", screenshotDataUrl);
    } catch (error) {
        console.error('Error capturing screenshot:', error);
    }
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Checking...';
    
    // Show feedback div with loading message
    feedbackDiv.style.display = 'block';
    feedbackDiv.innerHTML = '<div class="loading">Checking your answer...</div>';
    
    // Get the answer based on question type
    let userAnswer;
    let isCorrect = false;
    let evaluation = null;

    switch (questionType) {
        case 'shortanswer':
        case 'draw':
        case 'labelthediagrams':
            userAnswer = questionType === 'shortanswer' ? 
                questionDiv.querySelector('textarea').value :
                'Submission received';
            
            // Only use AI evaluation if API key is available and rubrics are present
            if (state.apiKey && question.content.rubrics) {
                button.textContent = 'Evaluating...';
                feedbackDiv.innerHTML = '<div class="loading">Evaluating your answer...</div>';
                evaluation = await evaluateAnswer(question, userAnswer, screenshotDataUrl, questionType);
            }
            break;

        case 'fillintheblank':
            const inputs = Array.from(questionDiv.querySelectorAll('input.blank'));
            userAnswer = inputs.map(input => input.value).join(', ');
            const correctBlankAnswers = inputs.map(input => input.dataset.answer);
            isCorrect = inputs.every((input, i) => 
                input.value.trim().toLowerCase() === correctBlankAnswers[i].toLowerCase()
            );
            break;

        case 'trueorfalse':
            const selectedValue = questionDiv.querySelector('input[type="radio"]:checked')?.value;
            userAnswer = selectedValue ? (selectedValue === 'true' ? 'True' : 'False') : 'Not answered';
            isCorrect = selectedValue === String(question.content.isTrue).toLowerCase();
            break;

        case 'simplemcq':
            const selectedOption = questionDiv.querySelector('input[type="radio"]:checked');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.value);
                userAnswer = question.content.options[selectedIndex];
                isCorrect = selectedIndex === question.content.correctAnswer;
            } else {
                userAnswer = 'Not answered';
            }
            break;

        case 'matchthefollowing':
            const rightColumn = questionDiv.querySelector('.matching-right-column');
            const pairs = JSON.parse(rightColumn.dataset.pairs);
            const currentAnswers = Array.from(rightColumn.querySelectorAll('.matching-item'))
                .map(item => item.textContent.trim());
            
            const leftItems = Array.from(questionDiv.querySelectorAll('.matching-left-column .matching-item'))
                .map(item => item.textContent.trim());
            
            // Create current pairs for display
            const userPairs = leftItems.map((left, i) => 
                `${left} → ${currentAnswers[i]}`
            );
            
            // Check if each pair matches the original pairs
            isCorrect = pairs.every((pair, index) => {
                const currentLeft = leftItems[index];
                const currentRight = currentAnswers[index];
                return pair.left === currentLeft && pair.right === currentRight;
            });
            
            // Format answer display with proper spacing
            userAnswer = `<div class="matching-pairs">
                ${userPairs.map(pair => `<div class="matching-pair-result">${pair}</div>`).join('')}
            </div>`;
            break;

        case 'circle':
            const circledWords = Array.from(questionDiv.querySelectorAll('.circle-word.circled'))
                .map(word => word.textContent.trim());
            userAnswer = circledWords.join(', ');
            const correctWords = question.content.correctWords.map(word => word.trim());
            isCorrect = correctWords.length === circledWords.length && 
                correctWords.every(word => circledWords.includes(word));
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

    // Show the answer for incorrect responses or if evaluation was performed
    if (!isCorrect || evaluation) {
        const toggleAnswerButton = questionDiv.querySelector('.toggle-answer');
        const answerSection = toggleAnswerButton.nextElementSibling;
        answerSection.style.display = 'block';
        toggleAnswerButton.textContent = 'Hide Answer';
    }
}

// Update the feedback display function
function updateFeedbackDisplay(feedbackDiv, userAnswer, evaluation, isCorrect) {
    // Ensure feedback div is visible
    feedbackDiv.style.display = 'block';
    
    feedbackDiv.innerHTML = `
        <div class="feedback-content">
            <div class="answer-section">
                <div class="feedback-status ${isCorrect ? 'correct' : 'incorrect'}">
                    ${userAnswer === "" ? 'No answer provided' : userAnswer}
                </div>
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
                ` : ''}
            </div>
        </div>
    `;
}

// Update reset answer function
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
        case 'matchthefollowing':
            // Re-shuffle the right column items
            const rightColumn = questionDiv.querySelector('.matching-right-column');
            const items = Array.from(rightColumn.querySelectorAll('.matching-item'));
            items.sort(() => Math.random() - 0.5).forEach(item => rightColumn.appendChild(item));
            break;
        case 'circle':
            questionDiv.querySelectorAll('.circle-word.circled').forEach(word => {
                word.classList.remove('circled');
            });
            break;
    }

    // Hide feedback
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML = '';

    // Hide answer section and reset toggle button
    const toggleAnswerButton = questionDiv.querySelector('.toggle-answer');
    const modalOverlay = questionDiv.querySelector('.modal-overlay');
    modalOverlay.classList.remove('active');
    toggleAnswerButton.textContent = 'Show Answer';

    // Enable submit button and hide reset button
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Answer';
    button.style.display = 'none';

    // Restore body scroll if modal was open
    document.body.style.overflow = '';
};

// Update getModelAnswer function for match-the-following
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
        case 'MatchTheFollowing':
            return `<div class="matching-pairs">
                ${question.content.pairs.map(pair => 
                    `<div class="matching-pair-result correct">
                        ${pair.left} → ${pair.right}
                    </div>`
                ).join('')}
            </div>`;
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

// Add skipApiKey function
window.skipApiKey = function() {
    state.apiKey = null;
    document.getElementById('apiKeyForm').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    init();
}; 
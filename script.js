// State management
const state = {
    currentLevel: 'grade',
    selectedGrade: null,
    selectedSubject: null,
    selectedChapter: null,
    selectedWorksheet: null
};

const contentData = [];

// DOM elements
const contentElement = document.getElementById('content');
const backButton = document.getElementById('backBtn');
const breadcrumbElement = document.getElementById('breadcrumb');

// Make selection handlers available globally
window.selectGrade = selectGrade;
window.selectSubject = selectSubject;
window.selectChapter = selectChapter;
window.selectWorksheet = selectWorksheet;
window.toggleModelAnswer = toggleModelAnswer;
window.toggleCircleWord = toggleCircleWord;

// Initialize the application
async function init() {
    try {
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
    
    const html = `
        <div class="worksheet">
            <h2>${worksheet.title}</h2>
            <div class="worksheet-info">
                <p>Chapter ${chapter.chapterNumber}: ${chapter.chapterName}</p>
                <p>${chapter.book}</p>
            </div>
            <div class="questions">
                ${worksheet.questions.map((question, index) => `
                    <div class="question ${question.type.toLowerCase()}">
                        <div class="question-header">
                            <span class="question-number">Q${index + 1}.</span>
                            <span class="question-type">[${question.type}]</span>
                            <span class="question-difficulty">${question.difficulty || 'Medium'}</span>
                        </div>
                        ${renderQuestion(question)}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    contentElement.innerHTML = html;
    
    // Add event listeners for interactive elements
    setupQuestionInteractions();
    
    updateBreadcrumb();
}

// Update renderQuestion function to handle all question types
function renderQuestion(question) {
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

function renderShortAnswer(content) {
    return `
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="answer-section">
                <textarea class="short-answer" placeholder="Enter your answer here..."></textarea>
                <div class="rubrics">
                    ${content.rubrics.map(rubric => `
                        <div class="rubric">
                            <span class="rubric-title">${rubric.title}</span>
                            <span class="rubric-score">/${rubric.maxScore}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="show-answer" onclick="toggleModelAnswer(this)">Show Model Answer</button>
                <div class="model-answer" style="display: none;">
                    <strong>Model Answer:</strong> ${content.answer}
                </div>
            </div>
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
        <div class="question-content">
            <div class="question-text">${content.question}</div>
            <div class="matching-container">
                <div class="left-column">
                    ${content.pairs.map((pair, index) => `
                        <div class="match-item" draggable="true" data-index="${index}">
                            ${pair.left}
                        </div>
                    `).join('')}
                </div>
                <div class="right-column">
                    ${content.pairs.map((pair, index) => `
                        <div class="match-item" data-index="${index}">
                            ${pair.right}
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
            <div class="rubrics">
                ${content.rubrics.map(rubric => `
                    <div class="rubric">
                        <span class="rubric-title">${rubric.title}</span>
                        <span class="rubric-score">/${rubric.maxScore}</span>
                    </div>
                `).join('')}
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
                        <img src="${diagram.url}" alt="Diagram to label">
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

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
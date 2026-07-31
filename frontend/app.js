/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Prevent scroll during loading
    document.body.style.overflow = 'hidden';
    
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });

    // Initialize theme
    initializeTheme();

    // Setup button ripple effects
    setupRippleEffects();

    // Setup sidebar
    setupSidebar();

    // Auto-resize textarea
    autoResizeTextarea();

    // Load initial data
    loadDashboardData();

    // Initialize charts
    initializeCharts();

    // Show app after loading
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.body.style.overflow = 'auto';
        
        // Trigger stat counters after loading
        setTimeout(animateStatCounters, 300);
    }, 1500);
}

/* ==================== THEME MANAGEMENT ==================== */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('sun');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme === 'dark' ? 'sun' : 'moon');
    
    showToast(newTheme === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 'info');
}

function updateThemeIcon(icon) {
    const themeBtn = document.querySelector('#themeToggle i');
    if (!themeBtn) return;
    themeBtn.className = `fas fa-${icon}`;
    themeBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        themeBtn.style.transform = 'rotate(0deg)';
    }, 300);
}

function updateThemeIcon(icon) {
    const themeBtn = document.querySelector('#themeToggle i');
    if (!themeBtn) return; // Guard: element may not exist
    themeBtn.className = `fas fa-${icon}`;
}

/* ==================== NAVIGATION ==================== */
function showSection(sectionId) {
    // Remove active class from all sections and nav items
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected section and nav item
    const section = document.getElementById(sectionId);
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    
    if (section) {
        section.classList.add('active');
        // Trigger animation by removing and re-adding
        section.style.animation = 'none';
        section.offsetHeight; // Trigger reflow
        section.style.animation = 'sectionFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (navItem) navItem.classList.add('active');

    // Refresh AOS
    AOS.refresh();

    // Load section-specific data
    if (sectionId === 'dashboard') {
        setTimeout(loadDashboardData, 100);
    }
    if (sectionId === 'analytics') {
        setTimeout(updateCharts, 100);
    }

    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
}

/* ==================== SIDEBAR ==================== */
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (!sidebar || !sidebarOverlay) return;

    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024 &&
            !sidebar.contains(e.target) &&
            !sidebarToggle?.contains(e.target)) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar) return;
    
    sidebar.classList.toggle('active');
    if (sidebarOverlay) {
        sidebarOverlay.classList.toggle('active');
    }
}

/* ==================== RIPPLE EFFECT ==================== */
function setupRippleEffects() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .quick-action-btn, .chat-send-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

/* ==================== STAT COUNTER ANIMATION ==================== */
function animateStatCounters() {
    const counters = document.querySelectorAll('.stat-value[data-count]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        if (isNaN(target)) return;
        
        const duration = 2000;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);
            
            counter.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        requestAnimationFrame(updateCounter);
    });
}

/* ==================== CHAT IMPROVEMENTS ==================== */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return null;
    
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'chat-message ai-message';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="message-text">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return typingId;
}

/* ==================== AUTO RESIZE TEXTAREA ==================== */
function autoResizeTextarea() {
    const textarea = document.getElementById('chatInput');
    if (!textarea) return;

    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

/* ==================== AUTHENTICATION ==================== */
function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.toggle('active');
}

function switchAuthTab(tab, event) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.style.display = 'none');
    
    // If called from a click event, highlight the clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Called programmatically (e.g. after register) — find the matching tab by data attribute
        const matchingTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
        if (matchingTab) matchingTab.classList.add('active');
    }
    document.getElementById(`${tab}Form`).style.display = 'block';
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showToast('❌ Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showToast('✅ Login successful!', 'success');
            updateUserInfo(username);
            toggleAuthModal();
            loadDashboardData();
        } else {
            showToast('❌ ' + (data.error || 'Login failed'), 'error');
        }
    } catch (error) {
        showToast('❌ Connection error', 'error');
        console.error('Login error:', error);
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    
    if (!username || !password) {
        showToast('❌ Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('❌ Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showToast('✅ Registration successful! Please login.', 'success');
            switchAuthTab('login');
        } else {
            showToast('❌ ' + (data.error || 'Registration failed'), 'error');
        }
    } catch (error) {
        showToast('❌ Connection error', 'error');
        console.error('Register error:', error);
    }
}

function updateUserInfo(username) {
    document.getElementById('userName').textContent = username;
    document.querySelector('.user-status').textContent = 'Online';
    document.getElementById('authBtn').innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    document.getElementById('authBtn').setAttribute('onclick', 'handleLogout()');
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        showToast('👋 Logged out successfully', 'success');
        
        document.getElementById('userName').textContent = 'Guest';
        document.querySelector('.user-status').textContent = 'Not logged in';
        document.getElementById('authBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        document.getElementById('authBtn').setAttribute('onclick', 'toggleAuthModal()');
        
        loadDashboardData();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/* ==================== DASHBOARD ==================== */
async function loadDashboardData() {
    try {
        const response = await fetch('/api/progress', { credentials: 'include' });
        
        if (response.status === 401) {
            clearDashboard();
            return;
        }

        const data = await response.json();

        if (data.success) {
            updateActivityList(data.quizzes || []);
            updateDashboardStats(data);
        } else {
            clearDashboard();
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        clearDashboard();
    }
}

function clearDashboard() {
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem;">
                <i class="fas fa-lock" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p>Please login to view your progress</p>
            </div>
        `;
    }
    
    // Clear stats
    document.querySelectorAll('.stat-value').forEach(el => {
        el.textContent = '0';
        if (el.hasAttribute('data-count')) {
            el.setAttribute('data-count', '0');
        }
    });
}

function updateDashboardStats(data) {
    const totalQuizzes = data.total_quizzes || 0;
    const stats = document.querySelectorAll('.stat-value');
    if (stats.length >= 4) {
        stats[0].setAttribute('data-count', totalQuizzes);
        stats[0].textContent = totalQuizzes;
        
        stats[1].setAttribute('data-count', totalQuizzes);
        stats[1].textContent = totalQuizzes;
        
        stats[2].textContent = totalQuizzes > 0 ? '100%' : '0%';
        
        stats[3].setAttribute('data-count', totalQuizzes > 0 ? '1' : '0');
        stats[3].textContent = totalQuizzes > 0 ? '1' : '0';
        
        animateStatCounters();
    }
}

function updateActivityList(quizzes) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    if (quizzes.length === 0) {
        activityList.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }

    const recentQuizzes = [...quizzes].reverse().slice(0, 5);
    activityList.innerHTML = recentQuizzes.map(quiz => `
        <div class="activity-item">
            <div class="activity-icon success">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="activity-content">
                <p class="activity-title">${quiz.topic || 'Quiz'}</p>
                <p class="activity-time">${formatDate(quiz.date)}</p>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 2) return 'Just now';        // Under 2 minutes
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
}

/* ==================== AI TUTOR / CHAT ==================== */

// Tracks currently selected files for attachment
let chatAttachedFiles = [];

function handleChatFileSelect(input) {
    const previews = document.getElementById('chatFilePreviews');
    
    // Merge newly selected files into chatAttachedFiles
    Array.from(input.files).forEach(file => {
        // Avoid exact duplicates by name+size
        const isDupe = chatAttachedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!isDupe) chatAttachedFiles.push(file);
    });

    // Reset the input so the same file can be re-selected if removed
    input.value = '';

    renderFilePreviews();
}

function renderFilePreviews() {
    const previews = document.getElementById('chatFilePreviews');
    if (!previews) return;

    if (chatAttachedFiles.length === 0) {
        previews.innerHTML = '';
        previews.classList.remove('visible');
        return;
    }

    previews.style.display = 'flex';
    previews.classList.add('visible');
    previews.innerHTML = chatAttachedFiles.map((file, index) => `
        <div class="chat-file-pill" style="animation: slideInUp 0.3s ease ${index * 0.05}s both;">
            <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}"></i>
            <span>${file.name}</span>
            <button class="chat-file-remove" onclick="removeChatFile(${index})" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeChatFile(index) {
    chatAttachedFiles.splice(index, 1);
    renderFilePreviews();
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.querySelector('.chat-send-btn');
    const message = input.value.trim();
    
    if (!message && chatAttachedFiles.length === 0) return;

    // Show loading state on send button
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Build a display label for attached files
    const fileLabel = chatAttachedFiles.length > 0
        ? `\n📎 ${chatAttachedFiles.map(f => f.name).join(', ')}`
        : '';

    // Add user message to chat
    addChatMessage((message || '(No text)') + fileLabel, 'user');
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        let response;

        if (chatAttachedFiles.length > 0) {
            // ── File upload path ─────────────────────────────────
            const formData = new FormData();
            formData.append('message', message);
            chatAttachedFiles.forEach(file => formData.append('files[]', file));

            response = await fetch('/api/chat-with-file', {
                method: 'POST',
                credentials: 'include',
                body: formData   // Do NOT set Content-Type header; browser sets multipart boundary
            });

            // Clear attachments after sending
            chatAttachedFiles = [];
            renderFilePreviews();
        } else {
            // ── Plain text path ───────────────────────────────────
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message })
            });
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (data.success) {
            addChatMessage(data.response, 'ai');
        } else {
            addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addChatMessage('Connection error. Please check your internet.', 'ai');
        console.error('Chat error:', error);
    } finally {
        // Restore send button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }
}

function addChatMessage(text, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const avatar = sender === 'ai' 
        ? '<i class="fas fa-robot"></i>' 
        : '<i class="fas fa-user"></i>';
    
    const senderName = sender === 'ai' ? 'Cambridge AI' : 'You';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${senderName}</span>
                <span class="message-time">Now</span>
            </div>
            <div class="message-text">
                <p>${formatMessageText(text)}</p>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add a subtle entrance animation
    messageDiv.style.animation = 'none';
    messageDiv.offsetHeight; // Trigger reflow
    messageDiv.style.animation = 'slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
}

function formatMessageText(text) {
    // Basic markdown-like formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'chat-message ai-message';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="message-text">
                <p>Typing...</p>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) {
        typingDiv.style.animation = 'slideInLeft 0.3s ease reverse';
        setTimeout(() => typingDiv.remove(), 300);
    }
}

function sendQuickMessage(message) {
    document.getElementById('chatInput').value = message;
    sendChatMessage();
}

function handleChatEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

/* ==================== QUIZ GENERATOR ==================== */
async function generateQuiz() {
    const topic = document.getElementById('quizTopic').value.trim();
    const subject = document.getElementById('quizSubject').value.trim() || 'General';
    const level = document.getElementById('quizLevel').value;
    
    if (!topic) {
        showToast('❌ Please enter a topic', 'error');
        return;
    }

    const quizDisplay = document.getElementById('quizDisplay');
    quizDisplay.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Generating quiz...</p></div>';

    try {
        const response = await fetch('/api/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subject, level })
        });

        const data = await response.json();

        if (data.success) {
            quizDisplay.innerHTML = `
                <div class="form-card">
                    <h3>📝 ${subject} Quiz - ${topic}</h3>
                    <div class="quiz-content">
                        <pre style="white-space: pre-wrap; font-family: inherit;">${data.quiz}</pre>
                    </div>
                </div>
            `;
            
            document.getElementById('answerSection').style.display = 'block';
            showToast('✅ Quiz generated successfully!', 'success');
        } else {
            quizDisplay.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to generate quiz. Please try again.</p>
                </div>
            `;
            showToast('❌ Quiz generation failed', 'error');
        }
    } catch (error) {
        quizDisplay.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Connection error. Please try again.</p>
            </div>
        `;
        showToast('❌ Connection error', 'error');
        console.error('Quiz generation error:', error);
    }
}

async function submitForMarking() {
    const questions = document.querySelector('#quizDisplay .quiz-content pre')?.textContent || '';
    const answers = document.getElementById('quizAnswers').value.trim();
    const topic = document.getElementById('quizTopic').value.trim();
    
    if (!answers) {
        showToast('❌ Please write your answers first', 'error');
        return;
    }

    const resultsDiv = document.getElementById('quizResults');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>AI is marking your answers...</p></div>';

    try {
        const response = await fetch('/api/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ questions, answers, topic })
        });
        
        if (response.status === 401) {
            resultsDiv.style.display = 'none';
            showToast('❌ Please login to submit answers for marking', 'error');
            toggleAuthModal();
            return;
        }

        const data = await response.json();

        if (data.success) {
            resultsDiv.innerHTML = `
                <div class="form-card">
                    <h3>📊 Marking Results</h3>
                    <div class="quiz-content">
                        <pre style="white-space: pre-wrap; font-family: inherit;">${data.result}</pre>
                    </div>
                </div>
            `;
            showToast('✅ Quiz marked successfully!', 'success');
            loadDashboardData();
        } else {
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Marking failed. Please try again.</p>
                </div>
            `;
            showToast('❌ Marking failed', 'error');
        }
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Connection error. Please try again.</p>
            </div>
        `;
        showToast('❌ Connection error', 'error');
        console.error('Marking error:', error);
    }
}

/* ==================== NOTES GENERATOR ==================== */
function handleFileSelect(input) {
    const fileName = document.getElementById('fileName');
    const generateBtn = document.getElementById('generateNotesBtn');
    
    if (input.files && input.files[0]) {
        fileName.textContent = '📄 ' + input.files[0].name;
        generateBtn.style.display = 'inline-flex';
    }
}

async function generateNotes() {
    const fileInput = document.getElementById('noteFile');
    const subject = document.getElementById('noteSubject').value.trim() || 'General';
    const topic = document.getElementById('noteTopic').value.trim();
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('❌ Please select a PDF file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('subject', subject);
    formData.append('topic', topic);

    const notesOutput = document.getElementById('notesOutput');
    notesOutput.style.display = 'block';
    notesOutput.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Processing PDF and generating notes...</p></div>';

    try {
        const response = await fetch('/api/notes/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            notesOutput.innerHTML = `
                <div class="form-card">
                    <h3>📚 AI Generated Notes - ${subject}</h3>
                    <div class="notes-content">
                        <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.8;">${data.notes}</pre>
                    </div>
                </div>
            `;
            showToast('✅ Notes generated successfully!', 'success');
        } else {
            notesOutput.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.error || 'Failed to generate notes'}</p>
                </div>
            `;
            showToast('❌ ' + (data.error || 'Failed to generate notes'), 'error');
        }
    } catch (error) {
        notesOutput.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Connection error. Please try again.</p>
            </div>
        `;
        showToast('❌ Connection error', 'error');
        console.error('Notes generation error:', error);
    }
}

/* ==================== CHARTS (ANALYTICS) ==================== */
let weeklyChart, subjectChart;

function initializeCharts() {
    const weeklyCtx = document.getElementById('weeklyChart');
    const subjectCtx = document.getElementById('subjectChart');
    
    if (!weeklyCtx || !subjectCtx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // Weekly Progress Chart
    weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Study Hours',
                data: [3, 4, 3.5, 5, 4.5, 6, 5.5],
                borderColor: 'rgb(124, 58, 237)',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
                    gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');
                    return gradient;
                },
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgb(124, 58, 237)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: 'rgb(124, 58, 237)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    // Subject Distribution Chart
    subjectChart = new Chart(subjectCtx, {
        type: 'doughnut',
        data: {
            labels: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
            datasets: [{
                data: [30, 25, 25, 20],
                backgroundColor: [
                    'rgb(124, 58, 237)',
                    'rgb(244, 114, 182)',
                    'rgb(6, 182, 212)',
                    'rgb(245, 158, 11)'
                ],
                borderColor: context => {
                    const chart = context.chart;
                    const ctx = chart.ctx;
                    return ctx.fillStyle;
                },
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

function updateCharts() {
    // Update chart data when analytics section is shown
    if (weeklyChart) weeklyChart.update();
    if (subjectChart) subjectChart.update();
}

/* ==================== TOAST NOTIFICATIONS ==================== */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    // Add subtle animation
    toast.style.animation = 'none';
    toast.offsetHeight; // Trigger reflow
    toast.style.animation = 'toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.animation = '';
        }, 300);
    }, 3000);
}

/* ==================== UTILITY FUNCTIONS ==================== */
function filterPapers() {
    // Placeholder for paper filtering
    showToast('🔍 Filtering papers...', 'info');
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
        toggleAuthModal();
    }
});
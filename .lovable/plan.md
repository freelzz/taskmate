

# TaskMate - Student Organization Tool

A clean, minimal app to help students stay on top of their academics with smart organization and AI-powered study assistance.

---

## Core Features

### 1. User Authentication & Onboarding
- Simple email/password signup and login
- Optional Google sign-in for quick access
- Brief onboarding flow to help students add their first course

### 2. Course Management
- Add and organize courses with details (name, professor, schedule, color coding)
- Upload or paste course outlines/syllabi for each course
- Archive completed courses at semester end

### 3. Task & Assignment Tracking
- Add assignments, tests, and deadlines for each course
- Mark priority levels (urgent, important, normal)
- Track completion status with satisfying checkmarks

### 4. Weekly Calendar View
- Clear, at-a-glance weekly view of all upcoming deadlines
- Color-coded by course for easy scanning
- Quick navigation between weeks
- Today's focus section highlighting immediate priorities

### 5. Smart Reminder System
- Visual indicators for upcoming deadlines (highlighted in the UI)
- Browser push notifications for approaching due dates
- Email reminders sent 1 day before deadlines
- Customizable reminder timing preferences

### 6. AI Study Hub (Per Course)
- Input or upload course outline to activate AI features
- **Generate Study Materials:**
  - AI-created summaries of each topic
  - Auto-generated flashcards for review
  - Practice questions and self-quizzes
- **Find External Resources:**
  - AI recommends YouTube videos, articles, and tutorials
  - Resources organized by topic from the course outline
- Saved materials organized in a study library

---

## Design Approach

- **Clean & minimal aesthetic** with plenty of white space
- Soft, neutral color palette with subtle accent colors
- Clear typography optimized for readability
- Mobile-responsive design for studying on the go
- Calming interface to reduce academic stress

---

## Technical Approach

- **Backend:** Lovable Cloud with Supabase for user accounts, courses, tasks, and study materials storage
- **AI Features:** Lovable AI integration for generating study materials and finding resources
- **Notifications:** Browser notification API + email reminders via Resend


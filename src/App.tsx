import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QuizProvider } from './contexts/QuizContext';
import { SessionProvider } from './contexts/SessionContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import Profile from './pages/Profile';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Help from './pages/Help';
import Sitemap from './pages/Sitemap';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import CreateQuiz from './pages/host/CreateQuiz';
import MyQuizzes from './pages/host/MyQuizzes';
import SessionQuiz from './pages/host/SessionQuiz';
import EditQuiz from './pages/host/EditQuiz';
import ActivityHistory from './pages/host/ActivityHistory';
import SessionHistoryDetail from './pages/host/SessionHistory';
import JoinQuiz from './pages/client/JoinQuiz';
import PlayQuiz from './pages/client/PlayQuiz';
import RoguelikeQuiz from './pages/client/RoguelikeQuiz';
import './index.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <QuizProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/help" element={<Help />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:postId" element={<BlogPost />} />
              
              {/* 호스트 라우트 */}
              <Route path="/host/create" element={<ProtectedRoute><CreateQuiz /></ProtectedRoute>} />
              <Route path="/host/my-quizzes" element={<ProtectedRoute><MyQuizzes /></ProtectedRoute>} />
              <Route path="/host/session/:quizId" element={<ProtectedRoute><SessionQuiz /></ProtectedRoute>} />
              <Route path="/host/edit/:quizId" element={<ProtectedRoute><EditQuiz /></ProtectedRoute>} />
              <Route path="/host/history" element={<ProtectedRoute><ActivityHistory /></ProtectedRoute>} />
              <Route path="/host/history/:historyId" element={<ProtectedRoute><SessionHistoryDetail /></ProtectedRoute>} />
              
              {/* 플레이어 라우트 */}
              <Route path="/join" element={<JoinQuiz />} />
              <Route path="/play/:quizId" element={<PlayQuiz />} />
              
              {/* 로그라이크 퀴즈 라우트 */}
              <Route path="/roguelike/:quizId" element={<ProtectedRoute><RoguelikeQuiz /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </SessionProvider>
        </QuizProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QuizProvider } from './contexts/QuizContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainPage from './pages/MainPage';
import CreateQuiz from './pages/host/CreateQuiz';
import ManageQuiz from './pages/host/ManageQuiz';
import MyQuizzes from './pages/host/MyQuizzes';
import JoinQuiz from './pages/client/JoinQuiz';
import WaitingRoom from './pages/client/WaitingRoom';
import PlayQuiz from './pages/client/PlayQuiz';
import Login from './pages/Login';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <QuizProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/host/create" 
                element={
                  <ProtectedRoute>
                    <CreateQuiz />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/host/manage/:quizId" 
                element={
                  <ProtectedRoute>
                    <ManageQuiz />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/host/my-quizzes" 
                element={
                  <ProtectedRoute>
                    <MyQuizzes />
                  </ProtectedRoute>
                } 
              />
              <Route path="/join" element={<JoinQuiz />} />
              <Route path="/waiting-room/:quizId" element={<WaitingRoom />} />
              <Route path="/play/:quizId" element={<PlayQuiz />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
      </QuizProvider>
    </AuthProvider>
  );
}

export default App;
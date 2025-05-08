import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QuizProvider } from './contexts/QuizContext';
import MainPage from './pages/MainPage';
import CreateQuiz from './pages/host/CreateQuiz';
import ManageQuiz from './pages/host/ManageQuiz';
import JoinQuiz from './pages/client/JoinQuiz';
import WaitingRoom from './pages/client/WaitingRoom';
import PlayQuiz from './pages/client/PlayQuiz';
import NotFound from './pages/NotFound';
import './index.css';

function App() {
  return (
    <QuizProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/host/create" element={<CreateQuiz />} />
            <Route path="/host/manage/:quizId" element={<ManageQuiz />} />
            <Route path="/join" element={<JoinQuiz />} />
            <Route path="/waiting-room/:quizId" element={<WaitingRoom />} />
            <Route path="/play/:quizId" element={<PlayQuiz />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </QuizProvider>
  );
}

export default App;
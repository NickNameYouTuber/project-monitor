import React, { useState, useEffect } from 'react'
import AuthScreen from './components/auth/AuthScreen'
import Header from './components/layout/Header'
import TeamMembers from './components/teams/TeamMembers'
import ProjectBoard from './components/project/ProjectBoard'
import ProjectModal from './components/modals/ProjectModal'
import MemberModal from './components/modals/MemberModal'
import { AppProvider, useAppContext } from './utils/AppContext'
import AppRouter from './router/AppRouter'
import './index.css'

// Main Content component (requires authentication)
const MainContent: React.FC = () => {
  const { projects } = useAppContext();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isMemberModalOpen, setMemberModalOpen] = useState(false);

  // Handlers for modals
  const openProjectModal = () => setProjectModalOpen(true);
  const closeProjectModal = () => setProjectModalOpen(false);
  const openMemberModal = () => setMemberModalOpen(true);
  const closeMemberModal = () => setMemberModalOpen(false);

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 transition-colors duration-300 py-8 px-4 md:px-8">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        {/* Header Component */}
        <Header onAddProject={openProjectModal} />
        
        {/* Team Members Component */}
        <TeamMembers onAddMember={openMemberModal} />
        
        {/* Project Board */}
        <ProjectBoard projects={projects} />

        {/* Modals */}
        <ProjectModal isOpen={isProjectModalOpen} onClose={closeProjectModal} />
        <MemberModal isOpen={isMemberModalOpen} onClose={closeMemberModal} />
      </div>
    </div>
  );
};

// App Root Component
function App() {
  // Setup Telegram Web App
  useEffect(() => {
    // Initialize Telegram Web App if it exists
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

// AppContent Component to use Context
const AppContent: React.FC = () => {
  const { currentUser } = useAppContext();
  
  // Font Awesome icons are loaded via CSS import in index.css
  useEffect(() => {
    // No dynamic script loading needed with local installation
  }, []);
  
  return (
    <>
      {currentUser ? <MainContent /> : <AuthScreen />}
    </>
  );
};

export default App

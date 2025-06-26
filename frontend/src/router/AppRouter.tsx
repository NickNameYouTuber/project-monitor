import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from '../utils/AppContext';
import AuthScreen from '../components/auth/AuthScreen';
import DashboardList from '../components/dashboards/DashboardList';
import DashboardDetail from '../components/dashboards/DashboardDetail';
import ProjectTaskBoard from '../components/projects/ProjectTaskBoard';
import Layout from '../components/layout/Layout';
import RepositoryList from '../components/repositories/RepositoryList';
import RepositoryCreate from '../components/repositories/RepositoryCreate';
import RepositoryDetail from '../pages/RepositoryDetail';

// Protected route component
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { currentUser } = useAppContext();
  return currentUser ? <>{element}</> : <Navigate to="/login" replace />;
};

const AppRouter: React.FC = () => {
  const { currentUser } = useAppContext();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/dashboards" replace /> : <AuthScreen />} 
        />

        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/dashboards" replace />} />
        <Route 
          path="/dashboards" 
          element={
            <ProtectedRoute 
              element={<Layout><DashboardList /></Layout>} 
            />
          } 
        />
        <Route 
          path="/dashboards/:dashboardId" 
          element={
            <ProtectedRoute 
              element={<Layout><DashboardDetail /></Layout>} 
            />
          } 
        />
        
        <Route 
          path="/projects/:projectId/tasks" 
          element={
            <ProtectedRoute 
              element={
                <Layout>
                  <ProjectTaskBoard />
                </Layout>
              } 
            />
          } 
        />

        {/* Git repositories routes */}
        <Route 
          path="/repositories" 
          element={
            <ProtectedRoute 
              element={
                <Layout>
                  <RepositoryList />
                </Layout>
              } 
            />
          } 
        />
        <Route 
          path="/repositories/create" 
          element={
            <ProtectedRoute 
              element={
                <Layout>
                  <RepositoryCreate />
                </Layout>
              } 
            />
          } 
        />
        <Route 
          path="/repositories/:repositoryId" 
          element={
            <ProtectedRoute 
              element={
                <Layout>
                  <RepositoryDetail />
                </Layout>
              } 
            />
          } 
        />
        <Route 
          path="/repositories/:repositoryId" 
          element={
            <ProtectedRoute 
              element={
                <Layout>
                  <RepositoryDetail />
                </Layout>
              } 
            />
          } 
        />

        {/* 404 route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

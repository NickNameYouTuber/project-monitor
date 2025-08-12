
import { Outlet } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import './App.css';

function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-shrink-0 h-14">
        <AppHeader />
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
}

export default App;

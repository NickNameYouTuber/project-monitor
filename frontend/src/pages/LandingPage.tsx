import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Добавляем класс к body для специальных стилей на главной странице
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#b2ebf2] to-[#80deea]">
      {/* Навигация */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/10 backdrop-blur-md">
        <div className="text-[#00796b] text-2xl font-bold">NIT</div>
        <div className="flex space-x-4">
          <Link to="/login" className="px-6 py-2 bg-[#009688] text-white rounded-md hover:bg-[#00897b] transition-colors">
            Войти
          </Link>
        </div>
      </nav>

      {/* Основной контент */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Заголовок с перечеркнутым Global и расшифровкой */}
        <div className="flex flex-col items-center justify-center mb-16 pt-8">
          <div className="relative inline-block mb-2">
            <span className="text-[#616161] text-3xl md:text-4xl relative opacity-70">
              <span className="line-through">Global</span>
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-center text-[#004d40]">
            <span className="text-[#00796b]">N</span>eural 
            <span className="text-[#00796b]">I</span>nformation 
            <span className="text-[#00796b]">T</span>racker
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-[#00695c] text-center max-w-3xl">
            Революционная платформа управления проектами и кодовой базой
          </p>
        </div>

        {/* Секция преимуществ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/30 backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-[#4db6ac] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#00695c] mb-2">Интеллектуальное отслеживание</h3>
            <p className="text-[#00796b]">
              Автоматизированное отслеживание изменений с использованием нейросетевых алгоритмов для более умного анализа кода.
            </p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-[#4db6ac] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#00695c] mb-2">Управление командой</h3>
            <p className="text-[#00796b]">
              Эффективная координация команды с прозрачным распределением задач и интуитивным управлением приоритетами.
            </p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <div className="w-16 h-16 bg-[#4db6ac] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#00695c] mb-2">Контроль версий</h3>
            <p className="text-[#00796b]">
              Полная поддержка веток и интегрированный просмотр изменений делает работу с репозиториями максимально удобной.
            </p>
          </div>
        </div>

        {/* Демонстрационный скриншот */}
        <div className="flex justify-center mb-20">
          <div className="relative w-full max-w-4xl">
            <div className="bg-[#004d40] p-2 rounded-t-lg">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="bg-[#263238] rounded-b-lg p-4 shadow-2xl">
              <div className="bg-[#37474f] rounded-lg p-4 h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[#4db6ac] text-2xl font-bold mb-4">NIT Dashboard</div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-[#455a64] h-16 rounded flex items-center justify-center">
                        <span className="text-[#b2dfdb]">Project {i}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#455a64] h-24 rounded flex items-center justify-center">
                    <span className="text-[#b2dfdb]">Repository Browser</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg">
              <span className="text-[#00695c] font-semibold">Интерфейс, который вдохновляет</span>
            </div>
          </div>
        </div>

        {/* Призыв к действию */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#004d40] mb-6">
            Готовы начать работу с NIT?
          </h2>
          <Link to="/login" className="inline-block px-8 py-3 bg-[#00897b] text-white rounded-full text-lg font-medium hover:bg-[#00796b] transition-colors shadow-lg hover:shadow-xl">
            Присоединиться сейчас
          </Link>
        </div>
      </main>

      {/* Подвал */}
      <footer className="bg-[#00695c] text-white py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-2xl font-bold">NIT</div>
              <div className="text-sm text-[#b2dfdb]">Neural Information Tracker</div>
            </div>
            <div className="text-sm text-[#b2dfdb]">
              &copy; {new Date().getFullYear()} NIT. Все права защищены.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

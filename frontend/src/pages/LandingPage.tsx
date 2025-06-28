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
          <div className="relative inline-block mb-2 text-center">
            <span className="text-[#616161] text-3xl md:text-4xl relative opacity-70 mb-2 block">
              <span className="line-through">Global</span>
            </span>
            <span className="text-[#004d40] text-5xl md:text-7xl font-bold leading-none">Neural</span>
            <span className="text-[#00796b] text-5xl md:text-7xl font-bold leading-none"> Information</span>
            <span className="text-[#26a69a] text-5xl md:text-7xl font-bold leading-none"> Tracker</span>
          </div>
          <div className="text-lg text-[#00695c] font-medium max-w-3xl mt-4">Управляйте проектами с помощью ИИ</div>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link to="/login" className="inline-block px-10 py-4 bg-gradient-to-r from-[#009688] to-[#00796b] text-white rounded-full text-lg font-medium hover:from-[#00897b] hover:to-[#00695c] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">Начать сейчас</Link>
            <button className="inline-block px-10 py-4 bg-transparent border-2 border-[#009688] text-[#009688] rounded-full text-lg font-medium hover:bg-[#009688]/10 transition-all duration-300">Узнать больше</button>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#4db6ac]/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#26a69a]/20 rounded-full blur-xl"></div>
        </div>

        {/* Секция преимуществ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/40 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4db6ac] to-[#26a69a] rounded-lg flex items-center justify-center mb-5 rotate-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#004d40] mb-3">Умное отслеживание</h3>
            <p className="text-[#00695c]/80 leading-relaxed">
              Используйте мощь искусственного интеллекта для анализа изменений в коде и предсказания потенциальных проблем еще до их возникновения.
            </p>
          </div>

          <div className="bg-white/40 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4db6ac] to-[#26a69a] rounded-lg flex items-center justify-center mb-5 rotate-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#004d40] mb-3">Командная синергия</h3>
            <p className="text-[#00695c]/80 leading-relaxed">
              Интуитивный интерфейс для распределения задач, отслеживания прогресса и общения команды в едином пространстве.
            </p>
          </div>

          <div className="bg-white/40 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4db6ac] to-[#26a69a] rounded-lg flex items-center justify-center mb-5 rotate-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#004d40] mb-3">Контроль версий 2.0</h3>
            <p className="text-[#00695c]/80 leading-relaxed">
              Улучшенная система ветвления с визуальным представлением изменений и автоматическим анализом конфликтов.
            </p>
          </div>
        </div>

        {/* Демонстрационный скриншот */}
        <div className="flex flex-col items-center mb-24 relative">
          <h3 className="text-2xl md:text-3xl font-bold text-[#004d40] mb-8 relative after:absolute after:content-[''] after:w-16 after:h-1 after:bg-[#4db6ac] after:-bottom-2 after:left-1/2 after:-translate-x-1/2">
            Взгляните на NIT в действии
          </h3>
          <div className="relative w-full max-w-5xl px-6">
            <div className="relative w-full rounded-t-2xl overflow-hidden bg-[#102027] p-3 z-10 flex items-center justify-between shadow-lg border-b border-[#37474f]">
              <div className="flex space-x-2 items-center pl-2">
                <div className="w-3 h-3 rounded-full bg-[#ff605c]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd44]"></div>
                <div className="w-3 h-3 rounded-full bg-[#00ca4e]"></div>
                <div className="text-[#78909c] text-xs pl-2">nit-dashboard@project-monitor</div>
              </div>
              <div className="text-[#78909c] text-xs bg-[#263238] px-3 py-1 rounded-full border border-[#37474f]">
                v0.9.3-beta
              </div>
            </div>
            <div className="bg-[#102027] rounded-b-2xl p-6 shadow-2xl overflow-hidden relative z-0 border border-[#37474f] border-t-0 pt-4">
              <div className="bg-gradient-to-br from-[#263238] to-[#1a262d] rounded-xl overflow-hidden relative border border-[#37474f] min-h-[400px] flex flex-col">
                <div className="flex border-b border-[#37474f] h-12 px-4 items-center justify-between flex-shrink-0 z-10 relative bg-[#1e2d36]/50">
                  <div className="text-[#b0bec5] font-medium text-sm flex space-x-4">
                    <span className="text-[#4db6ac]">Dashboard</span>
                    <span>Projects</span>
                    <span>Repositories</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#4db6ac] flex items-center justify-center text-white text-sm font-bold">N</div>
                </div>
                <div className="flex flex-grow relative z-0 overflow-hidden">
                  <div className="w-48 bg-[#1a262d] border-r border-[#37474f] p-3 flex flex-col flex-shrink-0 z-10 relative">
                    <div className="mb-3 text-[#b0bec5] text-xs font-medium uppercase tracking-wide pb-1 border-b border-[#37474f]">Active Projects</div>
                    <div className="space-y-2 mb-4">
                      <div className="px-2 py-1 bg-[#4db6ac]/20 rounded text-[#b0bec5] text-sm flex items-center gap-2 border-l-2 border-[#4db6ac]">
                        <div className="w-4 h-4 bg-[#4db6ac] rounded-full"></div>
                        <span>Core Engine</span>
                      </div>
                      <div className="px-2 py-1 hover:bg-[#263238] rounded text-[#b0bec5] text-sm flex items-center gap-2 transition-colors duration-200 border-l-2 border-transparent cursor-pointer">
                        <div className="w-4 h-4 bg-[#78909c] rounded-full"></div>
                        <span>UI Framework</span>
                      </div>
                      <div className="px-2 py-1 hover:bg-[#263238] rounded text-[#b0bec5] text-sm flex items-center gap-2 transition-colors duration-200 border-l-2 border-transparent cursor-pointer">
                        <div className="w-4 h-4 bg-[#78909c] rounded-full"></div>
                        <span>API Layer</span>
                      </div>
                    </div>
                    <div className="mb-3 text-[#b0bec5] text-xs font-medium uppercase tracking-wide pb-1 border-b border-[#37474f]">Repositories</div>
                    <div className="space-y-2">
                      <div className="px-2 py-1 hover:bg-[#263238] rounded text-[#b0bec5] text-sm flex items-center gap-2 transition-colors duration-200 border-l-2 border-transparent cursor-pointer">
                        <svg className="w-4 h-4 text-[#78909c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>frontend</span>
                      </div>
                      <div className="px-2 py-1 hover:bg-[#263238] rounded text-[#b0bec5] text-sm flex items-center gap-2 transition-colors duration-200 border-l-2 border-transparent cursor-pointer">
                        <svg className="w-4 h-4 text-[#78909c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span>backend</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col relative z-0 overflow-hidden bg-[#1e2d36]/30 border-l border-[#2d3f49]">
                    <div className="p-5 flex-grow relative z-0 overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-[#263238]/80 border border-[#37474f] rounded-lg p-4 h-32 flex flex-col justify-between overflow-hidden relative z-0 group hover:border-[#4db6ac]/50 transition-colors duration-200 cursor-pointer">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[#b0bec5] font-medium">Project {i}</span>
                              <span className="text-[#4db6ac] text-xs px-2 py-0.5 bg-[#4db6ac]/10 rounded-full border border-[#4db6ac]/20">Active</span>
                            </div>
                            <p className="text-[#78909c] text-xs mb-3 line-clamp-2">Short description of project {i} goes here with some details.</p>
                            <div className="flex items-center justify-between text-[#78909c] text-xs pt-1 border-t border-[#37474f]/50 group-hover:text-[#4db6ac] transition-colors duration-200">
                              <span>Updated 3h ago</span>
                              <span>5 tasks</span>
                            </div>
                            <div className="absolute -right-6 -top-6 w-12 h-12 bg-[#4db6ac]/5 rounded-full"></div>
                            <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#4db6ac]/10 rounded-full"></div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#263238]/80 border border-[#37474f] rounded-lg p-4 flex flex-col overflow-hidden relative z-0 h-56 group hover:border-[#4db6ac]/50 transition-colors duration-200 cursor-pointer mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[#b0bec5] font-medium">Repository: frontend</span>
                          <span className="text-[#4db6ac] text-xs px-2 py-0.5 bg-[#4db6ac]/10 rounded-full border border-[#4db6ac]/20">master</span>
                        </div>
                        <div className="flex-grow overflow-hidden text-[#78909c] text-sm font-mono mb-3 line-clamp-5">
                          <span className="text-[#4db6ac]">src/components/RepositoryFileExplorer.tsx</span><br />
                          <span className="pl-4 text-[#b0bec5]">const RepositoryFileExplorer: React.FC = (/* props */);</span><br />
                          <span className="pl-8 text-[#b0bec5]">const [path, setPath] = useState&lt;string&gt;("");</span><br />
                          <span className="pl-8 text-[#b0bec5]">const [files, setFiles] = useState&lt;GitFile[]&gt;([]);</span><br />
                          <span className="pl-8 text-[#b0bec5]">const [loading, setLoading] = useState&lt;boolean&gt;(true);</span><br />
                        </div>
                        <div className="flex items-center justify-between text-[#78909c] text-xs pt-1 border-t border-[#37474f]/50 group-hover:text-[#4db6ac] transition-colors duration-200">
                          <span>Last commit: Update styling</span>
                          <span>2h ago</span>
                        </div>
                        <div className="absolute -right-6 -top-6 w-12 h-12 bg-[#4db6ac]/5 rounded-full"></div>
                        <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#4db6ac]/10 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg px-8 py-4 rounded-full shadow-xl border border-white/30 max-w-md w-full mx-4 text-center z-20">
              <span className="text-[#00695c] font-semibold text-lg">Интерфейс, созданный для продуктивности</span>
            </div>
          </div>
        </div>

        {/* Призыв к действию */}
        <div className="text-center mb-16 bg-gradient-to-b from-transparent to-white/10 py-12 px-4 rounded-3xl relative overflow-hidden border border-white/10">
          <h2 className="text-3xl md:text-5xl font-bold text-[#004d40] mb-6 tracking-tight leading-tight max-w-3xl mx-auto">
            Перейдите на новый уровень управления проектами с NIT
          </h2>
          <p className="text-lg md:text-xl text-[#00695c]/80 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к лидерам индустрии, использующим искусственный интеллект для повышения продуктивности.
          </p>
          <Link to="/login" className="inline-block px-10 py-4 bg-gradient-to-r from-[#009688] to-[#00796b] text-white rounded-full text-lg font-medium hover:from-[#00897b] hover:to-[#00695c] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
            Начать прямо сейчас
          </Link>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
        </div>
      </main>

      {/* Подвал */}
      <footer className="bg-[#004d40] text-white py-12 relative overflow-hidden border-t border-[#00796b]/30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#00695c]/20 to-[#00796b]/20"></div>
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="mb-6 md:mb-0 flex items-center">
              <div className="text-3xl font-bold text-[#b2dfdb] mr-3">NIT</div>
              <div className="text-sm text-[#b2dfdb]/70 font-medium uppercase tracking-wider">Neural Information Tracker</div>
            </div>
            <div className="flex space-x-6 text-[#b2dfdb] text-sm">
              <span className="hover:text-white transition-colors duration-200 cursor-pointer">О нас</span>
              <span className="hover:text-white transition-colors duration-200 cursor-pointer">Функции</span>
              <span className="hover:text-white transition-colors duration-200 cursor-pointer">Контакты</span>
            </div>
          </div>
          <div className="border-t border-[#00796b]/30 pt-6 text-center text-[#b2dfdb]/60 text-xs">
            <p>&copy; {new Date().getFullYear()} NIT. Все права защищены.</p>
            <p className="mt-1">Создано с использованием передовых технологий для разработчиков будущего.</p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#00796b]/10 rounded-full blur-3xl -mb-24 -mr-24"></div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-[#00796b]/10 rounded-full blur-3xl -mt-24 -ml-24"></div>
      </footer>
    </div>
  );
};

export default LandingPage;

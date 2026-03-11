import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Trophy, CalendarDays, Network, 
  ShieldCheck, Menu, X, Plus, Save, Edit2, Trash2, 
  LogOut, Users, ChevronRight, Home, Info, AlertTriangle, Activity
} from 'lucide-react';

// ==========================================
// KONFIGURASI DATABASE & AUTH
// ==========================================
// PASTE URL DEPLOYMENT BARU ANDA DI BAWAH INI
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycby2j-8_cwfhQqg-0bv-Xhh8oIrDMeLVH0eB1qzwb9ilSmY6ckfTLMiH6NTEBArig4yf/exec"; 
const ADMIN_PIN = "2026";

// --- DATA DUMMY ---
const DUMMY_TEAMS = [
  { id: 't1', name: 'RW 01 (Elang)', group: 'A' },
  { id: 't2', name: 'RW 02 (Garuda)', group: 'A' },
  { id: 't3', name: 'RW 03 (Rajawali)', group: 'B' },
  { id: 't4', name: 'RW 04 (Merpati)', group: 'B' },
];

const DUMMY_MATCHES = [
  { id: 'm1', date: '2026-03-10', time: '15:30', team1Id: 't1', team2Id: 't2', score1: 3, score2: 1, status: 'completed', type: 'group' },
  { id: 'm2', date: '2026-03-11', time: '15:30', team1Id: 't3', team2Id: 't4', score1: 0, score2: 3, status: 'completed', type: 'group' },
  { id: 'm3', date: '2026-03-15', time: '15:30', team1Id: 't1', team2Id: 't4', score1: 0, score2: 0, status: 'scheduled', type: 'semifinal' },
  { id: 'm4', date: '2026-03-16', time: '15:30', team1Id: 't2', team2Id: 't3', score1: 0, score2: 0, status: 'scheduled', type: 'semifinal' },
  { id: 'm5', date: '2026-03-20', time: '15:30', team1Id: '', team2Id: '', score1: 0, score2: 0, status: 'scheduled', type: 'final' },
];

// ==========================================
// MODAL KONFIRMASI MODERN
// ==========================================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4 transition-opacity duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl p-8 w-full max-w-sm transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-5">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 leading-relaxed mb-8">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/30">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ROOT COMPONENT (STATE MANAGER)
// ==========================================
export default function App() {
  const [appMode, setAppMode] = useState('public');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [teams, setTeams] = useState(DUMMY_TEAMS);
  const [matches, setMatches] = useState(DUMMY_MATCHES);

  useEffect(() => {
    if (GOOGLE_SHEETS_API_URL) fetchDataFromSheets();
  }, []);

  const fetchDataFromSheets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL);
      const data = await response.json();
      if (data.teams) setTeams(data.teams);
      if (data.matches) setMatches(data.matches);
    } catch (error) {
      console.error("Gagal mengambil data dari sheets", error);
    } finally {
      setIsLoading(false);
    }
  };

  // SISTEM API BARU (ACTION-BASED)
  const syncDataToSheets = async (action, payload) => {
    if (!GOOGLE_SHEETS_API_URL) return;
    try {
      const formData = new URLSearchParams();
      formData.append('action', action);
      formData.append('payload', JSON.stringify(payload));

      await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        body: formData
      });
    } catch (error) {
      console.error("Gagal koneksi ke sheets:", error);
      alert("Terjadi kesalahan jaringan saat menyimpan ke server.");
    }
  };

  const standings = useMemo(() => {
    let table = teams.map(team => ({
      ...team, played: 0, won: 0, lost: 0, points: 0, setsWon: 0, setsLost: 0
    }));

    matches.filter(m => m.status === 'completed' && m.type === 'group').forEach(m => {
      const t1 = table.find(t => t.id === m.team1Id);
      const t2 = table.find(t => t.id === m.team2Id);
      if (t1 && t2) {
        t1.played++; t2.played++;
        t1.setsWon += parseInt(m.score1) || 0; t1.setsLost += parseInt(m.score2) || 0;
        t2.setsWon += parseInt(m.score2) || 0; t2.setsLost += parseInt(m.score1) || 0;
        if (m.score1 > m.score2) { t1.won++; t1.points += 3; t2.lost++; }
        else if (m.score1 < m.score2) { t2.won++; t2.points += 3; t1.lost++; }
      }
    });

    return table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
    });
  }, [teams, matches]);

  const handleAdminLoginClick = () => {
    setShowLoginModal(true);
    setPinInput('');
    setLoginError('');
  };

  const submitLogin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setAppMode('admin');
      setShowLoginModal(false);
    } else {
      setLoginError('PIN tidak valid. Coba lagi.');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setAppMode('public');
  };

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || 'TBD';

  const sharedProps = { 
    teams, matches, standings, getTeamName, 
    handleAdminLoginClick, handleLogout, setTeams, setMatches,
    syncDataToSheets
  };

  return (
    <div className="font-sans antialiased text-slate-800 bg-[#F8FAFC] min-h-screen selection:bg-indigo-500 selection:text-white">
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center text-indigo-600 mb-8">
              <div className="bg-indigo-50 p-3 rounded-2xl mr-4"><ShieldCheck size={28} /></div>
              <div><h3 className="text-xl font-extrabold text-slate-800">Akses Panitia</h3><p className="text-sm text-slate-500 font-medium">Verifikasi identitas Anda</p></div>
            </div>
            <form onSubmit={submitLogin}>
              <div className="mb-8">
                <input
                  type="password" autoFocus placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-2xl tracking-[0.5em] text-center font-bold focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                />
                {loginError && <p className="text-red-500 text-sm mt-3 font-semibold flex items-center justify-center"><AlertTriangle size={16} className="mr-1"/> {loginError}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-3.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30">Masuk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {appMode === 'public' ? <PublicLayout {...sharedProps} /> : <AdminLayout {...sharedProps} />}
    </div>
  );
}

// ==========================================
// PUBLIC LAYOUT
// ==========================================
function PublicLayout({ teams, matches, standings, getTeamName, handleAdminLoginClick }) {
  const [activeTab, setActiveTab] = useState('beranda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'klasemen', label: 'Klasemen', icon: Trophy },
    { id: 'jadwal', label: 'Jadwal & Hasil', icon: CalendarDays },
    { id: 'bagan', label: 'Bagan Liga', icon: Network },
  ];

  const nextMatch = matches.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center group cursor-pointer" onClick={() => setActiveTab('beranda')}>
              <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2 rounded-xl mr-3 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform"><Trophy size={24} /></div>
              <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight hidden sm:block">VOLLEY<span className="text-indigo-600">DUSUN</span></span>
              <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight sm:hidden">VOLLEY<span className="text-indigo-600">DUSUN</span></span>
            </div>
            
            <nav className="hidden md:flex space-x-2 items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center space-x-1.5 font-bold text-sm px-5 py-2.5 rounded-xl transition-all ${activeTab === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
                  <item.icon size={16} /><span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="hidden md:block pl-4">
              <button onClick={handleAdminLoginClick} className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-xl transition-colors"><ShieldCheck size={18} className="mr-2" /> Admin</button>
            </div>

            <div className="flex items-center md:hidden space-x-3">
              <button onClick={handleAdminLoginClick} className="text-indigo-600 bg-indigo-50 p-2.5 rounded-xl"><ShieldCheck size={20} /></button>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-700 bg-slate-100 p-2.5 rounded-xl">{isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/50 absolute w-full left-0 z-50 p-4 shadow-2xl rounded-b-3xl">
            <div className="space-y-2">
              {navItems.map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl text-base font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <item.icon size={20} /><span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {activeTab === 'beranda' && (
        <div className="relative overflow-hidden bg-[#0B1120] text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen"></div>
            <div className="absolute bottom-[0%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] mix-blend-screen"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="w-full lg:w-3/5 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-full px-4 py-1.5 mb-8">
                <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                <span className="text-sm font-semibold text-slate-300 tracking-wide uppercase">Musim 2026 Sedang Berjalan</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-white">
                Dukung Tim <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Kebanggaan Anda</span>
              </h1>
              <p className="text-slate-400 text-lg lg:text-xl mb-10 max-w-2xl mx-auto lg:mx-0 font-medium">Saksikan aksi memukau dari tim-tim terbaik dusun. Pantau jadwal, hasil laga, dan klasemen terkini secara real-time.</p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <button onClick={() => setActiveTab('jadwal')} className="bg-white text-slate-900 font-extrabold px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all flex items-center justify-center">Lihat Jadwal Lengkap <ChevronRight size={20} className="ml-2" /></button>
                <button onClick={() => setActiveTab('klasemen')} className="bg-slate-800/50 backdrop-blur-md border border-slate-700 text-white font-bold px-8 py-4 rounded-2xl hover:bg-slate-700/50 transition-all flex items-center justify-center">Cek Klasemen Poin</button>
              </div>
            </div>
            
            <div className="w-full lg:w-2/5">
              {nextMatch ? (
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <div className="flex items-center justify-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-8"><Activity size={14} className="animate-pulse" /> <span>Laga Terdekat</span></div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 text-center"><div className="text-2xl font-black text-white truncate px-2">{getTeamName(nextMatch.team1Id)}</div></div>
                    <div className="px-4 text-slate-500 font-black text-2xl italic">VS</div>
                    <div className="flex-1 text-center"><div className="text-2xl font-black text-white truncate px-2">{getTeamName(nextMatch.team2Id)}</div></div>
                  </div>
                  <div className="mt-8 bg-slate-900/50 rounded-2xl p-4 text-center border border-slate-700/50">
                    <div className="text-white font-bold text-lg mb-1">{new Date(nextMatch.date).toLocaleDateString('id-ID', { weekday:'long', day: 'numeric', month: 'long' })}</div>
                    <div className="text-indigo-400 font-semibold flex justify-center items-center"><CalendarDays size={16} className="mr-2"/> Pukul {nextMatch.time} WIB</div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-[32px] p-10 text-center shadow-2xl">
                  <div className="bg-indigo-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy className="text-indigo-400" size={32} /></div>
                  <h3 className="font-extrabold text-2xl text-white mb-2">Turnamen Selesai / Menunggu Laga</h3>
                  <p className="text-slate-400 font-medium">Cek menu lain untuk melihat hasil lengkap.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-20">
        {activeTab === 'beranda' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 h-full">
                <div className="flex items-center mb-8"><div className="bg-blue-50 p-3 rounded-2xl mr-4"><Info className="text-blue-600" size={24}/></div><h2 className="text-2xl font-extrabold text-slate-800">Statistik Turnamen</h2></div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors"><div className="text-slate-500 font-bold mb-2 uppercase tracking-wide text-xs">Total Tim Terdaftar</div><div className="text-5xl font-black text-slate-800">{teams.length}</div></div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-colors"><div className="text-slate-500 font-bold mb-2 uppercase tracking-wide text-xs">Laga Selesai</div><div className="text-5xl font-black text-slate-800">{matches.filter(m => m.status === 'completed').length}</div></div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between"><h3 className="font-extrabold text-lg text-slate-800">Top 3 Klasemen</h3><Trophy className="text-yellow-500" size={20} /></div>
                <div className="flex-1 p-2">
                  {standings.slice(0, 3).map((team, idx) => (
                    <div key={team.id} className="p-4 flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-colors mb-2">
                      <div className="flex items-center space-x-4"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{idx + 1}</div><span className="font-extrabold text-slate-700">{team.name}</span></div>
                      <div className="font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">{team.points} <span className="text-xs font-bold opacity-50">Pts</span></div>
                    </div>
                  ))}
                  {standings.length === 0 && <div className="p-8 text-center text-slate-400 font-medium">Data belum tersedia</div>}
                </div>
                <div className="p-4 border-t border-slate-100"><button onClick={() => setActiveTab('klasemen')} className="w-full py-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">Lihat Lengkap &rarr;</button></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'klasemen' && <KlasemenView standings={standings} />}
        {activeTab === 'jadwal' && <JadwalView matches={matches} getTeamName={getTeamName} />}
        {activeTab === 'bagan' && <BaganView matches={matches} getTeamName={getTeamName} />}
      </main>
      <footer className="bg-white border-t border-slate-200 mt-auto"><div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm font-medium text-slate-500">Dibuat untuk Liga Volley Dusun &copy; {new Date().getFullYear()}</div></footer>
    </div>
  );
}

// ==========================================
// ADMIN LAYOUT
// ==========================================
function AdminLayout({ teams, matches, standings, getTeamName, handleLogout, setTeams, setMatches, syncDataToSheets }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button onClick={() => { setActiveTab(id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={20} className="shrink-0" /><span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:relative z-40 h-[calc(100vh-2rem)] my-4 ml-4 rounded-[32px] bg-[#0A0F1C] text-white shrink-0 shadow-2xl transition-all duration-300 ease-out ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-[120%] lg:w-0 lg:hidden'}`}>
        <div className="w-72 h-full flex flex-col overflow-hidden">
          <div className="h-24 flex items-center px-8 shrink-0"><div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-indigo-500/30"><ShieldCheck className="text-white" size={20} /></div><span className="text-xl font-extrabold tracking-tight">Panitia<span className="text-indigo-400">Hub</span></span></div>
          <div className="px-4 pb-6 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold mb-3 mt-4 px-4">Menu Utama</div>
            <SidebarItem icon={LayoutDashboard} label="Ringkasan" id="dashboard" /><SidebarItem icon={Users} label="Kelola Tim" id="admin-tim" /><SidebarItem icon={CalendarDays} label="Kelola Laga" id="admin-jadwal" />
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold mb-3 mt-8 px-4">Tampilan Publik</div>
            <SidebarItem icon={Trophy} label="Klasemen" id="klasemen" /><SidebarItem icon={Network} label="Bagan Liga" id="bagan" />
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="h-24 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:bg-white p-3 rounded-2xl shadow-sm mr-4 lg:hidden"><Menu size={20} /></button><h2 className="text-3xl font-extrabold text-slate-800 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2></div>
          <button onClick={handleLogout} className="flex items-center text-sm font-bold text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 px-5 py-3 rounded-2xl shadow-sm transition-all border border-slate-200"><LogOut size={18} className="md:mr-2" /> <span className="hidden md:inline">Tutup Sesi</span></button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-8 pb-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl">
               <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[32px] p-8 md:p-10 shadow-xl shadow-indigo-200">
                 <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20"><ShieldCheck size={250} /></div>
                 <div className="relative z-10"><h3 className="text-3xl font-extrabold mb-2">Halo, Panitia! 👋</h3><p className="text-indigo-100 text-lg font-medium max-w-xl">Semua perubahan data pada panel ini akan disinkronisasikan ke Google Sheets dan terlihat oleh warga.</p></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6"><Users size={28}/></div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wide text-xs">Total Tim Terdaftar</div>
                    <div className="text-5xl font-black text-slate-800 mb-6">{teams.length}</div>
                    <button onClick={() => setActiveTab('admin-tim')} className="text-sm bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 w-full text-center transition-colors">Kelola Tim &rarr;</button>
                  </div>
                  <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6"><CalendarDays size={28}/></div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wide text-xs">Total Laga Dijadwalkan</div>
                    <div className="flex items-baseline space-x-2 mb-6"><span className="text-5xl font-black text-slate-800">{matches.length}</span><span className="text-sm font-bold text-slate-400">({matches.filter(m => m.status === 'completed').length} Selesai)</span></div>
                    <button onClick={() => setActiveTab('admin-jadwal')} className="text-sm bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 w-full text-center transition-colors">Perbarui Hasil &rarr;</button>
                  </div>
               </div>
            </div>
          )}
          {activeTab === 'admin-tim' && <AdminTimPanel teams={teams} setTeams={setTeams} syncDataToSheets={syncDataToSheets} />}
          {activeTab === 'admin-jadwal' && <AdminJadwalPanel teams={teams} matches={matches} setMatches={setMatches} syncDataToSheets={syncDataToSheets} />}
          {activeTab === 'klasemen' && <KlasemenView standings={standings} />}
          {activeTab === 'bagan' && <BaganView matches={matches} getTeamName={getTeamName} />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// VIEWS PUBLIK
// ==========================================
function KlasemenView({ standings }) {
  return (
    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex items-center"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mr-4"><Trophy size={24}/></div><h3 className="text-2xl font-extrabold text-slate-800">Klasemen Sementara</h3></div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-widest font-extrabold">
              <th className="p-4 text-center w-16">Pos</th><th className="p-4">Klub / Tim</th><th className="p-4 text-center">Main</th><th className="p-4 text-center">W</th><th className="p-4 text-center">L</th><th className="p-4 text-center">SW</th><th className="p-4 text-center">SL</th><th className="p-4 text-center text-indigo-600">Poin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {standings.map((team, idx) => (
              <tr key={team.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="p-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}>{idx + 1}</span></td>
                <td className="p-4 font-extrabold text-slate-800 text-lg">{team.name}</td>
                <td className="p-4 text-center font-bold text-slate-500">{team.played}</td><td className="p-4 text-center font-bold text-emerald-500">{team.won}</td><td className="p-4 text-center font-bold text-rose-500">{team.lost}</td>
                <td className="p-4 text-center font-bold text-slate-500">{team.setsWon}</td><td className="p-4 text-center font-bold text-slate-500">{team.setsLost}</td>
                <td className="p-4 text-center"><span className="font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-lg group-hover:bg-indigo-100 transition-colors">{team.points}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JadwalView({ matches, getTeamName }) {
  const sortedMatches = [...matches].sort((a,b) => new Date(a.date) - new Date(b.date));
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {sortedMatches.map(match => (
        <div key={match.id} className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-2 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow group">
          <div className="bg-slate-50 rounded-xl md:w-48 p-4 flex flex-col justify-center items-center">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-3 py-1 rounded-full mb-2">{match.type}</span>
            <span className="text-2xl font-black text-slate-800">{new Date(match.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</span>
            <span className="text-sm font-bold text-slate-500">{match.time} WIB</span>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-right font-extrabold text-xl text-slate-800 truncate pr-6">{getTeamName(match.team1Id)}</div>
              <div className="shrink-0 flex flex-col items-center">
                {match.status === 'completed' ? (
                  <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-black text-3xl tracking-widest min-w-[120px] text-center shadow-lg">{match.score1} <span className="text-slate-500 font-normal mx-1">-</span> {match.score2}</div>
                ) : (<div className="bg-slate-100 text-slate-400 px-6 py-2 rounded-2xl font-black text-xl tracking-widest min-w-[120px] text-center border border-slate-200">VS</div>)}
              </div>
              <div className="flex-1 text-left font-extrabold text-xl text-slate-800 truncate pl-6">{getTeamName(match.team2Id)}</div>
            </div>
          </div>
          <div className="p-4 flex items-center justify-center md:w-32 border-t md:border-t-0 border-slate-100">
             {match.status === 'completed' ? <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold uppercase tracking-widest w-full text-center">Selesai</span> : <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold uppercase tracking-widest w-full text-center">Nanti</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BaganView({ matches, getTeamName }) {
  return (
    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 overflow-x-auto">
      <div className="flex items-center justify-center mb-12 sticky left-0"><div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl mr-4"><Network size={24}/></div><h3 className="text-2xl font-extrabold text-slate-800">Fase Gugur (Bracket)</h3></div>
      <div className="flex justify-center min-w-[800px] py-4">
        {/* Semifinals */}
        <div className="flex flex-col justify-around w-72 space-y-16">
          {matches.filter(m => m.type === 'semifinal').map((match, idx) => (
            <div key={match.id} className="relative group">
              <div className="border border-slate-200 rounded-[20px] shadow-sm bg-white overflow-hidden relative z-10 hover:border-indigo-300 transition-colors hover:shadow-md">
                <div className="bg-slate-50 text-[10px] text-center py-2 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100">Semifinal {idx + 1}</div>
                <div className={`flex justify-between items-center px-5 py-4 border-b border-slate-50 ${match.score1 > match.score2 && match.status === 'completed' ? 'bg-emerald-50/50' : ''}`}>
                  <span className={`truncate font-bold ${match.score1 > match.score2 && match.status === 'completed' ? 'text-slate-900' : 'text-slate-600'}`}>{getTeamName(match.team1Id)}</span><span className="font-black text-lg">{match.status === 'completed' ? match.score1 : ''}</span>
                </div>
                <div className={`flex justify-between items-center px-5 py-4 ${match.score2 > match.score1 && match.status === 'completed' ? 'bg-emerald-50/50' : ''}`}>
                  <span className={`truncate font-bold ${match.score2 > match.score1 && match.status === 'completed' ? 'text-slate-900' : 'text-slate-600'}`}>{getTeamName(match.team2Id)}</span><span className="font-black text-lg">{match.status === 'completed' ? match.score2 : ''}</span>
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 w-8 border-t-2 border-slate-200"></div><div className={`absolute -right-8 w-0.5 border-r-2 border-slate-200 ${idx === 0 ? 'top-1/2 h-full' : 'bottom-1/2 h-full'}`}></div>
            </div>
          ))}
        </div>
        {/* Final */}
        <div className="flex flex-col justify-center w-80 ml-8 relative">
          <div className="absolute top-1/2 -left-8 w-8 border-t-2 border-slate-200 z-0"></div>
          {matches.filter(m => m.type === 'final').map(match => (
            <div key={match.id} className="rounded-[24px] shadow-xl bg-white overflow-hidden relative z-10 border-[3px] border-amber-400 p-1">
              <div className="rounded-[18px] overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-[11px] text-center py-3 text-white font-black uppercase tracking-[0.2em] shadow-inner">Grand Final</div>
                <div className={`flex justify-between items-center px-6 py-5 border-b border-slate-50 ${match.score1 > match.score2 && match.status === 'completed' ? 'bg-amber-50/50' : ''}`}><span className="truncate font-extrabold text-slate-800 text-lg">{getTeamName(match.team1Id)}</span><span className="font-black text-2xl text-slate-900">{match.status === 'completed' ? match.score1 : ''}</span></div>
                <div className={`flex justify-between items-center px-6 py-5 ${match.score2 > match.score1 && match.status === 'completed' ? 'bg-amber-50/50' : ''}`}><span className="truncate font-extrabold text-slate-800 text-lg">{getTeamName(match.team2Id)}</span><span className="font-black text-2xl text-slate-900">{match.status === 'completed' ? match.score2 : ''}</span></div>
              </div>
            </div>
          ))}
        </div>
        {/* Pemenang */}
        <div className="flex flex-col justify-center ml-8 relative">
            <div className="absolute top-1/2 -left-8 w-8 border-t-2 border-slate-200 z-0"></div>
            {matches.filter(m => m.type === 'final').map(match => {
              let winnerName = "?";
              if(match.status === 'completed') winnerName = match.score1 > match.score2 ? getTeamName(match.team1Id) : getTeamName(match.team2Id);
              return (
                <div key="winner" className="text-center z-10 bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-50"></div>
                  <div className="relative z-10"><div className="w-20 h-20 bg-gradient-to-tr from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30"><Trophy className="text-white" size={40} /></div><div className="font-black text-[10px] text-slate-400 tracking-[0.3em] uppercase mb-2">Champion 2026</div><div className="text-slate-800 font-extrabold text-2xl truncate max-w-[200px]">{winnerName}</div></div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN CRUD ADMIN (MENGGUNAKAN ACTION)
// ==========================================
function AdminTimPanel({ teams, setTeams, syncDataToSheets }) {
  const [newTeam, setNewTeam] = useState('');
  const [newGroup, setNewGroup] = useState('A');
  const [deleteId, setDeleteId] = useState(null);

  const handleAddTeam = (e) => {
    e.preventDefault();
    if(!newTeam) return;
    const newObj = { id: 't' + Date.now(), name: newTeam, group: newGroup };
    setTeams([...teams, newObj]);
    syncDataToSheets('ADD_TEAM', newObj); // Panggil Action ADD
    setNewTeam('');
  };

  const confirmDelete = () => {
    setTeams(teams.filter(t => t.id !== deleteId));
    syncDataToSheets('DELETE_TEAM', { id: deleteId }); // Panggil Action DELETE
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Hapus Tim" message="Yakin menghapus tim ini dari turnamen?" />
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center"><div className="bg-indigo-50 p-2 rounded-xl mr-3"><Plus className="text-indigo-600"/></div> Tambah Tim Baru</h3>
        <form onSubmit={handleAddTeam} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Tim / RW</label><input type="text" required value={newTeam} onChange={e => setNewTeam(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="Cth: RW 05" /></div>
          <div className="w-full md:w-48"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Grup</label><select value={newGroup} onChange={e => setNewGroup(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 cursor-pointer"><option value="A">Grup A</option><option value="B">Grup B</option></select></div>
          <button type="submit" className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl hover:bg-indigo-600 font-bold transition-colors shadow-lg shadow-slate-900/20 hover:shadow-indigo-600/30">Simpan</button>
        </form>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50"><h3 className="font-extrabold text-xl text-slate-800">Daftar Tim Terdaftar</h3></div>
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[500px]">
            <thead className="text-left text-[10px] text-slate-400 font-black uppercase tracking-widest"><tr><th className="p-4">Nama Tim</th><th className="p-4 w-32">Grup</th><th className="p-4 text-right w-24">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {teams.map(team => (
                <tr key={team.id} className="hover:bg-slate-50 rounded-2xl transition-colors"><td className="p-4 font-extrabold text-slate-800 text-lg">{team.name}</td><td className="p-4"><span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-xs font-black tracking-widest">GRUP {team.group}</span></td><td className="p-4 text-right"><button onClick={() => setDeleteId(team.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors"><Trash2 size={20} /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdminJadwalPanel({ teams, matches, setMatches, syncDataToSheets }) {
  const [formData, setFormData] = useState({ date: '', time: '15:30', team1Id: '', team2Id: '', type: 'group' });
  const [editingId, setEditingId] = useState(null);
  const [editScore, setEditScore] = useState({score1: '', score2: ''});
  const [deleteId, setDeleteId] = useState(null);

  const handleAddMatch = (e) => {
    e.preventDefault();
    const newObj = { id: 'm' + Date.now(), ...formData, score1: 0, score2: 0, status: 'scheduled' };
    setMatches([...matches, newObj]);
    syncDataToSheets('ADD_MATCH', newObj); // Panggil Action ADD
  };

  const confirmDelete = () => {
    setMatches(matches.filter(m => m.id !== deleteId));
    syncDataToSheets('DELETE_MATCH', { id: deleteId }); // Panggil Action DELETE
    setDeleteId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} title="Hapus Jadwal" message="Hapus jadwal ini beserta skornya?" />
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center"><div className="bg-indigo-50 p-2 rounded-xl mr-3"><CalendarDays className="text-indigo-600"/></div> Buat Jadwal Baru</h3>
        <form onSubmit={handleAddMatch} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Waktu</label><div className="flex gap-2"><input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold text-slate-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/><input type="time" required className="w-28 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold text-slate-700" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/></div></div>
          <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Fase</label><select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold text-slate-700" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="group">Grup</option><option value="semifinal">Semifinal</option><option value="final">Final</option></select></div>
          <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tim A</label><select required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold text-slate-700" value={formData.team1Id} onChange={e => setFormData({...formData, team1Id: e.target.value})}><option value="">Pilih...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tim B</label><select required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-indigo-500/20 outline-none font-bold text-slate-700" value={formData.team2Id} onChange={e => setFormData({...formData, team2Id: e.target.value})}><option value="">Pilih...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div className="md:col-span-1"><button type="submit" className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-2xl hover:bg-indigo-600 font-bold transition-colors shadow-lg">Tambah</button></div>
        </form>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50"><h3 className="font-extrabold text-xl text-slate-800">Manajemen Hasil Pertandingan</h3></div>
        <div className="divide-y divide-slate-50 p-4 overflow-x-auto">
          {matches.map(match => (
            <div key={match.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 rounded-2xl min-w-[700px] transition-colors group">
               <div className="flex-1 mb-2 md:mb-0 w-full flex items-center">
                  <div className="w-32"><div className="text-[10px] font-black text-indigo-500 mb-1 uppercase tracking-widest">{match.type}</div><div className="text-sm font-bold text-slate-500">{match.date}</div></div>
                  <div className="font-extrabold text-slate-800 text-xl ml-4">{teams.find(t=>t.id===match.team1Id)?.name || 'TBD'} <span className="text-slate-300 font-normal mx-3 italic">vs</span> {teams.find(t=>t.id===match.team2Id)?.name || 'TBD'}</div>
               </div>
               
               {editingId === match.id ? (
                 <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded-2xl shrink-0">
                    <input type="number" min="0" max="3" className="w-16 bg-white border border-slate-200 text-center py-2 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editScore.score1} onChange={e => setEditScore({...editScore, score1: e.target.value})} />
                    <span className="font-bold text-slate-400">-</span>
                    <input type="number" min="0" max="3" className="w-16 bg-white border border-slate-200 text-center py-2 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500" value={editScore.score2} onChange={e => setEditScore({...editScore, score2: e.target.value})} />
                    <button onClick={() => {
                      let updatedObj = null;
                      const updatedMatches = matches.map(m => {
                        if(m.id === match.id) {
                          updatedObj = { ...m, score1: parseInt(editScore.score1)||0, score2: parseInt(editScore.score2)||0, status: 'completed' };
                          return updatedObj;
                        }
                        return m;
                      });
                      setMatches(updatedMatches);
                      if(updatedObj) syncDataToSheets('UPDATE_MATCH', updatedObj); // Panggil Action UPDATE
                      setEditingId(null);
                    }} className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"><Save size={20} /></button>
                    <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-600 p-3 rounded-xl hover:bg-slate-300 transition-colors"><X size={20} /></button>
                 </div>
               ) : (
                 <div className="flex items-center space-x-3 shrink-0">
                    <div className={`font-black text-2xl px-6 py-2 rounded-2xl border ${match.status === 'completed' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-300 border-slate-200'}`}>
                      {match.status === 'completed' ? `${match.score1} - ${match.score2}` : 'VS'}
                    </div>
                    <button onClick={() => {setEditingId(match.id); setEditScore({score1: match.score1, score2: match.score2})}} className="text-indigo-500 hover:bg-indigo-50 p-3 rounded-xl transition-colors" title="Input/Edit Skor"><Edit2 size={20} /></button>
                    <button onClick={() => setDeleteId(match.id)} className="text-red-400 hover:bg-red-50 hover:text-red-600 p-3 rounded-xl transition-colors" title="Hapus Jadwal"><Trash2 size={20} /></button>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



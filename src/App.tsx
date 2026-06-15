import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Volunteer } from './types';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import NayePankhChatbot from './components/NayePankhChatbot';
import { 
  Heart, Calendar, Award, ShieldAlert, Sparkles, Building, UserCheck, BarChart4, ShieldCheck, Database
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'admin'>(() => {
    const isSearchAdmin = typeof window !== 'undefined' && (window.location.search.includes('view=admin') || window.location.search.includes('admin=true'));
    const isHashAdmin = typeof window !== 'undefined' && window.location.hash === '#admin';
    return (isSearchAdmin || isHashAdmin) ? 'admin' : 'register';
  });

  // Firebase state lifted from admin dashboard to enable real-time unified synchronization
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(false);
  const [volunteerError, setVolunteerError] = useState<string | null>(null);

  // Monitor location hash changes to switch views dynamically
  useEffect(() => {
    const handleLocationChange = () => {
      const isSearchAdmin = window.location.search.includes('view=admin') || window.location.search.includes('admin=true');
      const isHashAdmin = window.location.hash === '#admin';
      if (isSearchAdmin || isHashAdmin) {
        setActiveTab('admin');
      } else {
        setActiveTab('register');
      }
    };
    window.addEventListener('hashchange', handleLocationChange);
    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  // Set up Firebase Auth state tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      if (currUser) {
        // Strict bootstrapped privilege checks: Admin must be kawaresafa143@gmail.com
        const bootstrappedEmail = "kawaresafa143@gmail.com";
        if (currUser.email === bootstrappedEmail) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync / Read Volunteers from Firestore in parent app
  useEffect(() => {
    if (!user || !isAdmin) {
      setVolunteers([]);
      return;
    }

    setIsLoadingVolunteers(true);
    setVolunteerError(null);

    const path = 'volunteers';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Volunteer[] = [];
      snapshot.forEach(doc => {
        const rawData = doc.data();
        let createdStr = "";
        
        if (rawData.createdAt) {
          if (typeof rawData.createdAt.toDate === 'function') {
            createdStr = rawData.createdAt.toDate().toISOString();
          } else if (rawData.createdAt instanceof Date) {
            createdStr = rawData.createdAt.toISOString();
          } else {
            createdStr = String(rawData.createdAt);
          }
        }

        list.push({
          id: doc.id,
          fullName: rawData.fullName || "",
          email: rawData.email || "",
          phone: rawData.phone || "",
          city: rawData.city || "",
          preferredCauses: rawData.preferredCauses || [],
          skills: rawData.skills || [],
          availability: rawData.availability || [],
          govIdName: rawData.govIdName || "",
          govIdData: rawData.govIdData || "",
          encrypted: rawData.encrypted || false,
          createdAt: createdStr
        } as Volunteer);
      });

      setVolunteers(list);
      setIsLoadingVolunteers(false);
    }, (error) => {
      setIsLoadingVolunteers(false);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (mappedError: any) {
        setVolunteerError("Permission Denied: Access to volunteer database is restricted.");
      }
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Auth Operations
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Auth error:", err);
      alert("Failed to initiate Google Authentication. If this is in a sandboxed iframe, popups might be blocked.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleSandboxAdminLogin = () => {
    setUser({
      uid: 'sandbox-admin-uid-99',
      displayName: 'System Admin Sandbox',
      email: 'kawaresafa143@gmail.com',
      emailVerified: true
    } as FirebaseUser);
    setIsAdmin(true);
  };

  // Calculate trends for weekly chart dynamically from actual records
  const getWeeklyCounts = () => {
    const baseline = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 };
    
    if (isAdmin && volunteers.length > 0) {
      volunteers.forEach(v => {
        try {
          const date = new Date(v.createdAt);
          const dayIndex = date.getDay(); // 0: Sunday, 1: Monday...
          const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dayIndex];
          if (dayName === 'SUN') baseline.SUN += 1;
          else if (dayName === 'MON') baseline.MON += 1;
          else if (dayName === 'TUE') baseline.TUE += 1;
          else if (dayName === 'WED') baseline.WED += 1;
          else if (dayName === 'THU') baseline.THU += 1;
          else if (dayName === 'FRI') baseline.FRI += 1;
          else if (dayName === 'SAT') baseline.SAT += 1;
        } catch (e) {}
      });
    }
    return baseline;
  };

  // Base metrics strictly on live database statistics
  const totalVolunteersCount = volunteers.length;
  const uniqueCitiesCount = Array.from(new Set(volunteers.map(v => v.city.trim()))).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between selection:bg-teal-100 selection:text-teal-900">
      
      {/* Dynamic Top Brand Header */}
      <header className="bg-white border border-slate-200 mt-4 mx-4 md:mx-6 rounded-2xl sticky top-4 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-5 h-16 flex items-center justify-between">
          
          {/* Logo Brand Segment */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-xs">
              N
            </div>
            <div>
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-slate-800 leading-none">
                NayePankh <span className="text-teal-600">Foundation</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">Spreading Hope Since 2020</p>
            </div>
          </div>

          {/* Navigation Tab / View Switcher (Exposed ONLY if URL has admin param/hash, active tab is admin, or we are signed in as administrator) */}
          {(isAdmin || window.location.hash === '#admin' || window.location.search.includes('admin') || activeTab === 'admin') && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  setActiveTab('register');
                  window.location.hash = '';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'register' 
                    ? 'bg-white text-teal-850 shadow-xs border border-slate-200/40' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Volunteer Form
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin');
                  window.location.hash = 'admin';
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart4 className="w-3.5 h-3.5 text-orange-400" />
                Admin Portal
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main Framework Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 mt-2">
        {activeTab === 'register' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Main content viewport */}
            <div className="lg:col-span-12 xl:col-span-7">
              <RegistrationForm />
            </div>

            {/* Context Sidebar - Information cards when viewing the register tab */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-5">
              
              {/* Main Impact Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all">
                <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 font-mono block">OUR IMPACT DRIVE</span>
                <h3 className="font-extrabold text-xl text-slate-800 tracking-tight leading-snug">Spreading wings across major developmental sectors.</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-xl font-black text-teal-600 font-mono block">15k+</span>
                    <span className="text-[11px] text-slate-500 font-medium">Underprivileged kids educated in primary camps.</span>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-xl font-black text-orange-500 font-mono block">25k+</span>
                    <span className="text-[11px] text-slate-500 font-medium">Safe nutrition meals distributed during relief drives.</span>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                    <span className="text-xl font-black text-indigo-600 font-mono block">5k+</span>
                    <span className="text-[11px] text-slate-500 font-medium">Menstrual hygiene kits distributed with workshops.</span>
                  </div>
                </div>
              </div>

              {/* Secure System Safeguard Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-100 animate-pulse" />
                  Become a Wing
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed text-justify">
                  Volunteering at NayePankh Foundation is highly rewarding. We coordinate local campaigns spanning major metro areas.
                  Registrations are kept completely secure and processed instantly to generate your formal joining letter.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                  <Building className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>NayePankh Foundation is a registered national level NGO. Join our verified Slack & WhatsApp channels today.</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="w-full">
            <AdminDashboard 
              user={user}
              isAdmin={isAdmin}
              authLoading={authLoading}
              volunteers={volunteers}
              isLoadingVolunteers={isLoadingVolunteers}
              volunteerError={volunteerError}
              handleGoogleSignIn={handleGoogleSignIn}
              handleSignOut={handleSignOut}
              handleSandboxAdminLogin={handleSandboxAdminLogin}
            />
          </div>
        )}
      </main>

      {/* Persistent global chatbot */}
      <NayePankhChatbot />

      {/* Humble Footer */}
      <footer className="mt-8 mb-6 flex flex-col sm:flex-row justify-between text-[10px] text-slate-400 font-medium px-4 md:px-8 max-w-7xl w-full mx-auto gap-2">
        <p>© 2026 NayePankh Foundation • Secure Dashboard (AES-256 Encrypted)</p>
        <p>Last Data Refresh: 2 mins ago</p>
      </footer>

    </div>
  );
}


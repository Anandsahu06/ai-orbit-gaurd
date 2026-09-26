import React, { useState, Suspense } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ConjunctionsPage } from './pages/ConjunctionsPage';
import { SimulationPage } from './pages/SimulationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SatellitesPage } from './pages/SatellitesPage';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LiveOrbitPage } from './pages/LiveOrbitPage';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as NavTab | null;
      if (tab && ['home', 'live-orbit', 'conjunctions', 'simulation', 'satellites', 'analytics'].includes(tab)) {
        return tab;
      }
    }
    return 'home';
  });

  const [simulationTargetId, setSimulationTargetIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('conjunctionId') || null;
    }
    return null;
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [selectedNoradForConjunction, setSelectedNoradForConjunction] = useState<string | null>(null);
  const [trackedNoradId, setTrackedNoradId] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<string>('TLE Data: Connected');

  React.useEffect(() => {
    api.getDashboardSummary()
      .then((res) => {
        if (res.data_source_status) {
          setDataStatus(res.data_source_status);
        }
      })
      .catch(() => setDataStatus('Cached TLE'));
  }, []);

  // Handle browser Back / Forward history buttons
  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = (params.get('tab') as NavTab) || 'home';
      const conjId = params.get('conjunctionId');
      setActiveTabState(tab);
      if (conjId) {
        setSimulationTargetIdState(conjId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveTab = (tab: NavTab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    if (tab !== 'simulation') {
      params.delete('conjunctionId');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ tab, conjunctionId: tab === 'simulation' ? simulationTargetId : null }, '', newUrl);
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      setTrackedNoradId(null); // clear any tracked sat so search takes priority
      setActiveTab('live-orbit');
    }
  };

  const handleTrackSatellite = (noradId: string) => {
    setTrackedNoradId(noradId);
    setActiveTab('live-orbit');
  };

  const handleSelectConjunctionForSatellite = (noradId: string) => {
    setSelectedNoradForConjunction(noradId);
    setActiveTab('conjunctions');
  };

  const handleOpenFullSimulation = (conjId: string) => {
    setSimulationTargetIdState(conjId);
    setActiveTabState('simulation');
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'simulation');
    params.set('conjunctionId', conjId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ tab: 'simulation', conjunctionId: conjId }, '', newUrl);
  };

  return (
    <ErrorBoundary fallbackTitle="OrbitalGuard AI Application Error">
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <Header
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            searchQuery={globalSearch}
            setSearchQuery={setGlobalSearch}
            onSearchSubmit={handleGlobalSearchSubmit}
            dataSourceStatus={dataStatus}
          />

          {/* Dynamic Page Views */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
            {activeTab === 'live-orbit' && (
              <ErrorBoundary fallbackTitle="Live Orbit 3D Tracking Error">
                <LiveOrbitPage
                  setActiveTab={setActiveTab}
                  onSelectConjunctionForSatellite={handleSelectConjunctionForSatellite}
                  initialNoradId={trackedNoradId}
                  initialSearch={activeTab === 'live-orbit' ? globalSearch : ''}
                />
              </ErrorBoundary>
            )}
            {activeTab === 'conjunctions' && (
              <ConjunctionsPage
                setActiveTab={setActiveTab}
                preSelectedNoradId={selectedNoradForConjunction}
                onOpenFullSimulation={handleOpenFullSimulation}
              />
            )}
            {activeTab === 'simulation' && (
              <SimulationPage
                initialConjunctionId={simulationTargetId}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'analytics' && <AnalyticsPage setActiveTab={setActiveTab} />}
            {activeTab === 'satellites' && <SatellitesPage setActiveTab={setActiveTab} onTrackSatellite={handleTrackSatellite} />}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

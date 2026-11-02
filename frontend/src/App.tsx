import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar.tsx';
import type { NavItem } from './components/layout/Sidebar.tsx';
import { TopNav } from './components/layout/TopNav.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { PassportsPage } from './pages/PassportsPage.tsx';
import { CombinationLabPage } from './pages/CombinationLabPage.tsx';
import { UsageEvaluatorPage } from './pages/UsageEvaluatorPage.tsx';
import { InvestigationPage } from './pages/InvestigationPage.tsx';
import { LineagePage } from './pages/LineagePage.tsx';
import { AuditLogsPage } from './pages/AuditLogsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { checkBackendHealth, type ConnectionStatus } from './services/api.ts';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPassportDatasetId, setSelectedPassportDatasetId] = useState('DS-9021');
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>('CHECKING');

  const verifyHealth = useCallback(async () => {
    const result = await checkBackendHealth();
    setBackendStatus(result.status);
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((res) => {
      if (isMounted) {
        setBackendStatus(res.status);
      }
    });

    const interval = setInterval(() => {
      checkBackendHealth().then((res) => {
        if (isMounted) {
          setBackendStatus(res.status);
        }
      });
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelectDatasetForPassport = (datasetId: string) => {
    setSelectedPassportDatasetId(datasetId);
    setCurrentTab('passports');
  };

  const handleNavigateToCombinationLab = () => {
    setCurrentTab('combination-lab');
  };

  return (
    <div className="app-container">
      {/* Persistent Terminal Chic Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        openFindingsCount={2}
        backendStatus={backendStatus}
      />

      {/* Main Interactive Work Area */}
      <div className="main-content-area">
        <TopNav
          currentTab={currentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectTab={(tab) => setCurrentTab(tab)}
          backendStatus={backendStatus}
          onRefreshHealth={verifyHealth}
        />

        <main style={{ flex: 1 }}>
          {currentTab === 'overview' && (
            <OverviewPage
              onNavigate={(tab) => setCurrentTab(tab)}
              onSelectDatasetForPassport={handleSelectDatasetForPassport}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPage
              onSelectDatasetForPassport={handleSelectDatasetForPassport}
            />
          )}

          {currentTab === 'passports' && (
            <PassportsPage
              selectedDatasetId={selectedPassportDatasetId}
              onSelectDatasetId={setSelectedPassportDatasetId}
              onNavigateToCombinationLab={handleNavigateToCombinationLab}
            />
          )}

          {currentTab === 'combination-lab' && <CombinationLabPage />}

          {currentTab === 'usage-evaluator' && <UsageEvaluatorPage />}

          {currentTab === 'investigation' && <InvestigationPage />}

          {currentTab === 'lineage' && <LineagePage />}

          {currentTab === 'audit-logs' && <AuditLogsPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;

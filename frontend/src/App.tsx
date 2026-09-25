import React, { useCallback, useEffect, useState } from 'react';
import { ThreeEngineHologram } from './components/ThreeEngineHologram';
import { api, TelemetrySocket } from './services/api';
import type { SimulationStatus } from './services/api';
import type { AlertItem, TelemetryReading } from './types/telemetry';
import { AlertTriangle, Play, Plus, Square, Trash2, Wifi, WifiOff } from 'lucide-react';

type NavTab = 'overview' | 'mission' | 'twin' | 'insights' | 'fleet' | 'upcoming';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [telemetry, setTelemetry] = useState<TelemetryReading | null>(null);
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [faultTypes, setFaultTypes] = useState<string[]>([]);
  const [currentFault, setCurrentFault] = useState<string>('none');
  const [chartMetric, setChartMetric] = useState<'cht' | 'egt' | 'oil'>('cht');
  const [fleet, setFleet] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('aerion-fleet') || '["AERION-01", "AERION-02"]');
    } catch {
      return ['AERION-01', 'AERION-02'];
    }
  });
  const [selectedFleet, setSelectedFleet] = useState('AERION-01');
  const [nextMission, setNextMission] = useState('Long-range reconnaissance');
  const [newFleetName, setNewFleetName] = useState('');
  const [showFleetInput, setShowFleetInput] = useState(false);

  useEffect(() => {
    window.localStorage.setItem('aerion-fleet', JSON.stringify(fleet));
  }, [fleet]);

  const handleTelemetryMessage = useCallback((data: TelemetryReading) => {
    setTelemetry(data);
    setHistory((prev) => [...prev.slice(-40), data]);
  }, []);

  const handleSocketStatus = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [stat, faults, alertList] = await Promise.all([
          api.getStatus().catch(() => null),
          api.getFaultTypes().catch(() => []),
          api.getAlerts(20).catch(() => [])
        ]);

        if (stat) {
          setStatus(stat);
          setCurrentFault(stat.current_fault);
        }
        if (faults.length > 0) setFaultTypes(faults);
        if (alertList) setAlerts(alertList);
      } catch (error) {
        console.error('Initial fetch error', error);
      }
    };

    loadInitial();
    const socket = new TelemetrySocket(handleTelemetryMessage, handleSocketStatus);
    return () => socket.disconnect();
  }, [handleTelemetryMessage, handleSocketStatus]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const [latestAlerts, latestStatus] = await Promise.all([
          api.getAlerts(20).catch(() => []),
          api.getStatus().catch(() => null)
        ]);
        if (latestAlerts) setAlerts(latestAlerts);
        if (latestStatus) setStatus(latestStatus);
      } catch {
        // ignore polling errors
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  const handleStartSim = async () => {
    try {
      await api.startSimulation();
      const next = await api.getStatus();
      setStatus(next);
    } catch (error) {
      console.error('Failed to start simulation', error);
    }
  };

  const handleStopSim = async () => {
    try {
      await api.stopSimulation();
      const next = await api.getStatus();
      setStatus(next);
    } catch (error) {
      console.error('Failed to stop simulation', error);
    }
  };

  const handleAddFleet = () => {
    const name = newFleetName.trim().toUpperCase();
    if (!name || fleet.includes(name)) return;
    setFleet((current) => [...current, name]);
    setSelectedFleet(name);
    setNewFleetName('');
    setShowFleetInput(false);
  };

  const handleRemoveFleet = (asset: string) => {
    if (fleet.length <= 1) return;
    const nextFleet = fleet.filter((item) => item !== asset);
    setFleet(nextFleet);
    if (selectedFleet === asset) setSelectedFleet(nextFleet[0]);
  };

  const handleSelectFault = async (fault: string) => {
    try {
      setCurrentFault(fault);
      await api.setFault(fault);
    } catch (error) {
      console.error('Failed to set fault', error);
    }
  };

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert)));
    } catch (error) {
      console.error('Failed to acknowledge alert', error);
    }
  };

  const isAnomaly = telemetry?.anomaly === 1;
  const faultType = telemetry?.fault_type || 'none';
  const healthScore = telemetry?.health_score ?? (isAnomaly ? 58.2 : 95.2);
  const rulHours = telemetry?.rul_hours ?? 1120;
  const fidelityScore = Number(((telemetry?.twin_fidelity_score ?? 0.986) * 100).toFixed(1));
  const chtDeviation = Math.abs((telemetry?.cht ?? 175) - (telemetry?.twin_predicted_cht ?? 175));
  const egtDeviation = Math.abs((telemetry?.egt ?? 620) - (telemetry?.twin_predicted_egt ?? 620));
  const twinDeviation = Number(((chtDeviation + egtDeviation / 4) / 2).toFixed(1));
  const missionRisk = Math.min(99, Math.max(3, Math.round((100 - healthScore) * 0.72 + (isAnomaly ? 24 : 0))));
  const missionReady = missionRisk < 25 && rulHours > 100;
  const predictionConfidence = isAnomaly ? Math.min(98, Math.round(78 + twinDeviation * 2)) : Math.round(96 - twinDeviation);
  const affectedSubsystem = isAnomaly ? faultType.replace(/_/g, ' ') : 'none detected';
  const maintenanceAdvice = isAnomaly
    ? faultType.includes('oil') || faultType.includes('lubrication')
      ? 'Inspect oil circuit and filter before the next sortie.'
      : faultType.includes('injector') || faultType.includes('misfire')
        ? 'Inspect injector balance and combustion stability before dispatch.'
        : 'Reduce mission load and schedule a subsystem inspection.'
    : 'No immediate maintenance action. Continue live monitoring.';

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'mission', label: 'Mission Status' },
    { id: 'twin', label: 'Twin Hologram' },
    { id: 'insights', label: 'Insights' },
    { id: 'fleet', label: 'Fleet' },
    { id: 'upcoming', label: 'Upcoming Missions' }
  ];

  const upcomingMissions = [
    { name: 'Long-range reconnaissance', code: 'AER-RECON-035', time: '26 Sep 2026 17:26', asset: 'AERION-01', readiness: 'Ready' },
    { name: 'Maritime surveillance', code: 'AER-MAR-014', time: '28 Sep 2026 17:45', asset: 'AERION-02', readiness: 'Review' },
    { name: 'Communications relay', code: 'AER-COM-009', time: '30 Sep 2026 09:10', asset: 'Unassigned', readiness: 'Planned' }
  ];

  const telemetryRows = [
    ['RPM', `${(telemetry?.rpm ?? 3000).toFixed(0)}`],
    ['CHT', `${(telemetry?.cht ?? 175).toFixed(1)}°C`],
    ['EGT', `${(telemetry?.egt ?? 620).toFixed(1)}°C`],
    ['Oil pressure', `${(telemetry?.oil_pressure ?? 5.2).toFixed(2)} bar`],
    ['Vibration RMS', `${(telemetry?.vibration_rms ?? 0.2).toFixed(2)} g`],
    ['Fuel flow', `${(telemetry?.fuel_flow_rate ?? 18).toFixed(1)} L/h`]
  ];

  return (
    <div className="scanlines min-h-screen w-full overflow-x-hidden">
      <header className="header-shell">
        <div className="brand-block">
          <img className="brand-lockup" src="/aerion-lockup.svg" alt="Aerion Mission Intelligence" />
        </div>

        <nav className="top-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={activeTab === item.id ? 'nav-pill active' : 'nav-pill'}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="live-pill">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300">Offline</span>
              </>
            )}
          </div>

          <div className="fault-select-wrap">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <label htmlFor="scenario-select">Scenario</label>
            <select id="scenario-select" value={currentFault} onChange={(event) => handleSelectFault(event.target.value)}>
              <option value="none">Nominal mission</option>
              {faultTypes.filter((fault) => fault !== 'none').map((fault) => (
                <option key={fault} value={fault}>{fault.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {status?.is_running ? (
            <button className="header-button stop" onClick={handleStopSim}>
              <Square className="w-4 h-4 fill-current" />
              Halt sim
            </button>
          ) : (
            <button className="header-button start" onClick={handleStartSim}>
              <Play className="w-4 h-4 fill-current" />
              Start sim
            </button>
          )}
        </div>
      </header>

      <main className="main-shell">
        <section className="stat-grid">
          <div className="mini-stat">
            <span className="mini-label">Health index</span>
            <div className="mini-value-row">
              <strong className={healthScore >= 75 ? 'positive' : healthScore >= 50 ? 'warning' : 'danger'}>{healthScore.toFixed(0)}%</strong>
            </div>
          </div>

          <div className="mini-stat">
            <span className="mini-label">RUL</span>
            <div className="mini-value-row">
              <strong>{rulHours.toFixed(1)}</strong>
              <small>hrs</small>
            </div>
          </div>

          <div className="mini-stat">
            <span className="mini-label">AI diagnostics</span>
            <div className="mini-value-row">
              <strong className={isAnomaly ? 'danger' : 'positive'}>{isAnomaly ? 'Alert' : 'Nominal'}</strong>
            </div>
          </div>

          <div className="mini-stat">
            <span className="mini-label">Twin fidelity</span>
            <div className="mini-value-row">
              <strong>{fidelityScore}%</strong>
            </div>
          </div>

          <div className="mini-stat">
            <span className="mini-label">Flight phase</span>
            <div className="mini-value-row">
              <strong>{(telemetry?.flight_phase || 'cruise').toUpperCase()}</strong>
            </div>
          </div>
        </section>

        {activeTab === 'overview' && (
          <div className="grid-layout intro-layout">
            <section className="panel-shell hero-panel">
              <p className="eyebrow">AERION SYSTEM</p>
              <h1 className="hero-title">Mission intelligence for the next flight window.</h1>
              <p className="lead-copy">AERION unifies engine telemetry, digital twin physics, and AI diagnostics into a single lightweight operational picture built for modern UAV command insight.</p>

              <div className="cta-row">
                <button className="btn btn-primary" onClick={handleStartSim}>Launch simulation</button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('twin')}>Open twin view</button>
              </div>

              <div className="three-card-grid">
                <div className="info-card">
                  <span>Mission status</span>
                  <strong>{status?.is_running ? 'Simulation live' : 'Standby'}</strong>
                </div>
                <div className="info-card">
                  <span>Power</span>
                  <strong>{(telemetry?.rpm ?? 3000).toFixed(0)} RPM</strong>
                </div>
                <div className="info-card">
                  <span>System health</span>
                  <strong>{healthScore.toFixed(0)}%</strong>
                </div>
              </div>

              <div className="reliability-grid">
                <div className="reliability-card">
                  <span>Mission readiness</span>
                  <strong className={missionReady ? 'positive' : 'warning'}>{missionReady ? 'READY' : 'REVIEW'}</strong>
                  <small>{missionReady ? 'Within operational envelope' : 'Engineering review recommended'}</small>
                </div>
                <div className="reliability-card">
                  <span>Mission risk</span>
                  <strong className={missionRisk < 25 ? 'positive' : missionRisk < 60 ? 'warning' : 'danger'}>{missionRisk}%</strong>
                  <small>Calculated from health and anomaly state</small>
                </div>
                <div className="reliability-card">
                  <span>Twin deviation</span>
                  <strong>{twinDeviation.toFixed(1)}</strong>
                  <small>Combined thermal residual</small>
                </div>
              </div>

              <div className="recommendation-box">
                <div>
                  <p className="eyebrow">Recommended action</p>
                  <strong>{maintenanceAdvice}</strong>
                </div>
                <span className={isAnomaly ? 'status-pill status-warning' : 'status-pill status-good'}>{isAnomaly ? 'Attention' : 'Monitored'}</span>
              </div>
            </section>

            <aside className="panel-shell side-panel">
              <div className="side-header">
                <p className="eyebrow">Flight brief</p>
                <span className="status-pill status-good">Nominal</span>
              </div>

              {[
                ['Engine ID', telemetry?.engine_id || 'ENGINE_001'],
                ['Current fault', currentFault || 'none'],
                ['Twin fidelity', `${fidelityScore}%`],
                ['Mission profile', telemetry?.mission_profile_type || 'Reconnaissance']
              ].map(([label, value]) => (
                <div key={label} className="detail-row">
                  <span>{label}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}

              <div className="summary-box">
                <p className="eyebrow">Live AI summary</p>
                <p>{isAnomaly ? `Anomaly identified in ${faultType.replace(/_/g, ' ')}. Engine health remains stable but requires monitoring.` : 'No active anomaly detected. System remains within expected operating envelope.'}</p>
              </div>
              <div className="prediction-box">
                <div className="side-header">
                  <p className="eyebrow">AI prediction</p>
                  <strong>{predictionConfidence}%</strong>
                </div>
                <div className="prediction-bar"><span style={{ width: `${predictionConfidence}%` }} /></div>
                <p>{isAnomaly ? `${affectedSubsystem} predicted as the active risk driver.` : 'No fault trajectory currently exceeds the alert threshold.'}</p>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'mission' && (
          <div className="grid-layout mission-layout">
            <section className="panel-shell chart-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Mission status</p>
                  <h2 className="section-title">Live flight condition</h2>
                </div>
                <div className="flex-inline">
                  <span className="eyebrow small-space">Link</span>
                  {isConnected ? <span className="status-pill status-good">Connected</span> : <span className="status-pill status-bad">Offline</span>}
                </div>
              </div>

              <div className="chart-toolbar">
                {(['cht', 'egt', 'oil'] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    className={chartMetric === metric ? 'metric-toggle active' : 'metric-toggle'}
                    onClick={() => setChartMetric(metric)}
                  >
                    {metric === 'cht' ? 'CHT' : metric === 'egt' ? 'EGT' : 'Oil'}
                  </button>
                ))}
              </div>

              <div className="chart-box">
                <svg viewBox="0 0 420 180" className="chart-svg">
                  {[20, 60, 100, 140, 180].map((y) => (
                    <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
                  ))}
                  {history.length > 1 && (
                    <>
                      <path d={history.map((point, index) => {
                        const x = (index / Math.max(1, history.length - 1)) * 380 + 10;
                        const value = chartMetric === 'cht' ? point.cht : chartMetric === 'egt' ? point.egt : point.oil_pressure * 25;
                        const y = 160 - ((value - 50) / 220) * 120;
                        return `${index === 0 ? 'M' : 'L'} ${x} ${Math.max(20, Math.min(160, y))}`;
                      }).join(' ')} fill="none" stroke="#67e8f9" strokeWidth="2.4" />
                      <path d={history.map((point, index) => {
                        const x = (index / Math.max(1, history.length - 1)) * 380 + 10;
                        const value = chartMetric === 'cht' ? point.twin_predicted_cht ?? point.cht : chartMetric === 'egt' ? point.twin_predicted_egt ?? point.egt : (point.twin_predicted_oil_pressure ?? point.oil_pressure) * 25;
                        const y = 160 - ((value - 50) / 220) * 120;
                        return `${index === 0 ? 'M' : 'L'} ${x} ${Math.max(20, Math.min(160, y))}`;
                      }).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 6" />
                    </>
                  )}
                </svg>
              </div>
            </section>

            <aside className="panel-shell telemetry-panel">
              <p className="eyebrow">Current telemetry</p>
              <div className="telemetry-list">
                {telemetryRows.map(([label, value]) => (
                  <div key={label} className="telemetry-row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'twin' && (
          <section className="panel-shell twin-panel">
            <ThreeEngineHologram telemetry={telemetry} />
          </section>
        )}

        {activeTab === 'insights' && (
          <div className="grid-layout insight-layout">
            <section className="panel-shell insight-panel">
              <p className="eyebrow">AI explanation</p>
              <h3 className="section-title">Root-cause attribution</h3>
              <div className="insight-list">
                {(telemetry?.shap_explanations ?? [
                  { feature: 'CHT', delta: isAnomaly ? 38.5 : 2.1, unit: '°C' },
                  { feature: 'EGT', delta: isAnomaly ? 142 : -3.2, unit: '°C' },
                  { feature: 'Oil pressure', delta: isAnomaly ? -1.8 : 0.1, unit: 'bar' },
                  { feature: 'Vibration', delta: isAnomaly ? 0.63 : 0.02, unit: 'g' }
                ]).map((item, index) => (
                  <div key={index} className="explain-row">
                    <div className="explain-label-row">
                      <span>{item.feature}</span>
                      <strong>{item.delta.toFixed(1)} {item.unit}</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.min(100, Math.abs(item.delta) * 3)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="deviation-summary">
                <span>Real vs twin deviation</span>
                <strong>{twinDeviation.toFixed(1)}° equivalent</strong>
                <small>{fidelityScore}% model fidelity across current telemetry</small>
              </div>
            </section>

            <section className="panel-shell alert-panel">
              <p className="eyebrow">Alert queue</p>
              <div className="alert-list">
                {alerts.length ? alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="alert-card">
                    <div className="alert-heading">
                      <strong>{alert.fault_type || alert.alert_type}</strong>
                      <span className={`status-pill ${alert.severity === 'critical' ? 'status-bad' : alert.severity === 'high' ? 'status-warning' : 'status-good'}`}>{alert.severity}</span>
                    </div>
                    <p>{alert.message}</p>
                    {!alert.acknowledged && <button className="btn btn-secondary small" onClick={() => handleAcknowledgeAlert(alert.id)}>Acknowledge</button>}
                  </div>
                )) : (
                  <div className="empty-card">No active alerts. System remains within operating thresholds.</div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'fleet' && (
          <section className="fleet-view">
            <div className="section-header">
              <div>
                <p className="eyebrow">Fleet operations</p>
                <h2 className="section-title">Aircraft readiness</h2>
              </div>
              <button className="command-button" type="button" onClick={() => setShowFleetInput(true)}><Plus className="w-4 h-4" /> Add fleet</button>
            </div>
            {showFleetInput && (
              <div className="fleet-add-form fleet-add-form-panel">
                <input
                  value={newFleetName}
                  onChange={(event) => setNewFleetName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleAddFleet()}
                  placeholder="Asset ID"
                  aria-label="New fleet asset ID"
                  autoFocus
                />
                <button className="command-button confirm" type="button" onClick={handleAddFleet}>Add</button>
              </div>
            )}
            <div className="fleet-grid">
              {fleet.map((asset, index) => (
                <article className="fleet-card" key={asset}>
                  <div className="fleet-card-top">
                    <div className="asset-avatar">{String(index + 1).padStart(2, '0')}</div>
                    <span className={index === 0 && isAnomaly ? 'status-pill status-warning' : 'status-pill status-good'}>{index === 0 && isAnomaly ? 'Review' : 'Available'}</span>
                  </div>
                  <p className="eyebrow">MALE UAV / ENGINE TWIN</p>
                  <h3>{asset}</h3>
                  <div className="fleet-metric"><span>Health</span><strong>{index === 0 ? healthScore.toFixed(0) : '96'}%</strong></div>
                  <div className="fleet-metric"><span>RUL</span><strong>{index === 0 ? rulHours.toFixed(0) : '1180'} hrs</strong></div>
                  <div className="fleet-metric"><span>Next mission</span><strong>{index === 0 ? nextMission : 'Standby'}</strong></div>
                  <button className="remove-fleet-button" type="button" onClick={() => handleRemoveFleet(asset)} disabled={fleet.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove fleet
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'upcoming' && (
          <section className="upcoming-view">
            <div className="section-header">
              <div>
                <p className="eyebrow">Mission calendar</p>
                <h2 className="section-title">Upcoming missions</h2>
              </div>
              <span className="status-pill status-good">{upcomingMissions.length} scheduled</span>
            </div>
            <div className="mission-list">
              {upcomingMissions.map((mission, index) => (
                <article className="upcoming-card" key={mission.code}>
                  <div className={`mission-visual mission-visual-${index + 1}`}><span>AERION</span></div>
                  <div className="mission-copy">
                    <div className="mission-card-heading"><span className="eyebrow">{mission.code}</span><span className={`status-pill ${mission.readiness === 'Ready' ? 'status-good' : mission.readiness === 'Review' ? 'status-warning' : 'status-neutral'}`}>{mission.readiness}</span></div>
                    <h3>{mission.name}</h3>
                    <p>{mission.time}</p>
                    <span className="mission-asset">{mission.asset}</span>
                  </div>
                  <button className="command-button" type="button" onClick={() => setNextMission(mission.name)}>Select mission</button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer-shell">AERION • Mission systems dashboard</footer>
    </div>
  );
};

export default App;

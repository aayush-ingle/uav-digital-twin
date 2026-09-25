import type { AlertItem, MaintenanceRecordItem, TelemetryReading } from '../types/telemetry';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '') + '/api';
const WS_BASE = (import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') : 'ws://localhost:8000')).replace(/\/+$/, '') + '/ws/telemetry';

export interface SimulationStatus {
  is_running: boolean;
  engine_id: string;
  current_fault: string;
  readings_count: number;
}

export const api = {
  async getStatus(): Promise<SimulationStatus> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch simulation status');
    return res.json();
  },

  async startSimulation(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start simulation');
    return res.json();
  },

  async stopSimulation(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop simulation');
    return res.json();
  },

  async setFault(fault_type: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/simulation/fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fault_type }),
    });
    if (!res.ok) throw new Error('Failed to set fault');
    return res.json();
  },

  async getFaultTypes(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/fault-types`);
    if (!res.ok) throw new Error('Failed to fetch fault types');
    return res.json();
  },

  async getLatest(): Promise<TelemetryReading> {
    const res = await fetch(`${API_BASE}/engine/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest telemetry');
    return res.json();
  },

  async getHistory(n = 100): Promise<TelemetryReading[]> {
    const res = await fetch(`${API_BASE}/engine/history?n=${n}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getAlerts(limit = 50): Promise<AlertItem[]> {
    const res = await fetch(`${API_BASE}/alerts?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async acknowledgeAlert(alertId: number): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  async getMaintenance(limit = 50): Promise<MaintenanceRecordItem[]> {
    const res = await fetch(`${API_BASE}/maintenance?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch maintenance');
    return res.json();
  },

  async getReplayData(limit = 200): Promise<TelemetryReading[]> {
    const res = await fetch(`${API_BASE}/mission/replay-data?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch replay data');
    return res.json();
  }
};

export class TelemetrySocket {
  private ws: WebSocket | null = null;
  private onMessageCallback: ((data: TelemetryReading) => void) | null = null;
  private onStatusCallback: ((connected: boolean) => void) | null = null;
  private reconnectTimeout: number | null = null;
  private shouldReconnect = true;

  constructor(
    onMessage: (data: TelemetryReading) => void,
    onStatus: (connected: boolean) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onStatusCallback = onStatus;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(WS_BASE);

      this.ws.onopen = () => {
        this.onStatusCallback?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: TelemetryReading = JSON.parse(event.data);
          this.onMessageCallback?.(data);
        } catch (e) {
          console.error('Error parsing telemetry frame:', e);
        }
      };

      this.ws.onclose = () => {
        this.onStatusCallback?.(false);
        if (this.shouldReconnect) {
          this.reconnectTimeout = window.setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = () => {
        this.onStatusCallback?.(false);
        this.ws?.close();
      };
    } catch {
      this.onStatusCallback?.(false);
      if (this.shouldReconnect) {
        this.reconnectTimeout = window.setTimeout(() => this.connect(), 2000);
      }
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
  }
}

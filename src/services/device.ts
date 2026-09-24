// Client device fingerprinting & 1-device active session enforcement

const DEVICE_ID_KEY = 'aspirin_device_fingerprint_v1';

export class DeviceService {
  private static cachedDeviceId: string | null = null;
  private static tokenGetter: (() => Promise<string | null>) | null = null;

  public static setAuth(tokenGetter?: () => Promise<string | null>) {
    if (tokenGetter) {
      this.tokenGetter = tokenGetter;
    }
  }

  // Retrieve or generate persistent cryptographic device identifier
  public static getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        // Generate pseudo-UUID
        id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      this.cachedDeviceId = id;
      return id;
    } catch {
      return 'dev_fallback_' + Date.now();
    }
  }

  // Detect human-readable device & browser name
  public static getDeviceName(): string {
    if (typeof navigator === 'undefined') return 'Unknown Browser';

    const ua = navigator.userAgent;
    let browser = 'Browser';
    let os = 'Device';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  }

  // Register session with Cloudflare Edge
  public static async registerSession(userId: string): Promise<{ success: boolean }> {
    const deviceId = this.getDeviceId();
    const deviceName = this.getDeviceName();

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch('/api/sessions/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          deviceId,
          deviceName,
          sessionId: 'sess_' + Date.now(),
        }),
      });

      if (!res.ok) return { success: false };
      const data = await res.json();
      return { success: !!data.success };
    } catch {
      return { success: true }; // Graceful offline tolerance
    }
  }

  // Send periodic heartbeat check (every 60-90s)
  public static async checkHeartbeat(userId: string): Promise<{
    active: boolean;
    reason?: string;
    message?: string;
  }> {
    const deviceId = this.getDeviceId();

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.tokenGetter) {
        try {
          const token = await this.tokenGetter();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch('/api/sessions/heartbeat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          deviceId,
        }),
      });

      if (!res.ok) return { active: true };
      const data = await res.json();
      return {
        active: data.active !== false,
        reason: data.reason,
        message: data.message,
      };
    } catch {
      return { active: true }; // Graceful network fallback
    }
  }
}

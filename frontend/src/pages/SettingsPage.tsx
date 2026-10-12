import { FormEvent, useState } from "react";

interface Props {
  apiBaseUrl: string;
  onSetApiBaseUrl: (value: string) => void;
  allowedOriginsHint: string;
}

export function SettingsPage({ apiBaseUrl, onSetApiBaseUrl, allowedOriginsHint }: Props) {
  const [pendingApi, setPendingApi] = useState(apiBaseUrl);

  function onSave(event: FormEvent) {
    event.preventDefault();
    const trimmed = pendingApi.trim();
    if (!trimmed) {
      return;
    }
    onSetApiBaseUrl(trimmed);
  }

  return (
    <section className="card">
      <h2>Settings</h2>
      <form onSubmit={onSave} className="grid gap-sm">
        <label>
          Backend API URL
          <input
            type="url"
            value={pendingApi}
            onChange={(event) => setPendingApi(event.target.value)}
            placeholder="http://localhost:8210"
          />
        </label>
        <button type="submit">Save API URL</button>
      </form>
      <p className="muted">
        If API calls fail in the browser, confirm backend CORS allows your frontend origin. Current recommended origins:
        <code>{allowedOriginsHint}</code>
      </p>
    </section>
  );
}


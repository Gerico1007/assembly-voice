export type MuseScoreStructuredCommand = {
  command: string;
  params?: Record<string, unknown>;
};

export type MuseScoreCommandRequest = {
  prompt?: string;
  command?: MuseScoreStructuredCommand;
  authToken?: string;
};

export type MuseScoreCommandResponse = {
  status: 'ok' | 'error' | 'not_implemented';
  message?: string;
  received?: { hasPrompt: boolean; hasCommand: boolean };
  timestamp?: string;
};

export async function sendCommand(request: MuseScoreCommandRequest): Promise<MuseScoreCommandResponse> {
  const res = await fetch('/musescore-command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data = await res.json();
  return data as MuseScoreCommandResponse;
}


import { readFileSync } from 'fs';
import { execSync } from 'child_process';

export async function probeOllama(url: string): Promise<boolean> {
  const result = await testOllamaConnection(url, 3000);
  return result.ok;
}

export function isWsl2(): boolean {
  try {
    const version = readFileSync('/proc/version', 'utf-8');
    return /microsoft/i.test(version);
  } catch {
    return false;
  }
}

export function getWslGatewayIp(): string | null {
  try {
    const output = execSync('ip route show default', { encoding: 'utf-8', timeout: 3000 });
    const match = output.match(/via\s+([\d.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function detectOllamaUrl(): Promise<{
  success: boolean;
  url?: string;
  message: string;
}> {
  const localUrl = 'http://127.0.0.1:11434';

  if (await probeOllama(localUrl)) {
    return { success: true, url: localUrl, message: 'ローカルOllamaを検出しました' };
  }

  if (isWsl2()) {
    const gatewayIp = getWslGatewayIp();
    if (gatewayIp) {
      const wslUrl = `http://${gatewayIp}:11434`;
      if (await probeOllama(wslUrl)) {
        return {
          success: true,
          url: wslUrl,
          message: `WSL2ホストのOllamaを検出しました (${gatewayIp})`,
        };
      }
    }
  }

  return { success: false, message: 'Ollamaサーバーが見つかりませんでした' };
}

export async function testOllamaConnection(
  url: string,
  timeoutMs = 5000,
): Promise<{
  ok: boolean;
  models: string[];
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, models: [], error: message };
  } finally {
    clearTimeout(timeout);
  }
}

// --- OpenAI互換サーバー検出 ---

export async function testOpenAiCompatConnection(
  url: string,
  timeoutMs = 3000,
): Promise<{
  ok: boolean;
  models: string[];
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/v1/models`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = (data.data || []).map((m: { id: string }) => m.id);
    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, models: [], error: message };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeOpenAiCompat(url: string): Promise<boolean> {
  const result = await testOpenAiCompatConnection(url, 3000);
  return result.ok;
}

export async function detectOpenAiCompatUrl(): Promise<{
  success: boolean;
  url?: string;
  message: string;
}> {
  // LM Studio (port 1234)
  const lmStudioUrl = 'http://127.0.0.1:1234';
  if (await probeOpenAiCompat(lmStudioUrl)) {
    return {
      success: true,
      url: lmStudioUrl,
      message: 'ローカルのLM Studioを検出しました (port 1234)',
    };
  }

  // Ollama OpenAI互換エンドポイント (port 11434)
  const ollamaCompatUrl = 'http://127.0.0.1:11434';
  if (await probeOpenAiCompat(ollamaCompatUrl)) {
    return {
      success: true,
      url: ollamaCompatUrl,
      message: 'ローカルのOllama (OpenAI互換) を検出しました (port 11434)',
    };
  }

  // WSL2環境
  if (isWsl2()) {
    const gatewayIp = getWslGatewayIp();
    if (gatewayIp) {
      const wslLmStudioUrl = `http://${gatewayIp}:1234`;
      if (await probeOpenAiCompat(wslLmStudioUrl)) {
        return {
          success: true,
          url: wslLmStudioUrl,
          message: `WSL2ホストのLM Studioを検出しました (${gatewayIp}:1234)`,
        };
      }

      const wslOllamaCompatUrl = `http://${gatewayIp}:11434`;
      if (await probeOpenAiCompat(wslOllamaCompatUrl)) {
        return {
          success: true,
          url: wslOllamaCompatUrl,
          message: `WSL2ホストのOllama (OpenAI互換) を検出しました (${gatewayIp}:11434)`,
        };
      }
    }
  }

  return { success: false, message: 'OpenAI互換サーバーが見つかりませんでした' };
}

import { AuthProviders, DSP } from '@virtru/dsp-sdk';

// Worker's input data
interface WorkerInitData {
    config: any;
    user: { refreshToken: string; accessToken: string; };
}

interface WorkerMessageData {
    tdfBlobBuffer: ArrayBuffer;
}

async function createAuthProvider(user: WorkerInitData['user'], config: WorkerInitData['config']) {
  if (!user || !user.refreshToken) {
    throw new Error('TDF AuthProvider creation failed in worker: no refresh token found');
  }

  return await AuthProviders.refreshAuthProvider({
    clientId: config.dsp.keycloak.clientId,
    exchange: 'refresh',
    refreshToken: user.refreshToken,
    oidcOrigin: config.dsp.keycloak.serverUrl,
  });
}

async function decryptWorkerPayload(ciphertext: ArrayBuffer, config: WorkerInitData['config'], user: WorkerInitData['user']): Promise<string> {
    const authProvider = await createAuthProvider(user, config);

    // Initialize unified DSP client
    const dsp = new DSP({
        authProvider,
        platformUrl: config.dsp.baseUrl,
        disableDPoP: true,
    });

    const bufferedSource = {
      type: 'buffer' as const,
      location: new Uint8Array(ciphertext),
    };

    // dsp.read handles both Nano and ZTDF/TDF3 automatically
    const stream = await dsp.read({
      source: bufferedSource,
    });

    // Convert the resulting stream/ReadableStream to text
    return new Response(stream).text();
}

let isInitialized = false;
let workerConfig: WorkerInitData['config'];
let workerUser: WorkerInitData['user'];

self.onmessage = async (event: MessageEvent<WorkerInitData | WorkerMessageData>) => {
    // Initialization
    if ('config' in event.data && 'user' in event.data) {
        workerConfig = event.data.config;
        workerUser = event.data.user;
        isInitialized = true;
        self.postMessage({ type: 'init-complete' });
        return;
    }

    // Decryption
    if (!isInitialized) {
        console.error('Worker received decryption message before initialization.');
        return;
    }

    const { tdfBlobBuffer } = event.data as WorkerMessageData;

    let decryptedPayload: string | null = null;
    let error = null;

    if (tdfBlobBuffer && tdfBlobBuffer.byteLength > 0) {
        try {
            decryptedPayload = await decryptWorkerPayload(tdfBlobBuffer, workerConfig, workerUser);
        } catch (err) {
            error = err;
            console.error('Worker Decryption Error:', err);
        }
    }

    self.postMessage({
        type: 'decryption-result',
        decryptedPayload,
        error: error ? String(error) : null,
    });
};
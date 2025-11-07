import { AuthUser } from '@/contexts/AuthContext';
import { AuthProviders, NanoTDFClient, TDF3Client, DecryptSource } from '@opentdf/client';
import { config } from '@/config';
import { useAuth } from './useAuth';

/** Creates a new instance of an OIDC Auth Provider consumed by the TDF Clients */
async function createAuthProvider(user: AuthUser | null) {
  if (!user) {
    throw new Error('TDF Clients require an authenticated user');
  }

  const { refreshToken } = user;

  if (!refreshToken) {
    throw new Error('TDF AuthProvider creation failed, no refresh token found for user');
  }

  return await AuthProviders.refreshAuthProvider({
    clientId: config.dsp.keycloak.clientId,
    exchange: 'refresh',
    refreshToken,
    oidcOrigin: config.dsp.keycloak.serverUrl,
  });
}

/** Converts a string payload into a the data type expected by the TDF3Client */
function stringToReadableStream(input: string): ReadableStream<Uint8Array> {
  // Encode the string into a Uint8Array
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(input);

  // Create a ReadableStream
  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Enqueue the Uint8Array into the stream
      controller.enqueue(uint8Array);
      // Close the stream
      controller.close();
    },
  });
}

/*
 * This hook exposes two functions:
 * - encrypt: Encrypts a plaintext string as either a ZTDF (TDF3) by default or a NanoTDF if configured
 * - decrypt: Inspects encrypted payload to determine if it is a NanoTDF or TDF3 and decrypts accordingly
 */
export function useTDF() {
  const { user } = useAuth();

  const encryptNano = async (plaintext: string, attrs: string[]): Promise<ArrayBuffer> => {
    const client = new NanoTDFClient({
      authProvider: await createAuthProvider(user),
      kasEndpoint: config.dsp.kasUrl,
      dpopEnabled: false,
    });
    for (const attr of attrs) {
      client.addAttribute(attr);
    }
    return client.encrypt(plaintext);
  };

  const encryptZTDF = async (plaintext: string, attrs: string[]): Promise<ArrayBuffer> => {
    const client = new TDF3Client({
      authProvider: await createAuthProvider(user),
      kasEndpoint: config.dsp.kasUrl,
      dpopEnabled: false,
      allowedKases: [config.dsp.kasUrl],
    });
    const readable = await client.encrypt({
      scope: { attributes: attrs },
      source: stringToReadableStream(plaintext),
      offline: true,
    });
    return readable.toBuffer();
  };

  const encrypt = async (plaintext: string, attrs: string[]): Promise<ArrayBuffer> => {
    // environment variables end up strings even when defined as boolean in TS
    if (config.formSubmitNanoTdf === 'false' || !config.formSubmitNanoTdf) {
      console.debug('Encrypting as TDF3...');
      return encryptZTDF(plaintext, attrs);
    } else {
      console.debug('Encrypting as NanoTDF...');
      return encryptNano(plaintext, attrs);
    }
  };

  const decryptNano = async (ciphertext: ArrayBuffer): Promise<string> => {
    const client = new NanoTDFClient({
      authProvider: await createAuthProvider(user),
      kasEndpoint: config.dsp.kasUrl,
      dpopEnabled: false,
    });
    const buffer = await client.decrypt(ciphertext);
    return new TextDecoder().decode(buffer);
  };

  const decryptTdf3 = async (ciphertext: ArrayBuffer): Promise<string> => {
    const client = new TDF3Client({
      authProvider: await createAuthProvider(user),
      kasEndpoint: config.dsp.kasUrl,
      dpopEnabled: false,
      allowedKases: [config.dsp.kasUrl],
    });
    const buffered: DecryptSource = {
      type: 'buffer',
      location: new Uint8Array(ciphertext),
    };
    return (await client.decrypt({ source: buffered })).toString();
  };

  const decrypt = async (ciphertext: ArrayBuffer): Promise<string> => {
    // Expected bytes corresponding to Magic Number 'L1L' ASCII characters
    // For more info, see: https://github.com/opentdf/spec/tree/main/schema/nanotdf#3311-magic-number--version
    const expectedBytes = new Uint8Array([0x4c, 0x31, 0x4c]);

    // Create a Uint8Array view of the buffer
    const view = new Uint8Array(ciphertext);

    // Check if the first three bytes match the Magic Number
    for (let i = 0; i < 3; i++) {
      if (view[i] !== expectedBytes[i]) {
        console.debug('Detected TDF3 and decrypting...');
        return decryptTdf3(ciphertext);
      }
    }

    console.debug('Detected NanoTDF and decrypting...');
    return decryptNano(ciphertext);
  };

  return {
    decrypt,
    encrypt,
  };
}

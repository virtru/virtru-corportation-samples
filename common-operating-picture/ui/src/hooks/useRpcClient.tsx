import { TdfObject, QueryTdfObjectsRequest, UpdateTdfObjectRequest, UpdateTdfObjectResponse } from '@/proto/tdf_object/v1/tdf_object_pb';
import { QueryTdfNotesRequest, TdfNote } from '@/proto/tdf_object/v1/tdf_note_pb';
import { PartialMessage } from '@bufbuild/protobuf';
import { crpcClient, drpcClient } from '@/api/connectRpcClient';
import { useTDF } from './useTdf';
import { useAuth } from './useAuth';

export type TdfObjectResponse = {
  tdfObject: TdfObject;
  decryptedData: any;
}
export type TdfNotesResponse = {
  tdfNote: TdfNote;
  decryptedData: any;
}

const tdfObjectCache = new Map<string, any>();

export function useRpcClient() {
  const { decrypt } = useTDF();
  const { user } = useAuth();

  function clearTdfObjectCache() {
    tdfObjectCache.clear();
    console.log("TDF Object Cache cleared.");
  }

  // Modified from original to handle moving objects and caching
  async function transformTdfObject(tdfObject: TdfObject): Promise<TdfObjectResponse> {
  const objectId = tdfObject.id;

    // Cache Check
    if (tdfObjectCache.has(objectId)) {
      //console.debug(`Cache match for: ${objectId}`);
      const decryptedData = tdfObjectCache.get(objectId);
      return {
        tdfObject,
        decryptedData,
      };
    }

    // If not in cache, proceed to decrypt
    let decryptedData = null;

    if (tdfObject.tdfBlob && tdfObject.tdfBlob.length > 0) {
      try {
        console.debug(`Cache miss, decrypting TDF object ID: ${objectId}`);
        const decryptedPayload = await decrypt(tdfObject.tdfBlob.buffer);
        decryptedData = JSON.parse(decryptedPayload);

        // Store vehicles in cache
        if (tdfObject.srcType === 'vehicles') {
          tdfObjectCache.set(objectId, decryptedData);
        }
      } catch (err) {
        console.error('Error decrypting or parsing data:', err);
      }
    }

    return {
      tdfObject,
      decryptedData,
    };
  }

  async function transformNoteObject(tdfNote: TdfNote): Promise<TdfNotesResponse | null> {
    try {
      const decryptedData = await decrypt(tdfNote.tdfBlob.buffer);

      // Attempt to parse the decrypted data
      try {
        const parsedData = JSON.parse(decryptedData);
        return { tdfNote, decryptedData: parsedData };
      } catch (err) {
        console.error('Error parsing decrypted data:', err);
        return null;
      }
    } catch (err) {
      console.error('Error decrypting data:', err);
      return null; // Return null if decryption fails
    }
  }


  async function queryTdfObjects(request: PartialMessage<QueryTdfObjectsRequest>): Promise<TdfObjectResponse[]> {
    const response = await crpcClient.queryTdfObjects(request, { headers: { 'Authorization': user?.accessToken || '' } });
    const tdfObjectResponses = await Promise.all(response.tdfObjects.map(transformTdfObject));
    // todo: replace this with filter(not null) once we can upgrade to latest TS version w/ type inference
    return tdfObjectResponses.filter((tdfObjectResponse: TdfObjectResponse | null): tdfObjectResponse is TdfObjectResponse => tdfObjectResponse !== null);
  }

  async function updateTdfObject(request: PartialMessage<UpdateTdfObjectRequest>): Promise<UpdateTdfObjectResponse> {
    const response = await crpcClient.updateTdfObject(request, { headers: { 'Authorization': user?.accessToken || '' } });
    return response;
  }

  async function queryNotes(request: PartialMessage<QueryTdfNotesRequest>): Promise<TdfNotesResponse[]> {
    console.log("Request: ",request);
    const response = await drpcClient.queryTdfNotes(request, { headers: { 'Authorization': user?.accessToken || '' } });
    console.log('Response:', response);
    const noteResponses = await Promise.all(response.tdfNotes.map(transformNoteObject));

    // Filter to remove null values
    return noteResponses.filter((tdfNoteResponse): tdfNoteResponse is TdfNotesResponse => tdfNoteResponse !== null);
  }

  return {
    queryNotes,
    createNoteObject: drpcClient.createTdfNote,
    updateTdfObject,
    queryTdfObjects,
    createTdfObject: crpcClient.createTdfObject,
    clearTdfObjectCache,
    getSrcType: crpcClient.getSrcType,
    listSrcTypes: crpcClient.listSrcTypes,
    streamTdfObjects: crpcClient.streamTdfObjects,
  };
}

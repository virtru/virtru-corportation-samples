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

  // Modified to merge Dynamic (Plaintext) and Static (Encrypted) data
  async function transformTdfObject(tdfObject: TdfObject): Promise<TdfObjectResponse> {
    const objectId = tdfObject.id;

    // 1. Extract Dynamic Data from Plaintext Search Field
    // This comes from sim_data3.py (Speed, Altitude, Heading)
    let dynamicData = {};
    try {
      if (tdfObject.search && tdfObject.search !== "null") {
        dynamicData = JSON.parse(tdfObject.search);
      }
    } catch (e) {
      console.warn("Failed to parse dynamic metadata", e);
    }


    let staticData = {};
    
    // Check Cache first
    if (tdfObjectCache.has(objectId)) {
      staticData = tdfObjectCache.get(objectId);
    } 
    // If not in cache, decrypt the blob
    else if (tdfObject.tdfBlob && tdfObject.tdfBlob.length > 0) {
      try {
        const decryptedPayload = await decrypt(tdfObject.tdfBlob.buffer);
        staticData = JSON.parse(decryptedPayload);

        // Cache the static identity data so we don't re-decrypt every frame
        if (tdfObject.srcType === 'vehicles') {
          tdfObjectCache.set(objectId, staticData);
        }
      } catch (err) {
        console.error('Error decrypting static data:', err);
      }
    }

    // 3. Merge them into one object for the UI
    const mergedData = { ...staticData, ...dynamicData };

    return {
      tdfObject,
      decryptedData: mergedData, 
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

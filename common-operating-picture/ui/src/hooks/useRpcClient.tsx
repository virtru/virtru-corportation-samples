import { TdfObject, QueryTdfObjectsRequest } from '@/proto/tdf_object/v1/tdf_object_pb';
import { PartialMessage } from '@bufbuild/protobuf';
import { crpcClient } from '@/api/connectRpcClient';
import { useTDF } from './useTdf';
import { useAuth } from './useAuth';

export type TdfObjectResponse = {
  tdfObject: TdfObject;
  decryptedData: any;
}

export function useRpcClient() {
  const { decrypt } = useTDF();
  const { user } = useAuth();

  async function transformTdfObject(tdfObject: TdfObject): Promise<TdfObjectResponse | null> {
    try {
      const decryptedData = JSON.parse(await decrypt(tdfObject.tdfBlob.buffer));
      return {
        tdfObject,
        decryptedData,
      };
    } catch (err) {
      console.error('Error decrypting data, you might not be entitled to it:', err);
      return null;
    }
  }

  async function queryTdfObjects(request: PartialMessage<QueryTdfObjectsRequest>): Promise<TdfObjectResponse[]> {
    const response = await crpcClient.queryTdfObjects(request, { headers: { 'Authorization': user?.accessToken || '' } });
    const tdfObjectResponses = await Promise.all(response.tdfObjects.map(transformTdfObject));
    // todo: replace this with filter(not null) once we can upgrade to latest TS version w/ type inference
    return tdfObjectResponses.filter((tdfObjectResponse): tdfObjectResponse is TdfObjectResponse => tdfObjectResponse !== null);
  }

  return {
    queryTdfObjects,
    createTdfObject: crpcClient.createTdfObject,
    getSrcType: crpcClient.getSrcType,
    listSrcTypes: crpcClient.listSrcTypes,
    streamTdfObjects: crpcClient.streamTdfObjects,
  };
}

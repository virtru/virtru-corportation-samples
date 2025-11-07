import { createConnectTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
import { config } from '@/config';
import { TdfObjectService } from '@/proto/tdf_object/v1/tdf_object_connect';

const transport = createConnectTransport({
  baseUrl: config.grpcServerUrl,
});

export const crpcClient = createPromiseClient(TdfObjectService, transport);

import { useEffect } from 'react';
import { useRpcClient } from '@/hooks/useRpcClient';
import { PageTitle } from '@/components/PageTitle';
import { TimestampSelector } from '@/proto/tdf_object/v1/tdf_object_pb';
import { Timestamp } from '@bufbuild/protobuf';

/**
 * TODO: Temporary placeholder component for testing Nifi record decryption
 */
export function Nifi() {
  const { queryTdfObjects } = useRpcClient();

  useEffect(() => {
    const getData = async () => {
      const results = await queryTdfObjects({
        srcType: 'unit',
        tsRange: new TimestampSelector({
          greaterOrEqualTo: Timestamp.fromDate(new Date('2023-01-01')),
        }),
      });

      console.log(results);
    };

    getData();
  }, []);

  return (
    <>
      <PageTitle title="Nifi" />
    </>
  );
}

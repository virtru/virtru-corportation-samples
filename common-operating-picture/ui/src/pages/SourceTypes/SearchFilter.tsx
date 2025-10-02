import { useEffect, useState, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TdfObjectResponse, useRpcClient } from '@/hooks/useRpcClient';
import { Alert, Backdrop, Box, Button, CircularProgress, Popover } from '@mui/material';
import { FilterAlt } from '@mui/icons-material';
import { useSourceType } from './SourceTypeContext';
import { ErrorListTemplate } from '@/components/JsonSchemaForm/ErrorListTemplate';
import { RJSFSchema } from '@rjsf/utils';
import Form, { IChangeEvent, withTheme } from '@rjsf/core';
import { Theme as RJSFFormMuiTheme } from '@rjsf/mui';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { BannerContext, ClassificationPriority, Classifications, extractValues } from '@/contexts/BannerContext';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { LatLng, Map } from 'leaflet';
import { TimestampSelector } from '@/proto/tdf_object/v1/tdf_object_pb';
import dayjs from 'dayjs';
import { Timestamp } from '@bufbuild/protobuf';

const validator = customizeValidator<any>();
const SearchForm = withTheme<any, RJSFSchema>(RJSFFormMuiTheme);

type QueryParamState = {
  formData: any;
  mapState: {
    center: LatLng;
    zoom: number;
  }
}

type Props = {
  map: Map | null;
  onSearch: (results: TdfObjectResponse[]) => void;
}

export function SearchFilter({ map, onSearch }: Props) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { id: srcTypeId, searchFormSchema } = useSourceType();
  const { setClassification, setNeedToKnow, setRelTo, setSearchIsActive, setHasResults } = useContext(BannerContext);
  const { queryTdfObjects } = useRpcClient();

  const formRef = useRef<Form<any, RJSFSchema> | null>(null);
  const [formData, setFormData] = useState<any>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const updateBanner = (response: TdfObjectResponse[]) => {
    let classPriority = 0;
    let needToKnow = new Set();
    let relTo = new Set();
    setHasResults(true);
    response.forEach((o) => {
      classPriority = Math.max(classPriority, ClassificationPriority[extractValues(o.decryptedData.attrClassification) as keyof typeof ClassificationPriority]);
      needToKnow = new Set([...needToKnow, ...extractValues(o.decryptedData.attrNeedToKnow || []).split(', ')]);
      relTo = new Set([...relTo, ...extractValues(o.decryptedData.attrRelTo || []).split(', ')]);
    });
    setClassification(Classifications[classPriority]);
    setNeedToKnow([...needToKnow].join(', '));
    setRelTo([...relTo].join(', '));
  };

  const fetchTdfObjects = async (searchFormData: any) => {
    const tsRange = new TimestampSelector();
    const { startDate, endDate, ...searchJson } = searchFormData;

    if (startDate) {
      const dayJsValue = dayjs(startDate);
      tsRange.greaterOrEqualTo = Timestamp.fromDate(dayJsValue.toDate());
    }
    
    if (endDate) {
      const dayJsValue = dayjs(endDate);
      tsRange.lesserOrEqualTo = Timestamp.fromDate(dayJsValue.toDate());
    }
    
    let geoLocation = '';
    if (map) {
      // todo: prob a simpler way to create the bbox to pass to RPC request, but it works
      
      const bounds = map.getBounds();
      const nw = bounds.getNorthWest();
      const ne = bounds.getNorthEast();
      const se = bounds.getSouthEast();
      const sw = bounds.getSouthWest();
      
      const bboxPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [nw.lng, nw.lat],
            [ne.lng, ne.lat],
            [se.lng, se.lat],
            [sw.lng, sw.lat],
            // duplicated because polygon type requires the first and last coords to be the same
            [nw.lng, nw.lat],
          ],
        ],
      };
      geoLocation = JSON.stringify(bboxPolygon);
    }

    return queryTdfObjects({
      srcType: srcTypeId,
      tsRange,
      search: JSON.stringify(searchJson),
      geoLocation,
    });
  };

  const handleSearch = async (data: IChangeEvent<any, RJSFSchema>) => {
    const { formData: searchFormData } = data;
    if (!searchFormData) {
      return;
    }

    // this should never be undefined, but satisfying TS
    if (!map) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      setHasResults(false);

      const response = await fetchTdfObjects(searchFormData);

      if (response.length) {
        updateBanner(response);
      }

      setMenuAnchorEl(null);
      setFormData(searchFormData);
      onSearch(response);
      setSearchParams(params => {
        const queryState: QueryParamState = {
          formData: searchFormData,
          mapState: {
            center: map.getCenter(),
            zoom: map.getZoom(),
          },
        };
        const encodedFormData = compressToEncodedURIComponent(JSON.stringify(queryState));
        params.set('q', encodedFormData);
        return params;
      });
    } catch (err) {
      console.error('Error querying TDF objects:', err);
      setError('Server error encountered, please try again later.');
      setHasResults(false);
      onSearch([]);
      setSearchParams(params => {
        params.delete('q');
        return params;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get('q');
    
    if (!query) {
      setFormData({});
      return;
    }

    if (!map) {
      return;
    }

    try {
      const decodedJsonString = decompressFromEncodedURIComponent(query);
      const { formData, mapState }: QueryParamState = JSON.parse(decodedJsonString);
      setFormData(formData);
      map.flyTo(mapState.center, mapState.zoom);
    } catch (err) {
      console.error('Error parsing query state:', err);
      setFormData({});
      setSearchParams(params => {
        params.delete('q');
        return params;
      });
    }
  }, [searchParams, map]);

  useEffect(() => {
    setSearchIsActive(Boolean(menuAnchorEl));
  }), [menuAnchorEl];

  return (
    <>
      <Button variant="contained" onClick={e => setMenuAnchorEl(e.currentTarget)} startIcon={<FilterAlt />}>Filter</Button>
      <Popover 
        open={Boolean(menuAnchorEl)}
        anchorEl={menuAnchorEl}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box p={2} sx={{ maxWidth: '500px', position: 'relative', zIndex: 0 }}>
          <Alert severity="info" variant="filled">
            Results limited to data within viewable map bounds
          </Alert>
          {error && <Alert severity="error" variant="filled" sx={{ mt: 2 }}>{error}</Alert>}
          <SearchForm 
            schema={searchFormSchema.form}
            uiSchema={searchFormSchema.ui}
            formData={formData}
            ref={formRef}
            validator={validator}
            onChange={(data, id) => {
              id = id || ''.replace('root_', '');
              let fx;
              switch(id) {
                case 'attrClassification':
                  fx = setClassification;
                  break;
                case 'attrNeedToKnow':
                  fx = setNeedToKnow;
                  break;
                case 'attrRelTo':
                  fx = setRelTo;
                  break;
                default:
                  fx = () => {};
              }

              fx(data.formData[id]);
            }}
            onSubmit={handleSearch}
            templates={{ ErrorListTemplate }}
            noHtml5Validate
          />
          <Button variant="contained" onClick={() => formRef.current?.submit()} sx={{ mt: 2 }}>
            Search
          </Button>
          <Backdrop open={loading} sx={{ position: 'absolute', zIndex: 10 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={35} thickness={8} /> loading...
            </Box>
          </Backdrop>
        </Box>
      </Popover>
    </>
  );
}

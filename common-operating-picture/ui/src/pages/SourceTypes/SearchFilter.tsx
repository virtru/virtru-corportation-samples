import { useEffect, useState, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRpcClient } from '@/hooks/useRpcClient';
import { Alert, Backdrop, Box, Button, CircularProgress, Popover } from '@mui/material';
import { FilterAlt } from '@mui/icons-material';
import { useSourceType } from './SourceTypeContext';
import { ErrorListTemplate } from '@/components/JsonSchemaForm/ErrorListTemplate';
import { RJSFSchema } from '@rjsf/utils';
import Form, { IChangeEvent, withTheme } from '@rjsf/core';
import { Theme as RJSFFormMuiTheme } from '@rjsf/mui';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { BannerContext, calculateBannerAttributes } from '@/contexts/BannerContext';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { LatLng, Map } from 'leaflet';
import { TimestampSelector } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import dayjs from 'dayjs';
import { Timestamp } from '@bufbuild/protobuf';
import { useAuth } from '@/hooks/useAuth';
import { checkAndSetUnavailableAttributes, checkObjectEntitlements } from '@/utils/attributes';

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
  //onSearch: (results: TdfObjectResponse[]) => void;
}

export function SearchFilter({ map }: Props) { //onSearch removed
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // State to store original banner values
  const [originalClassification, setOriginalClassification] = useState('');
  const [originalNeedToKnow, setOriginalNeedToKnow] = useState('');
  const [originalRelTo, setOriginalRelTo] = useState('');

  // Define entitlements and unavailableAttrs state correctly
  const [unavailableAttrs, setUnavailAttrs] = useState<string[]>([]);

  // Use useAuth to get user and error status
  const { user, error: authCtxError } = useAuth();

  const { id: srcTypeId, searchFormSchema } = useSourceType();

  const {
    setClassification,
    setNeedToKnow,
    setRelTo,
    setHasResults,
    setSearchIsActive, // Need to pull setSearchIsActive back in
    classification: activeClassification, // Need current values to save them
    needToKnow: activeNeedToKnow,
    relTo: activeRelTo,
    activeEntitlements,
    setTdfObjects,
  } = useContext(BannerContext);

  const { queryTdfObjects } = useRpcClient();

  const formRef = useRef<Form<any, RJSFSchema> | null>(null);
  const [formData, setFormData] = useState<any>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Handler to open the menu and save current banner state
  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Save current active banner values
    setOriginalClassification(activeClassification);
    setOriginalNeedToKnow(activeNeedToKnow);
    setOriginalRelTo(activeRelTo);

    setSearchIsActive(true); // Update banner context state
    setMenuAnchorEl(e.currentTarget); // Open the popover
  };

  // Handler to close the menu, restoring original banner state
  const handleCancel = () => {
    // Restore the classification, needToKnow, and relTo from the stored originals
    setClassification(originalClassification);
    setNeedToKnow(originalNeedToKnow);
    setRelTo(originalRelTo);

    setSearchIsActive(false); // Update banner context state
    setMenuAnchorEl(null); // Close the popover
  };

  const { geoField, attrFields } = useSourceType();

  const renderAttributesAlert = () => {
    if (authCtxError) {
      return (
        <Alert severity="error" variant="filled" sx={{ mt: 2 }}>
          <strong>Error loading entitlements, please reauthenticate to try again.</strong>
        </Alert>
      );
    }

    // Add logic for checking entitlements loading state
    if (activeEntitlements.size === 0 && user?.entitlements?.length) {
      return (
        <Alert severity="info" variant="filled" sx={{ mt: 2 }}>
          <strong>Loading entitlements...</strong>
        </Alert>
      );
    }

    if (unavailableAttrs.length) {
      return (
        <Alert severity="warning" variant="filled" sx={{ mt: 2 }}>
          <strong>The following attributes are not available to you:</strong>
          {unavailableAttrs.map(attr => (
            <li key={attr}>{attr}</li>
          ))}
        </Alert>
      );
    }

    return null;
  };

  const handleChange = (data: IChangeEvent<any, RJSFSchema>) => {
    // Use new util in attributes.ts
    checkAndSetUnavailableAttributes(
        data,
        attrFields,
        activeEntitlements,
        setUnavailAttrs
    );

    if (!geoField) {
      return;
    }
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
            // duplicated because polygon type requires the
            // first and last coords to be the same
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

    // Block search if unavailiable attributes
    if (unavailableAttrs.length > 0) {
        console.warn('Attempted search with missing entitlements. Submission blocked.');
        return;
    }

    try {
      setError('');
      setLoading(true);
      setHasResults(false);

      const response = await fetchTdfObjects(searchFormData);

      const filteredResponse = response.filter(tdfObject => {
          // Keep the queried tdf object if it does not contain unavailable attributes
          return !checkObjectEntitlements(tdfObject, activeEntitlements);
      });

      if (filteredResponse.length) {
            const { classification, needToKnow, relTo } = calculateBannerAttributes(filteredResponse);
            setClassification(classification);
            setNeedToKnow(needToKnow);
            setRelTo(relTo);
            setHasResults(true);
        } else {
          // Clear banner if no results
          setClassification('');
          setNeedToKnow('');
          setRelTo('');
          setHasResults(false);
      }

      setSearchIsActive(false);
      setMenuAnchorEl(null);
      setFormData(searchFormData);
      setTdfObjects(filteredResponse);

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
      setTdfObjects([]);
      //onSearch([]);
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
      {/* <Button variant="contained" onClick={e => setMenuAnchorEl(e.currentTarget)} startIcon={<FilterAlt />}>Filter</Button> */}
      <Button variant="contained" onClick={handleOpenMenu} startIcon={<FilterAlt />}>Filter</Button>
      <Popover
        open={Boolean(menuAnchorEl)}
        anchorEl={menuAnchorEl}
        // onClose={() => setMenuAnchorEl(null)}
        onClose={handleCancel}
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
          {renderAttributesAlert()}
          <SearchForm
            schema={searchFormSchema.form}
            uiSchema={searchFormSchema.ui}
            formData={formData}
            ref={formRef}
            validator={validator}
            onChange={handleChange}
            onSubmit={handleSearch}
            templates={{ ErrorListTemplate }}
            noHtml5Validate
          />
          <Button variant="contained" onClick={() => formRef.current?.submit()} sx={{ mt: 2 }}>
            Search
          </Button>
          <Button onClick={handleCancel}>Cancel</Button>
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

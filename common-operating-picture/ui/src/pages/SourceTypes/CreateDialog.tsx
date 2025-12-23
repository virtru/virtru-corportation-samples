import { useRef, useState, useContext } from 'react';
import { LatLng } from 'leaflet';
import { useTDF } from '@/hooks/useTdf';
import { useRpcClient } from '@/hooks/useRpcClient';
import { useAuth } from '@/hooks/useAuth';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid } from '@mui/material';
import { MapPicker } from '@/components/Map/Picker';
import { ErrorListTemplate } from '@/components/JsonSchemaForm/ErrorListTemplate';
import { useSourceType } from './SourceTypeContext';
import Form, { IChangeEvent, withTheme } from '@rjsf/core';
import { RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Theme as RJSFFormMuiTheme } from '@rjsf/mui';
import { getAttributes } from '@/utils/attributes';
import { Country, countryFromPoint } from '@/utils/countries';
import { CreateTdfObjectRequest } from '@/proto/tdf_object/v1/tdf_object_pb.ts';
import { PartialMessage, Timestamp } from '@bufbuild/protobuf';
import dayjs from 'dayjs';
import { Alert } from '@mui/material';
import { BannerContext } from '@/contexts/BannerContext';
import { checkAndSetUnavailableAttributes } from '@/utils/attributes';

type Props = {
  open: boolean;
  onClose: () => void;
}

const formValidator = customizeValidator<any>();
const CopForm = withTheme<any, RJSFSchema>(RJSFFormMuiTheme);
const formIdPrefix = 'srcTypeForm';

export function CreateDialog({ open, onClose }: Props) {
  const [mapPosition, setMapPosition] = useState<LatLng>();
  const [ unavailableAttrs, setUnavailAttrs ] = useState<string[]>([]);

  const {
    activeEntitlements,
  } = useContext(BannerContext);

  const formRef = useRef<Form<any, RJSFSchema> | null>(null);

  const { user, error: authCtxError } = useAuth();
  const { id, geoField, attrFields, searchFields, tsField, createFormSchema } = useSourceType();
  const { encrypt } = useTDF();
  const { createTdfObject } = useRpcClient();

  const handleCancel = () => {
    onClose();
  };

  const handleMapPositionChange = (newPosition: LatLng) => {
    if (!formRef.current) {
      return;
    }

    if (!geoField) {
      return;
    }

    const { lat, lng } = newPosition;
    const country = countryFromPoint([lng, lat]);

    formRef.current.setState(state => ({
      formData: {
        ...state.formData,
        [geoField]: country || state.formData[geoField],
      },
    }));

    setMapPosition(newPosition);
  };

  const handleChange = (data: IChangeEvent<any, RJSFSchema>, fieldName?: string) => {
    const { formData } = data;

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

    if (fieldName !== `${formIdPrefix}_${geoField}`) {
      return;
    }

    const geoFieldValue = formData[geoField] as Country;

    if (!geoFieldValue) {
      setMapPosition(undefined);
      return;
    }

    const { latitude, longitude } = geoFieldValue;
    setMapPosition(new LatLng(latitude, longitude));
  };

  const handleSubmit = async (data: IChangeEvent<any, RJSFSchema>) => {
    const { formData } = data;
    if (!formData) {
      return;
    }

    // Disable search if unauthorized entitlements
    if (unavailableAttrs.length > 0) {
        console.warn('Attempted search with missing entitlements. Submission blocked.');
        return;
    }

    try {
      const attrs: string[] = [];
      for (const field of attrFields || []) {
        if (formData[field]) {
          attrs.push(...getAttributes(formData[field]));
        }
      }

      //console.debug('Form Data to submit:', formData);
      //console.debug('Attributes for encryption:', attrs);

      const tdfBlob = await encrypt(JSON.stringify(formData), attrs);

      const tdfObject: PartialMessage<CreateTdfObjectRequest> = {
        srcType: id,
        tdfBlob: new Uint8Array(tdfBlob),
      };

      if (geoField) {
        // override with map position to keep selections
        const { lat, lng } = mapPosition!;
        const geoFieldValue = formData[geoField] as Country;
        geoFieldValue.latitude = lat;
        geoFieldValue.longitude = lng;

        const geo: GeoJSON.Point = {
          type: 'Point',
          coordinates: [
            lng, // X
            lat, // Y
          ],
        };
        tdfObject.geo = JSON.stringify(geo);
      }

      //console.debug('Geos:', tdfObject.geo);
      //console.debug('Attrs:', attrs);


      const searchPlaintext: Record<string, any> = {};
      for (const field of searchFields || []) {
        if (formData[field]) {
          searchPlaintext[field] = formData[field];
        }
      }
      if (Object.keys(searchPlaintext).length > 0) {
        tdfObject.search = JSON.stringify(searchPlaintext);
      }

      if (tsField) {
        const utcDate = dayjs(formData[tsField]).utc().toDate();
        tdfObject.ts = Timestamp.fromDate(utcDate);
      }
      //console.debug('Timestamp:', tdfObject);
      //const response =
      await createTdfObject(tdfObject);
      //console.debug('Form submission successful:', response);

      onClose();
    } catch (err) {
      console.error('Form submission failed:', err);
    }
  };

  const renderAttributesAlert = () => {
    if (authCtxError) {
      return (
        <Alert severity="error" variant="filled">
          <strong>Error loading entitlements, please reauthenticate to try again.</strong>
        </Alert>
      );
    }


    /**
     * todo: Hack for loading state during entitlements retrieval
     *
     * The entitlements are loaded and will either be a populated or empty set, and
     * the 'loading' entry will be removed at that point.
     */
    // Use active enetilements
    if (activeEntitlements.size === 0 && user?.entitlements?.length) {
      return (
        <Alert severity="info" variant="filled">
          <strong>Loading entitlements...</strong>
        </Alert>
      );
    }

    if (unavailableAttrs.length) {
      return (
        <Alert severity="warning" variant="filled">
          <strong>The following attributes are not available to you:</strong>
          {unavailableAttrs.map(attr => (
            <li key={attr}>{attr}</li>
          ))}
        </Alert>
      );
    }

    return null;
  };

  /*
  useEffect(() => {
    if (user) {
      updateEntitlementsFromUser(user, setEntitlements);

      //Printing locally read entitlements
      console.log('User Entitlements:', user.entitlements);
    }
  }, [user]);
  */

  return (
    <Dialog open={open} fullScreen sx={{ margin: '5%' }}>
      {renderAttributesAlert()}
      <DialogTitle sx={{ textTransform: 'capitalize' }}>New {id}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <MapPicker value={mapPosition} onChange={handleMapPositionChange} />
          </Grid>
          <Grid item xs={12} md={5}>
            {/* todo: simplify this maybe or add a loading indicator if necessary? */}
            {createFormSchema && (
              <CopForm
                schema={createFormSchema.form}
                uiSchema={createFormSchema.ui}
                ref={formRef}
                validator={formValidator}
                onSubmit={handleSubmit}
                onChange={handleChange}
                templates={{ ErrorListTemplate }}
                idPrefix={formIdPrefix}
                autoComplete="off"
                noHtml5Validate
              />
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" onClick={() => formRef.current?.submit()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

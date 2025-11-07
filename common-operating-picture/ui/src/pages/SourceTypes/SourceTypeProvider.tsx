import { ReactNode, useEffect, useState } from 'react';
import { RJSFSchema, UiSchema, WidgetProps } from '@rjsf/utils';
import { SrcType, SrcTypeUiSchema } from '@/proto/tdf_object/v1/tdf_object_pb';
import { Context, DynamicFormSchema } from './SourceTypeContext';
import { LocationAutocompleteWidget } from '@/components/JsonSchemaForm/LocationAutocompleteWidget';
import { AttributeAutocompleteWidget } from '@/components/JsonSchemaForm/AttributeAutocompleteWidget';
import { DatePickerWidget } from '@/components/JsonSchemaForm/DatePickerWidget';
import { DateTimePickerWidget } from '@/components/JsonSchemaForm/DateTimePickerWidget';
import { propertyOf } from 'lodash';

//  TODO: If using a 'key.key' query on an object, the code below may need to be updated further.

function buildUiSchema(schemaConfig?: SrcTypeUiSchema): UiSchema {
  const uiSchema: UiSchema = {
    // disable submit by default as the modal has a submit button already
    'ui:submitButtonOptions': {
      norender: true,
    },
  };

  if (schemaConfig) {
    uiSchema['ui:order'] = schemaConfig.order;

    for (const field of Object.keys(schemaConfig.fieldConfig)) {
      uiSchema[field] = {};

      const { widget, placeholder, multiple } = schemaConfig.fieldConfig[field];

      if (placeholder) {
        uiSchema[field]['ui:placeholder'] = placeholder;
      }

      if (multiple) {
        uiSchema[field]['ui:options'] = {
          multiple: true,
        };
      }

      let uiWidget: string | ((props: WidgetProps) => JSX.Element);
      switch (widget) {
        case 'LocationAutocomplete':
          uiWidget = LocationAutocompleteWidget;
          break;
        case 'AttributeAutocomplete':
          uiWidget = AttributeAutocompleteWidget;
          break;
        case 'DatePicker':
          uiWidget = DatePickerWidget;
          break;
        default:
          uiWidget = widget;
      }

      if (uiWidget) {
        uiSchema[field]['ui:widget'] = uiWidget;
      }
    }
  }

  return uiSchema;
}

type Props = {
  children: ReactNode;
  srcType?: SrcType;
};

export function SourceTypeProvider({ children, srcType }: Props) {

  const [createFormSchema, setCreateFormSchema] = useState<DynamicFormSchema>({ form: {}, ui: {} });
  const [searchFormSchema, setSearchFormSchema] = useState<DynamicFormSchema>({ form: {}, ui: {} });

  useEffect(() => {
    if (!srcType) {
      return;
    }

    const { formSchema, uiSchema, metadata } = srcType;

    if (!formSchema) {
      // todo: show user message that source type does not have a form?
      throw new Error('SourceType does not have a form schema');
    }

    // Clone schema to safely mutate
    let createFormSchema: RJSFSchema = JSON.parse(JSON.stringify(formSchema.toJson()));

    // Log original schema for debugging
    console.log('CreateFormSchema:', JSON.stringify(createFormSchema, null, 2));
    console.log('Definitions:', JSON.stringify(createFormSchema.definitions, null, 2));

    //const createFormSchema: RJSFSchema = formSchema.toJson();
    // Strip fields from schemas
    const problematicFields = [ 'temp'
      //'attrRelTo' //'attrNeedToKnow',
      //'count' //'description', 'documentId', 'sourceId',// 'stage', 'siteId'
    ];

    //console.log('Original CreateFormSchema:', Object.keys(createFormSchema.properties || {}));

    // Remove allOf
    //if (createFormSchema.allOf) {
    //  console.warn('Removing allOf from createFormSchema for testing');
    //  delete createFormSchema.allOf;
    //}

    //Strip readOnly and remove problematic fields from createFormSchema
    // TO REMOVE
    Object.entries(createFormSchema.properties || {}).forEach(([key, prop]: [string, any]) => {
      if (prop?.readOnly) {
        console.warn(`⚠️ readOnly from "${key}"`);
        //delete prop.readOnly;
      }

      // TO REMOVE
      if (problematicFields.includes(key)) {
        console.warn(`🚫 Removing problematic field from createFormSchema: "${key}"`);
        delete createFormSchema.properties?.[key];
      }
    });

    const searchFormSchema: RJSFSchema = {
      type: 'object',
      definitions: createFormSchema.definitions,
      properties: {
        startDate: {
          type: 'string',
          format: 'date-time',
          title: 'Start Date',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          title: 'End Date',
        },
        // pull property definitions for searchable fields
        ...(metadata?.searchFields || []).reduce((schema: any, field: string) => {

          if (problematicFields.includes(field)) {
            console.warn(`Skipping potentially problematic field: ${field}`);
            return schema;
          }


          const prop = createFormSchema.properties?.[field];

          if (!prop) {
          console.warn(`⚠️ Field "${field}" is not defined in createFormSchema.properties`);
          return schema;
          }


          try {
            console.log(`Field: ${field}`, JSON.stringify(prop, null, 2));
          } catch (err) {
            console.error(`Could not stringify field "${field}" — possible circular reference`, field);
          }

          schema[field] = prop;
          //schema[field] = createFormSchema.properties[field];
          return schema;
        }, {}),
      },
    };

    const createUiSchema = buildUiSchema(uiSchema);

    const searchUiSchema = Object.entries(createUiSchema).reduce((schema: any, [field, config]) => {
      if (field.startsWith('ui') || searchFormSchema.properties[field]) {
        schema[field] = config;
      }
      return schema;
    }, {});
    searchUiSchema['ui:order'] = ['startDate', 'endDate', ...(searchUiSchema['ui:order'] || []) ];
    searchUiSchema.startDate = {
      'ui:widget': DateTimePickerWidget,
    };
    searchUiSchema.endDate = {
      'ui:widget': DateTimePickerWidget,
    };

    //Logs
    console.log('✅ Final createFormSchema:', Object.keys(createFormSchema.properties || {}));
    console.log('✅ Final searchFormSchema:', Object.keys(searchFormSchema.properties || {}));

    setCreateFormSchema({
      form: createFormSchema,
      ui: createUiSchema,
    });

    setSearchFormSchema({
      form: searchFormSchema,
      ui: searchUiSchema,
    });

  }, [srcType]);

  if (!srcType) {
    return null;
  }

  const { geoField, searchFields, tsField, attrFields, displayFields, mapFields } = srcType.metadata || {};

  const value = {
    id: srcType.id,
    createFormSchema,
    searchFormSchema,
    tsField,
    geoField,
    searchFields,
    attrFields,
    displayFields,
    mapFields,
    getFieldTitle: (field: string = '') => propertyOf(createFormSchema.form.properties)(field)?.title || field.split('.').join(' '),
  };

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
}

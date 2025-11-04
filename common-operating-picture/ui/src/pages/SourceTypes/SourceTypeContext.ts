import { createContext, useContext } from 'react';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { SrcTypeMetadataDisplayFields, SrcTypeMetadataMapFields } from '@/proto/tdf_object/v1/tdf_object_pb';

export type DynamicFormSchema = {
  form: RJSFSchema;
  ui: UiSchema;
};

export type SourceTypeContext = {
  id: string;
  createFormSchema: DynamicFormSchema;
  searchFormSchema: DynamicFormSchema;
  tsField?: string;
  geoField?: string;
  searchFields?: string[];
  attrFields?: string[];
  displayFields?: SrcTypeMetadataDisplayFields;
  mapFields?: SrcTypeMetadataMapFields;
  // todo: make this simpler and remove need for this function
  getFieldTitle: (field?: string) => string;
};

export const Context = createContext<SourceTypeContext | null>(null);

export function useSourceType() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('useSourceType must be used within a SourceTypeProvider');
  }
  return ctx;
}

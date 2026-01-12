// package: tdf_notes.v1
// file: tdf_note/v1/tdf_note.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_timestamp_pb from "google-protobuf/google/protobuf/timestamp_pb";

export class TdfNote extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  hasTs(): boolean;
  clearTs(): void;
  getTs(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTs(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getParentId(): string;
  setParentId(value: string): void;

  getSearch(): string;
  setSearch(value: string): void;

  getTdfBlob(): Uint8Array | string;
  getTdfBlob_asU8(): Uint8Array;
  getTdfBlob_asB64(): string;
  setTdfBlob(value: Uint8Array | string): void;

  getTdfUri(): string;
  setTdfUri(value: string): void;

  hasCreatedAt(): boolean;
  clearCreatedAt(): void;
  getCreatedAt(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreatedAt(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getCreatedBy(): string;
  setCreatedBy(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TdfNote.AsObject;
  static toObject(includeInstance: boolean, msg: TdfNote): TdfNote.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TdfNote, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TdfNote;
  static deserializeBinaryFromReader(message: TdfNote, reader: jspb.BinaryReader): TdfNote;
}

export namespace TdfNote {
  export type AsObject = {
    id: string,
    ts?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    parentId: string,
    search: string,
    tdfBlob: Uint8Array | string,
    tdfUri: string,
    createdAt?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    createdBy: string,
  }
}

export class CreateTdfNoteRequest extends jspb.Message {
  getParentId(): string;
  setParentId(value: string): void;

  getSearch(): string;
  setSearch(value: string): void;

  getTdfBlob(): Uint8Array | string;
  getTdfBlob_asU8(): Uint8Array;
  getTdfBlob_asB64(): string;
  setTdfBlob(value: Uint8Array | string): void;

  getTdfUri(): string;
  setTdfUri(value: string): void;

  hasTs(): boolean;
  clearTs(): void;
  getTs(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTs(value?: google_protobuf_timestamp_pb.Timestamp): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateTdfNoteRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateTdfNoteRequest): CreateTdfNoteRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CreateTdfNoteRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateTdfNoteRequest;
  static deserializeBinaryFromReader(message: CreateTdfNoteRequest, reader: jspb.BinaryReader): CreateTdfNoteRequest;
}

export namespace CreateTdfNoteRequest {
  export type AsObject = {
    parentId: string,
    search: string,
    tdfBlob: Uint8Array | string,
    tdfUri: string,
    ts?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class CreateTdfNoteResponse extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateTdfNoteResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateTdfNoteResponse): CreateTdfNoteResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CreateTdfNoteResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateTdfNoteResponse;
  static deserializeBinaryFromReader(message: CreateTdfNoteResponse, reader: jspb.BinaryReader): CreateTdfNoteResponse;
}

export namespace CreateTdfNoteResponse {
  export type AsObject = {
    id: string,
  }
}

export class GetTdfNoteRequest extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTdfNoteRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetTdfNoteRequest): GetTdfNoteRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetTdfNoteRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTdfNoteRequest;
  static deserializeBinaryFromReader(message: GetTdfNoteRequest, reader: jspb.BinaryReader): GetTdfNoteRequest;
}

export namespace GetTdfNoteRequest {
  export type AsObject = {
    id: string,
  }
}

export class GetTdfNoteResponse extends jspb.Message {
  hasTdfNote(): boolean;
  clearTdfNote(): void;
  getTdfNote(): TdfNote | undefined;
  setTdfNote(value?: TdfNote): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTdfNoteResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetTdfNoteResponse): GetTdfNoteResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetTdfNoteResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTdfNoteResponse;
  static deserializeBinaryFromReader(message: GetTdfNoteResponse, reader: jspb.BinaryReader): GetTdfNoteResponse;
}

export namespace GetTdfNoteResponse {
  export type AsObject = {
    tdfNote?: TdfNote.AsObject,
  }
}

export class QueryTdfNotesRequest extends jspb.Message {
  getParentId(): string;
  setParentId(value: string): void;

  hasStartTs(): boolean;
  clearStartTs(): void;
  getStartTs(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setStartTs(value?: google_protobuf_timestamp_pb.Timestamp): void;

  hasEndTs(): boolean;
  clearEndTs(): void;
  getEndTs(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setEndTs(value?: google_protobuf_timestamp_pb.Timestamp): void;

  getSearch(): string;
  setSearch(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryTdfNotesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: QueryTdfNotesRequest): QueryTdfNotesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryTdfNotesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryTdfNotesRequest;
  static deserializeBinaryFromReader(message: QueryTdfNotesRequest, reader: jspb.BinaryReader): QueryTdfNotesRequest;
}

export namespace QueryTdfNotesRequest {
  export type AsObject = {
    parentId: string,
    startTs?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    endTs?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    search: string,
  }
}

export class QueryTdfNotesResponse extends jspb.Message {
  clearTdfNotesList(): void;
  getTdfNotesList(): Array<TdfNote>;
  setTdfNotesList(value: Array<TdfNote>): void;
  addTdfNotes(value?: TdfNote, index?: number): TdfNote;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): QueryTdfNotesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: QueryTdfNotesResponse): QueryTdfNotesResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: QueryTdfNotesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): QueryTdfNotesResponse;
  static deserializeBinaryFromReader(message: QueryTdfNotesResponse, reader: jspb.BinaryReader): QueryTdfNotesResponse;
}

export namespace QueryTdfNotesResponse {
  export type AsObject = {
    tdfNotesList: Array<TdfNote.AsObject>,
  }
}

export class StreamTdfNotesRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamTdfNotesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StreamTdfNotesRequest): StreamTdfNotesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamTdfNotesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamTdfNotesRequest;
  static deserializeBinaryFromReader(message: StreamTdfNotesRequest, reader: jspb.BinaryReader): StreamTdfNotesRequest;
}

export namespace StreamTdfNotesRequest {
  export type AsObject = {
  }
}

export class StreamTdfNotesResponse extends jspb.Message {
  getEventType(): StreamEventTypeMap[keyof StreamEventTypeMap];
  setEventType(value: StreamEventTypeMap[keyof StreamEventTypeMap]): void;

  getEventDetail(): string;
  setEventDetail(value: string): void;

  clearTdfNotesList(): void;
  getTdfNotesList(): Array<TdfNote>;
  setTdfNotesList(value: Array<TdfNote>): void;
  addTdfNotes(value?: TdfNote, index?: number): TdfNote;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamTdfNotesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StreamTdfNotesResponse): StreamTdfNotesResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: StreamTdfNotesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamTdfNotesResponse;
  static deserializeBinaryFromReader(message: StreamTdfNotesResponse, reader: jspb.BinaryReader): StreamTdfNotesResponse;
}

export namespace StreamTdfNotesResponse {
  export type AsObject = {
    eventType: StreamEventTypeMap[keyof StreamEventTypeMap],
    eventDetail: string,
    tdfNotesList: Array<TdfNote.AsObject>,
  }
}

export interface StreamEventTypeMap {
  STREAM_EVENT_TYPE_UNSPECIFIED: 0;
  STREAM_EVENT_TYPE_STARTUP: 1;
  STREAM_EVENT_TYPE_SHUTDOWN: 2;
  STREAM_EVENT_TYPE_RESTART: 3;
  STREAM_EVENT_TYPE_MAINTENANCE: 4;
  STREAM_EVENT_TYPE_CONNECTED: 5;
  STREAM_EVENT_TYPE_HEARTBEAT: 6;
  STREAM_EVENT_TYPE_GENERIC_ERROR: 10;
  STREAM_EVENT_TYPE_SERVER_ERROR: 11;
  STREAM_EVENT_TYPE_DATA_ERROR: 12;
  STREAM_EVENT_TYPE_TDF_NOTES_NEW: 20;
}

export const StreamEventType: StreamEventTypeMap;


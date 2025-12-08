package activeclients

import (
	"fmt"
	"sync"

	"connectrpc.com/connect"
	tdf_notev1 "github.com/virtru-corp/dsp-cop/api/proto/github.com/virtru-corp/dsp-cop/api/proto/tdf_note/v1"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
)

// Stream interface that can be used by both TdfObjectStream and TdfNoteStream
type Stream interface {
	Send(message interface{}) error
}

// Wrapper for tdf_object stream
type TdfObjectStream struct {
	stream *connect.ServerStream[tdf_objectv1.StreamTdfObjectsResponse]
}

func (s *TdfObjectStream) Send(message interface{}) error {
	if m, ok := message.(*tdf_objectv1.StreamTdfObjectsResponse); ok {
		return s.stream.Send(m)
	}
	return fmt.Errorf("invalid message type for TdfObjectStream")
}

// Wrapper for tdf_note stream
type TdfNoteStream struct {
	stream *connect.ServerStream[tdf_notev1.StreamTdfNotesResponse]
}

func (s *TdfNoteStream) Send(message interface{}) error {
	if m, ok := message.(*tdf_notev1.StreamTdfNotesResponse); ok {
		return s.stream.Send(m)
	}
	return fmt.Errorf("invalid message type for TdfNoteStream")
}

// ActiveClient represents a client that can either stream tdf_objects or tdf_notes
type ActiveClient struct {
	id     string
	peer   connect.Peer
	stream Stream
}

// ActiveClients holds the list of active clients
type ActiveClients struct {
	lock    sync.Mutex
	clients []ActiveClient
}

// Add a new TDF object client
func (ac *ActiveClients) Add(id string, peer connect.Peer, stream *connect.ServerStream[tdf_objectv1.StreamTdfObjectsResponse]) {
	ac.lock.Lock()
	defer ac.lock.Unlock()
	ac.clients = append(ac.clients, ActiveClient{id, peer, &TdfObjectStream{stream}})
}

// AddNote adds a new TDF note client
func (ac *ActiveClients) AddNote(id string, peer connect.Peer, stream *connect.ServerStream[tdf_notev1.StreamTdfNotesResponse]) {
	ac.lock.Lock()
	defer ac.lock.Unlock()
	ac.clients = append(ac.clients, ActiveClient{id, peer, &TdfNoteStream{stream}})
}

// Remove a client by ID
func (ac *ActiveClients) Remove(id string) {
	ac.lock.Lock()
	defer ac.lock.Unlock()
	for i, c := range ac.clients {
		if c.id == id {
			ac.clients = append(ac.clients[:i], ac.clients[i+1:]...)
			return
		}
	}
}

// Get a client by ID
func (ac *ActiveClients) Get(id string) *ActiveClient {
	for _, c := range ac.clients {
		if c.id == id {
			return &c
		}
	}
	return nil
}

// Emit sends an event to a specific client
func (ac *ActiveClients) Emit(id string, event tdf_objectv1.StreamEventType, detail string) {
	c := ac.Get(id)
	if c != nil {
		c.stream.Send(&tdf_objectv1.StreamTdfObjectsResponse{
			EventType:   event,
			EventDetail: detail,
		})
	}
}

// broadcast sends a message to all connected clients
func (ac *ActiveClients) broadcast(msg interface{}) {
	for _, c := range ac.clients {
		c.stream.Send(msg)
	}
}

// Shutdown sends a shutdown event to all clients
func (ac *ActiveClients) Shutdown() {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:   tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_SHUTDOWN,
		EventDetail: "server is shutting down",
	})
}

// Broadcast sends an event to all clients
func (ac *ActiveClients) Broadcast(event tdf_objectv1.StreamEventType, detail string) {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:   event,
		EventDetail: detail,
	})
}

// BroadcastTdfObjects sends new TDF objects to all clients
func (ac *ActiveClients) BroadcastTdfObjects(objs []*tdf_objectv1.TdfObject) {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:  tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_TDF_OBJECTS_NEW,
		TdfObjects: objs,
	})
}

// BroadcastTdfNotes sends new TDF notes to all clients
func (ac *ActiveClients) BroadcastTdfNotes(notes []*tdf_notev1.TdfNote) {
	ac.broadcast(&tdf_notev1.StreamTdfNotesResponse{
		EventType: tdf_notev1.StreamEventType_STREAM_EVENT_TYPE_TDF_NOTES_NEW,
		TdfNotes:  notes,
	})
}

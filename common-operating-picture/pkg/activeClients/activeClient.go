package activeclients

import (
	"sync"

	"connectrpc.com/connect"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
)

type ActiveClient struct {
	id     string
	peer   connect.Peer
	stream *connect.ServerStream[tdf_objectv1.StreamTdfObjectsResponse]
}

type ActiveClients struct {
	lock    sync.Mutex
	clients []ActiveClient
}

func (ac *ActiveClients) Add(id string, peer connect.Peer, stream *connect.ServerStream[tdf_objectv1.StreamTdfObjectsResponse]) {
	ac.lock.Lock()
	defer ac.lock.Unlock()
	ac.clients = append(ac.clients, ActiveClient{id, peer, stream})
}

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

func (ac *ActiveClients) Get(id string) *ActiveClient {
	for _, c := range ac.clients {
		if c.id == id {
			return &c
		}
	}
	return nil
}

func (ac *ActiveClients) Emit(id string, event tdf_objectv1.StreamEventType, detail string) {
	c := ac.Get(id)
	if c != nil {
		c.stream.Send(&tdf_objectv1.StreamTdfObjectsResponse{
			EventType:   event,
			EventDetail: detail,
		})
	}
}

func (ac *ActiveClients) broadcast(msg *tdf_objectv1.StreamTdfObjectsResponse) {
	for _, c := range ac.clients {
		c.stream.Send(msg)
	}
}

func (ac *ActiveClients) Shutdown() {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:   tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_SHUTDOWN,
		EventDetail: "server is shutting down",
	})
}

func (ac *ActiveClients) Broadcast(event tdf_objectv1.StreamEventType, detail string) {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:   event,
		EventDetail: detail,
	})
}

func (ac *ActiveClients) BroadcastTdfObjects(objs []*tdf_objectv1.TdfObject) {
	ac.broadcast(&tdf_objectv1.StreamTdfObjectsResponse{
		EventType:  tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_TDF_OBJECTS_NEW,
		TdfObjects: objs,
	})
}

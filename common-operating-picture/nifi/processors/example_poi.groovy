import org.apache.commons.io.IOUtils
import java.nio.charset.StandardCharsets
import groovy.json.*

flowFile = session.get()
if(!flowFile) return

// Example to NiFi attributes to support indexed data flows using the POI example data type:
// geo spatial - point from lng/lat fields of payload
// temporal - direct copy from dt payload
// src - hard coded to poi
// example demo poi payload: {"lat": "16.7666", "lng":"3.0026", "dt":"2020-07-30T18:00:00.000Z", "text":"SECRET RELTO USA"}
try {
    def jsonText=''
    session.read(flowFile, {inputStream ->
        jsonText = IOUtils.toString(inputStream, StandardCharsets.UTF_8)
    } as InputStreamCallback)
    def json = new JsonSlurper().parseText(jsonText)
    // create point json
    pointMap = ['type' : 'Point', 'coordinates':[json.lng, json.lat]]
    def pointJsonString = new JsonBuilder(pointMap).toPrettyString()
    // build new attributes
    attrMap = ['tdf_geo': pointJsonString, 'tdf_ts': json.dt, 'tdf_src': 'poi']
    flowFile = session.putAllAttributes(flowFile, attrMap)
    session.transfer(flowFile, REL_SUCCESS)
} catch(Exception ex) {
    log.error('Error processing poi data: {}', ex)
    session.transfer(flowFile, REL_FAILURE)
}
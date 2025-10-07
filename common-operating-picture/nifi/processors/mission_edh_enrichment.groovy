import java.nio.charset.StandardCharsets
import groovy.json.JsonBuilder
flowFile = session.get()
if(!flowFile) return

// Example - blank out output

try {

    def tdf_attributes = flowFile.getAttribute("tdf_attribute")
    flowFile = session.write(flowFile, {inputStream, outputStream ->
        def json = new JsonBuilder(['tdf_attributes': tdf_attributes]).toString()
        outputStream.write(json.getBytes(StandardCharsets.UTF_8))
    } as StreamCallback)
    flowFile = session.putAllAttributes(flowFile, ['mime.type': 'application/json'])
    session.transfer(flowFile, REL_SUCCESS)
} catch(Exception ex) {
    log.error('Error processing: {}', ex)
    session.transfer(flowFile, REL_FAILURE)
}
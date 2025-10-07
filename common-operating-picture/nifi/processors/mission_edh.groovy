import org.apache.commons.io.IOUtils
import java.nio.charset.StandardCharsets
import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.json.StringEscapeUtils
flowFile = session.get()
if(!flowFile) return

// Example - extract Enterprise Data Header element and set as flowfile content

try {
    def object_type = null
    def details = null
    def edh = null
    session.read(flowFile, {inputStream ->
        def obj = new JsonSlurper().parse(inputStream)
        object_type = obj['Type']
        details = obj['Details']
        edh = obj['EDH']
    } as InputStreamCallback)

    flowFile = session.write(flowFile, {inputStream, outputStream ->
        def obj = new JsonSlurper().parse(inputStream)
        edh = obj['EDH']
        json = new JsonBuilder( edh ).toString()
        xml = StringEscapeUtils.unescapeJava(json)
        // trim leading and trailing quotes
        xml = xml.substring(1, xml.length()-1)
        outputStream.write(xml.getBytes(StandardCharsets.UTF_8))
    } as StreamCallback)
    attrMap = ['mime.type': 'application/xml']
    flowFile = session.putAllAttributes(flowFile, attrMap)
    session.transfer(flowFile, REL_SUCCESS)
} catch(Exception ex) {
    log.error('Error extract EDH data: {}', ex)
    session.transfer(flowFile, REL_FAILURE)
}
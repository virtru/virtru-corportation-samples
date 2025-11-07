import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import org.apache.commons.io.IOUtils
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets
import java.math.BigDecimal

flowFile = session.get()
if(!flowFile) return

// Example mission data, take original + enrichment to create a single record with appropriate NiFi attributes
// to guide TDF operations and database indexing.
/** Example flow file
 * [ {
 "original" : {
 "Type" : "Facility",
 "Details" : {
 "Name" : "Bravo Base",
 "Location" : "Coordinates or address",
 "Status" : "Operational",
 "SCIcontrol" : "TK",
 "Classification" : "Top Secret",
 "Declassdate" : "2025-12-31",
 "Declassexception" : "Exception details",
 "derivativelyClassifiedBy" : "John Doe",
 "Derivedfrom" : "Source X, Source Y",
 "disseminationControls" : "NF",
 "ownerProducer" : "USA",
 "GUIDE" : "unique-entity-id-002",
 "FAcSk" : 456,
 "Activity" : "ABC",
 "BENumber" : "2345-6789",
 "ClsLVL" : "TS",
 "Condition" : "RDY",
 "datetimeCreated" : "2024-06-14T10:00:00Z",
 "DatetimeLastChg" : "2024-06-14T12:00:00Z",
 "GraphicAgency" : "nga",
 "Reviewdate" : "2025-02-01",
 "Allegiance" : "US",
 "ClassRating" : 4,
 "Codeword" : 3,
 "DegreeInterest" : "B",
 "Coord" : "450110931N6451411523E",
 "Elevation" : 600.5,
 "ElevationAcc" : 15.0,
 "ElevationConfLvl" : 90,
 "GeoidalMslSeparation" : 35.5,
 "GeoidalMslSeparationUm" : "m",
 "ProducerUserId" : "user002",
 "ProducerDateTimeLastChg" : "2024-06-14T12:00:00Z",
 "Resprod" : "DF"
 },
 "EDH" : "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<edh:ExternalEdh xmlns:edh=\"urn:us:gov:ic:edh\" xmlns:arh=\"urn:us:gov:ic:arh\" xmlns:ism=\"urn:us:gov:ic:ism\" xmlns:icid=\"urn:us:gov:ic:id\" ism:DESVersion=\"201609.201707\" ism:ISMCATCESVersion=\"201709\">\n   <icid:Identifier>guide://unique-entity-id-002</icid:Identifier>\n   <edh:DataItemCreateDateTime>2024-06-14T10:00:00Z</edh:DataItemCreateDateTime>\n   <edh:ResponsibleEntity edh:role=\"Custodian\">\n      <edh:Country>USA</edh:Country>\n      <edh:Organization>DIA</edh:Organization>\n   </edh:ResponsibleEntity>\n   <arh:Security ism:classification=\"TS\" ism:ownerProducer=\"USA\" ism:SCIcontrols=\"TK\" ism:disseminationControls=\"NF\" ism:resourceElement=\"true\" ism:compliesWith=\"USGov USIC\" ism:createDate=\"2024-06-14\" ism:derivativelyClassifiedBy=\"John Doe\" ism:derivedFrom=\"Source X, Source Y\" ism:declassDate=\"2025-12-31\"/>\n</edh:ExternalEdh>"
 },
 "enrichment" : {
 "tdf_attributes" : "https://demo.com/attr/classification/value/topsecret"
 }
 } ]
 */

// these are based on sample ,data change or augment as coord representation is updated.
latPrecisionPlaces = 7
lngPrecisionPlaces = 8

def searchKeyN = searchKeySize.value.toInteger()

def coordElementToFloat(coordStr, isLongitude, precisionPlaces) {
    def positiveChar = isLongitude ? "E" : "N"
    def isPositive = coordStr[coordStr.length()-1] == positiveChar
    def valueStr =coordStr.substring(0, coordStr.length()-1)
    def valueDecimal = valueStr.length() - precisionPlaces
    def valueWithDecimal = valueStr.substring(0, valueDecimal) + "." + valueStr.substring(valueDecimal)
    def decimalValue = new BigDecimal(valueWithDecimal)
    if (!isPositive){
        floatValue = 0-floatValue
    }
    return decimalValue
}

def parseLngLat(coordStr){
    def splitIndex = coordStr.indexOf('N') >0 ? coordStr.indexOf('N') : coordStr.indexOf('S')
    def latStr = coordStr.substring(0, splitIndex+1)
    def lngStr = coordStr.substring(splitIndex+1)
    return [coordElementToFloat(lngStr, true, lngPrecisionPlaces), coordElementToFloat(latStr, false, latPrecisionPlaces)]
}


try {
    def recordList = []
    session.read(flowFile, {inputStream ->
        recordList = new JsonSlurper().parse(inputStream)
    } as InputStreamCallback)

    for (record in recordList){
        def originalData = record['original']
        def enrichedData = record['enrichment']
        def objectType = originalData['Type']
        def tdfAttributes = enrichedData['tdf_attributes']
        def details = originalData['Details']
        def searchMap = [:]
        details.eachWithIndex{key, value, i ->
            {
                if (i < searchKeyN) {
                    searchMap[key] = value
                }
            }}

        newFlowFile = session.create(flowFile)
        newFlowFile = session.putAttribute(newFlowFile, 'tdf_attribute', tdfAttributes)
        newFlowFile = session.putAttribute(newFlowFile, 'tdf_src', objectType)
        def tdfSearchJsonString = new JsonBuilder(searchMap).toPrettyString()
        newFlowFile = session.putAttribute(newFlowFile, 'tdf_search', tdfSearchJsonString)

        //timestamp for all types from ProducerDateTimeLastChg
        newFlowFile = session.putAttribute(newFlowFile, 'tdf_ts', details['ProducerDateTimeLastChg'])
        //add search indices?
        //add geo point
        //Example: "Coord": "440110931N6451411523E",'
        def coordStr = details['Coord']
        lngLat = parseLngLat(coordStr)
        pointMap = ['type' : 'Point', 'coordinates':[lngLat[0], lngLat[1]]]
        def pointJsonString = new JsonBuilder(pointMap).toPrettyString()

        newFlowFile = session.putAttribute(newFlowFile, 'tdf_geo', pointJsonString)
        payloadObj = originalData['Details']
        newFlowFile = session.write(newFlowFile, {inputStream, outputStream ->
            def oos = new OutputStreamWriter(outputStream)
            new JsonBuilder(payloadObj).writeTo(oos)
            oos.close()
        } as StreamCallback)

        session.transfer(newFlowFile, REL_SUCCESS)
    }
    session.remove(flowFile)
} catch(Exception ex) {
    log.error('Error processing enriched mission data: {}', ex)
    session.transfer(flowFile, REL_FAILURE)
}
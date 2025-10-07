import java.nio.charset.StandardCharsets
import java.time.format.DateTimeFormatter
import java.time.OffsetDateTime
import java.util.Calendar
import java.sql.Timestamp

flowFile = session.get()
if(!flowFile) return

// Example to create index data insert statement from an input flowfile
def conn = CTL.db.getConnection()
def cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))

def dtf = DateTimeFormatter.ISO_OFFSET_DATE_TIME
try {
    sqlTableName = context.getProperty("db_tablename").evaluateAttributeExpressions().getValue()
    flowFile = session.write(flowFile, {inputStream, outputStream ->
        def uri = null
        def geo = flowFile.getAttribute("tdf_geo")
        def search = flowFile.getAttribute("tdf_search")
        if (search!=null){
            search = "'{$search}'"
        }
        def src = flowFile.getAttribute("tdf_src")
        if (src!=null){
            src = src.toLowerCase()
        }else{
            throw new Exception("tdf_src required");
        }
        def ts = flowFile.getAttribute("tdf_ts")
        if (ts!=null){
            ts = new Timestamp(1000 * OffsetDateTime.parse(ts, dtf).toEpochSecond())
        }
        if (geo!=null && geo.isBlank()){
            geo = null
        }
        def sql = "INSERT INTO ${sqlTableName}(ts, geo, src_type, search, tdf_blob, tdf_uri) VALUES (?,ST_GeomFromGeoJSON(?),?,to_json(?::json), ?,?)"
        def myStmt = conn.prepareStatement(sql)
        myStmt.setTimestamp(1, ts)
        myStmt.setString(2, geo)
        myStmt.setString(3, src)
        myStmt.setString(4, search)
        myStmt.setBinaryStream(5, inputStream)
        myStmt.setString(6, uri)
        myStmt.executeUpdate()
    } as StreamCallback)
    session.transfer(flowFile, REL_SUCCESS)
} catch(Exception ex) {
    log.error('Error processing poi data: {}', ex)
    session.transfer(flowFile, REL_FAILURE)
} finally{
    conn.close()
}

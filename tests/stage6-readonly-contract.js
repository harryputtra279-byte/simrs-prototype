/* PENCARIAN KODE: STAGE6_READONLY_CONTRACT — kontrak adapter kawasan 3D. */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','kawasan-3d.html'),'utf8');
const checks=[
 ['menggunakan key database SIMRS yang sebenarnya',html.includes("const DB_KEY='simrs_db_v1'")],
 ['mem-parsing snapshot lokal',html.includes('JSON.parse(raw)')],
 ['membaca permintaan lab dari visit.labRequest',html.includes('chosen.labRequest')],
 ['membaca permintaan radiologi dari visit.radiologyRequest',html.includes('chosen.radiologyRequest')],
 ['membaca relasi careRequests.sourceVisitId',html.includes('r.sourceVisitId===visitId')],
 ['tidak menulis ke localStorage',!html.includes('localStorage.setItem(')],
 ['tidak menghapus localStorage',!html.includes('localStorage.removeItem(')],
 ['tidak menampilkan nama pasien pada catatan perjalanan',!html.includes("patient?'Pasien demo: '+patient.nama")],
 ['memiliki refresh dan lifecycle listeners',html.includes("addEventListener('pageshow'")&&html.includes("addEventListener('storage'")],
 ['memiliki penanda pencarian kode',html.includes('PENCARIAN KODE: SIMRS_READ_ONLY_ADAPTER')]
];let failed=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`LULUS ${checks.length}/${checks.length} kontrak statis.`);

/**
 * AgroFix Kebun Hub API v1.1
 * Bound to AGROFIX_KEBUN_DATABASE (existing production Sheet).
 * NEVER run a destructive reset on the seven original tables.
 * IMPORTANT: paste into a NEW Apps Script project bound to the Sheet;
 * do not overwrite the existing APK's Code.gs deployment.
 *
 * Set script properties:
 * AGROFIX_GATEWAY_SECRET  (min 32 random characters)
 * AGROFIX_AUTH_SECRET     (different min 32 random characters)
 */
const AF_TZ='Asia/Kuala_Lumpur';
const AF_TABLES={
 HUB_GARDENS:['ID','NAME','STATUS','CREATED_AT'],
 HUB_USERS:['EMAIL','NAME','STATUS','CREATED_AT'],
 HUB_MEMBERSHIPS:['EMAIL','GARDEN_ID','ROLE','STATUS','MEMBER_ID','APPROVED_AT','APPROVED_BY'],
 HUB_AUDIT:['ID','AT','ACTOR','GARDEN_ID','ACTION','RECORD_ID','DETAIL'],
 MEMBERS:['ID','NAME','PHONE','GARDEN_ID','GARDEN_NAME','REGISTERED_AT','RECEIVED_AT','SYNC_STATUS'],
 ATTENDANCE:['ID','MEMBER_ID','GARDEN_ID','CHECK_IN_AT','CHECK_OUT_AT','METHOD_IN','METHOD_OUT','SYNC_STATUS','RECEIVED_AT'],
 ACTIVITIES:['ID','MEMBER_ID','ATTENDANCE_ID','TYPE','CROP','PLOT','NOTES','CREATED_AT','SYNC_STATUS','RECEIVED_AT','PLANTING_ID'],
 HARVESTS:['ID','MEMBER_ID','CROP','WEIGHT_KG','PURPOSE','RECIPIENT','NOTES','CREATED_AT','SYNC_STATUS','RECEIVED_AT','PLANTING_ID'],
 SALES:['ID','MEMBER_ID','CROP','WEIGHT_KG','PRICE_PER_KG','TOTAL_RM','BUYER','PAYMENT_METHOD','CREATED_AT','SYNC_STATUS','RECEIVED_AT','PLANTING_ID'],
 VISITORS:['ID','RECORDED_BY_MEMBER_ID','VISITOR_NAME','CATEGORY','PURPOSE','PARTICIPANT_COUNT','CREATED_AT','SYNC_STATUS','RECEIVED_AT'],
 PLANTINGS:['ID','GARDEN_ID','CROP_NAME','VARIETY','PLOT','PLANTED_AT','EXPECTED_HARVEST_AT','STATUS','COMPLETED_AT','NOTES','CREATED_BY_MEMBER_ID','CREATED_AT','UPDATED_AT','SYNC_STATUS','RECEIVED_AT']
};
function afSecret_(name){const x=PropertiesService.getScriptProperties().getProperty(name)||'';if(x.length<32)throw Error('Konfigurasi server belum lengkap: '+name);return x}
function afTime_(){return Utilities.formatDate(new Date(),AF_TZ,'yyyy-MM-dd HH:mm:ss')}
function afEmail_(x){return String(x||'').trim().toLowerCase()}
function afRows_(name){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);if(!sh)throw Error('Jadual belum ada: '+name);const a=sh.getDataRange().getDisplayValues();if(a.length<2)return [];return a.slice(1).filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(a[0].map((h,i)=>[h,String(r[i]||'')])))}
function afJson_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function doGet(){return afJson_({ok:true,service:'AgroFix Kebun Hub',version:'1.1.0'})}
function doPost(e){try{
 const q=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
 if(q.gatewaySecret!==afSecret_('AGROFIX_GATEWAY_SECRET'))throw Error('Gateway tidak dibenarkan');
 return afJson_({ok:true,data:afRoute_(String(q.action||''),q.payload||{},String(q.token||''))});
}catch(error){return afJson_({ok:false,error:String(error.message||error)})}}
function afHex_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('')}
function afEncode_(s){return Utilities.base64EncodeWebSafe(s,Utilities.Charset.UTF_8).replace(/=+$/,'')}
function afSign_(email){const p=afEncode_(JSON.stringify({email,exp:Date.now()+24*3600*1000}));const mac=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p,afSecret_('AGROFIX_AUTH_SECRET'))).replace(/=+$/,'');return p+'.'+mac}
function afAuth_(token){const [p,s,...extra]=String(token||'').split('.');if(!p||!s||extra.length)throw Error('Sila log masuk');const mac=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p,afSecret_('AGROFIX_AUTH_SECRET'))).replace(/=+$/,'');if(mac!==s)throw Error('Sesi tidak sah');let data;try{data=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p)).getDataAsString())}catch(e){throw Error('Sesi tidak sah')}if(!data.exp||data.exp<Date.now())throw Error('Sesi tamat');const email=afEmail_(data.email);if(!afUser_(email))throw Error('Akaun tidak aktif');return email}
function afUser_(email){return afRows_('HUB_USERS').find(r=>afEmail_(r.EMAIL)===email&&r.STATUS==='ACTIVE')}
function afMemberships_(email){const gardens=afRows_('HUB_GARDENS').filter(g=>['ACTIVE','INVITED'].includes(g.STATUS));return afRows_('HUB_MEMBERSHIPS').filter(m=>afEmail_(m.EMAIL)===email&&m.STATUS==='ACTIVE').flatMap(m=>{const g=gardens.find(g=>g.ID===m.GARDEN_ID);if(!g)return [];const valid=afRows_('MEMBERS').some(r=>r.ID===m.MEMBER_ID&&r.GARDEN_ID===g.ID);return valid?[{id:g.ID,name:g.NAME,role:m.ROLE,memberId:m.MEMBER_ID}]:[]})}
function afMember_(email,gardenId){const m=afMemberships_(email).find(x=>x.id===gardenId);if(!m)throw Error('Anda tidak mempunyai akses kebun ini');return m}
function afOtpRequest_(payload){const email=afEmail_(payload.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('E-mel tidak sah');
 const user=afUser_(email);const memberships=user?afMemberships_(email):[];
 if(!user||!memberships.length)return {message:'Permintaan diterima'};
 const cache=CacheService.getScriptCache();if(cache.get('cool:'+email))throw Error('Sila tunggu 60 saat');
 const code=String(Math.floor(Math.random()*1000000)).padStart(6,'0');
 cache.put('otp:'+email,JSON.stringify({hash:afHex_(email+':'+code+':'+afSecret_('AGROFIX_AUTH_SECRET')),tries:0}),300);
 cache.put('cool:'+email,'1',60);
 MailApp.sendEmail(email,'Kod masuk AgroFix Kebun','Kod masuk anda: '+code+'\nSah selama 5 minit. Jangan kongsi kod.');
 return {message:'Permintaan diterima'} }
function afOtpVerify_(payload){const email=afEmail_(payload.email),code=String(payload.code||'');if(!/^\d{6}$/.test(code))throw Error('Kod tidak sah');const c=CacheService.getScriptCache(),key='otp:'+email,raw=c.get(key);if(!raw)throw Error('Kod tamat tempoh');const item=JSON.parse(raw);if(item.tries>=5){c.remove(key);throw Error('Terlalu banyak percubaan')}
 if(item.hash!==afHex_(email+':'+code+':'+afSecret_('AGROFIX_AUTH_SECRET'))){item.tries++;c.put(key,JSON.stringify(item),240);throw Error('Kod tidak sepadan')}
 c.remove(key);if(!afUser_(email)||!afMemberships_(email).length)throw Error('Akaun tidak aktif');return {token:afSign_(email)} }
function afCamel_(row){return Object.fromEntries(Object.entries(row).map(([key,v])=>[key.toLowerCase().replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]))}
function afDashboard_(g){const members=afRows_('MEMBERS').filter(x=>x.GARDEN_ID===g);const ids=new Set(members.map(x=>x.ID));const attendance=afRows_('ATTENDANCE').filter(x=>x.GARDEN_ID===g),acts=afRows_('ACTIVITIES').filter(x=>ids.has(x.MEMBER_ID)),harvest=afRows_('HARVESTS').filter(x=>ids.has(x.MEMBER_ID)),sales=afRows_('SALES').filter(x=>ids.has(x.MEMBER_ID)),plants=afRows_('PLANTINGS').filter(x=>x.GARDEN_ID===g),day=afTime_().slice(0,10),month=day.slice(0,7);
 return {todayAttendance:new Set(attendance.filter(x=>x.CHECK_IN_AT.startsWith(day)).map(x=>x.MEMBER_ID)).size,memberCount:ids.size,attendanceSessions:attendance.filter(x=>x.CHECK_IN_AT.startsWith(month)).length,activityCount:acts.filter(x=>x.CREATED_AT.startsWith(month)).length,harvestKg:harvest.filter(x=>x.CREATED_AT.startsWith(month)).reduce((v,x)=>v+(Number(x.WEIGHT_KG)||0),0),salesRm:sales.filter(x=>x.CREATED_AT.startsWith(month)).reduce((v,x)=>v+(Number(x.TOTAL_RM)||0),0),activePlantings:plants.filter(x=>x.STATUS!=='HARVEST_COMPLETED').length} }
function afPersonal_(m,g){const att=afRows_('ATTENDANCE').filter(x=>x.GARDEN_ID===g&&x.MEMBER_ID===m.memberId);const acts=afRows_('ACTIVITIES').filter(x=>x.MEMBER_ID===m.memberId);
 return {attendanceSessions:att.length,activityCount:acts.length,openAttendance:att.filter(x=>x.CHECK_IN_AT&&!x.CHECK_OUT_AT).slice(-1).map(x=>({id:x.ID}))[0]||null,recent:acts.slice(-40).reverse().map(x=>({id:x.ID,kind:'activity',title:x.TYPE,detail:x.NOTES,at:x.CREATED_AT}))}}
function afSave_(table,record){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(table),headers=AF_TABLES[table];const grid=sh.getDataRange().getDisplayValues();let row=0;for(let i=1;i<grid.length;i++)if(grid[i][0]===record.ID){row=i+1;break}const cells=headers.map(h=>record[h]??'');if(row)sh.getRange(row,1,1,headers.length).setValues([cells]);else sh.appendRow(cells);return {id:record.ID,operation:row?'updated':'inserted'}}
function afAudit_(email,g,action,id){afSave_('HUB_AUDIT',{ID:Utilities.getUuid(),AT:afTime_(),ACTOR:email,GARDEN_ID:g,ACTION:action,RECORD_ID:id,DETAIL:''})}
function afWrite_(action,p,m,g,email){const lock=LockService.getScriptLock();lock.waitLock(15000);try{
 const id=String(p.id||'').trim();if(!/^[A-Za-z0-9_-]{8,80}$/.test(id))throw Error('ID rekod tidak sah');const now=afTime_();
 const table={punchIn:'ATTENDANCE',punchOut:'ATTENDANCE',addActivity:'ACTIVITIES',addHarvest:'HARVESTS',addSale:'SALES',addPlanting:'PLANTINGS'}[action];if(!table)throw Error('Operasi tidak disokong');
 const existing=afRows_(table).find(x=>x.ID===id);if(existing){if(table==='PLANTINGS'){if(existing.GARDEN_ID!==g)throw Error('ID rekod milik kebun lain')}else if(existing.MEMBER_ID!==m.memberId|| (existing.GARDEN_ID&&existing.GARDEN_ID!==g))throw Error('ID rekod tidak sepadan')}
 const base={ID:id,MEMBER_ID:m.memberId,SYNC_STATUS:'synced',RECEIVED_AT:now};
 let record;
 if(action==='punchIn'){const current=afRows_('ATTENDANCE').find(x=>x.MEMBER_ID===m.memberId&&x.GARDEN_ID===g&&x.CHECK_IN_AT&&!x.CHECK_OUT_AT);if(current&&current.ID!==id)throw Error('Sesi kehadiran masih aktif');record={...base,GARDEN_ID:g,CHECK_IN_AT:existing?.CHECK_IN_AT||now,CHECK_OUT_AT:existing?.CHECK_OUT_AT||'',METHOD_IN:'PWA',METHOD_OUT:existing?.METHOD_OUT||''}}
 else if(action==='punchOut'){if(!existing||!existing.CHECK_IN_AT)throw Error('Sesi kehadiran tidak ditemui');record={...base,GARDEN_ID:g,CHECK_IN_AT:existing.CHECK_IN_AT,CHECK_OUT_AT:existing.CHECK_OUT_AT||now,METHOD_IN:existing.METHOD_IN||'PWA',METHOD_OUT:'PWA'}}
 else if(action==='addActivity'){record={...base,ATTENDANCE_ID:'',TYPE:String(p.type||'Lain-lain').slice(0,80),CROP:String(p.crop||'').slice(0,100),PLOT:String(p.plot||'').slice(0,100),NOTES:String(p.notes||'').slice(0,1000),CREATED_AT:existing?.CREATED_AT||now,PLANTING_ID:''}}
 else if(action==='addHarvest'){const w=Number(p.weightKg);if(!Number.isFinite(w)||w<=0)throw Error('Berat mesti melebihi 0');record={...base,CROP:String(p.crop||'').slice(0,100),WEIGHT_KG:w,PURPOSE:'',RECIPIENT:'',NOTES:'',CREATED_AT:existing?.CREATED_AT||now,PLANTING_ID:''}}
 else if(action==='addSale'){const total=Number(p.totalRm);if(!Number.isFinite(total)||total<=0)throw Error('Jumlah jualan tidak sah');record={...base,CROP:String(p.crop||'').slice(0,100),WEIGHT_KG:'',PRICE_PER_KG:'',TOTAL_RM:total,BUYER:'',PAYMENT_METHOD:'',CREATED_AT:existing?.CREATED_AT||now,PLANTING_ID:''}}
 else {if(!['ADMIN','SUPER_ADMIN'].includes(m.role))throw Error('Hanya pentadbir kebun dibenarkan');const crop=String(p.cropName||'').trim().slice(0,100);if(!crop)throw Error('Nama tanaman wajib');record={ID:id,GARDEN_ID:g,CROP_NAME:crop,VARIETY:'',PLOT:String(p.plot||'').slice(0,100),PLANTED_AT:existing?.PLANTED_AT||now,EXPECTED_HARVEST_AT:'',STATUS:'ACTIVE',COMPLETED_AT:'',NOTES:'',CREATED_BY_MEMBER_ID:m.memberId,CREATED_AT:existing?.CREATED_AT||now,UPDATED_AT:now,SYNC_STATUS:'synced',RECEIVED_AT:now}}
 const result=afSave_(table,record);afAudit_(email,g,action,id);return result
}finally{lock.releaseLock()}}
function afRoute_(action,p,token){if(action==='requestOtp')return afOtpRequest_(p);if(action==='verifyOtp')return afOtpVerify_(p);const email=afAuth_(token);if(action==='whoami'){const u=afUser_(email);return {email,name:u.NAME,gardens:afMemberships_(email)}}
 const gardenId=String(p.gardenId||'');const m=afMember_(email,gardenId);
 if(action==='getGardenDashboard')return afDashboard_(gardenId);
 if(action==='getMyDashboard')return afPersonal_(m,gardenId);
 if(action==='listPlantings')return afRows_('PLANTINGS').filter(x=>x.GARDEN_ID===gardenId&&x.STATUS!=='HARVEST_COMPLETED').map(afCamel_);
 return afWrite_(action,p,m,gardenId,email)
}
function inspectAgroFixHub(){return {gardens:afRows_('HUB_GARDENS').length,users:afRows_('HUB_USERS').length,memberships:afRows_('HUB_MEMBERSHIPS').length,originalMembers:afRows_('MEMBERS').length,originalPlantings:afRows_('PLANTINGS').length}}

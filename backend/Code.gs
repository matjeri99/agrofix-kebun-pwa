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
const AF_SPREADSHEET_ID='1Xtx7p3qOZB6h3lYOF-w8UIwRsHb8NShyjIilX2UnzJc';
function afSpreadsheet_(){return SpreadsheetApp.openById(AF_SPREADSHEET_ID)}
const AF_TABLES={
 HUB_GARDENS:['ID','NAME','STATUS','CREATED_AT'],
 HUB_USERS:['EMAIL','NAME','STATUS','CREATED_AT'],
 HUB_MEMBERSHIPS:['EMAIL','GARDEN_ID','ROLE','STATUS','MEMBER_ID','APPROVED_AT','APPROVED_BY'],
 HUB_AUDIT:['ID','AT','ACTOR','GARDEN_ID','ACTION','RECORD_ID','DETAIL'],
 HUB_APPLICATIONS:['ID','NAME','PHONE','EMAIL','GARDEN_ID','STATUS','APPLIED_AT','DECIDED_AT','DECIDED_BY','MEMBER_ID','CONSENT_AT'],
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
function afRows_(name){const sh=afSpreadsheet_().getSheetByName(name);if(!sh)throw Error('Jadual belum ada: '+name);const a=sh.getDataRange().getDisplayValues();if(a.length<2)return [];return a.slice(1).filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(a[0].map((h,i)=>[h,String(r[i]||'')])))}
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
 const code=String(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16)%1000000).padStart(6,'0');
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
function afSave_(table,record){const sh=afSpreadsheet_().getSheetByName(table),headers=AF_TABLES[table];const grid=sh.getDataRange().getDisplayValues();let row=0;for(let i=1;i<grid.length;i++)if(grid[i][0]===record.ID){row=i+1;break}const cells=headers.map(h=>record[h]??'');if(row)sh.getRange(row,1,1,headers.length).setValues([cells]);else sh.appendRow(cells);return {id:record.ID,operation:row?'updated':'inserted'}}
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
function afHubOverview_(email){
 const memberships=afMemberships_(email);
 if(!memberships.some(x=>x.role==='SUPER_ADMIN'))throw Error('Akses pentadbir induk tidak dibenarkan');
 const gardens=afRows_('HUB_GARDENS').filter(x=>['ACTIVE','INVITED'].includes(x.STATUS));
 const members=afRows_('MEMBERS');
 const plantings=afRows_('PLANTINGS');
 const activeMembers=afRows_('HUB_MEMBERSHIPS').filter(x=>x.STATUS==='ACTIVE');
 return {gardens:gardens.map(g=>({
  id:g.ID,name:g.NAME,status:g.STATUS,
  members:members.filter(m=>m.GARDEN_ID===g.ID).length,
  activePlantings:plantings.filter(x=>x.GARDEN_ID===g.ID&&x.STATUS!=='HARVEST_COMPLETED').length,
  activeAccounts:activeMembers.filter(x=>x.GARDEN_ID===g.ID).length
 }))};
}

function afRegistrationOtp_(p){
 const email=afEmail_(p.email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('E-mel tidak sah');
 const cache=CacheService.getScriptCache();
 if(cache.get('regcool:'+email))throw Error('Sila tunggu 60 saat');
 const code=String(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16)%1000000).padStart(6,'0');
 cache.put('regotp:'+email,JSON.stringify({hash:afHex_(email+':'+code+':'+afSecret_('AGROFIX_AUTH_SECRET')),tries:0}),300);
 cache.put('regcool:'+email,'1',60);
 MailApp.sendEmail(email,'Pengesahan pendaftaran AgroFix Kebun','Kod pendaftaran: '+code+'\nSah selama 5 minit.');
 return {message:'Jika e-mel sah, kod pengesahan dihantar'};
}
function afRegister_(p){
 const email=afEmail_(p.email),name=String(p.name||'').trim().slice(0,120),phone=String(p.phone||'').replace(/[^\d+]/g,'').slice(0,20),g=String(p.gardenId||''),code=String(p.code||'');
 if(name.length<3||!/^(?:\+?60|0)1\d{8,9}$/.test(phone))throw Error('Nama atau nombor telefon tidak sah');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!p.consent)throw Error('E-mel dan persetujuan diperlukan');
 if(!afRows_('HUB_GARDENS').some(x=>x.ID===g&&['INVITED','ACTIVE'].includes(x.STATUS)))throw Error('Kebun tidak tersedia');
 const cache=CacheService.getScriptCache(),key='regotp:'+email,raw=cache.get(key);if(!raw)throw Error('Kod pengesahan tamat tempoh');
 const entry=JSON.parse(raw);
 if(entry.tries>=5){cache.remove(key);throw Error('Terlalu banyak cubaan')}
 if(!/^\d{6}$/.test(code)||entry.hash!==afHex_(email+':'+code+':'+afSecret_('AGROFIX_AUTH_SECRET'))){entry.tries++;cache.put(key,JSON.stringify(entry),240);throw Error('Kod tidak sepadan')}
 const lock=LockService.getScriptLock();lock.waitLock(15000);try{
  if(afRows_('HUB_MEMBERSHIPS').some(x=>x.EMAIL===email&&x.GARDEN_ID===g&&x.STATUS==='ACTIVE'))throw Error('Anda sudah menjadi ahli kebun');
  const pending=afRows_('HUB_APPLICATIONS').find(x=>x.EMAIL===email&&x.GARDEN_ID===g&&x.STATUS==='PENDING');
  if(pending){cache.remove(key);return {id:pending.ID,status:'PENDING'}}
  const row={ID:'APP-'+Utilities.getUuid(),NAME:name,PHONE:phone,EMAIL:email,GARDEN_ID:g,STATUS:'PENDING',APPLIED_AT:afTime_(),DECIDED_AT:'',DECIDED_BY:'',MEMBER_ID:'',CONSENT_AT:afTime_()};
  afSave_('HUB_APPLICATIONS',row);cache.remove(key);return {id:row.ID,status:'PENDING'};
 }finally{lock.releaseLock()}
}
function afScope_(email,g){
 const memberships=afMemberships_(email);
 if(!memberships.some(m=>m.role==='SUPER_ADMIN'||(m.id===g&&m.role==='ADMIN')))throw Error('Anda bukan pentadbir kebun');
}
function afPending_(email,p){
 const g=String(p.gardenId||''),roles=afMemberships_(email),superAdmin=roles.some(m=>m.role==='SUPER_ADMIN');
 if(!superAdmin&&!roles.some(m=>m.id===g&&m.role==='ADMIN'))throw Error('Akses tidak dibenarkan');
 return afRows_('HUB_APPLICATIONS').filter(x=>x.STATUS==='PENDING'&&(!g?superAdmin:x.GARDEN_ID===g)).map(x=>({id:x.ID,name:x.NAME,email:x.EMAIL,phone:x.PHONE,gardenId:x.GARDEN_ID,appliedAt:x.APPLIED_AT}));
}
function afLegacyCandidates_(email,p){
 const app=afRows_('HUB_APPLICATIONS').find(x=>x.ID===String(p.applicationId||'')&&x.STATUS==='PENDING');
 if(!app)throw Error('Permohonan menunggu tidak ditemui');
 afScope_(email,app.GARDEN_ID);
 const linked=new Set(afRows_('HUB_MEMBERSHIPS').filter(x=>x.STATUS==='ACTIVE'&&x.GARDEN_ID===app.GARDEN_ID).map(x=>x.MEMBER_ID));
 const normal=v=>String(v||'').replace(/\D/g,'').replace(/^60/,'0');
 const search=normal(app.PHONE),name=String(app.NAME||'').trim().toLowerCase();
 return {application:{id:app.ID,name:app.NAME,phone:app.PHONE,gardenId:app.GARDEN_ID},
   candidates:afRows_('MEMBERS').filter(x=>x.GARDEN_ID===app.GARDEN_ID).map(x=>({
     id:x.ID,name:x.NAME,phone:x.PHONE,
     matchPhone:!!search&&normal(x.PHONE)===search,
     matchName:String(x.NAME||'').trim().toLowerCase()===name,
     alreadyLinked:linked.has(x.ID)
   })).sort((a,b)=>Number(b.matchPhone)-Number(a.matchPhone)||Number(b.matchName)-Number(a.matchName)||a.name.localeCompare(b.name))
 };
}

function afDecide_(email,p){
 const lock=LockService.getScriptLock();lock.waitLock(20000);try{
 const x=afRows_('HUB_APPLICATIONS').find(a=>a.ID===p.applicationId);
 if(!x||x.STATUS!=='PENDING')throw Error('Permohonan tidak ditemui atau telah diproses');
 afScope_(email,x.GARDEN_ID);
 if(p.decision==='REJECT'){x.STATUS='REJECTED';x.DECIDED_AT=afTime_();x.DECIDED_BY=email;afSave_('HUB_APPLICATIONS',x);afAudit_(email,x.GARDEN_ID,'rejectApplication',x.ID);return {status:'REJECTED'}}
 if(p.decision!=='APPROVE')throw Error('Keputusan tidak sah');
 if(afRows_('HUB_MEMBERSHIPS').some(y=>y.EMAIL===x.EMAIL&&y.GARDEN_ID===x.GARDEN_ID))throw Error('Keahlian sudah wujud');
 const existing=afRows_('HUB_USERS').find(y=>afEmail_(y.EMAIL)===afEmail_(x.EMAIL));
 if(existing&&existing.STATUS!=='ACTIVE')throw Error('Akaun tidak aktif, perlu semakan');
 const normalize=v=>String(v||'').replace(/\D/g,'').replace(/^60/,'0');
 const legacy=afRows_('MEMBERS').filter(y=>y.GARDEN_ID===x.GARDEN_ID);
 const matches=legacy.filter(y=>normalize(y.PHONE)===normalize(x.PHONE));
 let memberId;
 const selected=String(p.linkMemberId||'').trim();
 if(selected){
   if(p.identityConfirmed!==true)throw Error('Pengesahan identiti secara manual diperlukan sebelum pautan');
   const chosen=legacy.find(y=>y.ID===selected);
   if(!chosen)throw Error('Rekod ahli lama tidak sepadan dengan kebun');
   if(afRows_('HUB_MEMBERSHIPS').some(y=>y.MEMBER_ID===selected&&y.GARDEN_ID===x.GARDEN_ID&&y.STATUS==='ACTIVE'))throw Error('Rekod lama telah dipautkan kepada akaun lain');
   memberId=selected;
 }else{
   if(matches.length)throw Error('Nombor telefon sudah sepadan dengan ahli lama. Pilih rekod lama dan sahkan identiti dahulu');
   if(p.newMemberConfirmed!==true)throw Error('Sahkan semakan bahawa pemohon ini ahli baharu');
   const garden=afRows_('HUB_GARDENS').find(y=>y.ID===x.GARDEN_ID);
   if(!garden)throw Error('Kebun tidak ditemui');
   memberId='MBR-'+Utilities.getUuid();
   afSave_('MEMBERS',{ID:memberId,NAME:x.NAME,PHONE:x.PHONE,GARDEN_ID:garden.ID,GARDEN_NAME:garden.NAME,REGISTERED_AT:afTime_(),RECEIVED_AT:afTime_(),SYNC_STATUS:'synced'});
 }
 if(!existing)afSpreadsheet_().getSheetByName('HUB_USERS').appendRow([x.EMAIL,x.NAME,'ACTIVE',afTime_()]);
 afSpreadsheet_().getSheetByName('HUB_MEMBERSHIPS').appendRow([x.EMAIL,x.GARDEN_ID,'MEMBER','ACTIVE',memberId,afTime_(),email]);
 x.STATUS='APPROVED';x.DECIDED_AT=afTime_();x.DECIDED_BY=email;x.MEMBER_ID=memberId;
 afSave_('HUB_APPLICATIONS',x);afAudit_(email,g.ID,'approveApplication',x.ID);return {status:'APPROVED'};
 }finally{lock.releaseLock()}
}
function afAssignAdmin_(email,p){
 if(!afMemberships_(email).some(m=>m.role==='SUPER_ADMIN'))throw Error('Hanya Super Admin boleh melantik Admin Kebun');
 const target=afEmail_(p.email),g=String(p.gardenId||''),role=String(p.role||'');
 if(!['ADMIN','MEMBER'].includes(role)||target===email)throw Error('Pelantikan tidak sah');
 const lock=LockService.getScriptLock();lock.waitLock(15000);try{
 const sh=afSpreadsheet_().getSheetByName('HUB_MEMBERSHIPS'),rows=sh.getDataRange().getDisplayValues();
 const index=rows.findIndex((r,i)=>i>0&&afEmail_(r[0])===target&&r[1]===g&&r[3]==='ACTIVE');
 if(index<0)throw Error('Ahli belum diluluskan');if(rows[index][2]==='SUPER_ADMIN')throw Error('Tidak boleh mengubah Super Admin');
 sh.getRange(index+1,3).setValue(role);afAudit_(email,g,'setGardenAdmin',target);return {role,gardenId:g,email:target};
 }finally{lock.releaseLock()}
}

function afRoute_(action,p,token){if(action==='requestRegistrationOtp')return afRegistrationOtp_(p);if(action==='submitRegistration')return afRegister_(p);if(action==='requestOtp')return afOtpRequest_(p);if(action==='verifyOtp')return afOtpVerify_(p);const email=afAuth_(token);if(action==='whoami'){const u=afUser_(email);return {email,name:u.NAME,gardens:afMemberships_(email)}}
 if(action==='getHubOverview')return afHubOverview_(email);
 if(action==='listPendingApplications')return afPending_(email,p);
 if(action==='getLegacyCandidates')return afLegacyCandidates_(email,p);
 if(action==='decideApplication')return afDecide_(email,p);
 if(action==='setGardenAdmin')return afAssignAdmin_(email,p);
 const gardenId=String(p.gardenId||'');const m=afMember_(email,gardenId);
 if(action==='getGardenDashboard')return afDashboard_(gardenId);
 if(action==='getMyDashboard')return afPersonal_(m,gardenId);
 if(action==='listPlantings')return afRows_('PLANTINGS').filter(x=>x.GARDEN_ID===gardenId&&x.STATUS!=='HARVEST_COMPLETED').map(afCamel_);
 return afWrite_(action,p,m,gardenId,email)
}
function inspectAgroFixHub(){return {gardens:afRows_('HUB_GARDENS').length,users:afRows_('HUB_USERS').length,memberships:afRows_('HUB_MEMBERSHIPS').length,originalMembers:afRows_('MEMBERS').length,originalPlantings:afRows_('PLANTINGS').length}}

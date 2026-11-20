/* AgroFix memberships: verified application & authorized garden management */
(()=>{
'use strict';
const API=()=>String(window.AGROFIX_CONFIG?.apiUrl||'').replace(/\/$/,'');
const TOKEN=()=>sessionStorage.getItem('agrofix_hub_session_v1')||'';
const $=s=>document.querySelector(s);
async function request(action,payload={},auth=false){
 if(!API())throw Error('Sambungan pelayan tidak tersedia');
 const res=await fetch(API(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload,token:auth?TOKEN():''})});
 const answer=await res.json().catch(()=>({ok:false,error:'Respons pelayan tidak sah'}));
 if(!res.ok||!answer.ok)throw Error(answer.error||'Permintaan tidak berjaya');
 return answer.data;
}
function makeDialog(title){
 const d=document.createElement('dialog');d.style.cssText='border:0;border-radius:22px;padding:22px;width:min(94vw,440px);max-height:88vh;overflow:auto;color:#173f3f;';
 const h=document.createElement('h2');h.textContent=title;d.append(h);document.body.append(d);
 d.addEventListener('close',()=>d.remove());d.showModal();return d;
}
function control(d,label,name,type='text'){
 const l=document.createElement('label');l.textContent=label;l.style.cssText='display:block;margin:12px 0;font-size:14px;font-weight:600';
 const i=document.createElement('input');i.type=type;i.name=name;i.required=true;i.style.cssText='display:block;width:100%;padding:12px;border:1px solid #d2ded5;border-radius:11px;margin-top:6px';l.append(i);d.append(l);return i;
}
function button(d,label,fn,secondary=false){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:12px 17px;border-radius:12px;margin:8px 8px 0 0;border:0;background:'+(secondary?'#e8eeea':'#205c5c')+';color:'+(secondary?'#173f3f':'white')+';font-weight:700';b.onclick=fn;d.append(b);return b;
}
const GARDENS=[['KKB-P05','Kebun Komuniti Presint 5'],['KKB-P06','Kebun Komuniti Presint 6'],['KKB-P16','Kebun Komuniti Presint 16'],['KKB-P17','Kebun Komuniti Presint 17'],['KKB-P18','Kebun Komuniti Presint 18']];
function gardenSelect(d){
 const l=document.createElement('label');l.textContent='Kebun komuniti';l.style.cssText='display:block;margin:12px 0;font-weight:600';
 const s=document.createElement('select');s.style.cssText='display:block;width:100%;padding:12px;border:1px solid #d2ded5;border-radius:11px;margin-top:6px';
 for(const [id,name] of GARDENS){const opt=document.createElement('option');opt.value=id;opt.textContent=name;s.append(opt)}
 s.value=GARDENS.some(g=>g[0]==='KKB-P16')?'KKB-P16':GARDENS[0][0];
 l.append(s);d.append(l);return s;
}
function status(d){const p=document.createElement('p');p.style.cssText='font-size:13px;line-height:1.6;color:#316149';p.setAttribute('role','status');d.append(p);return p}
function register(){
 const d=makeDialog('Daftar Ahli AgroFix 🌱');
 d.style.maxHeight='min(88dvh,780px)';
 const note=document.createElement('p');note.textContent='Isi sendiri, pilih kebun dan sahkan e-mel. Pentadbir akan semak permohonan anda.';d.append(note);
 const name=control(d,'Nama penuh / nama panggilan','name');
 const phone=control(d,'Nombor telefon','phone','tel');
 const email=control(d,'Alamat e-mel','email','email');
 const g=gardenSelect(d);
 const consent=document.createElement('label');consent.style.cssText='display:flex;align-items:flex-start;gap:9px;font-size:13px;margin-top:12px';
 const tick=document.createElement('input');tick.type='checkbox';tick.style.marginTop='3px';
 const t=document.createElement('span');t.textContent='Saya bersetuju maklumat ini digunakan untuk permohonan keahlian dan pengurusan kebun yang dipilih.';consent.append(tick,t);d.append(consent);
 const code=control(d,'Kod pengesahan e-mel (6 digit)','code','text');code.maxLength=6;code.inputMode='numeric';code.parentElement.style.display='none';
 const msg=status(d);
 const getCode=button(d,'Hantar kod e-mel',async()=>{getCode.disabled=true;msg.textContent='Sedang memohon kod…';try{await request('requestRegistrationOtp',{email:email.value.trim()});code.parentElement.style.display='block';submit.disabled=false;code.focus();msg.textContent='Kod dihantar jika alamat e-mel sah. Periksa Inbox / Spam. Kod sah selama 5 minit.'}catch(e){msg.textContent=e.message}finally{getCode.disabled=false}});
 const submit=button(d,'Hantar permohonan',async()=>{if(!name.value.trim()||!phone.value.trim()||!email.value.trim()||!tick.checked||code.value.trim().length!==6){msg.textContent='Lengkapkan borang, persetujuan dan kod enam digit.';return}
 submit.disabled=true;msg.textContent='Menghantar…';
 try{const result=await request('submitRegistration',{name:name.value,phone:phone.value,email:email.value,gardenId:g.value,code:code.value,consent:true});msg.textContent='Permohonan diterima. Status: '+result.status+'. Tunggu pengesahan Admin Kebun.';submit.hidden=true;getCode.hidden=true}
 catch(e){msg.textContent=e.message}finally{submit.disabled=false}});
 submit.disabled=true;
 const close=button(d,'Tutup',()=>d.close(),true);
 close.setAttribute('aria-label','Tutup borang pendaftaran');
}
async function pendingPanel(){
 if(!TOKEN())return;
 const d=makeDialog('Permohonan Ahli');
 const msg=status(d);msg.textContent='Memuatkan permohonan…';
 const area=document.createElement('div');d.append(area);
 async function reload(){
 area.replaceChildren();
 try{
 const apps=await request('listPendingApplications',{},true);
 msg.textContent=apps.length?apps.length+' permohonan memerlukan semakan':'Tiada permohonan menunggu.';
 for(const x of apps){
  const panel=document.createElement('div');panel.style.cssText='background:#f1f7f1;border-radius:13px;padding:12px;margin:12px 0';
  const info=document.createElement('div');info.style.fontSize='13px';info.style.lineHeight='1.7';
  info.textContent=[x.name,x.email,x.phone,x.gardenId,'Mohon: '+x.appliedAt].join(' · ');panel.append(info);
  for(const [label,decision] of [['Luluskan','APPROVE'],['Tolak','REJECT']]){
   button(panel,label,async()=>{if(!confirm('Sahkan keputusan '+label+' untuk '+x.name+'?'))return;
     try{await request('decideApplication',{applicationId:x.id,decision},true);await reload()}catch(e){alert(e.message)}
   },decision==='REJECT');
  }
  area.append(panel);
 }
 }catch(e){msg.textContent=e.message}
 }
 await reload();button(d,'Tutup',()=>d.close(),true);
}
function appointment(){
 if(!TOKEN())return;
 const d=makeDialog('Lantik Admin Kebun');
 const p=document.createElement('p');p.textContent='Hanya ahli yang sudah diluluskan boleh dilantik. Pelantikan ini boleh ditarik balik oleh Super Admin.';d.append(p);
 const e=control(d,'E-mel ahli yang telah diluluskan','email','email');
 const g=gardenSelect(d);const label=document.createElement('label');label.textContent='Peranan';label.style.cssText='display:block;margin:12px 0';
 const role=document.createElement('select');role.style.cssText='display:block;width:100%;padding:12px;border-radius:10px';
 for(const [v,n] of [['ADMIN','Lantik Admin Kebun'],['MEMBER','Kembalikan sebagai Ahli']]){const o=document.createElement('option');o.value=v;o.textContent=n;role.append(o)}
 label.append(role);d.append(label);const msg=status(d);
 button(d,'Sahkan perubahan',async()=>{if(!confirm('Sahkan pertukaran peranan untuk '+e.value+'?'))return;try{await request('setGardenAdmin',{email:e.value,gardenId:g.value,role:role.value},true);msg.textContent='Peranan berjaya dikemas kini.'}catch(err){msg.textContent=err.message}});
 button(d,'Tutup',()=>d.close(),true);
}
function boot(){
 const profile=$('#profile');
 if(profile&&!$('#registerEntry')){
  const b=document.createElement('button');b.id='registerEntry';b.className='admin-entry';b.textContent='🌱 Daftar Ahli Baharu';
  b.style.display='block';b.style.margin='16px 0';b.onclick=register;
  const target=profile.querySelector('.sub');target?.after(b);
 }
 const admin=$('#admin');
 if(admin&&!$('#approvalEntry')){
  const wrap=document.createElement('div');wrap.style.cssText='display:grid;gap:9px;margin:13px 0';
  const b=document.createElement('button');b.id='approvalEntry';b.className='admin-entry';b.textContent='📋 Semak Permohonan Ahli';b.onclick=pendingPanel;wrap.append(b);
  const a=document.createElement('button');a.id='appointEntry';a.className='admin-entry';a.textContent='👤 Lantik Admin Kebun';a.onclick=appointment;wrap.append(a);
  admin.querySelector('.sub')?.after(wrap);
 }
 const home=$('#home');if(home&&!$('#homeRegisterEntry')){
  const b=document.createElement('button');b.id='homeRegisterEntry';b.className='admin-entry';b.textContent='🌱 Ahli baharu? Daftar di sini';b.onclick=register;
  home.querySelector('.card')?.after(b);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
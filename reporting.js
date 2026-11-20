/* AgroFix Reporting Centre — administrator read-only drafts */
(()=>{
'use strict';
const token=()=>sessionStorage.getItem('agrofix_hub_session_v1')||'';
const apiUrl=()=>String(window.AGROFIX_CONFIG?.apiUrl||'').replace(/\/$/,'');
const $=q=>document.querySelector(q);
const TYPES=[['kpkm','Laporan Bulanan Projek'],['members','Statistik Ahli'],['activities','Aktiviti Bulanan'],['plantings','Inventori Tanaman'],['harvest','Hasil Tuaian'],['finance','Kewangan Kebun'],['fertilizer','Rekod Baja'],['pest','Kawalan Perosak'],['maintenance','Penyelenggaraan']];
function element(type,value){const e=document.createElement(type);if(value!==undefined)e.textContent=value;return e}
function field(label,value,readonly=false){const wrap=element('div');const title=element('strong',label);title.style.fontSize='12px';wrap.append(title,element('div',String(value??'Belum direkod')));return wrap}
function modal(){
 const d=element('dialog');d.style.cssText='border:0;border-radius:21px;padding:22px;width:min(94vw,600px);max-height:90dvh;overflow:auto;color:#173f3f;';
 document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove());return d
}
function select(options){const s=element('select');s.style.cssText='width:100%;border:1px solid #cbdccf;border-radius:12px;padding:12px;margin:9px 0 14px';for(const [v,n] of options){const o=element('option',n);o.value=v;s.append(o)}return s}
function btn(label,click){const b=element('button',label);b.style.cssText='border:0;border-radius:12px;padding:12px 16px;background:#205c5c;color:white;font-weight:700;margin:6px 8px 6px 0';b.onclick=click;return b}
async function report(){
 const d=modal();d.append(element('h2','AgroFix Reporting Centre'));
 d.append(element('p','Pratonton laporan daripada rekod sebenar. Angka yang belum lengkap akan ditandakan dan tidak direka.'));
 const type=select(TYPES);const gardens=select([['KKB-P16','Presint 16'],['KKB-P05','Presint 5'],['KKB-P06','Presint 6'],['KKB-P17','Presint 17'],['KKB-P18','Presint 18']]);
 d.append(element('label','Jenis laporan'));d.append(type);d.append(element('label','Kebun'));d.append(gardens);
 const month=element('input');month.type='month';const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit'}).formatToParts(new Date());month.value=p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;month.style.cssText='width:100%;padding:12px;margin:9px 0 14px;border:1px solid #cbdccf;border-radius:12px';
 d.append(element('label','Bulan'));d.append(month);
 const status=element('p','Pilih laporan untuk melihat ringkasan.');status.style.fontSize='13px';d.append(status);
 const output=element('div');output.style.cssText='display:grid;gap:12px;margin:14px 0';d.append(output);
 const generate=btn('Papar Laporan',async()=>{
  if(!token()){status.textContent='Sila log masuk sebagai pentadbir dahulu.';return}
  output.replaceChildren();status.textContent='Memuatkan data...';generate.disabled=true;
  try{
   const resp=await fetch(apiUrl(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getReportDraft',token:token(),payload:{reportType:type.value,gardenId:gardens.value,period:month.value}})});
   const j=await resp.json();if(!resp.ok||!j.ok)throw Error(j.error||'Tidak dapat menjana pratonton');
   const report=j.data;status.textContent='Pratonton · '+report.status+' · '+report.period;
   const summary=element('div');summary.style.cssText='padding:12px;border-radius:13px;background:#edf5ed;display:grid;gap:8px';
   const s=report.summary||{};
   [['Ahli berdaftar',s.registeredMembers],['Sesi kehadiran',s.attendances],['Aktiviti',s.activities],['Tanaman',s.plantings],['Hasil dituai (kg)',s.harvestKg],['Jualan (RM)',s.salesRm],['Aplikasi baja',s.fertilizerEvents],['Kawalan perosak',s.pestControlEvents],['Penyelenggaraan',s.maintenanceEvents]].forEach(([k,v])=>summary.append(field(k,v)));output.append(summary);
   if(type.value==='kpkm'||type.value==='plantings'){
    const h=element('h3','Pengeluaran tanaman');output.append(h);
    if(!report.production?.length)output.append(element('p','Belum ada maklumat tanaman.'));
    for(const x of report.production||[]){
     const card=element('div');card.style.cssText='border:1px solid #d7e0d7;border-radius:12px;padding:12px';
     card.append(element('strong',x.crop+(x.variety?' · '+x.variety:'')));
     for(const [k,v] of [['Luas bertanam (ha)',x.plantedAreaHa],['Luas berhasil (ha)',x.harvestedAreaHa],['Bilangan pokok',x.plantCount],['Hasil direkod (kg)',x.harvestKg]])card.append(field(k,v));
     output.append(card);
    }
   }
   if(report.missingFields?.length){
    output.append(element('h3','Maklumat belum lengkap'));
    const list=element('ul');for(const v of report.missingFields)list.append(element('li',v));output.append(list);
   }
  }catch(e){status.textContent='Belum dapat menjana laporan: '+e.message}
  finally{generate.disabled=false}
 });d.append(generate);
 d.append(btn('Tutup',()=>d.close()));
}
function boot(){const admin=$('#admin');if(!admin||$('#reportEntry'))return;const b=element('button','📊 Reporting Centre');b.id='reportEntry';b.className='admin-entry';b.onclick=report;const entry=$('#appointEntry');if(entry)entry.after(b);else admin.querySelector('.sub')?.after(b)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
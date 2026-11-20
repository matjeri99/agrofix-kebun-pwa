/* AgroFix Hub UI-to-API connection. Public URL only; server secrets stay in Worker. */
(() => {
  'use strict';
  const API=String(window.AGROFIX_CONFIG?.apiUrl||'').replace(/\/$/,'');
  const tokenKey='agrofix_hub_session_v1';
  const $=s=>document.querySelector(s);
  const nav=s=>document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===s));
  let token=sessionStorage.getItem(tokenKey)||'',me=null,selected='',dash=null,personal=null,plants=[],working=false;
  const modal=$('#modal'),title=$('#modtitle'),message=$('#modtext');
  function alertBox(t,m){title.textContent=t;message.textContent=m;modal.showModal()}
  async function api(action,payload={}){
    if(!API)throw Error('Sambungan AgroFix belum diaktifkan oleh pentadbir.');
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload,token})});
    if(!res.ok)throw Error('Sambungan server gagal ('+res.status+')');
    const out=await res.json();if(!out.ok)throw Error(out.error||'Operasi tidak berjaya');return out.data;
  }
  function n(v){return v===null||v===undefined?'—':v}
  function updateCounts(){
    $('#att').textContent=n(dash?.todayAttendance);$('#plants').textContent=n(dash?.activePlantings);
    const values=[n(dash?.attendanceSessions),n(dash?.activityCount),dash?.harvestKg===undefined?'—':dash.harvestKg+' kg',dash?.salesRm===undefined?'—':'RM '+Number(dash.salesRm).toFixed(2)];
    document.querySelectorAll('#home .stat strong').forEach((e,i)=>e.textContent=values[i]);
    const dashScreen=$('#dashboard .stats');if(dashScreen){
      const v=[n(dash?.memberCount),n(dash?.activePlantings),n(dash?.activityCount),dash?.harvestKg===undefined?'—':dash.harvestKg+' kg'];
      dashScreen.querySelectorAll('.stat strong').forEach((e,i)=>e.textContent=v[i]);
    }
    $('#checkin').innerHTML=personal?.openAttendance?'🏁 Selesai berkebun dah!!<small>Saya hendak pulang</small>':'🟢 Hai Kebun!!<small>Saya sudah sampai</small>';
  }
  function setSignedInUI(){
    const button=$('#profile [data-needlogin]');
    if(button){button.textContent=me?'Log keluar AgroFix':'Log Masuk AgroFix';button.onclick=()=>{
      if(!me){loginFlow();return}
      sessionStorage.removeItem(tokenKey);token='';me=null;selected='';dash=null;personal=null;plants=[];
      updateCounts();setSignedInUI();location.reload();
    }}
    const dashboardNote=$('#dashboard .notice');
    if(dashboardNote)dashboardNote.hidden=!!me;
    const gardenNote=$('#garden .notice');
    if(gardenNote)gardenNote.textContent=me?'Kebun yang dipaparkan adalah mengikut keahlian yang diluluskan.':'Log masuk untuk mengakses rekod kebun anda.';
  }
  function fillGardens(){
    const s=$('#gardenSelect');s.replaceChildren();
    (me?.gardens||[]).forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.name;s.append(o)});
    selected=s.value||'';s.disabled=!(me?.gardens?.length);
    if(selected)updateGarden();
  }
  async function refresh(){
    if(!token||!selected)return;const [stats,pers,crops]=await Promise.all([api('getGardenDashboard',{gardenId:selected}),api('getMyDashboard',{gardenId:selected}),api('listPlantings',{gardenId:selected})]);
    dash=stats;personal=pers;plants=crops||[];updateCounts();
    const box=$('#garden .empty');if(box){
      box.replaceChildren();
      if(!plants.length){box.textContent='Belum ada tanaman direkodkan.'}
      else{
        const list=document.createElement('ul');
        list.style.cssText='list-style:none;padding:0;margin:0;display:grid;gap:9px';
        for(const item of plants){
          const li=document.createElement('li');
          li.style.cssText='padding:9px 11px;border-radius:12px;background:#eff6ee;color:#204c43';
          const name=document.createElement('strong');
          name.textContent=item.cropName||'Tanaman';
          li.append(name);
          if(item.plot){const sub=document.createElement('div');sub.style.cssText='font-size:13px;color:#61746d;margin-top:2px';sub.textContent='📍 '+item.plot;li.append(sub)}
          list.append(li);
        }
        box.append(list);
      }
    }
    const activity=$('#activity .empty');if(activity){
      activity.replaceChildren();
      const activities=(personal?.recent||[]).filter(x=>x.kind==='activity');
      if(!activities.length)activity.textContent='Belum ada aktiviti direkodkan.';
      else{
        const list=document.createElement('ul');list.style.cssText='list-style:none;margin:0;padding:0;display:grid;gap:9px';
        for(const x of activities){
          const li=document.createElement('li');li.style.cssText='padding:10px;border-bottom:1px solid #edf1ed';
          const heading=document.createElement('strong');heading.textContent=x.title||'Aktiviti';li.append(heading);
          const when=document.createElement('div');when.style.cssText='font-size:12px;color:#687772;margin-top:4px';
          const date=new Date(x.at);when.textContent=Number.isNaN(date.getTime())?(x.at||'') : new Intl.DateTimeFormat('ms-MY',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuala_Lumpur'}).format(date);
          li.append(when);
          if(x.detail){const detail=document.createElement('div');detail.textContent=x.detail;li.append(detail)}
          list.append(li);
        }
        activity.append(list);
      }
    }
    const record=$('#profile .empty');if(record){record.textContent='Sesi kehadiran: '+n(personal?.attendanceSessions)+' · Aktiviti: '+n(personal?.activityCount)}
  }
  async function loginFlow(){
    if(working)return;
    if(!API){alertBox('Sambungan pelayan','Pentadbir perlu mengaktifkan API AgroFix sebelum rekod kebun boleh disimpan.');return}
    const panel=document.createElement('dialog');panel.style.cssText='border:0;border-radius:24px;width:min(92vw,410px);padding:26px;color:#173f3f';
    panel.innerHTML='<h2>Log masuk AgroFix</h2><p>Hanya ahli kebun yang disahkan boleh masuk.</p><label>Alamat e-mel<input id="afEmail" type="email" autocomplete="email" style="width:100%;padding:14px;border:1px solid #cadbd2;border-radius:12px;margin:8px 0 12px"></label><div id="afCodeRow" hidden><label>Kod pengesahan<input id="afCode" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="width:100%;padding:14px;border:1px solid #cadbd2;border-radius:12px;margin:8px 0 12px"></label></div><p id="afError" role="alert" style="font-size:14px;color:#b43930"></p><button id="afNext">Dapatkan kod</button><button id="afCancel" style="margin-left:9px;background:#e8eeee;color:#173f3f">Tutup</button>';
    document.body.append(panel);panel.showModal();
    const error=panel.querySelector('#afError'),email=panel.querySelector('#afEmail'),code=panel.querySelector('#afCode'),next=panel.querySelector('#afNext');
    panel.querySelector('#afCancel').onclick=()=>panel.close();panel.addEventListener('close',()=>panel.remove());
    let sent=false;
    next.onclick=async()=>{if(working)return;working=true;next.disabled=true;error.textContent='';try{
      if(!sent){await api('requestOtp',{email:email.value.trim()});sent=true;panel.querySelector('#afCodeRow').hidden=false;next.textContent='Sahkan & masuk';error.style.color='#27664b';error.textContent='Kod dihantar jika e-mel sudah didaftarkan.'}
      else{const data=await api('verifyOtp',{email:email.value.trim(),code:code.value.trim()});if(!data.token)throw Error('Tiada sesi diterima');token=data.token;sessionStorage.setItem(tokenKey,token);panel.close();await loadProfile();alertBox('Selamat datang','Akaun AgroFix anda telah disahkan.')}
    }catch(ex){error.style.color='#b43930';error.textContent=ex.message}finally{working=false;next.disabled=false}};
  }
  function updateGarden(){
    selected=$('#gardenSelect').value;const g=me?.gardens?.find(x=>x.id===selected);if(g){$('#place').textContent=g.name;$('#dashname').textContent=g.name}
  }
  async function loadProfile(){
    me=await api('whoami');if(!me.gardens?.length)throw Error('Keahlian kebun belum diluluskan');
    fillGardens();await refresh();setSignedInUI();$("#checkin").disabled=false;
  }
  async function save(action,payload){
    if(working)return;working=true;try{
      await api(action,{gardenId:selected,id:crypto.randomUUID(),...payload});await refresh();alertBox('Rekod berjaya','Rekod telah disahkan dan disimpan dalam pangkalan data AgroFix.')
    }catch(ex){alertBox('Rekod tidak disimpan',ex.message)}finally{working=false}
  }
  function createForm(type){
    if(!me){loginFlow();return}
    const labels={activity:['Rekod Aktiviti','Jenis aktiviti'],harvest:['Rekod Hasil','Berat hasil (kg)'],sale:['Rekod Jualan','Jumlah jualan (RM)']};
    const p=document.createElement('dialog');p.style.cssText='border:0;border-radius:22px;padding:23px;width:min(92vw,440px);color:#173f3f';
    const heading=document.createElement('h2');heading.textContent=labels[type][0];p.append(heading);
    const cropSel=document.createElement('select');cropSel.style.cssText='display:block;width:100%;padding:13px;margin:12px 0;border-radius:10px;border:1px solid #cadbd2';
    for(const x of plants){const opt=document.createElement('option');opt.value=x.cropName;opt.textContent=x.cropName;cropSel.append(opt)}
    const label=document.createElement('label');label.textContent=labels[type][1];const field=document.createElement(type==='activity'?'select':'input');
    if(type==='activity'){for(const t of ['Menyiram','Membaja','Menanam','Merumput','Menuai','Penyelenggaraan','Lain-lain']){const opt=document.createElement('option');opt.textContent=t;field.append(opt)}}else{field.type='number';field.min='0.01';field.step='0.01'}
    field.style.cssText='display:block;width:100%;padding:13px;border:1px solid #cadbd2;border-radius:10px;margin:11px 0';label.append(field);p.append(label);
    const cropLabel=document.createElement('label');cropLabel.textContent='Tanaman';cropLabel.append(cropSel);p.append(cropLabel);
    const notes=document.createElement('textarea');notes.placeholder='Catatan (pilihan)';notes.style.cssText='width:100%;padding:12px;border:1px solid #cadbd2;border-radius:10px;margin:8px 0';if(type==='activity')p.append(notes);
    const save=document.createElement('button');save.textContent='Simpan rekod';p.append(save);const close=document.createElement('button');close.textContent='Batal';close.style.cssText='margin-left:10px;background:#e8eeee;color:#173f3f';p.append(close);
    close.onclick=()=>p.close();p.addEventListener('close',()=>p.remove());document.body.append(p);p.showModal();
    save.onclick=async()=>{if(working)return;const payload=type==='activity'?{type:field.value,crop:cropSel.value,notes:notes.value}:type==='harvest'?{crop:cropSel.value,weightKg:field.value}:{crop:cropSel.value,totalRm:field.value};if(type!=='activity'&&!(Number(field.value)>0)){alertBox('Semak rekod','Masukkan nilai melebihi sifar');return}
      working=true;save.disabled=true;try{await api({activity:'addActivity',harvest:'addHarvest',sale:'addSale'}[type],{id:crypto.randomUUID(),gardenId:selected,...payload});p.close();await refresh();alertBox('Rekod berjaya','Data telah disimpan dalam cloud AgroFix.')}catch(e){alertBox('Gagal menyimpan',e.message)}finally{working=false;save.disabled=false}};
  }
  $('#checkin').onclick=async()=>{if(!me){await loginFlow();return}if(personal?.openAttendance){if(working)return;working=true;try{await api('punchOut',{id:personal.openAttendance.id,gardenId:selected});await refresh();alertBox('Sesi selesai','Masa keluar kebun telah direkodkan.')}catch(e){alertBox('Tidak berjaya',e.message)}finally{working=false}}else await save('punchIn',{})};
  const quick=document.querySelectorAll('#home .quick button');['activity','harvest','sale'].forEach((k,i)=>{if(quick[i])quick[i].onclick=()=>createForm(k)});
  document.querySelectorAll('[data-needlogin]').forEach(x=>x.onclick=()=>loginFlow());
  setSignedInUI();
  $('#gardenSelect').addEventListener('change',async()=>{if(!me)return;updateGarden();try{await refresh()}catch(e){alertBox('Gagal memuatkan kebun',e.message)}});
  $('#settings').onclick=()=>{if(!me)loginFlow();else alertBox('AgroFix Kebun','Log masuk sebagai '+me.name+'. Untuk log keluar, buka Rekod Saya dan tekan Log keluar AgroFix.')};
  if(token)loadProfile().catch(e=>{sessionStorage.removeItem(tokenKey);token='';me=null;updateCounts();alertBox('Sesi tamat',e.message)});
  updateCounts();
})();
/**
 * AgroFix Kebun Hub · authenticated gateway
 * Secrets are Cloudflare Worker secrets, never sent to GitHub/browser:
 *   APPS_SCRIPT_URL, AGROFIX_GATEWAY_SECRET
 * Var: ALLOWED_ORIGINS=https://matjeri99.github.io
 */
const ACTIONS=new Set(['requestOtp','verifyOtp','whoami','getGardenDashboard','getMyDashboard','listPlantings','punchIn','punchOut','addActivity','addHarvest','addSale','addPlanting']);
function response(body,status,headers){return new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allow=String(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).includes(origin);
  const headers=allow?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{};
  if(request.method==='OPTIONS')return new Response(null,{status:allow?204:403,headers});
  if(request.method!=='POST'||!allow)return response({ok:false,error:'Permintaan tidak dibenarkan.'},403,headers);
  if(!env.APPS_SCRIPT_URL||!env.AGROFIX_GATEWAY_SECRET)return response({ok:false,error:'Konfigurasi pelayan belum lengkap.'},503,headers);
  let value;try{
   const txt=await request.text();if(txt.length>16000)return response({ok:false,error:'Permintaan terlalu besar.'},413,headers);
   value=JSON.parse(txt);if(!ACTIONS.has(value.action))return response({ok:false,error:'Operasi tidak dikenali.'},400,headers);
   const payload={action:value.action,payload:value.payload||{},token:String(value.token||''),gatewaySecret:env.AGROFIX_GATEWAY_SECRET};
   // Apps Script redirects /exec POST response to script.googleusercontent.com. Follow redirects server-side.
   const upstream=await fetch(env.APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
   const answer=await upstream.text();
   if(!upstream.ok) return response({ok:false,error:'Sambungan Apps Script terganggu.'},502,headers);
   let parsed;try{parsed=JSON.parse(answer)}catch{return response({ok:false,error:'Format jawapan pelayan tidak sah.'},502,headers)}
   return response(parsed,200,headers);
  }catch(ex){return response({ok:false,error:'Pelayan gagal memproses permintaan.'},500,headers)}
 }
};
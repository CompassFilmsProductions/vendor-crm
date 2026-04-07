import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const APP_NAME = 'vendor-crm';

async function loadFromSupabase() {
  const { data, error } = await supabase
    .from('app_states')
    .select('content')
    .eq('app_name', APP_NAME)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  if (error) { console.error('Load failed:', error); return null; }
  return data?.content;
}

async function saveToSupabase(content) {
  const { error } = await supabase
    .from('app_states')
    .upsert({ app_name: APP_NAME, content, updated_at: new Date() });
  if (error) console.error('Save failed:', error);
}


const REGIONS = ["Atlanta","Charleston","Savannah","Nashville"];
const REGION_COLORS = {
  Atlanta:    {active:"#2563eb",bg:"#eff6ff",text:"#1e40af"},
  Charleston: {active:"#059669",bg:"#ecfdf5",text:"#065f46"},
  Savannah:   {active:"#d97706",bg:"#fffbeb",text:"#92400e"},
  Nashville:  {active:"#7c3aed",bg:"#f5f3ff",text:"#5b21b6"},
};
const STATUSES = {
  meeting:["Completed","Scheduled","Pending","No Response","Not Started"],
  vendor: ["Commission Partner","Preferred Vendor","Prospect","In Negotiation","On Hold","Pending","Declined"],
  websiteNeeded:["Yes","No"],
};
const PIPELINE_STAGES = ["Prospect","Pending","In Negotiation","On Hold","Preferred Vendor","Commission Partner","Declined"];
const SC = {
  Completed:{bg:"#dcfce7",color:"#166534"},Scheduled:{bg:"#dbeafe",color:"#1e40af"},
  Pending:{bg:"#fef9c3",color:"#854d0e"},"No Response":{bg:"#f3f4f6",color:"#4b5563"},
  "Not Started":{bg:"#fee2e2",color:"#b91c1c"},"Commission Partner":{bg:"#d1fae5",color:"#065f46"},
  "Preferred Vendor":{bg:"#dbeafe",color:"#1e40af"},Prospect:{bg:"#ede9fe",color:"#5b21b6"},
  "In Negotiation":{bg:"#fef9c3",color:"#92400e"},"On Hold":{bg:"#ffedd5",color:"#9a3412"},
  Declined:{bg:"#fee2e2",color:"#b91c1c"},Yes:{bg:"#ffedd5",color:"#9a3412"},No:{bg:"#f3f4f6",color:"#6b7280"},
};
const TAG_COLORS = [
  {bg:"#dbeafe",color:"#1e40af"},{bg:"#dcfce7",color:"#166534"},
  {bg:"#fce7f3",color:"#9d174d"},{bg:"#ffedd5",color:"#9a3412"},
  {bg:"#ede9fe",color:"#5b21b6"},{bg:"#fef9c3",color:"#854d0e"},
];
const ITYPES = [
  {key:"email",label:"Email",icon:"✉️"},{key:"call",label:"Phone Call",icon:"📞"},
  {key:"meeting",label:"In-Person",icon:"🤝"},{key:"social",label:"Social Media",icon:"💬"},
];
const ALL_COLS = [
  {key:"organization",label:"Organization",required:true},{key:"contact",label:"Contact"},
  {key:"type",label:"Type"},{key:"meetingStatus",label:"Meeting Status"},
  {key:"vendorStatus",label:"Vendor Status"},{key:"health",label:"Health"},
  {key:"meetingDate",label:"Meeting Date"},{key:"websiteNeeded",label:"Website Needed?"},
  {key:"tags",label:"Tags"},{key:"interactions",label:"Interactions"},
  {key:"phone",label:"Phone"},{key:"email",label:"Email"},
];
const CRM_FIELDS = [
  {key:"organization",label:"Organization"},{key:"contact",label:"Contact Person"},
  {key:"type",label:"Type / Category"},{key:"phone",label:"Phone"},{key:"email",label:"Email"},
  {key:"website",label:"Website"},{key:"social",label:"Social Account"},
  {key:"meetingStatus",label:"Meeting Status"},{key:"vendorStatus",label:"Vendor Status"},
  {key:"websiteNeeded",label:"Website Needed?"},{key:"notes",label:"Notes"},
  {key:"partnership",label:"Partnership"},{key:"ignore",label:"— Ignore —"},
];
const COL_ALIASES = {
  organization:["organization","org","company","business","name","vendor name","vendor"],
  contact:["contact","contact person","contact name","person","rep","representative"],
  type:["type","category","vendor type","industry","service"],
  phone:["phone","phone #","phone number","tel","telephone","mobile","cell"],
  email:["email","e-mail","email address"],
  website:["website","web","url","site","web address"],
  social:["social","social account","instagram","twitter","facebook","handle"],
  meetingStatus:["meeting status","meeting","meeting progress"],
  vendorStatus:["vendor status","vendor","relationship","stage","partnership status"],
  websiteNeeded:["website needed","needs website","web needed"],
  notes:["notes","note","comments","remarks","details"],
  partnership:["partnership","partner","agreement","partnership agreement"],
};
const STATUS_FUZZY = {
  meetingStatus:{completed:"Completed",done:"Completed",met:"Completed",scheduled:"Scheduled",booked:"Scheduled",confirmed:"Scheduled",pending:"Pending","in progress":"Pending","no response":"No Response","no reply":"No Response","not started":"Not Started",new:"Not Started",cold:"Not Started"},
  vendorStatus:{"commission partner":"Commission Partner",commission:"Commission Partner","preferred vendor":"Preferred Vendor",preferred:"Preferred Vendor",active:"Preferred Vendor",prospect:"Prospect",lead:"Prospect","in negotiation":"In Negotiation",negotiating:"In Negotiation","on hold":"On Hold",hold:"On Hold",paused:"On Hold",pending:"Pending",declined:"Declined",rejected:"Declined",inactive:"Declined"},
};
const AREA_CODES = {
  Atlanta:["404","470","678","770","762","706"],
  Charleston:["843","854"],
  Savannah:["912","478"],
};
const CITY_KEYWORDS = {
  Atlanta:["atlanta","alpharetta","marietta","roswell","duluth","smyrna","decatur","sandy springs","cumming","canton","gainesville","kennesaw","acworth","woodstock","norcross","lawrenceville","buford","suwanee","johns creek","peachtree","dunwoody","brookhaven","north georgia","north ga","gwinnett","cobb","fulton","dekalb","cherokee","forsyth"],
  Charleston:["charleston","mount pleasant","summerville","goose creek","north charleston","isle of palms","james island","johns island","folly beach","moncks corner","beaufort","bluffton","hilton head"],
  Savannah:["savannah","tybee","pooler","rincon","hinesville","brunswick","jekyll island","st simons","statesboro"],
};

const nowIso = () => new Date().toISOString();
const daysAgo = iso => iso ? Math.floor((Date.now()-new Date(iso).getTime())/86400000) : null;
const daysUntil = iso => iso ? Math.ceil((new Date(iso).getTime()-Date.now())/86400000) : null;
const fmtDate = iso => iso ? new Date(iso).toLocaleString([],{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtShort = iso => iso ? new Date(iso).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}) : "—";
const toDateInput = iso => iso ? new Date(iso).toISOString().slice(0,16) : "";

function healthScore(v) {
  let s=0;
  const last=v.interactions?.length ? v.interactions.reduce((a,b)=>a.date>b.date?a:b) : null;
  const d=daysAgo(last?.date);
  if(d!==null){if(d<=7)s+=40;else if(d<=14)s+=30;else if(d<=30)s+=15;}
  if(v.meetingStatus==="Completed")s+=30;else if(v.meetingStatus==="Scheduled")s+=20;else if(v.meetingStatus==="Pending")s+=10;
  if(v.vendorStatus==="Commission Partner")s+=30;else if(v.vendorStatus==="Preferred Vendor")s+=25;else if(v.vendorStatus==="In Negotiation")s+=15;else if(v.vendorStatus==="Prospect")s+=10;
  return Math.min(100,s);
}
function clipCopy(text) {
  try{const el=document.createElement("textarea");el.value=text;el.style.cssText="position:fixed;top:0;left:0;opacity:0;";document.body.appendChild(el);el.focus();el.select();document.execCommand("copy");document.body.removeChild(el);}catch(e){navigator.clipboard?.writeText(text);}
}
function useOutside(ref,cb) {
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))cb();};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
}
function guessCol(col) {
  const c=col.toLowerCase().trim();
  for(const [field,keys] of Object.entries(COL_ALIASES)){if(keys.includes(c))return field;}
  for(const [field,keys] of Object.entries(COL_ALIASES)){if(keys.some(k=>c.includes(k)||k.includes(c)))return field;}
  return "ignore";
}
function fuzzyStatus(raw,field) {
  if(!raw)return "";
  return STATUS_FUZZY[field]?.[raw.toLowerCase().trim()]||"";
}
function guessRegion(name) {
  const n=name.toLowerCase();
  if(n.includes("atlanta")||n.includes("georgia")||n.includes(" ga")||n.includes("north ga"))return "Atlanta";
  if(n.includes("charleston")||n.includes(" sc")||n.includes("south carolina"))return "Charleston";
  if(n.includes("savannah")||n.includes("sav"))return "Savannah";
  if(n.includes("nashville")||n.includes("nash")||n.includes("tennessee")||n.includes(" tn"))return "Nashville";
  return null;
}
function detectRegionFromData(v) {
  const text=[v.phone,v.notes,v.website,v.email,v.organization,v.contact,v.type].join(" ").toLowerCase();
  const phone=(v.phone||"").replace(/\D/g,"");
  for(const [region,codes] of Object.entries(AREA_CODES)){
    if(codes.some(c=>phone.startsWith(c)))return {region,signal:"area code "+phone.slice(0,3)};
  }
  for(const [region,keywords] of Object.entries(CITY_KEYWORDS)){
    const hit=keywords.find(k=>text.includes(k));
    if(hit)return {region,signal:'keyword "'+hit+'"'};
  }
  const zips=text.match(/\b3[0-9]\d{3}\b/g)||[];
  for(const zip of zips){
    const z=parseInt(zip);
    if(z>=37001&&z<=38599)return {region:"Nashville",signal:"zip "+zip};
    if(z>=31401&&z<=31499)return {region:"Savannah",signal:"zip "+zip};
    if(z>=29400&&z<=29499)return {region:"Charleston",signal:"zip "+zip};
    if(z>=30001&&z<=31999)return {region:"Atlanta",signal:"zip "+zip};
  }
  return null;
}
function stringSim(a,b) {
  a=a.toLowerCase().trim();b=b.toLowerCase().trim();
  if(a===b)return 1;
  if(a.includes(b)||b.includes(a))return 0.9;
  const longer=a.length>b.length?a:b,shorter=a.length>b.length?b:a;
  let m=0;for(let i=0;i<shorter.length;i++)if(longer.includes(shorter[i]))m++;
  return m/longer.length;
}
function findDupes(vendors) {
  const pairs=[],seen=new Set();
  for(let i=0;i<vendors.length;i++){
    for(let j=i+1;j<vendors.length;j++){
      const key=vendors[i].id+"-"+vendors[j].id;if(seen.has(key))continue;
      const a=vendors[i],b=vendors[j];
      const ns=stringSim(a.organization||"",b.organization||"");
      const sp=a.phone&&b.phone&&a.phone.replace(/\D/g,"")===b.phone.replace(/\D/g,"");
      const se=a.email&&b.email&&a.email.toLowerCase()===b.email.toLowerCase();
      if(ns>=0.85||sp||se){seen.add(key);pairs.push({a,b,reason:se?"Same email":sp?"Same phone":"Similar name ("+Math.round(ns*100)+"%)"}); }
    }
  }
  return pairs;
}

function HealthBar({score}){
  const color=score>=70?"#22c55e":score>=40?"#f59e0b":"#ef4444";
  return <div style={{display:"flex",alignItems:"center",gap:5}}>
    <div style={{flex:1,height:5,background:"#f3f4f6",borderRadius:9999,minWidth:50}}>
      <div style={{height:5,borderRadius:9999,background:color,width:score+"%"}}/>
    </div>
    <span style={{fontSize:10,fontWeight:700,color,minWidth:24}}>{score}</span>
  </div>;
}
function Badge({label}){
  const c=SC[label]||{bg:"#f3f4f6",color:"#6b7280"};
  return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9999,fontSize:11,fontWeight:600,background:c.bg,color:c.color}}>{label||"—"}</span>;
}
function TagChip({label,idx,onRemove}){
  const c=TAG_COLORS[idx%TAG_COLORS.length];
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 7px",borderRadius:9999,fontSize:11,fontWeight:600,background:c.bg,color:c.color}}>
    {label}{onRemove&&<span onClick={onRemove} style={{cursor:"pointer",opacity:.6,fontSize:12}}>×</span>}
  </span>;
}
function StatCard({label,value,bg,color}){
  return <div style={{borderRadius:12,padding:16,background:bg,display:"flex",flexDirection:"column",gap:4}}>
    <div style={{fontSize:26,fontWeight:700,color}}>{value}</div>
    <div style={{fontSize:11,fontWeight:500,color,opacity:.7}}>{label}</div>
  </div>;
}
function CopyClick({value,type}){
  const [copied,setCopied]=useState(false);
  if(!value)return <span style={{fontSize:13,color:"#d1d5db",fontStyle:"italic"}}>—</span>;
  if(type==="website"){const href=value.startsWith("http")?value:"https://"+value;return <a href={href} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:13,color:"#2563eb",textDecoration:"underline"}}>{value} 🔗</a>;}
  return <span onClick={e=>{e.stopPropagation();clipCopy(value);setCopied(true);setTimeout(()=>setCopied(false),1500);}} style={{fontSize:13,color:"#1f2937",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,padding:"1px 4px",borderRadius:4,background:copied?"#d1fae5":"transparent"}}>
    {copied?"✅ Copied!":<>{value}<span style={{fontSize:11,color:"#9ca3af"}}>{type==="email"?"✉️":"📋"}</span></>}
  </span>;
}
function InlineSelect({value,options,field,onSave}){
  const [open,setOpen]=useState(false);
  const ref=useRef();useOutside(ref,()=>setOpen(false));
  const c=SC[value]||{bg:"#f3f4f6",color:"#374151"};
  return <div ref={ref} style={{position:"relative",display:"inline-block"}}>
    <span onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{display:"inline-block",padding:"2px 8px",borderRadius:9999,fontSize:11,fontWeight:600,background:c.bg,color:c.color,cursor:"pointer",border:open?"1.5px solid "+c.color:"1.5px solid transparent",userSelect:"none"}}>{value||"—"} ▾</span>
    {open&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,minWidth:170,padding:6}}>
      {options.map(opt=>{const oc=SC[opt]||{bg:"#f3f4f6",color:"#374151"};return(
        <div key={opt} onClick={()=>{onSave(field,opt);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,cursor:"pointer",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <span style={{width:10,height:10,borderRadius:9999,background:oc.color,flexShrink:0,display:"inline-block"}}/>
          <span style={{fontWeight:opt===value?700:400,color:opt===value?oc.color:"#374151"}}>{opt}</span>
          {opt===value&&<span style={{marginLeft:"auto",color:oc.color}}>✓</span>}
        </div>);})}
    </div>}
  </div>;
}
function Field({label,value,edit,onChange,type="text",options,fieldType}){
  return <div style={{marginBottom:8}}>
    <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>{label}</div>
    {edit?(options
      ?<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 8px",fontSize:13}}>{options.map(o=><option key={o}>{o}</option>)}</select>
      :type==="textarea"
        ?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 8px",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/>
        :<input type={type} value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 8px",fontSize:13,boxSizing:"border-box"}}/>)
    :fieldType?<CopyClick value={value} type={fieldType}/>
    :<div style={{fontSize:13,color:value?"#1f2937":"#d1d5db",fontStyle:value?"normal":"italic"}}>{value||"—"}</div>}
  </div>;
}
function OrgCell({vendor,showWarning}){
  const [hov,setHov]=useState(false);
  const [showNotes,setShowNotes]=useState(false);
  const [copied,setCopied]=useState(false);
  const ref=useRef();useOutside(ref,()=>setShowNotes(false));
  function copyContact(e){
    e.stopPropagation();
    clipCopy([vendor.organization,vendor.contact&&"Contact: "+vendor.contact,vendor.phone&&"Phone: "+vendor.phone,vendor.email&&"Email: "+vendor.email,vendor.website&&"Website: "+vendor.website].filter(Boolean).join("\n"));
    setCopied(true);setTimeout(()=>setCopied(false),2000);
  }
  return <div ref={ref} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{position:"relative"}}>
    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
      {showWarning&&<span>⚠️</span>}
      <span style={{fontWeight:600}}>{vendor.organization}</span>
      {hov&&<>
        <button onClick={copyContact} style={{padding:"1px 6px",fontSize:10,fontWeight:600,borderRadius:9999,border:"1px solid #d1d5db",background:copied?"#d1fae5":"#f9fafb",color:copied?"#065f46":"#6b7280",cursor:"pointer"}}>{copied?"✅":"🔗 Copy"}</button>
        {vendor.notes&&<button onClick={e=>{e.stopPropagation();setShowNotes(s=>!s);}} style={{padding:"1px 6px",fontSize:10,fontWeight:600,borderRadius:9999,border:"1px solid #d1d5db",background:showNotes?"#fef9c3":"#f9fafb",color:showNotes?"#854d0e":"#6b7280",cursor:"pointer"}}>📝</button>}
      </>}
    </div>
    {showNotes&&vendor.notes&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 6px)",left:0,background:"#fff",border:"1px solid #fde68a",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:300,padding:"12px 14px",fontSize:12,color:"#374151",maxWidth:280,lineHeight:1.6}}>
      <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",marginBottom:5}}>📝 NOTES</div>{vendor.notes}
    </div>}
  </div>;
}
function IBtn({vendor,onLog}){
  const [open,setOpen]=useState(false);
  const ref=useRef();useOutside(ref,()=>setOpen(false));
  const last=vendor.interactions?.length?vendor.interactions.reduce((a,b)=>a.date>b.date?a:b):null;
  const days=daysAgo(last?.date);const overdue=days===null||days>=30;
  return <div ref={ref} style={{position:"relative"}}>
    <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:9999,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",background:overdue?"#fee2e2":"#ecfdf5",color:overdue?"#b91c1c":"#065f46"}}>
      {overdue?"⚠️":"✅"} {vendor.interactions?.length||0}{days!==null?" · "+days+"d":" · Never"}
    </button>
    {open&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 6px)",left:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,padding:10,minWidth:180}}>
      <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",marginBottom:8}}>LOG INTERACTION</div>
      {ITYPES.map(t=><button key={t.key} onClick={()=>{onLog(vendor.id,t.key);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 8px",borderRadius:6,border:"none",background:"none",cursor:"pointer",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background="#f3f4f6"} onMouseLeave={e=>e.currentTarget.style.background="none"}>{t.icon} {t.label}</button>)}
    </div>}
  </div>;
}
function ILog({interactions,onDelete}){
  if(!interactions?.length)return <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>No interactions yet.</div>;
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {[...interactions].sort((a,b)=>b.date.localeCompare(a.date)).map(i=>{
      const t=ITYPES.find(x=>x.key===i.type);
      return <div key={i.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",background:"#f9fafb",borderRadius:6,fontSize:12,gap:6}}>
        <span style={{whiteSpace:"nowrap"}}>{t?.icon} {t?.label}</span>
        <span style={{color:"#6b7280",flex:1,textAlign:"right"}}>{fmtDate(i.date)}</span>
        <button onClick={()=>onDelete(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:14}}>×</button>
      </div>;
    })}
  </div>;
}
function Timeline({vendor}){
  const events=[
    ...(vendor.statusHistory||[]).map(h=>({date:h.date,icon:"🏷",label:"Status → "+h.status,color:"#8b5cf6"})),
    ...(vendor.interactions||[]).map(i=>{const t=ITYPES.find(x=>x.key===i.type);return{date:i.date,icon:t?.icon,label:t?.label,color:"#3b82f6"};}),
    ...(vendor.meetingDate?[{date:vendor.meetingDate,icon:"📅",label:"Meeting: "+fmtShort(vendor.meetingDate),color:"#f59e0b"}]:[]),
  ].sort((a,b)=>b.date.localeCompare(a.date));
  if(!events.length)return <div style={{fontSize:12,color:"#9ca3af",fontStyle:"italic"}}>No history yet.</div>;
  return <div style={{position:"relative",paddingLeft:20}}>
    <div style={{position:"absolute",left:7,top:0,bottom:0,width:2,background:"#e5e7eb"}}/>
    {events.map((e,i)=><div key={i} style={{position:"relative",marginBottom:10}}>
      <div style={{position:"absolute",left:-16,top:2,width:10,height:10,borderRadius:9999,background:e.color,border:"2px solid #fff"}}/>
      <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{e.icon} {e.label}</div>
      <div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(e.date)}</div>
    </div>)}
  </div>;
}
function TaskList({tasks,vendorId,onUpdate}){
  const [newTask,setNewTask]=useState("");const [newDue,setNewDue]=useState("");
  function add(){if(!newTask.trim())return;onUpdate(vendorId,[...tasks,{id:Date.now(),text:newTask.trim(),done:false,due:newDue?new Date(newDue).toISOString():null}]);setNewTask("");setNewDue("");}
  return <div>
    {tasks.map(t=>{const od=t.due&&!t.done&&daysUntil(t.due)<0;return <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6,padding:"5px 8px",background:od?"#fef2f2":"#f9fafb",borderRadius:6,border:od?"1px solid #fca5a5":"1px solid transparent"}}>
      <input type="checkbox" checked={t.done} onChange={()=>onUpdate(vendorId,tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={{marginTop:2,cursor:"pointer"}}/>
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:t.done?"#9ca3af":"#374151",textDecoration:t.done?"line-through":"none"}}>{t.text}</div>
        {t.due&&<div style={{fontSize:10,color:od?"#b91c1c":"#9ca3af"}}>{od?"⚠️ ":""}{fmtShort(t.due)}</div>}
      </div>
      <button onClick={()=>onUpdate(vendorId,tasks.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:13}}>×</button>
    </div>;})}
    <div style={{display:"flex",gap:4,marginTop:6}}>
      <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add task..." style={{flex:1,border:"1px solid #d1d5db",borderRadius:6,padding:"4px 7px",fontSize:12}}/>
      <input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} style={{border:"1px solid #d1d5db",borderRadius:6,padding:"4px 6px",fontSize:11,width:110}}/>
      <button onClick={add} style={{padding:"4px 8px",background:"#2563eb",color:"#fff",border:"none",borderRadius:6,fontSize:12,cursor:"pointer"}}>+</button>
    </div>
  </div>;
}
function TagEditor({tags,allTags,onChange}){
  const [input,setInput]=useState("");const [open,setOpen]=useState(false);
  const ref=useRef();useOutside(ref,()=>setOpen(false));
  const sugg=allTags.filter(t=>!tags.includes(t)&&t.toLowerCase().includes(input.toLowerCase()));
  return <div ref={ref} style={{position:"relative"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{tags.map((t,i)=><TagChip key={t} label={t} idx={i} onRemove={()=>onChange(tags.filter(x=>x!==t))}/>)}</div>
    <div style={{display:"flex",gap:4}}>
      <input value={input} onChange={e=>{setInput(e.target.value);setOpen(true);}} onKeyDown={e=>{if(e.key==="Enter"&&input.trim()){onChange([...tags,input.trim()]);setInput("");setOpen(false);}}} placeholder="Add tag..." style={{flex:1,border:"1px solid #d1d5db",borderRadius:6,padding:"3px 7px",fontSize:12}}/>
      <button onClick={()=>{if(input.trim()){onChange([...tags,input.trim()]);setInput("");}}} style={{padding:"3px 8px",background:"#f3f4f6",border:"1px solid #d1d5db",borderRadius:6,fontSize:12,cursor:"pointer"}}>+</button>
    </div>
    {open&&sugg.length>0&&<div style={{position:"absolute",top:"100%",left:0,background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,.1)",zIndex:300,padding:6,minWidth:140}}>
      {sugg.map((s,i)=><div key={s} onClick={()=>{onChange([...tags,s]);setInput("");setOpen(false);}} style={{padding:"5px 8px",borderRadius:4,cursor:"pointer",fontSize:12}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="none"}><TagChip label={s} idx={i}/></div>)}
    </div>}
  </div>;
}
function CalendarView({vendors}){
  const [cur,setCur]=useState(()=>{const d=new Date();d.setDate(1);return d;});
  const year=cur.getFullYear(),month=cur.getMonth();
  const firstDay=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate();
  const map=useMemo(()=>{
    const m={};
    vendors.filter(v=>v.meetingDate&&(v.meetingStatus==="Scheduled"||v.meetingStatus==="Pending")).forEach(v=>{
      const d=new Date(v.meetingDate);const key=d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();
      if(!m[key])m[key]=[];m[key].push(v);
    });return m;
  },[vendors]);
  const cells=[];for(let i=0;i<firstDay;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const isToday=d=>d&&new Date(year,month,d).toDateString()===new Date().toDateString();
  return <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid #f3f4f6"}}>
      <button onClick={()=>{const d=new Date(cur);d.setMonth(d.getMonth()-1);setCur(d);}} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>‹</button>
      <div style={{fontWeight:700,fontSize:15}}>{cur.toLocaleString([],{month:"long",year:"numeric"})}</div>
      <button onClick={()=>{const d=new Date(cur);d.setMonth(d.getMonth()+1);setCur(d);}} style={{background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid #f3f4f6"}}>
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{padding:"6px 0",textAlign:"center",fontSize:11,fontWeight:600,color:"#9ca3af"}}>{d}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
      {cells.map((d,i)=>{const key=d?year+"-"+month+"-"+d:null;const mtgs=key?(map[key]||[]):[];
        return <div key={i} style={{minHeight:72,padding:4,borderRight:"1px solid #f9fafb",borderBottom:"1px solid #f9fafb",background:isToday(d)?"#eff6ff":"#fff"}}>
          {d&&<><div style={{fontSize:12,fontWeight:isToday(d)?700:400,color:isToday(d)?"#2563eb":"#374151",marginBottom:2}}>{d}</div>
          {mtgs.map(v=>{const c=SC[v.meetingStatus]||{bg:"#e5e7eb",color:"#374151"};return <div key={v.id} title={v.organization} style={{fontSize:10,fontWeight:600,background:c.bg,color:c.color,borderRadius:4,padding:"1px 5px",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.organization}</div>;})}
          </>}
        </div>;
      })}
    </div>
  </div>;
}
function PipelineView({vendors,onUpdate}){
  const [dragging,setDragging]=useState(null);
  const byStage=useMemo(()=>{const m={};PIPELINE_STAGES.forEach(s=>m[s]=[]);vendors.forEach(v=>{if(m[v.vendorStatus])m[v.vendorStatus].push(v);});return m;},[vendors]);
  return <div style={{display:"flex",gap:12,overflowX:"auto",padding:"4px 0 12px"}}>
    {PIPELINE_STAGES.map(stage=>{const c=SC[stage]||{bg:"#f3f4f6",color:"#374151"};
      return <div key={stage} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragging){onUpdate(dragging.id,"vendorStatus",stage);setDragging(null);}}} style={{minWidth:180,background:"#f9fafb",borderRadius:10,border:"2px dashed #e5e7eb",padding:8,flexShrink:0}}>
        <div style={{fontSize:11,fontWeight:700,color:c.color,background:c.bg,borderRadius:6,padding:"3px 8px",marginBottom:8,textAlign:"center"}}>{stage} ({byStage[stage].length})</div>
        {byStage[stage].map(v=><div key={v.id} draggable onDragStart={()=>setDragging(v)} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 10px",marginBottom:6,cursor:"grab"}}>
          <div style={{fontWeight:600,fontSize:12,color:"#111827",marginBottom:2}}>{v.organization}</div>
          {v.contact&&<div style={{fontSize:11,color:"#6b7280"}}>{v.contact}</div>}
          <HealthBar score={healthScore(v)}/>
          {v.tags?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>{v.tags.map((t,i)=><TagChip key={t} label={t} idx={i}/>)}</div>}
        </div>)}
      </div>;
    })}
  </div>;
}

function AuditModal({vendors,onClose,onApply,darkMode,cardBg,borderCol,textCol,subText}){
  const [tab,setTab]=useState("region");
  const [regionFlags,setRegionFlags]=useState(null);
  const [dupPairs,setDupPairs]=useState(null);
  const [loading,setLoading]=useState(true);
  const [lookupStatus,setLookupStatus]=useState({});
  const [decisions,setDecisions]=useState({});
  const [applied,setApplied]=useState(false);
  useEffect(()=>{runAudit();},[]);
  async function runAudit(){
    setLoading(true);
    const flags=vendors.map(v=>{
      const det=detectRegionFromData(v);
      if(det&&det.region!==v.region)return{vendor:v,suggested:det.region,signal:det.signal,needsLookup:false};
      if(!det)return{vendor:v,suggested:null,signal:"No local signals",needsLookup:true};
      return null;
    }).filter(Boolean);
    setRegionFlags(flags);setDupPairs(findDupes(vendors));setLoading(false);
    for(const flag of flags.filter(f=>f.needsLookup).slice(0,6)){
      setLookupStatus(s=>({...s,[flag.vendor.id]:"🔍 looking up…"}));
      try{
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:200,messages:[{role:"user",content:'What city and state is this business in? Reply ONLY with JSON: {"city":"Atlanta","state":"GA","region":"Atlanta"} where region is one of: Atlanta, Charleston, Savannah, Nashville. If unknown set region to null.\n\nBusiness: "'+flag.vendor.organization+'"\nPhone: "'+(flag.vendor.phone||"")+'"\nWebsite: "'+(flag.vendor.website||"").slice(0,80)+'"'}],tools:[{type:"web_search_20250305",name:"web_search"}]})});
        const data=await res.json();
        const tb=data.content?.find(b=>b.type==="text");
        if(tb){const m=tb.text.match(/\{[^}]+\}/);if(m){const p=JSON.parse(m[0]);if(p.region){
          setRegionFlags(prev=>prev.map(f=>f.vendor.id===flag.vendor.id?{...f,suggested:p.region,signal:"AI: "+(p.city||"")+(p.state?", "+p.state:""),needsLookup:false}:f));
          setLookupStatus(s=>({...s,[flag.vendor.id]:"✅ "+(p.city||p.region)}));
        }else setLookupStatus(s=>({...s,[flag.vendor.id]:"❓ Unknown"}));}}
      }catch(e){setLookupStatus(s=>({...s,[flag.vendor.id]:"⚠️ Failed"}));}
    }
  }
  function applyAll(){
    const regionUpdates={},toDelete=new Set(),merges=[];
    (regionFlags||[]).forEach(f=>{if(decisions["r:"+f.vendor.id]==="accept"&&f.suggested)regionUpdates[f.vendor.id]=f.suggested;});
    (dupPairs||[]).forEach(pair=>{
      const key=pair.a.id+"-"+pair.b.id,dec=decisions["d:"+key];if(!dec)return;
      if(dec==="keepA")toDelete.add(pair.b.id);
      else if(dec==="keepB")toDelete.add(pair.a.id);
      else if(dec==="merge")merges.push({keep:pair.a,discard:pair.b});
    });
    onApply({regionUpdates,toDelete,merges});setApplied(true);
  }
  const decided=Object.keys(decisions).length;
  const pending=(regionFlags||[]).filter(f=>f.suggested&&f.suggested!==f.vendor.region&&!decisions["r:"+f.vendor.id]).length+(dupPairs||[]).filter(p=>!decisions["d:"+p.a.id+"-"+p.b.id]).length;
  const sb={padding:"5px 10px",fontSize:12,border:"1px solid "+borderCol,borderRadius:6,background:cardBg,color:textCol,cursor:"pointer"};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
    <div style={{background:cardBg,borderRadius:14,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 48px rgba(0,0,0,.25)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+borderCol,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div><div style={{fontWeight:700,fontSize:16}}>🔍 Dedup & Region Audit</div><div style={{fontSize:11,color:subText,marginTop:2}}>Scanning {vendors.length} vendors</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:subText,cursor:"pointer"}}>×</button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid "+borderCol,flexShrink:0}}>
        {[["region","🗺 Region Audit",(regionFlags||[]).filter(f=>f.suggested&&f.suggested!==f.vendor.region).length],
          ["dups","🔁 Duplicates",(dupPairs||[]).length]].map(([t,l,cnt])=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:tab===t?700:500,cursor:"pointer",border:"none",background:"none",color:tab===t?"#2563eb":subText,borderBottom:tab===t?"2px solid #2563eb":"2px solid transparent"}}>
            {l}{!loading&&cnt>0&&<span style={{fontSize:11,padding:"1px 6px",borderRadius:9999,background:tab===t?"#dbeafe":(darkMode?"#334155":"#f3f4f6"),color:tab===t?"#1e40af":subText,marginLeft:4}}>{cnt}</span>}
          </button>
        ))}
      </div>
      <div style={{overflowY:"auto",flex:1,padding:20}}>
        {loading&&<div style={{textAlign:"center",padding:40,color:subText}}>🔍 Scanning vendors…</div>}
        {!loading&&tab==="region"&&(()=>{
          const flagged=(regionFlags||[]).filter(f=>f.suggested&&f.suggested!==f.vendor.region);
          return <>
            {flagged.length===0&&<div style={{background:"#ecfdf5",borderRadius:10,padding:20,textAlign:"center",color:"#065f46",fontWeight:500}}>✅ All regions look correct!</div>}
            {flagged.map(flag=>{
              const dec=decisions["r:"+flag.vendor.id];
              const rc=REGION_COLORS[flag.suggested]||{bg:"#f3f4f6",active:"#374151"};
              const cur=REGION_COLORS[flag.vendor.region]||{bg:"#f3f4f6",active:"#374151"};
              return <div key={flag.vendor.id} style={{marginBottom:10,padding:"12px 14px",background:dec?(dec==="accept"?"#f0fdf4":(darkMode?"#1e293b":"#f9fafb")):(darkMode?"#334155":"#fff"),border:"1px solid "+(dec==="accept"?"#bbf7d0":dec==="dismiss"?borderCol:"#fde68a"),borderRadius:10}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{flag.vendor.organization}</div>
                    {flag.vendor.contact&&<div style={{fontSize:11,color:subText}}>{flag.vendor.contact}</div>}
                    <div style={{fontSize:11,color:subText,marginTop:3}}>📍 {lookupStatus[flag.vendor.id]||flag.signal}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:cur.bg,color:cur.active||cur.text}}>Current: {flag.vendor.region}</span>
                      <span style={{fontSize:12,color:subText}}>→</span>
                      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:9999,background:rc.bg,color:rc.active||rc.text}}>Suggested: {flag.suggested}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
                    {dec?<span style={{fontSize:12,color:dec==="accept"?"#065f46":subText}}>{dec==="accept"?"✅ Accepted":"❌ Dismissed"}</span>:<>
                      <button onClick={()=>setDecisions(d=>({...d,["r:"+flag.vendor.id]:"accept"}))} style={{...sb,background:"#2563eb",color:"#fff",border:"none"}}>✓ Move to {flag.suggested}</button>
                      <button onClick={()=>setDecisions(d=>({...d,["r:"+flag.vendor.id]:"dismiss"}))} style={sb}>✗ Keep</button>
                    </>}
                    {dec&&<button onClick={()=>setDecisions(d=>{const n={...d};delete n["r:"+flag.vendor.id];return n;})} style={{...sb,fontSize:11}}>Undo</button>}
                  </div>
                </div>
              </div>;
            })}
            {(regionFlags||[]).filter(f=>!f.suggested||f.suggested===f.vendor.region).length>0&&<div style={{fontSize:12,color:subText,marginTop:8}}>✅ {(regionFlags||[]).filter(f=>!f.suggested||f.suggested===f.vendor.region).length} vendors confirmed correct.</div>}
          </>;
        })()}
        {!loading&&tab==="dups"&&(()=>{
          const pairs=dupPairs||[];
          return <>
            {pairs.length===0&&<div style={{background:"#ecfdf5",borderRadius:10,padding:20,textAlign:"center",color:"#065f46",fontWeight:500}}>✅ No duplicates found!</div>}
            {pairs.map(pair=>{
              const key=pair.a.id+"-"+pair.b.id,dec=decisions["d:"+key];
              const conflicts=["organization","contact","phone","email","website","meetingStatus","vendorStatus","notes","region"].filter(f=>pair.a[f]!==pair.b[f]&&(pair.a[f]||pair.b[f]));
              return <div key={key} style={{marginBottom:14,padding:"14px 16px",background:dec?(darkMode?"#1e293b":"#f9fafb"):(darkMode?"#334155":"#fff"),border:"1px solid "+(dec?borderCol:"#fca5a5"),borderRadius:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#b91c1c",background:"#fee2e2",padding:"2px 8px",borderRadius:9999}}>⚠️ {pair.reason}</span>
                  {dec?<div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,color:subText}}>{dec==="keepA"?"Keep: "+pair.a.organization:dec==="keepB"?"Keep: "+pair.b.organization:dec==="merge"?"Merge ✅":"Keep Both ✅"}</span>
                    <button onClick={()=>setDecisions(d=>{const n={...d};delete n["d:"+key];return n;})} style={{...sb,fontSize:11}}>Undo</button>
                  </div>:<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button onClick={()=>setDecisions(d=>({...d,["d:"+key]:"keepA"}))} style={{...sb,background:"#2563eb",color:"#fff",border:"none",fontSize:11}}>Keep A</button>
                    <button onClick={()=>setDecisions(d=>({...d,["d:"+key]:"keepB"}))} style={{...sb,background:"#059669",color:"#fff",border:"none",fontSize:11}}>Keep B</button>
                    <button onClick={()=>setDecisions(d=>({...d,["d:"+key]:"merge"}))} style={{...sb,background:"#7c3aed",color:"#fff",border:"none",fontSize:11}}>Merge (A wins)</button>
                    <button onClick={()=>setDecisions(d=>({...d,["d:"+key]:"both"}))} style={{...sb,fontSize:11}}>Keep Both</button>
                  </div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {["a","b"].map(side=>{const v=pair[side];return <div key={side} style={{padding:"10px 12px",background:darkMode?"#0f172a":"#f9fafb",borderRadius:8,border:"1px solid "+borderCol}}>
                    <div style={{fontSize:11,fontWeight:700,color:side==="a"?"#2563eb":"#059669",marginBottom:6}}>Record {side.toUpperCase()} · {v.region}</div>
                    {conflicts.map(f=><div key={f} style={{marginBottom:4}}>
                      <div style={{fontSize:10,color:subText,textTransform:"uppercase"}}>{f}</div>
                      <div style={{fontSize:12,color:v[f]?textCol:"#d1d5db",fontStyle:v[f]?"normal":"italic",wordBreak:"break-all"}}>{v[f]||"—"}</div>
                    </div>)}
                    <div style={{marginTop:6,fontSize:11,color:subText}}>{v.interactions?.length||0} interactions · Health {healthScore(v)}</div>
                  </div>;})}
                </div>
              </div>;
            })}
          </>;
        })()}
      </div>
      {!loading&&!applied&&<div style={{padding:"14px 20px",borderTop:"1px solid "+borderCol,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:10}}>
        <div style={{fontSize:12,color:subText}}>{decided} decision{decided!==1?"s":""} made{pending>0&&<span style={{color:"#f59e0b"}}> · {pending} pending</span>}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{padding:"8px 16px",background:"none",border:"1px solid "+borderCol,borderRadius:8,fontSize:13,cursor:"pointer",color:textCol}}>Cancel</button>
          <button onClick={applyAll} disabled={decided===0} style={{padding:"8px 18px",background:decided>0?"#2563eb":(darkMode?"#334155":"#e5e7eb"),color:decided>0?"#fff":subText,border:"none",borderRadius:8,fontSize:13,cursor:decided>0?"pointer":"default",fontWeight:600}}>Apply {decided} Change{decided!==1?"s":""}</button>
        </div>
      </div>}
      {applied&&<div style={{padding:"14px 20px",borderTop:"1px solid "+borderCol,textAlign:"center",color:"#065f46",fontWeight:600}}>✅ Done! <button onClick={onClose} style={{marginLeft:12,padding:"6px 14px",background:"#2563eb",color:"#fff",border:"none",borderRadius:6,fontSize:13,cursor:"pointer"}}>Close</button></div>}
    </div>
  </div>;
}

function XlsxModal({onClose,onImport,darkMode,cardBg,borderCol,textCol,subText,bg}){
  const [stage,setStage]=useState("upload");
  const [sheets,setSheets]=useState([]);
  const [colMap,setColMap]=useState({});
  const [statusMap,setStatusMap]=useState({});
  const [sheetRegions,setSheetRegions]=useState({});
  const [preview,setPreview]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  function handleFile(e){
    const file=e.target.files[0];if(!file)return;
    setLoading(true);setError("");
    const reader=new FileReader();
    reader.onload=evt=>{
      if(!window.XLSX){
        const script=document.createElement("script");
        script.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        script.onload=()=>parseFile(evt.target.result);
        script.onerror=()=>{setError("Could not load Excel parser.");setLoading(false);};
        document.head.appendChild(script);
      }else parseFile(evt.target.result);
    };
    reader.readAsArrayBuffer(file);
  }
  function parseFile(buf){
    try{
      const wb=window.XLSX.read(buf,{type:"array"});
      const parsed=wb.SheetNames.map(name=>{const ws=wb.Sheets[name];return{name,rows:window.XLSX.utils.sheet_to_json(ws,{defval:""})};}).filter(s=>s.rows.length>0);
      if(!parsed.length){setError("No data found.");setLoading(false);return;}
      setSheets(parsed);
      const allCols=[...new Set(parsed.flatMap(s=>s.rows.length?Object.keys(s.rows[0]):[]))];
      const cm={};allCols.forEach(c=>{cm[c]=guessCol(c);});setColMap(cm);
      const regions={};parsed.forEach(s=>{regions[s.name]=guessRegion(s.name)||"Atlanta";});setSheetRegions(regions);
      const sVals={meetingStatus:new Set(),vendorStatus:new Set()};
      parsed.forEach(s=>s.rows.forEach(r=>{allCols.forEach(c=>{const f=cm[c];if((f==="meetingStatus"||f==="vendorStatus")&&r[c])sVals[f].add(String(r[c]).trim());});}));
      const sm={};["meetingStatus","vendorStatus"].forEach(field=>{sVals[field].forEach(raw=>{sm[field+":"+raw]=fuzzyStatus(raw,field);});});
      setStatusMap(sm);setStage("mapping");
    }catch(err){setError("Error: "+err.message);}
    setLoading(false);
  }
  function buildPreview(){
    const out=[];
    sheets.forEach(sheet=>{
      const region=sheetRegions[sheet.name]||"Atlanta";
      sheet.rows.forEach(row=>{
        const v={region,interactions:[],tasks:[],tags:[],statusHistory:[],partnership:"No",meetingDate:null,notes:"",website:"",social:"",phone:"",email:"",contact:"",type:""};
        Object.entries(colMap).forEach(([exCol,crmField])=>{
          if(crmField==="ignore"||!crmField)return;
          const raw=String(row[exCol]||"").trim();if(!raw)return;
          if(crmField==="meetingStatus")v.meetingStatus=statusMap["meetingStatus:"+raw]||raw;
          else if(crmField==="vendorStatus")v.vendorStatus=statusMap["vendorStatus:"+raw]||raw;
          else v[crmField]=raw;
        });
        if(!v.organization)return;
        v.id=Date.now()+Math.random();
        if(!v.meetingStatus)v.meetingStatus="Not Started";
        if(!v.vendorStatus)v.vendorStatus="Prospect";
        if(!v.websiteNeeded)v.websiteNeeded="No";
        out.push(v);
      });
    });
    setPreview(out);setStage("preview");
  }
  const si={padding:"5px 8px",fontSize:12,border:"1px solid "+borderCol,borderRadius:6,background:cardBg,color:textCol};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
    <div style={{background:cardBg,borderRadius:14,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 48px rgba(0,0,0,.25)"}}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+borderCol,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontWeight:700,fontSize:16}}>📥 Import from Excel</div><div style={{fontSize:11,color:subText,marginTop:2}}>{stage==="upload"?"Upload your .xlsx file":stage==="mapping"?"Step 1 — Review column mapping":"Step 2 — Preview & confirm"}</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:subText,cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:20}}>
        {error&&<div style={{padding:"10px 14px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,fontSize:13,color:"#b91c1c",marginBottom:16}}>{error}</div>}
        {stage==="upload"&&<div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>Upload your Excel file</div>
          <div style={{fontSize:13,color:subText,marginBottom:20}}>Supports .xlsx with multiple region tabs.</div>
          {loading?<div style={{color:subText}}>Reading file…</div>:<label style={{display:"inline-block",padding:"10px 24px",background:"#2563eb",color:"#fff",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>Choose File<input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/></label>}
        </div>}
        {stage==="mapping"&&<>
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>📂 Tab → Region</div>
            {sheets.map(s=><div key={s.name} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,padding:"8px 12px",background:darkMode?"#334155":"#f9fafb",borderRadius:8}}>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:subText}}>{s.rows.length} rows</div></div>
              <select value={sheetRegions[s.name]||"Atlanta"} onChange={e=>setSheetRegions(r=>({...r,[s.name]:e.target.value}))} style={si}>{REGIONS.map(r=><option key={r}>{r}</option>)}</select>
            </div>)}
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>🗂 Column Mapping</div>
            <div style={{fontSize:12,color:subText,marginBottom:8}}>Adjust anything that looks wrong.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {Object.keys(colMap).map(exCol=><div key={exCol} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:darkMode?"#334155":"#f9fafb",borderRadius:8}}>
                <div style={{flex:1,fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={exCol}>{exCol}</div>
                <span style={{fontSize:11,color:subText}}>→</span>
                <select value={colMap[exCol]} onChange={e=>setColMap(m=>({...m,[exCol]:e.target.value}))} style={{...si,fontSize:11,padding:"2px 4px"}}>{CRM_FIELDS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select>
              </div>)}
            </div>
          </div>
          {Object.keys(statusMap).length>0&&<div style={{marginBottom:20}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>🏷 Status Mapping</div>
            <div style={{fontSize:12,color:subText,marginBottom:8}}>✅ = confident · ⚠️ = needs review</div>
            {Object.keys(statusMap).map(key=>{
              const [field,raw]=key.split(":");
              const opts=field==="meetingStatus"?STATUSES.meeting:STATUSES.vendor;
              const confident=!!statusMap[key];
              return <div key={key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"6px 10px",background:confident?(darkMode?"#1e3a2e":"#f0fdf4"):(darkMode?"#3b1c1c":"#fef2f2"),borderRadius:8,border:"1px solid "+(confident?(darkMode?"#166534":"#bbf7d0"):(darkMode?"#7f1d1d":"#fca5a5"))}}>
                <div style={{fontSize:11,color:subText,minWidth:80}}>{field==="meetingStatus"?"Meeting:":"Vendor:"}</div>
                <div style={{flex:1,fontSize:12,fontWeight:600}}>"{raw}"</div>
                <select value={statusMap[key]} onChange={e=>setStatusMap(m=>({...m,[key]:e.target.value}))} style={{...si,fontSize:11,padding:"2px 4px"}}><option value="">— Not mapped —</option>{opts.map(o=><option key={o}>{o}</option>)}</select>
                <span>{confident?"✅":"⚠️"}</span>
              </div>;
            })}
          </div>}
          <button onClick={buildPreview} style={{width:"100%",padding:10,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:600}}>Preview Import →</button>
        </>}
        {stage==="preview"&&<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{fontWeight:600,fontSize:13}}>Ready to import {preview.length} vendors</div>
            <button onClick={()=>setStage("mapping")} style={{fontSize:12,color:"#2563eb",background:"none",border:"none",cursor:"pointer"}}>← Back</button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {REGIONS.map(r=>{const cnt=preview.filter(v=>v.region===r).length;return cnt>0&&<span key={r} style={{padding:"3px 10px",borderRadius:9999,fontSize:12,fontWeight:600,background:REGION_COLORS[r].bg,color:REGION_COLORS[r].active}}>{r}: {cnt}</span>;})}
          </div>
          <div style={{overflowX:"auto",border:"1px solid "+borderCol,borderRadius:8,marginBottom:16}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:darkMode?"#334155":"#f9fafb"}}>
                {["Organization","Contact","Type","Region","Meeting Status","Vendor Status"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subText,borderBottom:"1px solid "+borderCol,whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {preview.slice(0,60).map((v,i)=><tr key={i} style={{borderBottom:"1px solid "+borderCol}}>
                  <td style={{padding:"5px 10px",fontWeight:600}}>{v.organization}</td>
                  <td style={{padding:"5px 10px",color:subText}}>{v.contact||"—"}</td>
                  <td style={{padding:"5px 10px",color:subText}}>{v.type||"—"}</td>
                  <td style={{padding:"5px 10px"}}><span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:9999,background:REGION_COLORS[v.region]?.bg,color:REGION_COLORS[v.region]?.active}}>{v.region}</span></td>
                  <td style={{padding:"5px 10px"}}><Badge label={v.meetingStatus}/></td>
                  <td style={{padding:"5px 10px"}}><Badge label={v.vendorStatus}/></td>
                </tr>)}
              </tbody>
            </table>
            {preview.length>60&&<div style={{padding:"8px 12px",fontSize:12,color:subText,textAlign:"center"}}>…and {preview.length-60} more</div>}
          </div>
          <button onClick={()=>onImport(preview)} style={{width:"100%",padding:11,background:"#059669",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:700}}>✅ Import {preview.length} Vendors</button>
        </>}
      </div>
    </div>
  </div>;
}

export default function App(){
  const [activeRegion,setActiveRegion]=useState("Atlanta");
  const [vendors,setVendors]=useState([]);
  const [dbLoading,setDbLoading]=useState(true);
  const [saveStatus,setSaveStatus]=useState("saved");
  const saveTimer=useRef(null);
  const [search,setSearch]=useState("");
  const [filters,setFilters]=useState({meetingStatus:"",vendorStatus:"",websiteNeeded:"",overdue:"",organization:"",contact:"",type:""});
  const [selected,setSelected]=useState(null);
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newV,setNewV]=useState({region:"Atlanta",type:"",organization:"",contact:"",website:"",phone:"",social:"",email:"",meetingStatus:"Not Started",vendorStatus:"Prospect",websiteNeeded:"No",notes:"",partnership:"No",interactions:[],meetingDate:null,tasks:[],tags:[],statusHistory:[]});
  const [sortField,setSortField]=useState("organization");
  const [sortDir,setSortDir]=useState("asc");
  const [view,setView]=useState("table");
  const [darkMode,setDarkMode]=useState(false);
  const [detailTab,setDetailTab]=useState("info");
  const [showCsv,setShowCsv]=useState(false);
  const [csvInput,setCsvInput]=useState("");
  const [showXlsx,setShowXlsx]=useState(false);
  const [showAudit,setShowAudit]=useState(false);
  const [showBackupReminder,setShowBackupReminder]=useState(false);
  const [dupWarning,setDupWarning]=useState(null);
  const [selectedIds,setSelectedIds]=useState(new Set());
  const [bulkAction,setBulkAction]=useState("");
  const [bulkVal,setBulkVal]=useState("");
  const [toast,setToast]=useState(null);
  const [colOrder,setColOrder]=useState(ALL_COLS.map(c=>c.key));
  const [hiddenCols,setHiddenCols]=useState(new Set(["phone","email"]));
  const [showColMenu,setShowColMenu]=useState(false);
  const [dragColKey,setDragColKey]=useState(null);
  const [dragOverKey,setDragOverKey]=useState(null);
  const colMenuRef=useRef();useOutside(colMenuRef,()=>setShowColMenu(false));

  useEffect(()=>{
    loadFromSupabase().then(saved=>{
      if(saved?.vendors) setVendors(saved.vendors);
      if(saved?.activeRegion) setActiveRegion(saved.activeRegion);
      setDbLoading(false);
    }).catch(()=>setDbLoading(false));
  },[]);

  useEffect(()=>{
    if(dbLoading) return;
    const lastBackup=localStorage.getItem("lastBackupReminder");
    const now=Date.now();
    const oneWeek=7*24*60*60*1000;
    if(!lastBackup||now-parseInt(lastBackup)>oneWeek){
      setTimeout(()=>setShowBackupReminder(true),5000);
    }
  },[dbLoading]);

  useEffect(()=>{
    if(dbLoading) return;
    setSaveStatus("saving");
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>{
      saveToSupabase({vendors,activeRegion}).then(()=>setSaveStatus("saved")).catch(()=>setSaveStatus("error"));
    },1500);
  },[vendors,activeRegion,dbLoading]);

  const visibleCols=colOrder.filter(k=>!hiddenCols.has(k));
  const allTags=useMemo(()=>[...new Set(vendors.flatMap(v=>v.tags||[]))].sort(),[vendors]);
  const regionVendors=useMemo(()=>vendors.filter(v=>v.region===activeRegion),[vendors,activeRegion]);

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),2800);}
  function updateField(id,field,value){
    setVendors(vs=>vs.map(v=>{if(v.id!==id)return v;const u={...v,[field]:value};if(field==="vendorStatus")u.statusHistory=[...(v.statusHistory||[]),{status:value,date:nowIso()}];return u;}));
    if(selected?.id===id)setSelected(s=>({...s,[field]:value,...(field==="vendorStatus"?{statusHistory:[...(s.statusHistory||[]),{status:value,date:nowIso()}]}:{})}));
  }
  function logInteraction(vendorId,type){
    const entry={id:Date.now(),type,date:nowIso()};
    setVendors(vs=>vs.map(v=>v.id===vendorId?{...v,interactions:[...(v.interactions||[]),entry]}:v));
    if(selected?.id===vendorId)setSelected(sv=>({...sv,interactions:[...(sv.interactions||[]),entry]}));
    const t=ITYPES.find(x=>x.key===type);showToast(t.icon+" "+t.label+" logged!");
  }
  function delInteraction(vendorId,intId){
    setVendors(vs=>vs.map(v=>v.id===vendorId?{...v,interactions:v.interactions.filter(i=>i.id!==intId)}:v));
    if(selected?.id===vendorId)setSelected(sv=>({...sv,interactions:sv.interactions.filter(i=>i.id!==intId)}));
  }
  function updateTasks(vid,tasks){setVendors(vs=>vs.map(v=>v.id===vid?{...v,tasks}:v));if(selected?.id===vid)setSelected(sv=>({...sv,tasks}));}
  function updateTags(vid,tags){setVendors(vs=>vs.map(v=>v.id===vid?{...v,tags}:v));if(selected?.id===vid)setSelected(sv=>({...sv,tags}));}
  function saveEdit(){setVendors(vs=>vs.map(v=>v.id===editing.id?editing:v));setSelected(editing);setEditing(null);}
  function addVendor(){
    const v=newV;
    const dup=vendors.find(x=>x.organization.toLowerCase()===v.organization.toLowerCase()||(v.email&&x.email&&x.email.toLowerCase()===v.email.toLowerCase()));
    if(dup&&!dupWarning){setDupWarning(dup);return;}
    setVendors(vs=>[...vs,{...v,id:Date.now(),statusHistory:[{status:v.vendorStatus,date:nowIso()}]}]);
    setNewV({region:activeRegion,type:"",organization:"",contact:"",website:"",phone:"",social:"",email:"",meetingStatus:"Not Started",vendorStatus:"Prospect",websiteNeeded:"No",notes:"",partnership:"No",interactions:[],meetingDate:null,tasks:[],tags:[],statusHistory:[]});
    setShowAdd(false);setDupWarning(null);showToast("✅ Vendor added!");
  }
  function deleteVendor(id){setVendors(vs=>vs.filter(v=>v.id!==id));setSelected(null);}
  function handleImport(newVs){setVendors(vs=>[...vs,...newVs]);setShowXlsx(false);showToast("✅ Imported "+newVs.length+" vendors!");}
  function handleAuditApply({regionUpdates,toDelete,merges}){
    setVendors(vs=>{
      let u=vs.map(v=>regionUpdates[v.id]?{...v,region:regionUpdates[v.id]}:v);
      u=u.filter(v=>!toDelete.has(v.id));
      merges.forEach(({keep,discard})=>{
        u=u.map(v=>v.id!==keep.id?v:{...v,notes:[v.notes,discard.notes].filter(Boolean).join(" | "),interactions:[...(v.interactions||[]),...(discard.interactions||[])],tags:[...new Set([...(v.tags||[]),...(discard.tags||[])])]}).filter(v=>v.id!==discard.id);
      });
      return u;
    });
    setShowAudit(false);showToast("✅ Audit changes applied!");
  }
  function applyBulk(){
    if(!bulkAction||!bulkVal||selectedIds.size===0)return;
    setVendors(vs=>vs.map(v=>{if(!selectedIds.has(v.id))return v;const u={...v,[bulkAction]:bulkVal};if(bulkAction==="vendorStatus")u.statusHistory=[...(v.statusHistory||[]),{status:bulkVal,date:nowIso()}];return u;}));
    setSelectedIds(new Set());setBulkAction("");setBulkVal("");showToast("✅ Bulk update applied to "+selectedIds.size+" vendors");
  }
  function exportCSV(){
    const cols=["organization","contact","type","region","phone","email","website","meetingStatus","vendorStatus","websiteNeeded","notes","tags"];
    const rows=[cols.join(","),...filtered.map(v=>cols.map(c=>JSON.stringify(c==="tags"?(v.tags||[]).join("|"):(v[c]||""))).join(","))];
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"}));a.download="vendors.csv";a.click();
  }
  function importCSV(){
    const lines=csvInput.trim().split("\n");if(lines.length<2)return;
    const headers=lines[0].split(",").map(h=>h.trim().replace(/"/g,"").toLowerCase().replace(/\s+/g,""));
    const newVs=lines.slice(1).map((line,idx)=>{
      const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
      const obj={id:Date.now()+idx,interactions:[],tasks:[],tags:[],statusHistory:[],partnership:"No",region:activeRegion};
      headers.forEach((h,i)=>{obj[h]=vals[i]||"";});
      if(!obj.vendorStatus)obj.vendorStatus="Prospect";
      if(!obj.meetingStatus)obj.meetingStatus="Not Started";
      if(!obj.websiteNeeded)obj.websiteNeeded="No";
      if(obj.tags&&typeof obj.tags==="string")obj.tags=obj.tags.split("|").filter(Boolean);
      return obj;
    }).filter(v=>v.organization);
    setVendors(vs=>[...vs,...newVs]);setCsvInput("");setShowCsv(false);showToast("✅ Imported "+newVs.length+" vendors!");
  }
  function digestText(){
    const rv=vendors.filter(v=>v.region===activeRegion);
    const overdue=rv.filter(v=>{const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;return daysAgo(last?.date)===null||daysAgo(last?.date)>=30;});
    const upcoming=rv.filter(v=>v.meetingDate&&(v.meetingStatus==="Scheduled"||v.meetingStatus==="Pending")&&daysUntil(v.meetingDate)>=0&&daysUntil(v.meetingDate)<=7);
    const tasks=rv.flatMap(v=>(v.tasks||[]).filter(t=>!t.done).map(t=>({...t,org:v.organization})));
    let text="📋 "+activeRegion+" DIGEST — "+new Date().toLocaleDateString()+"\n\n";
    if(upcoming.length){text+="📅 UPCOMING ("+upcoming.length+")\n";upcoming.forEach(v=>text+="• "+v.organization+" — "+fmtShort(v.meetingDate)+"\n");text+="\n";}
    if(overdue.length){text+="⚠️ OVERDUE ("+overdue.length+")\n";overdue.forEach(v=>text+="• "+v.organization+(v.contact?" ("+v.contact+")":"")+"\n");text+="\n";}
    if(tasks.length){text+="✅ TASKS ("+tasks.length+")\n";tasks.forEach(t=>text+="• ["+t.org+"] "+t.text+(t.due?" — "+fmtShort(t.due):"")+"\n");}
    clipCopy(text);showToast("📋 Digest copied!");
  }

  const overdueVendors=useMemo(()=>regionVendors.filter(v=>{const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;return daysAgo(last?.date)===null||daysAgo(last?.date)>=30;}),[regionVendors]);
  const meetingAlerts=useMemo(()=>regionVendors.filter(v=>{if(!v.meetingDate||v.meetingStatus!=="Scheduled"&&v.meetingStatus!=="Pending")return false;const d=daysUntil(v.meetingDate);return d!==null&&d>=0&&d<=7;}),[regionVendors]);
  const totalAlerts=overdueVendors.length+meetingAlerts.length;
  const filtered=useMemo(()=>{
    let d=regionVendors.filter(v=>{
      const q=search.toLowerCase();
      if(q&&!(v.organization+" "+v.type+" "+v.email+" "+v.phone+" "+v.contact+" "+(v.tags||[]).join(" ")).toLowerCase().includes(q))return false;
      if(filters.meetingStatus&&v.meetingStatus!==filters.meetingStatus)return false;
      if(filters.vendorStatus&&v.vendorStatus!==filters.vendorStatus)return false;
      if(filters.websiteNeeded&&v.websiteNeeded!==filters.websiteNeeded)return false;
      if(filters.organization&&v.organization!==filters.organization)return false;
      if(filters.contact&&v.contact!==filters.contact)return false;
      if(filters.type&&v.type!==filters.type)return false;
      if(filters.overdue==="overdue"){const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;if(!(daysAgo(last?.date)===null||daysAgo(last?.date)>=30))return false;}
      return true;
    });
    d.sort((a,b)=>{const av=String(a[sortField]||"").toLowerCase();const bv=String(b[sortField]||"").toLowerCase();return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);});
    return d;
  },[regionVendors,search,filters,sortField,sortDir]);
  const stats=useMemo(()=>({total:regionVendors.length,active:regionVendors.filter(v=>v.vendorStatus==="Commission Partner"||v.vendorStatus==="Preferred Vendor").length,partners:regionVendors.filter(v=>v.vendorStatus==="Commission Partner").length,upcoming:regionVendors.filter(v=>v.meetingDate&&(v.meetingStatus==="Scheduled"||v.meetingStatus==="Pending")&&daysUntil(v.meetingDate)>=0).length,overdue:overdueVendors.length}),[regionVendors,overdueVendors]);

  function sort(f){if(sortField===f)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortField(f);setSortDir("asc");}}
  const uniqueVals=field=>[...new Set(regionVendors.map(v=>v[field]).filter(Boolean))].sort();
  function onColDragStart(key){setDragColKey(key);}
  function onColDragOver(e,key){e.preventDefault();setDragOverKey(key);}
  function onColDrop(key){
    if(!dragColKey||dragColKey===key){setDragColKey(null);setDragOverKey(null);return;}
    const order=[...colOrder];const from=order.indexOf(dragColKey);const to=order.indexOf(key);
    order.splice(from,1);order.splice(to,0,dragColKey);
    setColOrder(order);setDragColKey(null);setDragOverKey(null);
  }

  const bg=darkMode?"#0f172a":"#f9fafb";
  const cardBg=darkMode?"#1e293b":"#fff";
  const borderCol=darkMode?"#334155":"#e5e7eb";
  const textCol=darkMode?"#f1f5f9":"#111827";
  const subText=darkMode?"#94a3b8":"#6b7280";
  const thS={padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:600,color:subText,textTransform:"uppercase",whiteSpace:"nowrap",userSelect:"none",background:darkMode?"#1e293b":"#f9fafb"};
  const tdS={padding:"8px 12px",fontSize:13,borderBottom:"1px solid "+(darkMode?"#334155":"#f3f4f6")};
  const btnBase={padding:"6px 14px",fontSize:13,borderRadius:8,cursor:"pointer",fontWeight:500,border:"1px solid "+borderCol,background:cardBg,color:textCol};
  const FKEYS={meetingStatus:"meetingStatus",vendorStatus:"vendorStatus",websiteNeeded:"websiteNeeded",organization:"organization",contact:"contact",type:"type"};
  const FOPTS={meetingStatus:STATUSES.meeting,vendorStatus:STATUSES.vendor,websiteNeeded:["Yes","No"]};

  const TH=({colKey,label,filterKey,filterOpts})=>{
    const [open,setOpen]=useState(false);
    const ref=useRef();useOutside(ref,()=>setOpen(false));
    const active=filterKey&&filters[filterKey];
    const isDO=dragOverKey===colKey;
    return <th draggable onDragStart={()=>onColDragStart(colKey)} onDragOver={e=>onColDragOver(e,colKey)} onDrop={()=>onColDrop(colKey)} onDragEnd={()=>{setDragColKey(null);setDragOverKey(null);}} style={{...thS,cursor:"grab",borderLeft:isDO?"3px solid #2563eb":"3px solid transparent"}}>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <span style={{cursor:"pointer"}} onClick={()=>sort(colKey)}>{label}{sortField===colKey?(sortDir==="asc"?" ↑":" ↓"):""}</span>
        {filterKey&&<div ref={ref} style={{position:"relative"}}>
          <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{background:active?"#2563eb":"none",color:active?"#fff":"#9ca3af",border:"none",borderRadius:4,cursor:"pointer",fontSize:11,padding:"1px 4px"}}>▾</button>
          {open&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:0,background:cardBg,border:"1px solid "+borderCol,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:300,minWidth:160,padding:6}}>
            <div onClick={()=>{setFilters(f=>({...f,[filterKey]:""}));setOpen(false);}} style={{padding:"6px 8px",borderRadius:6,fontSize:13,cursor:"pointer",color:!active?"#2563eb":textCol,fontWeight:!active?700:400}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="none"}>All</div>
            {(filterOpts||uniqueVals(colKey)).map(opt=><div key={opt} onClick={()=>{setFilters(f=>({...f,[filterKey]:opt}));setOpen(false);}} style={{padding:"6px 8px",borderRadius:6,fontSize:13,cursor:"pointer",color:active===opt?"#2563eb":textCol,fontWeight:active===opt?700:400}} onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"} onMouseLeave={e=>e.currentTarget.style.background="none"}>{opt}</div>)}
          </div>}
        </div>}
      </div>
    </th>;
  };

  function renderCell(v,colKey){
    const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;
    const overdue=daysAgo(last?.date)===null||daysAgo(last?.date)>=30;
    const du=daysUntil(v.meetingDate);
    const showMtg=v.meetingDate&&(v.meetingStatus==="Scheduled"||v.meetingStatus==="Pending");
    switch(colKey){
      case "organization":return <td key={colKey} style={{...tdS,fontWeight:600,minWidth:180}}><OrgCell vendor={v} showWarning={overdue}/></td>;
      case "contact":return <td key={colKey} style={{...tdS,color:subText}}>{v.contact||"—"}</td>;
      case "type":return <td key={colKey} style={{...tdS,color:subText}}>{v.type||"—"}</td>;
      case "meetingStatus":return <td key={colKey} style={tdS}><InlineSelect value={v.meetingStatus} options={STATUSES.meeting} field="meetingStatus" onSave={(f,val)=>updateField(v.id,f,val)}/></td>;
      case "vendorStatus":return <td key={colKey} style={tdS}><InlineSelect value={v.vendorStatus} options={STATUSES.vendor} field="vendorStatus" onSave={(f,val)=>updateField(v.id,f,val)}/></td>;
      case "health":return <td key={colKey} style={{...tdS,minWidth:90}}><HealthBar score={healthScore(v)}/></td>;
      case "meetingDate":return <td key={colKey} style={tdS}>{showMtg?<span style={{fontSize:11,fontWeight:600,color:du<=3?"#b91c1c":du<=7?"#92400e":textCol,background:du<=3?"#fee2e2":du<=7?"#fef9c3":(darkMode?"#334155":"#f3f4f6"),padding:"2px 7px",borderRadius:9999}}>{fmtShort(v.meetingDate)}</span>:<span style={{color:"#d1d5db"}}>—</span>}</td>;
      case "websiteNeeded":return <td key={colKey} style={tdS}><InlineSelect value={v.websiteNeeded} options={STATUSES.websiteNeeded} field="websiteNeeded" onSave={(f,val)=>updateField(v.id,f,val)}/></td>;
      case "tags":return <td key={colKey} style={tdS}><div style={{display:"flex",flexWrap:"wrap",gap:3,maxWidth:140}}>{(v.tags||[]).slice(0,3).map((t,i)=><TagChip key={t} label={t} idx={i}/>)}{v.tags?.length>3&&<span style={{fontSize:10,color:subText}}>+{v.tags.length-3}</span>}</div></td>;
      case "interactions":return <td key={colKey} style={tdS}><IBtn vendor={v} onLog={logInteraction}/></td>;
      case "phone":return <td key={colKey} style={{...tdS,color:subText,whiteSpace:"nowrap"}}>{v.phone||"—"}</td>;
      case "email":return <td key={colKey} style={{...tdS,color:subText,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.email||"—"}</td>;
      default:return <td key={colKey} style={tdS}>—</td>;
    }
  }

  return (
    <div style={{minHeight:"100vh",background:bg,fontFamily:"sans-serif",display:"flex",flexDirection:"column",color:textCol}}>
      {dbLoading&&<div style={{position:"fixed",inset:0,background:"rgba(255,255,255,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,flexDirection:"column",gap:12}}>
        <div style={{fontSize:32}}>⏳</div>
        <div style={{fontSize:15,fontWeight:600,color:"#374151"}}>Loading your vendors…</div>
        <div style={{fontSize:12,color:"#9ca3af"}}>Connecting to database</div>
      </div>}
      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1f2937",color:"#fff",padding:"10px 20px",borderRadius:999,fontSize:13,fontWeight:500,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>{toast}</div>}
      <div style={{background:cardBg,borderBottom:"1px solid "+borderCol}}>
        <div style={{padding:"12px 24px",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>Vendor CRM</div>
            <div style={{fontSize:11,color:subText,display:"flex",alignItems:"center",gap:6}}>
              {activeRegion}{activeRegion==="Atlanta"?" (incl. North Georgia)":""} · {regionVendors.length} vendors
              <span style={{fontSize:10,padding:"1px 6px",borderRadius:9999,background:saveStatus==="saved"?"#dcfce7":saveStatus==="saving"?"#fef9c3":"#fee2e2",color:saveStatus==="saved"?"#166534":saveStatus==="saving"?"#854d0e":"#b91c1c",fontWeight:600}}>
                {saveStatus==="saved"?"✓ Saved":saveStatus==="saving"?"⏳ Saving…":"⚠️ Save failed"}
              </span>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8}}>
            {view==="table"&&<button onClick={()=>setShowAdd(true)} style={{...btnBase,background:"#2563eb",color:"#fff",borderColor:"#2563eb"}}>+ Add Vendor</button>}
            <button onClick={()=>setShowAudit(true)} style={btnBase}>🔍 Audit</button>
            <button onClick={()=>setShowXlsx(true)} style={btnBase}>📥 Import Excel</button>
            <button onClick={()=>setShowCsv(true)} style={btnBase}>📄 CSV</button>
            <button onClick={exportCSV} style={btnBase}>📤 Export</button>
            <button onClick={digestText} style={btnBase}>📋 Digest</button>
            <button onClick={()=>setDarkMode(d=>!d)} style={btnBase}>{darkMode?"☀️":"🌙"}</button>
            <div style={{display:"flex",border:"1px solid "+borderCol,borderRadius:8,overflow:"hidden"}}>
              {[["table","📋"],["pipeline","🗂"],["alerts","🔔"],["calendar","📅"],["dashboard","📊"]].map(([v,icon],idx,arr)=>(
                <button key={v} onClick={()=>setView(v)} title={v.charAt(0).toUpperCase()+v.slice(1)} style={{position:"relative",padding:"6px 12px",fontSize:14,cursor:"pointer",border:"none",borderRight:idx<arr.length-1?"1px solid "+borderCol:"none",background:view===v?"#1f2937":cardBg,color:view===v?"#fff":textCol}}>
                  {icon}{v==="alerts"&&totalAlerts>0&&<span style={{position:"absolute",top:2,right:2,background:"#ef4444",color:"#fff",borderRadius:9999,fontSize:9,fontWeight:700,padding:"1px 3px",lineHeight:1}}>{totalAlerts}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",paddingLeft:24}}>
          {REGIONS.map(r=>{
            const rc=REGION_COLORS[r];const isActive=activeRegion===r;
            const cnt=vendors.filter(v=>v.region===r).length;
            const alerts=vendors.filter(v=>{if(v.region!==r)return false;const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;return daysAgo(last?.date)===null||daysAgo(last?.date)>=30;}).length;
            return <button key={r} onClick={()=>{setActiveRegion(r);setSelected(null);setFilters({meetingStatus:"",vendorStatus:"",websiteNeeded:"",overdue:"",organization:"",contact:"",type:""});}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 20px",fontSize:13,fontWeight:isActive?700:500,cursor:"pointer",border:"none",background:isActive?rc.bg:"transparent",color:isActive?rc.active:subText,borderBottom:isActive?"3px solid "+rc.active:"3px solid transparent"}}>
              {r}{r==="Atlanta"&&<span style={{fontSize:10,color:subText,fontStyle:"italic"}}>+N.GA</span>}
              <span style={{fontSize:11,padding:"1px 7px",borderRadius:9999,background:isActive?"#fff":(darkMode?"#334155":"#f3f4f6"),color:isActive?rc.active:subText,fontWeight:700}}>{cnt}</span>
              {alerts>0&&<span style={{fontSize:10,padding:"1px 5px",borderRadius:9999,background:"#fee2e2",color:"#b91c1c",fontWeight:700}}>⚠️ {alerts}</span>}
            </button>;
          })}
        </div>
      </div>

      {view==="alerts"&&<div style={{padding:24,overflowY:"auto"}}>
        {meetingAlerts.length>0&&<div style={{marginBottom:24}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>📅 Upcoming Meeting Reminders</div>
          {[...meetingAlerts].sort((a,b)=>new Date(a.meetingDate)-new Date(b.meetingDate)).map(v=>{const d=daysUntil(v.meetingDate);const urgent=d<=3;return(
            <div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:urgent?"#fef2f2":"#fffbeb",border:"1px solid "+(urgent?"#fca5a5":"#fde68a"),borderRadius:10,marginBottom:8,flexWrap:"wrap",gap:10}}>
              <div><div style={{display:"flex",alignItems:"center",gap:8}}><span>{urgent?"🔴":"🟡"}</span><strong>{v.organization}</strong><Badge label={v.meetingStatus}/></div><div style={{fontSize:12,color:"#6b7280",marginLeft:22}}>{v.contact&&v.contact+" · "}{fmtShort(v.meetingDate)}</div></div>
              <span style={{fontSize:13,fontWeight:700,color:urgent?"#b91c1c":"#92400e",background:urgent?"#fee2e2":"#fef9c3",padding:"4px 12px",borderRadius:9999}}>{d===0?"Today!":d===1?"Tomorrow!":"In "+d+" days"}</span>
            </div>);})}
        </div>}
        <div>
          <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:16,fontWeight:700}}>⚠️ Overdue Follow-ups</div><span style={{background:"#fee2e2",color:"#b91c1c",borderRadius:9999,fontSize:11,fontWeight:700,padding:"2px 10px"}}>{overdueVendors.length}</span></div>
          {overdueVendors.length===0?<div style={{background:"#ecfdf5",borderRadius:12,padding:24,textAlign:"center",color:"#065f46",fontWeight:500}}>✅ All vendors contacted within 30 days!</div>
          :overdueVendors.map(v=>{const last=v.interactions?.length?v.interactions.reduce((a,b)=>a.date>b.date?a:b):null;return <div key={v.id} style={{background:cardBg,borderRadius:10,border:"1px solid #fca5a5",padding:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:8}}>
            <div><div style={{fontWeight:600,fontSize:14}}>{v.organization}</div><div style={{fontSize:12,color:subText}}>{v.contact||v.type} · {last?daysAgo(last.date)+"d ago":"Never"}</div></div>
            <IBtn vendor={v} onLog={logInteraction}/>
          </div>;})}
        </div>
      </div>}

      {view==="calendar"&&<div style={{padding:24,overflowY:"auto",display:"grid",gridTemplateColumns:"1fr 320px",gap:24,alignItems:"start"}}>
        <CalendarView vendors={regionVendors}/>
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Upcoming Meetings</div>
          {regionVendors.filter(v=>v.meetingDate&&(v.meetingStatus==="Scheduled"||v.meetingStatus==="Pending")&&daysUntil(v.meetingDate)>=0).sort((a,b)=>new Date(a.meetingDate)-new Date(b.meetingDate)).map(v=>{
            const d=daysUntil(v.meetingDate);const urgent=d<=3,soon=d<=7;
            return <div key={v.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:urgent?"#fef2f2":soon?"#fffbeb":cardBg,border:"1px solid "+(urgent?"#fca5a5":soon?"#fde68a":borderCol),borderRadius:8,marginBottom:8,gap:10}}>
              <div><div style={{fontWeight:600,fontSize:13}}>{v.organization}</div><div style={{fontSize:11,color:subText}}>{v.contact||v.type} · {fmtShort(v.meetingDate)}</div></div>
              <span style={{fontSize:11,fontWeight:700,color:urgent?"#b91c1c":soon?"#92400e":subText}}>{d===0?"Today!":d===1?"Tomorrow!":d+"d"}</span>
            </div>;
          })}
        </div>
      </div>}

      {view==="pipeline"&&<div style={{padding:24,overflowY:"auto"}}>
        <div style={{fontSize:13,color:subText,marginBottom:12}}>Drag vendors between columns to update their status.</div>
        <PipelineView vendors={regionVendors} onUpdate={updateField}/>
      </div>}

      {view==="dashboard"&&<div style={{padding:24,overflowY:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:24}}>
          <StatCard label="Total Vendors" value={stats.total} bg="#eff6ff" color="#1d4ed8"/>
          <StatCard label="Active Vendors" value={stats.active} bg="#ecfdf5" color="#065f46"/>
          <StatCard label="Commission Partners" value={stats.partners} bg="#f5f3ff" color="#5b21b6"/>
          <StatCard label="Upcoming Meetings" value={stats.upcoming} bg="#fffbeb" color="#92400e"/>
          <StatCard label="Overdue Follow-ups" value={stats.overdue} bg="#fef2f2" color="#b91c1c"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24}}>
          {[{title:"Meeting Status",key:"meetingStatus",opts:STATUSES.meeting,color:"#60a5fa"},{title:"Vendor Status",key:"vendorStatus",opts:STATUSES.vendor,color:"#34d399"}].map(section=>(
            <div key={section.key} style={{background:cardBg,borderRadius:12,border:"1px solid "+borderCol,padding:20}}>
              <div style={{fontWeight:600,marginBottom:12}}>{section.title}</div>
              {section.opts.map(s=>{const cnt=regionVendors.filter(v=>v[section.key]===s).length;const pct=regionVendors.length?Math.round(cnt/regionVendors.length*100):0;return(
                <div key={s} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}><span>{s}</span><span style={{color:subText}}>{cnt}</span></div><div style={{height:6,background:darkMode?"#334155":"#f3f4f6",borderRadius:9999}}><div style={{height:6,borderRadius:9999,background:section.color,width:pct+"%"}}/></div></div>);})}
            </div>
          ))}
        </div>
      </div>}

      {view==="table"&&<div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:cardBg,borderBottom:"1px solid "+borderCol,padding:"10px 16px",display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." style={{border:"1px solid "+borderCol,borderRadius:8,padding:"6px 10px",fontSize:13,width:180,background:bg,color:textCol}}/>
            {[{key:"meetingStatus",label:"Meeting",opts:STATUSES.meeting},{key:"vendorStatus",label:"Vendor",opts:STATUSES.vendor},{key:"websiteNeeded",label:"Website?",opts:["Yes","No"]}].map(f=>(
              <select key={f.key} value={filters[f.key]} onChange={e=>setFilters(x=>({...x,[f.key]:e.target.value}))} style={{border:"1px solid "+borderCol,borderRadius:8,padding:"6px 8px",fontSize:13,color:textCol,background:bg}}>
                <option value="">All {f.label}</option>{f.opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
            <select value={filters.overdue} onChange={e=>setFilters(x=>({...x,overdue:e.target.value}))} style={{border:"1px solid "+borderCol,borderRadius:8,padding:"6px 8px",fontSize:13,color:textCol,background:bg}}>
              <option value="">All Follow-ups</option><option value="overdue">⚠️ Overdue</option>
            </select>
            {Object.values(filters).some(Boolean)&&<button onClick={()=>setFilters({meetingStatus:"",vendorStatus:"",websiteNeeded:"",overdue:"",organization:"",contact:"",type:""})} style={{fontSize:11,color:"#2563eb",background:"none",border:"none",cursor:"pointer"}}>Clear</button>}
            <span style={{fontSize:11,color:subText}}>{filtered.length} vendors</span>
            <div ref={colMenuRef} style={{position:"relative",marginLeft:"auto"}}>
              <button onClick={()=>setShowColMenu(o=>!o)} style={{...btnBase,fontSize:12,padding:"5px 12px"}}>⚙️ Columns</button>
              {showColMenu&&<div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:cardBg,border:"1px solid "+borderCol,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:300,padding:12,minWidth:200}}>
                <div style={{fontSize:11,fontWeight:700,color:subText,marginBottom:4}}>SHOW / HIDE & REORDER</div>
                <div style={{fontSize:11,color:subText,marginBottom:8,fontStyle:"italic"}}>Drag to reorder · Click to toggle</div>
                {colOrder.map(key=>{const col=ALL_COLS.find(c=>c.key===key);const hidden=hiddenCols.has(key);const isDO=dragOverKey===key;
                  return <div key={key} draggable onDragStart={()=>onColDragStart(key)} onDragOver={e=>onColDragOver(e,key)} onDrop={()=>onColDrop(key)} onDragEnd={()=>{setDragColKey(null);setDragOverKey(null);}}
                    onClick={()=>{if(key==="organization")return;setHiddenCols(s=>{const n=new Set(s);n.has(key)?n.delete(key):n.add(key);return n;});}}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,cursor:key==="organization"?"default":"pointer",marginBottom:2,background:isDO?(darkMode?"#334155":"#eff6ff"):"none",borderLeft:isDO?"3px solid #2563eb":"3px solid transparent"}}
                    onMouseEnter={e=>{if(key!=="organization")e.currentTarget.style.background=darkMode?"#334155":"#f9fafb";}}
                    onMouseLeave={e=>{if(!isDO)e.currentTarget.style.background="none";}}>
                    <span style={{fontSize:12,color:subText}}>⠿</span>
                    <span style={{flex:1,fontSize:13,color:hidden?subText:textCol,textDecoration:hidden?"line-through":"none"}}>{col?.label}</span>
                    <span style={{fontSize:12}}>{key==="organization"?"🔒":hidden?"👁":"✅"}</span>
                  </div>;
                })}
                <button onClick={()=>{setColOrder(ALL_COLS.map(c=>c.key));setHiddenCols(new Set(["phone","email"]));}} style={{marginTop:8,width:"100%",padding:"5px",background:"none",border:"1px solid "+borderCol,borderRadius:6,fontSize:12,cursor:"pointer",color:subText}}>Reset to default</button>
              </div>}
            </div>
          </div>
          {selectedIds.size>0&&<div style={{background:"#eff6ff",borderBottom:"1px solid #bfdbfe",padding:"8px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"#1e40af"}}>{selectedIds.size} selected</span>
            <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)} style={{border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 8px",fontSize:13}}>
              <option value="">Update field…</option><option value="meetingStatus">Meeting Status</option><option value="vendorStatus">Vendor Status</option><option value="websiteNeeded">Website Needed</option>
            </select>
            {bulkAction&&<select value={bulkVal} onChange={e=>setBulkVal(e.target.value)} style={{border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 8px",fontSize:13}}>
              <option value="">Choose…</option>{(STATUSES[bulkAction==="meetingStatus"?"meeting":bulkAction==="vendorStatus"?"vendor":"websiteNeeded"]||[]).map(o=><option key={o}>{o}</option>)}
            </select>}
            <button onClick={applyBulk} style={{padding:"4px 12px",background:"#2563eb",color:"#fff",border:"none",borderRadius:6,fontSize:13,cursor:"pointer"}}>Apply</button>
            <button onClick={()=>{setSelectedIds(new Set());setBulkAction("");setBulkVal("");}} style={{padding:"4px 10px",background:"none",border:"1px solid #bfdbfe",borderRadius:6,fontSize:13,cursor:"pointer",color:"#1e40af"}}>Clear</button>
            <button onClick={()=>{if(window.confirm("Delete "+selectedIds.size+" vendors?")){setVendors(vs=>vs.filter(v=>!selectedIds.has(v.id)));setSelectedIds(new Set());}}} style={{padding:"4px 10px",background:"#fee2e2",color:"#b91c1c",border:"none",borderRadius:6,fontSize:13,cursor:"pointer"}}>🗑 Delete</button>
          </div>}
          <div style={{overflowY:"auto",flex:1}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{position:"sticky",top:0,zIndex:10}}>
                <tr>
                  <th style={{...thS,width:32}}><input type="checkbox" onChange={e=>setSelectedIds(e.target.checked?new Set(filtered.map(v=>v.id)):new Set())} checked={selectedIds.size===filtered.length&&filtered.length>0}/></th>
                  {visibleCols.map(key=>{const col=ALL_COLS.find(c=>c.key===key);return <TH key={key} colKey={key} label={col?.label} filterKey={FKEYS[key]} filterOpts={FOPTS[key]}/>;} )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v=>{const sel=selected?.id===v.id;return(
                  <tr key={v.id} onClick={()=>setSelected(v)} style={{background:sel?(darkMode?"#1e3a5f":"#eff6ff"):cardBg,cursor:"pointer"}} onMouseEnter={e=>{if(!sel)e.currentTarget.style.background=darkMode?"#1e293b":"#f8fafc";}} onMouseLeave={e=>{e.currentTarget.style.background=sel?(darkMode?"#1e3a5f":"#eff6ff"):cardBg;}}>
                    <td style={{...tdS,width:32}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(v.id)} onChange={e=>{const s=new Set(selectedIds);e.target.checked?s.add(v.id):s.delete(v.id);setSelectedIds(s);}}/></td>
                    {visibleCols.map(key=>renderCell(v,key))}
                  </tr>);})}
                {filtered.length===0&&<tr><td colSpan={visibleCols.length+1} style={{textAlign:"center",padding:48,color:subText}}>No vendors found in {activeRegion}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {selected&&<div style={{width:310,background:cardBg,borderLeft:"1px solid "+borderCol,display:"flex",flexDirection:"column",overflowY:"auto"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+borderCol,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.organization}</div>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",fontSize:20,color:subText,cursor:"pointer"}}>×</button>
          </div>
          <div style={{display:"flex",borderBottom:"1px solid "+borderCol}}>
            {[["info","Info"],["tasks","Tasks"],["timeline","History"],["tags","Tags"]].map(([t,l])=>(
              <button key={t} onClick={()=>setDetailTab(t)} style={{flex:1,padding:"7px 0",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:"none",color:detailTab===t?"#2563eb":subText,borderBottom:detailTab===t?"2px solid #2563eb":"2px solid transparent"}}>{l}</button>
            ))}
          </div>
          {detailTab==="info"&&(editing?(
            <div style={{padding:16}}>
              {[["Organization","organization"],["Contact Person","contact"],["Type","type"],["Website","website"],["Phone","phone"],["Social","social"],["Email","email"]].map(([l,k])=><Field key={k} label={l} value={editing[k]} edit onChange={val=>setEditing(e=>({...e,[k]:val}))}/>)}
              <Field label="Meeting Status" value={editing.meetingStatus} edit options={STATUSES.meeting} onChange={val=>setEditing(e=>({...e,meetingStatus:val}))}/>
              <Field label="Vendor Status" value={editing.vendorStatus} edit options={STATUSES.vendor} onChange={val=>setEditing(e=>({...e,vendorStatus:val}))}/>
              {(editing.meetingStatus==="Scheduled"||editing.meetingStatus==="Pending")&&<div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:subText,marginBottom:2}}>Meeting Date & Time</div>
                <input type="datetime-local" value={toDateInput(editing.meetingDate)} onChange={e=>setEditing(ev=>({...ev,meetingDate:e.target.value?new Date(e.target.value).toISOString():null}))} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:6,padding:"4px 8px",fontSize:13,boxSizing:"border-box",background:bg,color:textCol}}/>
              </div>}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:subText,marginBottom:2}}>Region</div>
                <select value={editing.region||activeRegion} onChange={e=>setEditing(ev=>({...ev,region:e.target.value}))} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:6,padding:"4px 8px",fontSize:13,background:bg,color:textCol}}>
                  {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                {editing.region&&editing.region!==selected?.region&&<div style={{fontSize:11,color:"#d97706",marginTop:4}}>⚠️ This will move the vendor to {editing.region}</div>}
              </div>
              <Field label="Website Needed" value={editing.websiteNeeded} edit options={["Yes","No"]} onChange={val=>setEditing(e=>({...e,websiteNeeded:val}))}/>
              <Field label="Notes" value={editing.notes} edit type="textarea" onChange={val=>setEditing(e=>({...e,notes:val}))}/>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={saveEdit} style={{flex:1,padding:8,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>Save</button>
                <button onClick={()=>setEditing(null)} style={{flex:1,padding:8,background:cardBg,border:"1px solid "+borderCol,borderRadius:8,fontSize:13,cursor:"pointer"}}>Cancel</button>
              </div>
            </div>
          ):(
            <div style={{padding:16}}>
              <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}><Badge label={selected.meetingStatus}/><Badge label={selected.vendorStatus}/></div>
              <div style={{marginBottom:10}}><div style={{fontSize:11,color:subText,marginBottom:2}}>Health Score</div><HealthBar score={healthScore(selected)}/></div>
              {(selected.meetingStatus==="Scheduled"||selected.meetingStatus==="Pending")&&selected.meetingDate&&<div style={{marginBottom:10,padding:"8px 12px",background:darkMode?"#1e3a5f":"#f0f9ff",borderRadius:8,border:"1px solid "+(darkMode?"#3b82f6":"#bae6fd")}}>
                <div style={{fontSize:11,color:"#0369a1",fontWeight:600,marginBottom:2}}>📅 MEETING</div>
                <div style={{fontSize:13,fontWeight:500}}>{fmtShort(selected.meetingDate)}</div>
                {daysUntil(selected.meetingDate)!==null&&<div style={{fontSize:11,color:daysUntil(selected.meetingDate)<=3?"#b91c1c":"#0369a1"}}>{daysUntil(selected.meetingDate)===0?"Today!":daysUntil(selected.meetingDate)===1?"Tomorrow!":"In "+daysUntil(selected.meetingDate)+" days"}</div>}
              </div>}
              {[["Type",selected.type,null],["Contact Person",selected.contact,null],["Phone",selected.phone,"phone"],["Email",selected.email,"email"],["Website",selected.website,"website"],["Social",selected.social,null],["Website Needed",selected.websiteNeeded,null]].map(([l,val,ft])=><Field key={l} label={l} value={val} fieldType={ft}/>)}
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:subText,marginBottom:4}}>Notes</div>
                <textarea value={selected.notes} onChange={e=>{const u={...selected,notes:e.target.value};setSelected(u);setVendors(vs=>vs.map(v=>v.id===selected.id?u:v));}} placeholder="Type notes here..." rows={3} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:8,padding:8,fontSize:13,resize:"vertical",boxSizing:"border-box",background:bg,color:textCol,outline:"none"}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:11,color:subText,fontWeight:600}}>INTERACTIONS</div>
                  <IBtn vendor={selected} onLog={logInteraction}/>
                </div>
                <ILog interactions={selected.interactions} onDelete={id=>delInteraction(selected.id,id)}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEditing({...selected})} style={{flex:1,padding:8,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>Edit</button>
                <button onClick={()=>deleteVendor(selected.id)} style={{flex:1,padding:8,background:cardBg,color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,fontSize:13,cursor:"pointer"}}>Delete</button>
              </div>
            </div>
          ))}
          {detailTab==="tasks"&&<div style={{padding:16}}><div style={{fontSize:11,color:subText,fontWeight:600,marginBottom:8}}>FOLLOW-UP TASKS</div><TaskList tasks={selected.tasks||[]} vendorId={selected.id} onUpdate={updateTasks}/></div>}
          {detailTab==="timeline"&&<div style={{padding:16}}><div style={{fontSize:11,color:subText,fontWeight:600,marginBottom:8}}>ACTIVITY TIMELINE</div><Timeline vendor={selected}/></div>}
          {detailTab==="tags"&&<div style={{padding:16}}><div style={{fontSize:11,color:subText,fontWeight:600,marginBottom:8}}>TAGS & LABELS</div><TagEditor tags={selected.tags||[]} allTags={allTags} onChange={tags=>updateTags(selected.id,tags)}/></div>}
        </div>}
      </div>}

      {showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
        <div style={{background:cardBg,borderRadius:12,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 40px rgba(0,0,0,.2)"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid "+borderCol,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:600,fontSize:15}}>Add New Vendor</div>
            <button onClick={()=>{setShowAdd(false);setDupWarning(null);}} style={{background:"none",border:"none",fontSize:22,color:subText,cursor:"pointer"}}>×</button>
          </div>
          {dupWarning&&<div style={{margin:"12px 20px 0",padding:"10px 14px",background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,fontSize:13}}>
            ⚠️ <strong>{dupWarning.organization}</strong> may already exist. <button onClick={()=>{addVendor();setDupWarning(null);}} style={{color:"#b91c1c",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Add anyway</button>
          </div>}
          <div style={{padding:20}}>
            {[["Organization","organization"],["Contact Person","contact"],["Type","type"],["Website","website"],["Phone","phone"],["Social Account","social"],["Email","email"]].map(([l,k])=><Field key={k} label={l} value={newV[k]} edit onChange={val=>setNewV(n=>({...n,[k]:val}))}/>)}
            <Field label="Meeting Status" value={newV.meetingStatus} edit options={STATUSES.meeting} onChange={val=>setNewV(n=>({...n,meetingStatus:val}))}/>
            {(newV.meetingStatus==="Scheduled"||newV.meetingStatus==="Pending")&&<div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:subText,marginBottom:2}}>Meeting Date & Time</div>
              <input type="datetime-local" value={toDateInput(newV.meetingDate)} onChange={e=>setNewV(n=>({...n,meetingDate:e.target.value?new Date(e.target.value).toISOString():null}))} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:6,padding:"4px 8px",fontSize:13,boxSizing:"border-box",background:bg,color:textCol}}/>
            </div>}
            <Field label="Vendor Status" value={newV.vendorStatus} edit options={STATUSES.vendor} onChange={val=>setNewV(n=>({...n,vendorStatus:val}))}/>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:subText,marginBottom:2}}>Region</div>
              <select value={newV.region} onChange={e=>setNewV(n=>({...n,region:e.target.value}))} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:6,padding:"4px 8px",fontSize:13,background:bg,color:textCol}}>{REGIONS.map(r=><option key={r}>{r}</option>)}</select>
            </div>
            <Field label="Website Needed" value={newV.websiteNeeded} edit options={["Yes","No"]} onChange={val=>setNewV(n=>({...n,websiteNeeded:val}))}/>
            <Field label="Notes" value={newV.notes} edit type="textarea" onChange={val=>setNewV(n=>({...n,notes:val}))}/>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={addVendor} style={{flex:1,padding:9,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:500}}>Add Vendor</button>
              <button onClick={()=>{setShowAdd(false);setDupWarning(null);}} style={{flex:1,padding:9,background:cardBg,border:"1px solid "+borderCol,borderRadius:8,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      </div>}

      {showCsv&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:16}}>
        <div style={{background:cardBg,borderRadius:12,width:"100%",maxWidth:500,boxShadow:"0 20px 40px rgba(0,0,0,.2)"}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid "+borderCol,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:600,fontSize:15}}>📄 Import CSV</div>
            <button onClick={()=>setShowCsv(false)} style={{background:"none",border:"none",fontSize:22,color:subText,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:subText,marginBottom:8}}>Columns: organization, contact, type, phone, email, website, meetingStatus, vendorStatus, websiteNeeded, notes, region, tags</div>
            <textarea value={csvInput} onChange={e=>setCsvInput(e.target.value)} rows={8} placeholder={"organization,contact,type\nVendor Name,Contact Person,Catering"} style={{width:"100%",border:"1px solid "+borderCol,borderRadius:8,padding:10,fontSize:12,fontFamily:"monospace",boxSizing:"border-box",resize:"vertical",background:bg,color:textCol}}/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={importCSV} style={{flex:1,padding:9,background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:500}}>Import</button>
              <button onClick={()=>setShowCsv(false)} style={{flex:1,padding:9,background:cardBg,border:"1px solid "+borderCol,borderRadius:8,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      </div>}

      {showAudit&&<AuditModal vendors={vendors} onClose={()=>setShowAudit(false)} onApply={handleAuditApply} darkMode={darkMode} cardBg={cardBg} borderCol={borderCol} textCol={textCol} subText={subText}/>}
      {showXlsx&&<XlsxModal onClose={()=>setShowXlsx(false)} onImport={handleImport} darkMode={darkMode} cardBg={cardBg} borderCol={borderCol} textCol={textCol} subText={subText} bg={bg}/>}
      {showBackupReminder&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16}}>
        <div style={{background:cardBg,borderRadius:14,width:"100%",maxWidth:400,padding:28,boxShadow:"0 24px 48px rgba(0,0,0,.25)",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>💾</div>
          <div style={{fontWeight:700,fontSize:17,marginBottom:8,color:textCol}}>Weekly Backup Reminder</div>
          <div style={{fontSize:13,color:subText,marginBottom:20,lineHeight:1.6}}>It's been a week since your last backup reminder. We recommend exporting your vendor data as a CSV to keep a local copy safe.</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{exportCSV();localStorage.setItem("lastBackupReminder",Date.now().toString());setShowBackupReminder(false);showToast("✅ Backup exported!");}} style={{flex:1,padding:"10px 0",background:"#2563eb",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer",fontWeight:600}}>📤 Export Now</button>
            <button onClick={()=>{localStorage.setItem("lastBackupReminder",Date.now().toString());setShowBackupReminder(false);}} style={{flex:1,padding:"10px 0",background:darkMode?"#334155":"#f3f4f6",color:subText,border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>Remind me later</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
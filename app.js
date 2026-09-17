(() => {
"use strict";
const { createClient } = window.supabase;
const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey, {
  auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
});
const TIME_OPTIONS=[0,.5,1,1.5,2,2.5,3,3.5,4,8];
let tasks=[],activeFilter="all",searchTerm="",sortMode="priority",authMode="signin",currentUser=null,realtimeChannel=null;
const $=id=>document.getElementById(id);
const timeLabel=v=>{v=Number(v);if(v===0)return"<30 min";if(v===.5)return"30 min";if(v===8)return">1 day";if(Number.isInteger(v))return`${v} ${v===1?"hour":"hours"}`;return`${Math.floor(v)} hr 30 min`};
const priorityLabel=p=>["","Low","Below normal","Normal","High","Critical"][p]||"Normal";
const typeLabel=t=>t==="work"?"Work":"Personal";
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatDue=d=>{if(!d)return"No due date";const x=new Date(`${d}T00:00:00`),today=new Date();today.setHours(0,0,0,0);const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);if(x.getTime()===today.getTime())return"Today";if(x.getTime()===tomorrow.getTime())return"Tomorrow";return x.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})};
const overdue=t=>{if(!t.due_date||t.completed)return false;const d=new Date();d.setHours(0,0,0,0);return new Date(`${t.due_date}T00:00:00`)<d};
function status(t){$("status").textContent=t;clearTimeout(status.timer);status.timer=setTimeout(()=>$("status").textContent="",2200)}
function sync(t){$("syncStatus").textContent=t}
async function loadTasks(){sync("Syncing…");const {data,error}=await supabase.from("tasks").select("*").order("completed",{ascending:true}).order("priority",{ascending:false}).order("created_at",{ascending:false});if(error){console.error(error);sync("Sync error");status(error.message);return}tasks=data||[];sync("Cloud sync active");render()}
function visible(){let r=tasks.filter(t=>{if(activeFilter==="personal"&&t.type!=="personal")return false;if(activeFilter==="work"&&t.type!=="work")return false;if(activeFilter==="completed"&&!t.completed)return false;if(activeFilter!=="completed"&&t.completed)return false;if(searchTerm&&!`${t.title} ${t.notes||""}`.toLowerCase().includes(searchTerm))return false;return true});r.sort((a,b)=>{if(sortMode==="priority")return b.priority-a.priority||new Date(b.created_at)-new Date(a.created_at);if(sortMode==="due"){if(!a.due_date&&!b.due_date)return 0;if(!a.due_date)return 1;if(!b.due_date)return-1;return a.due_date.localeCompare(b.due_date)}if(sortMode==="time")return b.time-a.time;if(sortMode==="title")return a.title.localeCompare(b.title);return new Date(b.created_at)-new Date(a.created_at)});return r}
function counts(){const a=tasks.filter(t=>!t.completed),p=a.filter(t=>t.type==="personal").length,w=a.filter(t=>t.type==="work").length,c=tasks.filter(t=>t.completed).length;$("allCount").textContent=a.length?`(${a.length})`:"";$("personalCount").textContent=p?`(${p})`:"";$("workCount").textContent=w?`(${w})`:"";$("completedCount").textContent=c?`(${c})`:""}
function row(t){const r=document.createElement("article");r.className=`task ${t.completed?"done":""} ${overdue(t)?"overdue":""}`;const stars="★".repeat(t.priority)+"☆".repeat(5-t.priority);r.innerHTML=`<label class="check-wrap" title="Complete task"><input class="task-check" type="checkbox" ${t.completed?"checked":""}><span class="custom-check"></span></label><div class="task-due ${overdue(t)?"due-overdue":""}">${formatDue(t.due_date)}</div><div class="task-main"><div class="task-title-row"><h3>${esc(t.title)}</h3></div>${t.notes?`<p class="task-notes">${esc(t.notes)}</p>`:""}</div><div class="task-priority" title="Priority ${t.priority} — ${priorityLabel(t.priority)}">${stars}</div><div class="task-type"><span class="type-badge ${t.type}">${typeLabel(t.type)}</span></div><div class="task-time">${timeLabel(t.time)}</div><label class="today-check" title="Add to Today's Focus"><input class="today-task" type="checkbox" ${t.today?"checked":""} aria-label="Add to Today's Focus"><span class="today-label">Today</span></label><div class="task-actions"><button class="icon-button edit-task" title="Edit">✎</button><button class="icon-button delete-task" title="Delete">×</button></div>`;
r.querySelector(".task-check").addEventListener("change",async e=>{const completed=e.target.checked;const {error}=await supabase.from("tasks").update({completed,completed_at:completed?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",t.id).eq("user_id",currentUser.id);if(error){e.target.checked=!completed;status(error.message);return}await loadTasks();status(completed?"Task completed.":"Task reopened.")});
r.querySelector(".delete-task").addEventListener("click",async()=>{if(!confirm(`Delete "${t.title}"?`))return;const{error}=await supabase.from("tasks").delete().eq("id",t.id).eq("user_id",currentUser.id);if(error){status(error.message);return}await loadTasks();status("Task deleted.")});
r.querySelector(".edit-task").addEventListener("click",()=>openEditModal(t));r.querySelector(".today-task").addEventListener("change",e=>toggleToday(t,e.target.checked));return r}

let editingTaskId=null;

function renderTodaysFocus(){
  const focus=tasks.filter(t=>t.today);
  const done=focus.filter(t=>t.completed).length;
  const hours=focus.reduce((sum,t)=>sum+(Number(t.time)===8?0:Number(t.time)||0),0);
  $("todayFocusCount").textContent=focus.length
    ? `${done} of ${focus.length} complete · ${hours%1===0?hours:hours.toFixed(1)}h planned`
    : "No tasks selected";
  $("todayFocusList").innerHTML=focus.length ? focus.map(t=>`
    <article class="today-item ${t.completed?"done":""}">
      <input class="today-complete" type="checkbox" ${t.completed?"checked":""} data-id="${t.id}" aria-label="Complete task">
      <div class="today-item-main">
        <div class="today-item-title">${esc(t.title)}</div>
        <div class="today-item-meta">${typeLabel(t.type)} · Priority ${t.priority} · ${timeLabel(t.time)}</div>
      </div>
      <button class="today-remove" type="button" data-id="${t.id}" title="Remove from Today's Focus">×</button>
    </article>`).join("")
    : '<div class="today-empty">Select tasks below to build your focus list for today.</div>';

  document.querySelectorAll(".today-complete").forEach(cb=>cb.addEventListener("change",async e=>{
    const t=tasks.find(x=>x.id===e.target.dataset.id);
    if(t){
      const completed=e.target.checked;
      const {error}=await supabase.from("tasks").update({
        completed,completed_at:completed?new Date().toISOString():null,updated_at:new Date().toISOString()
      }).eq("id",t.id).eq("user_id",currentUser.id);
      if(error){e.target.checked=!completed;status(error.message);return}
      await loadTasks(); status(completed?"Task completed.":"Task reopened.");
    }
  }));
  document.querySelectorAll(".today-remove").forEach(btn=>btn.addEventListener("click",async e=>{
    const t=tasks.find(x=>x.id===e.target.dataset.id);
    if(!t)return;
    const {error}=await supabase.from("tasks").update({today:false,updated_at:new Date().toISOString()}).eq("id",t.id).eq("user_id",currentUser.id);
    if(error){status(error.message);return}
    await loadTasks(); status("Removed from Today's Focus.");
  }));
}

async function toggleToday(t,checked){
  const {error}=await supabase.from("tasks").update({today:checked,updated_at:new Date().toISOString()}).eq("id",t.id).eq("user_id",currentUser.id);
  if(error){status(error.message);return}
  await loadTasks();
}


function openEditModal(t){
  editingTaskId=t.id;
  $("editTitleInput").value=t.title||"";
  $("editNotesInput").value=t.notes||"";
  $("editTypeInput").value=t.type||"personal";
  $("editPriorityInput").value=String(t.priority??3);
  $("editTimeInput").value=String(t.time??1);
  $("editDueInput").value=t.due_date||"";
  $("editCompletedInput").checked=!!t.completed;
  $("editTodayInput").checked=!!t.today;
  $("editModal").hidden=false;
  document.body.classList.add("modal-open");
  setTimeout(()=>$("editTitleInput").focus(),0);
}

function closeEditModal(){
  editingTaskId=null;
  $("editModal").hidden=true;
  document.body.classList.remove("modal-open");
}

async function saveEdit(e){
  e.preventDefault();
  if(!editingTaskId||!currentUser)return;

  const existing=tasks.find(x=>x.id===editingTaskId);
  if(!existing)return;

  const title=$("editTitleInput").value.trim();
  if(!title){status("Task title is required.");$("editTitleInput").focus();return}

  const completed=$("editCompletedInput").checked;
  const now=new Date().toISOString();
  const completedAt=completed?(existing.completed_at||now):null;

  const changes={
    title:title.slice(0,200),
    notes:$("editNotesInput").value.trim().slice(0,500),
    type:$("editTypeInput").value,
    priority:Number($("editPriorityInput").value),
    time:Number($("editTimeInput").value),
    due_date:$("editDueInput").value||null,
    completed,
    completed_at:completedAt,
    today:$("editTodayInput").checked,
    updated_at:now
  };

  $("editSave").disabled=true;
  const {error}=await supabase.from("tasks").update(changes)
    .eq("id",editingTaskId)
    .eq("user_id",currentUser.id);
  $("editSave").disabled=false;

  if(error){status(error.message);return}
  closeEditModal();
  await loadTasks();
  status("Task updated.");
}

$("editForm").addEventListener("submit",saveEdit);
$("editCancelTop").addEventListener("click",closeEditModal);
$("editTimeInput").innerHTML=TIME_OPTIONS.map(v=>`<option value="${v}">${timeLabel(v)}</option>`).join("");
$("editCancel").addEventListener("click",closeEditModal);
$("editModal").addEventListener("click",e=>{if(e.target===$("editModal"))closeEditModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("editModal").hidden)closeEditModal()});


function renderCompletedStats(){
  const active=tasks.filter(t=>!t.completed);
  const completed=tasks.filter(t=>t.completed);
  const levels=[1,2,3,4,5];
  const counts=arr=>levels.map(p=>({p,n:arr.filter(t=>Number(t.priority)===p).length}));
  const total=tasks.length;
  const rate=total?Math.round(completed.length/total*100):0;
  $("statsTotal").textContent=total;
  $("statsCompleted").textContent=completed.length;
  $("statsRate").textContent=`${rate}%`;
  $("statsTime").textContent=statsTime(completed);
  $("existingPriorityChart").innerHTML=priorityBars(counts(active),"active");
  $("completedPriorityChart").innerHTML=priorityBars(counts(completed),"completed");
}
function statsTime(arr){
  const mins=arr.reduce((sum,t)=>{const v=Number(t.time);return sum+(v===8?0:Math.round(v*60))},0);
  const h=Math.floor(mins/60),m=mins%60;
  return h?`${h} hr${h===1?"":"s"}${m?` ${m} min`:""}`:`${m} min`;
}
function priorityBars(rows,kind){
  const max=Math.max(1,...rows.map(x=>x.n));
  return `<div class="priority-chart-bars">${rows.map(x=>`
    <div class="priority-bar-col">
      <div class="priority-bar-value">${x.n}</div>
      <div class="priority-bar-track"><div class="priority-bar-fill ${kind}" style="height:${Math.max(4,x.n/max*100)}%"></div></div>
      <div class="priority-bar-label">${x.p}</div>
    </div>`).join("")}</div>`;
}

function render(){const completedView=activeFilter==="completed";document.body.classList.toggle("completed-view",completedView);$("todayFocus").hidden=completedView;$("addCard").hidden=completedView;$("clearCompleted").hidden=!completedView;renderTodaysFocus();renderCompletedStats();counts();document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===activeFilter));$("listTitle").textContent={all:"All tasks",personal:"Personal tasks",work:"Work tasks",completed:"Completed tasks"}[activeFilter];const v=visible(),a=tasks.filter(t=>!t.completed).length,total=tasks.filter(t=>!t.completed).reduce((s,t)=>s+Number(t.time||0),0);$("listSummary").textContent=`${v.length} shown · ${a} active · ${timeLabel(total)} total estimated`;$("tasks").innerHTML="";v.forEach(t=>$("tasks").appendChild(row(t)));$("emptyState").hidden=!!v.length}
function defaultAddType(){return activeFilter==="personal"?"personal":"work"}
function resetForm(){$("taskForm").reset();$("typeInput").value=defaultAddType();$("priorityInput").value="3";$("timeInput").value=".5"}
async function session(session){currentUser=session?.user||null;$("authView").hidden=!!currentUser;$("appView").hidden=!currentUser;if(!currentUser){tasks=[];if(realtimeChannel){await supabase.removeChannel(realtimeChannel);realtimeChannel=null}return}$("userEmail").textContent=currentUser.email||"";await loadTasks();if(realtimeChannel)await supabase.removeChannel(realtimeChannel);realtimeChannel=supabase.channel(`tasks-${currentUser.id}`).on("postgres_changes",{event:"*",schema:"public",table:"tasks",filter:`user_id=eq.${currentUser.id}`},()=>loadTasks()).subscribe()}
async function auth(e){e.preventDefault();const email=$("emailInput").value.trim(),password=$("passwordInput").value;$("authMessage").textContent="Working…";$("authSubmit").disabled=true;const r=authMode==="signin"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});$("authSubmit").disabled=false;if(r.error){$("authMessage").textContent=r.error.message;return}if(authMode==="signup"&&!r.data.session){$("authMessage").textContent="Account created. Check your email to confirm it, then sign in.";return}$("authMessage").textContent=""}
$("authForm").addEventListener("submit",auth);
$("authToggle").addEventListener("click",()=>{authMode=authMode==="signin"?"signup":"signin";$("authSubmit").textContent=authMode==="signin"?"Sign in":"Create account";$("authToggle").textContent=authMode==="signin"?"Create an account":"I already have an account";$("authMessage").textContent=""});
$("signOut").addEventListener("click",()=>supabase.auth.signOut());
$("taskForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;const title=$("titleInput").value.trim();if(!title)return;const{error}=await supabase.from("tasks").insert({user_id:currentUser.id,title:title.slice(0,200),notes:$("notesInput").value.trim().slice(0,500),type:$("typeInput").value,priority:Number($("priorityInput").value),time:Number($("timeInput").value),due_date:$("dueInput").value||null,completed:false,today:false});if(error){status(error.message);return}resetForm();await loadTasks();status("Task added.");$("titleInput").focus()});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;resetForm();render()}));
$("searchInput").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLowerCase();render()});
$("sortSelect").addEventListener("change",e=>{sortMode=e.target.value;render()});
$("clearCompleted").addEventListener("click",async()=>{const n=tasks.filter(t=>t.completed).length;if(!n){status("No completed tasks to clear.");return}if(!confirm(`Remove ${n} completed task${n===1?"":"s"}?`))return;const{error}=await supabase.from("tasks").delete().eq("user_id",currentUser.id).eq("completed",true);if(error){status(error.message);return}await loadTasks();status("Completed tasks cleared.")});
$("timeInput").innerHTML=TIME_OPTIONS.map(v=>`<option value="${v}">${timeLabel(v)}</option>`).join("");resetForm();
(async()=>{const{data:{session:s}}=await supabase.auth.getSession();await session(s);supabase.auth.onAuthStateChange((_e,s)=>setTimeout(()=>session(s),0))})();
})();

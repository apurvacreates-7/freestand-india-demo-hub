/* canvas engine · nodes, bezier edges, pan/zoom, drag, connect, undo/redo, minimap */
const Canvas={
  nodes:[],edges:[],vp:{x:0,y:0,k:1},sel:null,mode:"edit",history:[],future:[],dirty:false,onChange:null,onSelect:null,
  init(root){
    this.root=root; this.el=root.querySelector("#canvas"); this.layer=root.querySelector("#layer"); this.svg=root.querySelector("#edges"); this.xbtn=null;
    this.bindPointer(); this.bindKeys();
  },
  load(graph){ this.nodes=JSON.parse(JSON.stringify(graph.nodes)); this.edges=JSON.parse(JSON.stringify(graph.edges)); this.history=[]; this.future=[]; this.sel=null; this.render(); requestAnimationFrame(()=>this.fit(0.62)); },
  graph(){ return {nodes:this.nodes,edges:this.edges}; },
  snapshot(){ return JSON.stringify({nodes:this.nodes,edges:this.edges}); },
  commit(reason){ this.history.push(this.snapshot()); if(this.history.length>60)this.history.shift(); this.future=[]; this.dirty=true; this.render(); this.onChange&&this.onChange(reason); },
  undo(){ if(!this.history.length)return; this.future.push(this.snapshot()); const s=JSON.parse(this.history.pop()); this.nodes=s.nodes; this.edges=s.edges; this.render(); this.onChange&&this.onChange("undo"); },
  redo(){ if(!this.future.length)return; this.history.push(this.snapshot()); const s=JSON.parse(this.future.pop()); this.nodes=s.nodes; this.edges=s.edges; this.render(); this.onChange&&this.onChange("redo"); },
  node(id){ return this.nodes.find(n=>n.id===id); },
  /* ── coordinates ── */
  toFlow(cx,cy){ const r=this.el.getBoundingClientRect(); return {x:(cx-r.left-this.vp.x)/this.vp.k,y:(cy-r.top-this.vp.y)/this.vp.k}; },
  applyVp(){ this.layer.style.transform=`translate(${this.vp.x}px,${this.vp.y}px) scale(${this.vp.k})`; this.drawMini(); this.checkAway(); },
  zoomTo(k,cx,cy){ const r=this.el.getBoundingClientRect(); cx=cx==null?r.width/2:cx; cy=cy==null?r.height/2:cy; k=Math.max(.15,Math.min(2,k)); const f=this.toFlow(cx+r.left,cy+r.top); this.vp.k=k; this.vp.x=cx-f.x*k; this.vp.y=cy-f.y*k; this.applyVp(); },
  bounds(){ if(!this.nodes.length)return {x:0,y:0,w:800,h:600}; let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9; this.nodes.forEach(n=>{ const el=this.layer.querySelector(`[data-id="${n.id}"]`); const w=el?el.offsetWidth:280,h=el?el.offsetHeight:140; x1=Math.min(x1,n.x);y1=Math.min(y1,n.y);x2=Math.max(x2,n.x+w);y2=Math.max(y2,n.y+h); }); return {x:x1,y:y1,w:x2-x1,h:y2-y1}; },
  fit(min){ const b=this.bounds(), r=this.el.getBoundingClientRect(); let k=Math.min(1,Math.min((r.width*0.85)/b.w,(r.height*0.85)/b.h)); const clamped=min&&k<min; if(clamped)k=min; this.vp.k=k; this.vp.x=clamped?60-b.x*k:(r.width-b.w*k)/2-b.x*k; this.vp.y=(r.height-b.h*k)/2-b.y*k; this.applyVp(); },
  checkAway(){ const b=this.bounds(), r=this.el.getBoundingClientRect(); const sx=b.x*this.vp.k+this.vp.x, sy=b.y*this.vp.k+this.vp.y, ex=sx+b.w*this.vp.k, ey=sy+b.h*this.vp.k; const away=ex<0||ey<0||sx>r.width||sy>r.height; const p=this.root.querySelector(".backpill"); if(p)p.style.display=away?"block":"none"; },
  /* ── render ── */
  render(){
    const L=this.layer; L.innerHTML=""; this.nodes.forEach(n=>L.appendChild(this.nodeEl(n))); L.appendChild(this.svg);
    if(window.lucide)lucide.createIcons({attrs:{},nameAttr:"data-lucide"});
    this.drawEdges(); this.drawMini();
  },
  nodeEl(n){
    const T=NODE_TYPES[n.type]||{label:n.type,icon:"box",color:"#64748b",w:270}; const d=n.data; const el=document.createElement("div");
    el.className="node "+n.type+(this.sel===n.id?" sel":"")+(this.invalid&&this.invalid.has(n.id)?" invalid":""); el.dataset.id=n.id; el.style.left=n.x+"px"; el.style.top=n.y+"px"; el.style.width=(T.w||280)+"px";
    const ed=(field,val,ph,cls)=>`<div class="ed ph ${cls||""}" contenteditable="true" data-f="${field}" data-ph="${ph}" ${val?"":'data-empty="1"'}>${esc(val||"")}</div>`;
    const head=(extra)=>`<div class="nh"><span class="ni" style="background:${n.type==="start"?"":T.color}"><i data-lucide="${T.icon}"></i></span><span class="lbl"><span contenteditable="true" data-f="label">${esc(d.label||T.label)}</span><i data-lucide="edit-3"></i></span>${extra||""}</div>`;
    const tH=n.type==="start"?"":`<span class="h t" data-h="target"></span>`;
    const sH=(id,cls)=>`<span class="h s ${cls||""}" data-h="${id||"next"}"></span>`;
    let body="";
    if(n.type==="start"){
      const trigs=d.triggers.length?d.triggers.map(t=>`<div class="trig"><span class="ti"><i data-lucide="${t.type==="keyword"?"message-square-text":t.type==="qr"?"qr-code":"zap"}"></i></span><div>${t.type==="keyword"?`<div class="kws">${t.keywords.map(k=>`<span>${esc(k)}</span>`).join("")}</div>`:`<span style="font-size:12px">${esc(t.label)}</span>`}</div></div>`).join(""):`<div class="sub" style="text-align:center;padding:10px 0"><b style="display:block;color:var(--foreground)">Choose how this flow starts</b>Click to add triggers</div>`;
      body=head()+`<div class="nb" style="padding-bottom:12px"><div class="slabel">Starts when</div>${trigs}<div style="display:flex;gap:6px;margin-top:10px"><button class="btn sm outline" data-act="triggers" style="flex:1;justify-content:center"><i data-lucide="plus"></i>Add Trigger</button><button class="btn sm outline" data-act="test"><i data-lucide="send"></i>Test</button></div></div>`+`<span class="h s" data-h="next" style="top:50%;transform:translateY(-50%)"></span>`;
      el.innerHTML=body; return el;
    }
    if(n.type==="text") body=`<div class="nb"><div class="opt-row">${d.header?esc(d.header):"Add header (optional)..."}</div>${ed("text",d.text,"Type your WhatsApp message...","clamp")}<div class="sub" style="text-align:right">${(d.text||"").length}/4096</div><div class="opt-row">${d.footer?esc(d.footer):"Add footer (optional)..."}</div><div class="opt-row" style="border-color:rgba(34,197,94,.2);color:#15803d;background:rgba(34,197,94,.05)">${d.linkLabel?"🔗 "+esc(d.linkLabel):"Add link button"}</div></div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="question") body=`<div class="nb">${ed("text",d.text,"Enter your question...")}<div class="store"><i data-lucide="variable" style="width:11px;height:11px"></i>${d.store?`<b>{{${esc(d.store)}}}</b>`:"Save response as..."}</div>${d.expect&&d.expect!=="Text"?`<div class="sub">Expects: ${esc(d.expect)}${d.retry?" · retries "+d.maxRetries:""}</div>`:""}</div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="quickReply") body=`<div class="nb">${ed("text",d.text,"Enter your question...")}<div class="store"><i data-lucide="variable" style="width:11px;height:11px"></i>${d.store?`<b>{{${esc(d.store)}}}</b>`:"Save response as..."}</div>${d.buttons.map(b=>`<div class="wbtn" data-bid="${b.id}"><i data-lucide="sparkles"></i><span class="ed" contenteditable="true" data-f="btn:${b.id}">${esc(b.label)}</span><i data-lucide="edit-3"></i><span class="h opt mini" data-h="${b.id}"></span></div>${this.edges.some(e=>e.source===n.id&&e.sourceHandle===b.id)?"":'<div class="unc">Button not connected</div>'}`).join("")}${d.buttons.length<10?`<div class="wbtn add" data-act="addbtn"><i data-lucide="plus"></i>Add Button</div>`:""}</div><div class="nfoot dotted">Sync Next</div>${sH("sync-next")}`;
    if(n.type==="list") body=`<div class="nb">${d.header?`<div class="sub"><span class="badge green">${esc(d.header)}</span></div>`:""}${ed("text",d.text,"Choose an option:")}${d.options.map((o,i)=>`<div class="lopt"><span class="n">${i+1}</span><span class="ed" contenteditable="true" data-f="opt:${o.id}">${esc(o.label)}</span><span class="h opt mini" data-h="${o.id}"></span></div>`).join("")}${d.options.length<10?`<div class="wbtn add" data-act="addopt"><i data-lucide="plus"></i>Add Option</div>`:""}<div class="opt-row" style="text-align:center">${esc(d.cta||"View options")}</div></div><div class="nfoot dotted">Sync Next</div>${sH("sync-next")}`;
    if(n.type==="carousel") body=`<div class="nb"><div class="sub">${d.cards} cards · image or video · 2 to 10</div><div style="display:flex;gap:6px;margin-top:4px">${Array.from({length:Math.min(d.cards,4)}).map((_,i)=>`<div style="flex:1;height:54px;border-radius:6px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);display:flex;align-items:center;justify-content:center;font-size:10px;color:#4338ca">Card ${i+1}</div>`).join("")}</div></div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="condition") body=`<div class="nb">${d.groups.map((g,i)=>`<div class="cgrp"><div class="gh"><span class="badge teal">Group ${i+1}</span>${g.mode==="ALL"?"All of these":"Any of these"}</div>${g.rules.length&&g.rules[0].field?g.rules.map(r=>`<div class="crule"><b>${esc(r.field)}</b><em>${esc(r.op)}</em><b>${esc(r.value)}</b></div>`).join(""):'<div class="sub">No conditions set</div>'}<span class="h mini" data-h="${g.id}"></span></div>`).join("")}</div><div class="nfoot">Else</div>${sH("else","mini")}`;
    if(n.type==="delay") body=`<div class="nb"><div class="delaybox"><div><small>WAIT</small><b>${d.amount} ${d.unit}</b></div><i data-lucide="timer-reset"></i></div>${(d.unit==="days"||(d.unit==="hours"&&d.amount>=22))?'<div class="warn">22h safety buffer: resume with a template before the 24h WhatsApp window closes.</div>':""}</div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="flowComplete") body=`<div class="nb" style="padding-bottom:12px"><span class="badge green">Complete</span></div>`;
    if(n.type==="apiFetch"){ const mc={GET:"green",POST:"blue",PUT:"amber",DELETE:"red"}[d.method]||"muted"; body=`<div class="nb" style="padding-bottom:12px"><div class="api-url"><span class="badge ${mc}">${d.method}</span><span class="mono">${d.url?esc(d.url):'<span style="color:var(--muted-foreground)">No URL configured</span>'}</span></div><div class="sub">Maps ${d.maps} variables · Fallback: ${esc(d.fallback)}</div><button class="btn xs outline" data-act="props">Edit config</button><div class="hrow ok"><span class="tagx">Success</span><span class="h mini" data-h="success"></span></div><div class="hrow err"><span class="tagx">Error</span><span class="h mini" data-h="error"></span></div></div>`; }
    if(n.type==="transfer") body=`<div class="nb" style="padding-bottom:12px"><span class="badge orange" style="font-size:9px">Exits Flow</span><div class="sub" style="margin-top:4px">Team: <b style="color:var(--foreground)">${esc(d.team)}</b></div></div>`;
    if(n.type==="template") body=`<div class="nb"><span class="badge ${d.category==="MARKETING"?"blue":d.category==="UTILITY"?"green":"purple"}">${d.category}</span>${d.name?`<div class="mono" style="margin-top:6px">${esc(d.name)}</div>`:'<div class="sub">No template selected</div>'}${d.buttons.map(b=>`<div class="tmplbtn"><i data-lucide="reply" style="width:12px;height:12px"></i>${esc(b.label)}<span class="h opt mini" data-h="${b.id}"></span></div>`).join("")}</div><div class="nfoot dotted">Sync Next</div>${sH("sync-next")}`;
    if(n.type==="action") body=`<div class="nb"><div class="sub">${d.sets.length?d.sets.map(s=>`set <b>${esc(s)}</b>`).join(", "):"Set variables"}</div><div class="sub">${d.tags.length?d.tags.map(t=>`<span class="badge purple">${esc(t)}</span>`).join(" "):"Manage contact tags"}</div></div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="waFlow") body=`<div class="nb"><div class="sub">${d.form?"Form: <b>"+esc(d.form)+"</b>":"No Meta Flow selected"}</div><button class="btn xs outline" data-act="props">Open form builder</button></div><div class="nfoot">Next</div>${sH("next")}`;
    if(n.type==="integration") body=`<div class="nb"><div class="sub">${esc(d.desc||"")}</div></div><div class="nfoot">Next</div>${sH("next")}`;
    el.innerHTML=head(n.type==="transfer"||n.type==="flowComplete"?"":"")+body+tH; return el;
  },
  handlePos(nodeId,h){ const nel=this.layer.querySelector(`[data-id="${nodeId}"]`); if(!nel)return null; let hel=nel.querySelector(`[data-h="${h}"]`); if(!hel&&h!=="target")hel=nel.querySelector('[data-h="next"],[data-h="sync-next"]'); if(!hel)return null; const r=hel.getBoundingClientRect(), L=this.layer.getBoundingClientRect(); return {x:(r.left+r.width/2-L.left)/this.vp.k,y:(r.top+r.height/2-L.top)/this.vp.k}; },
  path(a,b){ const dx=Math.max(40,Math.abs(b.x-a.x)*0.5); return `M${a.x} ${a.y} C${a.x+dx} ${a.y} ${b.x-dx} ${b.y} ${b.x} ${b.y}`; },
  drawEdges(){
    const S=this.svg; S.innerHTML="";
    this.edges.forEach(e=>{ const a=this.handlePos(e.source,e.sourceHandle||"next"), b=this.handlePos(e.target,"target"); if(!a||!b)return; const d=this.path(a,b);
      const hit=document.createElementNS("http://www.w3.org/2000/svg","path"); hit.setAttribute("d",d); hit.setAttribute("class","hit"); hit.dataset.e=e.id;
      const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d",d); p.setAttribute("class","e"+(this.hoverEdge===e.id?" hl":"")); p.dataset.e=e.id; S.appendChild(hit); S.appendChild(p); });
    if(this.tempPath){ const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d",this.tempPath); p.setAttribute("class","temp"); S.appendChild(p); }
    this.placeX();
  },
  placeX(){ const old=this.layer.querySelector(".edge-x"); if(old)old.remove(); if(!this.hoverEdge||this.mode!=="edit")return; const e=this.edges.find(x=>x.id===this.hoverEdge); if(!e)return; const a=this.handlePos(e.source,e.sourceHandle||"next"), b=this.handlePos(e.target,"target"); if(!a||!b)return; const x=document.createElement("div"); x.className="edge-x"; x.setAttribute("aria-label","Delete edge"); x.innerHTML='<i data-lucide="x"></i>'; x.style.left=(a.x+b.x)/2+"px"; x.style.top=(a.y+b.y)/2+"px"; x.style.transform=`translate(-50%,-50%) scale(${1/this.vp.k})`; x.onmousedown=ev=>{ ev.stopPropagation(); this.edges=this.edges.filter(z=>z.id!==e.id); this.hoverEdge=null; this.commit("edge removed"); }; x.onmouseenter=()=>{this._keepX=true}; x.onmouseleave=()=>{this._keepX=false}; this.layer.appendChild(x); lucide.createIcons({nameAttr:"data-lucide"}); },
  drawMini(){ const m=this.root.querySelector("#minimap"); if(!m)return; const b=this.bounds(); const pad=40; const W=200,H=130; const k=Math.min(W/(b.w+pad*2),H/(b.h+pad*2)); const ox=(W-(b.w+pad*2)*k)/2, oy=(H-(b.h+pad*2)*k)/2; const col=n=>n.type==="start"?"var(--chart-2)":n.type==="question"?"var(--primary)":n.type==="quickReply"?"var(--chart-1)":n.type==="list"?"var(--chart-4)":"oklch(0.9 0.01 260)"; const r=this.el.getBoundingClientRect(); const vx=(-this.vp.x/this.vp.k-b.x+pad)*k+ox, vy=(-this.vp.y/this.vp.k-b.y+pad)*k+oy, vw=r.width/this.vp.k*k, vh=r.height/this.vp.k*k;
    m.innerHTML=`<svg width="${W}" height="${H}">${this.nodes.map(n=>{const el=this.layer.querySelector(`[data-id="${n.id}"]`);const w=el?el.offsetWidth:280,h=el?el.offsetHeight:120;return `<rect x="${(n.x-b.x+pad)*k+ox}" y="${(n.y-b.y+pad)*k+oy}" width="${w*k}" height="${h*k}" rx="2" fill="${col(n)}" ${this.invalid&&this.invalid.has(n.id)?'stroke="var(--destructive)" stroke-width="3"':''}/>`}).join("")}<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="rgba(99,102,241,.08)" stroke="var(--edge-color)" stroke-width="1"/></svg>`; },
  /* ── pointer interactions ── */
  bindPointer(){
    const el=this.el; let drag=null;
    el.addEventListener("wheel",ev=>{ ev.preventDefault(); const r=el.getBoundingClientRect(); if(ev.ctrlKey||ev.metaKey||true){ const k=this.vp.k*(ev.deltaY<0?1.08:0.92); this.zoomTo(k,ev.clientX-r.left,ev.clientY-r.top);} },{passive:false});
    el.addEventListener("mousedown",ev=>{
      if(ev.button===2)return;
      const h=ev.target.closest(".h"); const nEl=ev.target.closest(".node"); const act=ev.target.closest("[data-act]");
      if(ev.target.closest(".edge-x")||ev.target.closest(".cpanel")||ev.target.closest(".backpill"))return;
      if(h&&this.mode==="edit"&&h.dataset.h!=="target"){ ev.preventDefault(); ev.stopPropagation(); drag={kind:"connect",from:nEl.dataset.id,handle:h.dataset.h}; return; }
      if(act){ return; }
      if(nEl){ if(ev.target.isContentEditable){ return; } ev.preventDefault(); this.select(nEl.dataset.id); if(this.mode!=="edit")return; const n=this.node(nEl.dataset.id); drag={kind:"node",id:n.id,sx:ev.clientX,sy:ev.clientY,ox:n.x,oy:n.y,moved:false}; nEl.classList.add("dragging"); return; }
      if(ev.target.closest("svg#edges path")) return;
      drag={kind:"pan",sx:ev.clientX,sy:ev.clientY,ox:this.vp.x,oy:this.vp.y,moved:false}; el.classList.add("panning");
      if(document.activeElement&&document.activeElement.isContentEditable)document.activeElement.blur();
    });
    window.addEventListener("mousemove",ev=>{
      if(!drag){ const p=ev.target.closest&&ev.target.closest("svg#edges path"); const id=p?p.dataset.e:null; if(id!==this.hoverEdge&&!this._keepX){ this.hoverEdge=id; this.drawEdges(); } return; }
      if(drag.kind==="pan"){ this.vp.x=drag.ox+ev.clientX-drag.sx; this.vp.y=drag.oy+ev.clientY-drag.sy; drag.moved=true; this.applyVp(); }
      if(drag.kind==="node"){ const n=this.node(drag.id); n.x=drag.ox+(ev.clientX-drag.sx)/this.vp.k; n.y=drag.oy+(ev.clientY-drag.sy)/this.vp.k; drag.moved=true; const nEl=this.layer.querySelector(`[data-id="${n.id}"]`); nEl.style.left=n.x+"px"; nEl.style.top=n.y+"px"; this.drawEdges(); }
      if(drag.kind==="connect"){ const a=this.handlePos(drag.from,drag.handle), b=this.toFlow(ev.clientX,ev.clientY); this.tempPath=this.path(a,b); this.drawEdges(); const t=ev.target.closest&&ev.target.closest(".node"); this.layer.querySelectorAll(".node.focus").forEach(x=>x.classList.remove("focus")); if(t&&t.dataset.id!==drag.from)t.classList.add("focus"); }
    });
    window.addEventListener("mouseup",ev=>{
      if(!drag)return; const d=drag; drag=null; el.classList.remove("panning");
      if(d.kind==="node"){ const nEl=this.layer.querySelector(`[data-id="${d.id}"]`); nEl&&nEl.classList.remove("dragging"); if(d.moved)this.commit("moved"); }
      if(d.kind==="connect"){ this.tempPath=null; this.layer.querySelectorAll(".node.focus").forEach(x=>x.classList.remove("focus")); const t=ev.target.closest&&ev.target.closest(".node"); if(t&&t.dataset.id!==d.from&&t.dataset.id!=="start"){ this.edges=this.edges.filter(e=>!(e.source===d.from&&(e.sourceHandle||"next")===d.handle)); this.edges.push({id:uid(),source:d.from,target:t.dataset.id,sourceHandle:d.handle==="next"?null:d.handle}); this.commit("connected"); } else { this.drawEdges(); if(!t&&this.onDropConnect)this.onDropConnect(d,ev); } }
    });
    el.addEventListener("dblclick",ev=>{ const nEl=ev.target.closest(".node"); if(nEl&&this.onOpen)this.onOpen(nEl.dataset.id); });
    el.addEventListener("click",ev=>{ if(ev.target.closest(".node")||ev.target.closest(".cpanel")||ev.target.closest(".edge-x")||ev.target.closest(".backpill"))return; this.select(null); });
    /* inline edits */
    this.layer.addEventListener("focusin",ev=>{ if(ev.target.isContentEditable){ ev.target.removeAttribute("data-empty"); this._editBefore=this.snapshot(); } });
    this.layer.addEventListener("input",ev=>{ if(!ev.target.isContentEditable)return; const nEl=ev.target.closest(".node"); const n=this.node(nEl.dataset.id); this.setField(n,ev.target.dataset.f,ev.target.innerText.replace(/\n$/,"")); const c=nEl.querySelector(".sub[style*='text-align:right']"); if(c&&n.type==="text")c.textContent=(n.data.text||"").length+"/4096"; this.onChange&&this.onChange("edit",true); });
    this.layer.addEventListener("focusout",ev=>{ if(!ev.target.isContentEditable)return; if(this._editBefore&&this._editBefore!==this.snapshot()){ this.history.push(this._editBefore); this.future=[]; this.dirty=true; } this._editBefore=null; this.render(); this.onChange&&this.onChange("edit"); });
    this.layer.addEventListener("keydown",ev=>{ if(ev.target.isContentEditable&&ev.key==="Enter"&&!ev.shiftKey&&ev.target.dataset.f!=="text"){ ev.preventDefault(); ev.target.blur(); } if(ev.target.isContentEditable&&ev.key==="Escape")ev.target.blur(); ev.stopPropagation(); });
    this.layer.addEventListener("click",ev=>{ const a=ev.target.closest("[data-act]"); if(!a)return; const nEl=a.closest(".node"); const n=this.node(nEl.dataset.id); const act=a.dataset.act;
      if(act==="addbtn"&&n.data.buttons.length<10){ n.data.buttons.push({id:uid(),label:"New button"}); this.commit("button added"); }
      if(act==="addopt"&&n.data.options.length<10){ n.data.options.push({id:uid(),label:"New option"}); this.commit("option added"); }
      if(act==="props"){ this.select(n.id); this.onOpen&&this.onOpen(n.id); }
      if(act==="triggers"&&this.onTriggers)this.onTriggers(n.id);
      if(act==="test"&&this.onTest)this.onTest();
    });
    el.addEventListener("contextmenu",ev=>{ ev.preventDefault(); const nEl=ev.target.closest(".node"); this.onContext&&this.onContext(ev,nEl?nEl.dataset.id:null); });
    /* drop from palette */
    el.addEventListener("dragover",ev=>{ ev.preventDefault(); el.classList.add("dropping"); }); el.addEventListener("dragleave",()=>el.classList.remove("dropping"));
    el.addEventListener("drop",ev=>{ ev.preventDefault(); el.classList.remove("dropping"); if(!this.pendingDrop||this.mode!=="edit")return; const p=this.toFlow(ev.clientX,ev.clientY); this.addNode(this.pendingDrop.type,p.x-140,p.y-30,this.pendingDrop.data); this.pendingDrop=null; });
  },
  bindKeys(){ window.addEventListener("keydown",ev=>{ if(ev.target.isContentEditable||/INPUT|TEXTAREA/.test(ev.target.tagName))return; const meta=ev.metaKey||ev.ctrlKey; if(meta&&ev.key==="z"&&!ev.shiftKey){ ev.preventDefault(); this.undo(); } else if(meta&&(ev.key==="Z"||(ev.key==="z"&&ev.shiftKey))){ ev.preventDefault(); this.redo(); } else if((ev.key==="Backspace"||ev.key==="Delete")&&this.sel&&this.sel!=="start"&&this.mode==="edit"){ this.removeNode(this.sel); } else if(ev.key==="Escape"){ this.select(null); } }); },
  setField(n,f,v){ if(f==="label")n.data.label=v; else if(f.startsWith("btn:")){ const b=n.data.buttons.find(x=>x.id===f.slice(4)); if(b)b.label=v; } else if(f.startsWith("opt:")){ const o=n.data.options.find(x=>x.id===f.slice(4)); if(o)o.label=v; } else n.data[f]=v; },
  select(id){ this.sel=id; this.layer.querySelectorAll(".node").forEach(x=>x.classList.toggle("sel",x.dataset.id===id)); this.onSelect&&this.onSelect(id); },
  addNode(type,x,y,data){ const n={id:uid(),type,x:Math.round(x),y:Math.round(y),data:Object.assign(defaults(type),data||{})}; this.nodes.push(n); this.commit("node added"); this.select(n.id); return n; },
  removeNode(id){ this.nodes=this.nodes.filter(n=>n.id!==id); this.edges=this.edges.filter(e=>e.source!==id&&e.target!==id); if(this.sel===id)this.sel=null; this.commit("node removed"); this.onSelect&&this.onSelect(null); },
  duplicate(id){ const n=this.node(id); if(!n||n.type==="start")return; const c=JSON.parse(JSON.stringify(n)); c.id=uid(); c.x+=40; c.y+=40; if(c.data.buttons)c.data.buttons.forEach(b=>b.id=uid()); if(c.data.options)c.data.options.forEach(b=>b.id=uid()); this.nodes.push(c); this.commit("duplicated"); this.select(c.id); },
  /* layered auto-layout from Start */
  autoLayout(){ const depth={start:0}; const q=["start"]; while(q.length){ const id=q.shift(); this.edges.filter(e=>e.source===id).forEach(e=>{ if(depth[e.target]==null||depth[e.target]<depth[id]+1){ depth[e.target]=depth[id]+1; q.push(e.target); } }); } let maxd=0; Object.values(depth).forEach(v=>maxd=Math.max(maxd,v)); this.nodes.forEach(n=>{ if(depth[n.id]==null)depth[n.id]=++maxd; }); const cols={}; this.nodes.forEach(n=>{ (cols[depth[n.id]]=cols[depth[n.id]]||[]).push(n); }); Object.keys(cols).forEach(d=>{ const col=cols[d]; let y=0; const hs=col.map(n=>{ const el=this.layer.querySelector(`[data-id="${n.id}"]`); return el?el.offsetHeight:140; }); const total=hs.reduce((a,b)=>a+b,0)+(col.length-1)*60; y=-total/2; col.forEach((n,i)=>{ n.x=60+d*380; n.y=400+y; y+=hs[i]+60; }); }); this.commit("auto-layout"); requestAnimationFrame(()=>this.fit(0.62)); },
  /* validation · mirrors the publish blockers */
  validate(){ const issues=[]; const inv=new Set(); const has=(s,h)=>this.edges.some(e=>e.source===s&&(h?e.sourceHandle===h:true));
    this.nodes.forEach(n=>{ const d=n.data;
      if(n.type==="quickReply")d.buttons.forEach(b=>{ if(!has(n.id,b.id)){ issues.push(["quick-reply / list buttons with no follow-up",n.id]); inv.add(n.id);} });
      if(n.type==="list")d.options.forEach(o=>{ if(!has(n.id,o.id)){ issues.push(["quick-reply / list buttons with no follow-up",n.id]); inv.add(n.id);} });
      if((n.type==="question"||n.type==="quickReply")&&!d.store){ issues.push(["input nodes missing variable name",n.id]); inv.add(n.id); }
      if(n.type==="condition"&&d.groups.some(g=>g.rules.some(r=>!r.field||!r.value))){ issues.push(["condition rule is incomplete",n.id]); inv.add(n.id); }
      if(n.type==="text"&&(d.text||"").length>4096){ issues.push(["fields exceed character limits",n.id]); inv.add(n.id); }
      if(n.type==="delay"){ const nx=this.edges.find(e=>e.source===n.id); const t=nx&&this.node(nx.target); if(!t||t.type!=="template"){ issues.push(["delay needs a template next",n.id]); inv.add(n.id);} }
      if(n.type==="apiFetch"&&!has(n.id,"success")){ issues.push(["a branch is not connected correctly",n.id]); inv.add(n.id); }
      const vars=(JSON.stringify(d).match(/\{\{(\w+)\}\}/g)||[]).map(v=>v.slice(2,-2)); const known=new Set(["first_name","city","courier"]); this.nodes.forEach(m=>{ if(m.data.store)known.add(m.data.store); }); vars.forEach(v=>{ if(!known.has(v)){ issues.push(["unknown variables found · {{"+v+"}}",n.id]); inv.add(n.id);} });
    });
    this.invalid=inv; return issues; }
};
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

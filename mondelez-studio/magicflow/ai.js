/* Freestand AI · mocked assistant that streams text and applies real edits to the canvas */
const AI={
  msgs:[],busy:false,
  mount(el){ this.el=el; this.render(); },
  render(){
    const suggestions=Canvas.nodes.length>1?["✨ Add a follow-up question to collect feedback","🔀 Add conditional routing based on the user's answer","🔍 Review this flow for issues and suggest improvements"]:["✏️ Create a customer feedback survey flow","🛒 Build a product recommendation bot","📋 Add user registration with email validation"];
    this.el.innerHTML=`<div class="rp-head"><i data-lucide="sparkles" style="color:var(--primary);width:18px;height:18px"></i><div style="flex:1"><h2 style="font-size:15px">Freestand AI</h2><div class="sub">Project chat</div></div><button class="btn icon" onclick="App.closeRight()"><i data-lucide="x"></i></button></div>
    <div class="ai-body" id="ai-body">${this.msgs.length?"":`<div class="ai-empty"><i data-lucide="sparkles"></i><h3>What can I help you with?</h3><p>Ask me to create or edit your flow</p>${suggestions.map(s=>`<button class="sugg" data-s="${esc(s.slice(2).trim())}">${s}</button>`).join("")}</div>`}</div>
    <div class="ai-in"><div class="box"><textarea id="ai-text" rows="1" placeholder="${this.busy?"AI is thinking...":"Ask AI to create or edit your flow..."}" ${this.busy?"disabled":""}></textarea><button class="send" id="ai-send" ${this.busy?"":""}><i data-lucide="${this.busy?"square":"arrow-up"}"></i></button></div></div>`;
    lucide.createIcons({nameAttr:"data-lucide"});
    const body=this.el.querySelector("#ai-body"); this.msgs.forEach(m=>body.appendChild(m.el)); body.scrollTop=body.scrollHeight;
    this.el.querySelectorAll(".sugg").forEach(b=>b.onclick=()=>this.send(b.dataset.s));
    const ta=this.el.querySelector("#ai-text"); ta.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); this.send(ta.value); } e.stopPropagation(); }); ta.addEventListener("input",()=>{ ta.style.height="auto"; ta.style.height=Math.min(120,ta.scrollHeight)+"px"; });
    this.el.querySelector("#ai-send").onclick=()=>{ if(this.busy){ this.stop=true; } else this.send(ta.value); };
  },
  push(cls,html){ const el=document.createElement("div"); el.className="msg "+cls; el.innerHTML=html; this.msgs.push({el}); const b=this.el.querySelector("#ai-body"); const e=b.querySelector(".ai-empty"); if(e)e.remove(); b.appendChild(el); b.scrollTop=b.scrollHeight; return el; },
  sleep(ms){ return new Promise(r=>setTimeout(r,ms)); },
  async stream(el,text){ const target=document.createElement("div"); el.appendChild(target); let out=""; for(const ch of text){ if(this.stop)break; out+=ch; target.innerHTML=this.md(out); await this.sleep(ch===" "?9:14); const b=this.el.querySelector("#ai-body"); b.scrollTop=b.scrollHeight; } target.innerHTML=this.md(out); },
  md(s){ return s.split(/\n\n+/).map(p=>{ if(/^- /m.test(p))return "<ul>"+p.split("\n").filter(Boolean).map(l=>"<li>"+this.inline(l.replace(/^- /,""))+"</li>").join("")+"</ul>"; return "<p>"+this.inline(p).replace(/\n/g,"<br>")+"</p>"; }).join(""); },
  inline(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/`(.+?)`/g,"<code>$1</code>"); },
  async tool(el,label,ms){ const t=document.createElement("div"); t.className="tool"; t.innerHTML=`<span class="spin"></span><span class="shim">${label}</span>`; el.appendChild(t); await this.sleep(ms||900); return (done)=>{ t.innerHTML=`<span class="ok"><i data-lucide="check"></i></span><span>${done}</span>`; lucide.createIcons({nameAttr:"data-lucide"}); }; },
  tasks(el,rows){ const t=document.createElement("div"); t.className="tasks"; t.innerHTML=rows.map(r=>`<div class="${r[0]}">${r[0]==="add"?"+":r[0]==="rem"?"−":r[0]==="upd"?"~":"↳"} ${esc(r[1])}</div>`).join(""); el.appendChild(t); },
  lastNode(){ const ends=Canvas.nodes.filter(n=>!Canvas.edges.some(e=>e.source===n.id)&&n.type!=="transfer"&&n.type!=="flowComplete"); const s=Canvas.sel&&Canvas.node(Canvas.sel); return s&&s.type!=="flowComplete"?s:(ends[0]||Canvas.nodes[Canvas.nodes.length-1]); },
  place(after,dy){ return {x:after.x+380,y:after.y+(dy||0)}; },
  wire(a,b,h){ Canvas.edges.push({id:uid(),source:a.id,target:b.id,sourceHandle:h||null}); },
  async send(text){ text=(text||"").trim(); if(!text||this.busy)return; this.busy=true; this.stop=false; this.render(); this.push("user",esc(text));
    const ai=this.push("ai",""); const think=document.createElement("div"); think.className="tool"; think.innerHTML='<span class="shim">Thinking…</span>'; ai.appendChild(think); await this.sleep(900); think.remove();
    const q=text.toLowerCase(); const before=Canvas.snapshot(); const rows=[];
    try{
    if(/review|issues|improve this flow|audit/.test(q)&&!/copy on the/.test(q)){
      const done=await this.tool(ai,"Inspecting node…",1100); const issues=Canvas.validate(); Canvas.render(); done(`Inspected ${Canvas.nodes.length} nodes and ${Canvas.edges.length} edges`);
      const list=issues.length?issues.map(i=>`- **${Canvas.node(i[1]).data.label}**: ${i[0]}`).join("\n"):"- No blocking issues. Every button is wired and every input stores a variable.";
      await this.stream(ai,`Here is what I found in **${App.flow.name}**:\n\n${list}\n\nSuggestions:\n\n- Add a **Delay → Template** pair after confirmation to collect Day-7 feedback inside the 24h window rules.\n- The pincode question would benefit from a regex \`^[1-9][0-9]{5}$\` so retries fire on bad input.\n- Consider a **Quick Reply** before Transfer so contacts can choose “Call me” or “WhatsApp is fine”.\n\nWant me to apply the first two?`);
    } else if(/survey|recommendation|registration|create|build/.test(q)&&Canvas.nodes.length<=2){
      const done=await this.tool(ai,"Building and validating…",1600); const s=Canvas.node("start"); s.data.triggers=[{type:"keyword",keywords:[/survey/.test(q)?"FEEDBACK":/recommend/.test(q)?"SNACK":"JOIN"]}]; const base={x:s.x+380,y:s.y};
      const spec=/survey/.test(q)?[["text","Welcome","Hi {{first_name}}! Two quick questions about your last Cadbury purchase 💜",{}],["quickReply","Rating","How would you rate it?",{store:"rating",buttons:[{id:uid(),label:"5 · Excellent"},{id:uid(),label:"4 · Good"},{id:uid(),label:"3 or below"}]}],["question","Comment","What is the one thing we should keep or change?",{store:"comment"}],["text","Thanks","Thank you! 50 Joy Club points added to your account 🎁",{}],["flowComplete","Complete","",{}]]
        :/recommend/.test(q)?[["quickReply","Mood","What are you in the mood for?","",{store:"mood",buttons:[{id:uid(),label:"Something sweet"},{id:uid(),label:"Crunchy"},{id:uid(),label:"Surprise me"}]}],["quickReply","Occasion","When are you snacking?",{store:"occasion",buttons:[{id:uid(),label:"Right now"},{id:uid(),label:"After 9pm"},{id:uid(),label:"Gifting"}]}],["apiFetch","Recommend","",{method:"POST",url:"https://api.freestand.in/v1/recommend",maps:2}],["text","Pick","Try **{{sku}}** · {{reason}}. Want a sample?",{}],["flowComplete","Complete","",{}]]
        :[["question","Name","What's your name?",{store:"name",expect:"Text"}],["question","Email","And your email address?",{store:"email",expect:"Email",retry:true,maxRetries:2,error:"That email doesn't look right. Try again?"}],["text","Done","You're in, {{name}}! Welcome to the club.",{}],["flowComplete","Complete","",{}]];
      let prev=s,prevH=null,x=base.x; spec.forEach(sp=>{ const type=sp[0]; const data=Object.assign({label:sp[1],text:sp[2]},sp[3]||{}); if(type==="flowComplete")delete data.text; const n=Canvas.addNode(type,x,base.y,data); if(prev.type==="quickReply")prev.data.buttons.forEach(b=>this.wire(prev,n,b.id)); else this.wire(prev,n,prev.type==="apiFetch"?"success":null); rows.push(["add",`Added ${type} “${(sp[2]||sp[1]).slice(0,42)}”`]); prev=n; x+=380; });
      Canvas.commit("ai"); Canvas.fit(0.62); done(`Applied ${spec.length} changes`); rows.push(["wire",`${Canvas.edges.length} edges wired`]); this.tasks(ai,rows);
      await this.stream(ai,`Built the flow from **Start** with keyword trigger \`${s.data.triggers[0].keywords[0]}\`. Every input stores a variable, so the profile fills as the contact answers. Click any node to edit inline, or ask me to change the copy.`);
      const d2=await this.tool(ai,"Validating flow…",700); d2("Flow validates · 0 blockers");
    } else if(/follow-up|feedback/.test(q)){
      const done=await this.tool(ai,"Building and validating…",1300); const a=this.lastNode(); const p=this.place(a);
      const n1=Canvas.addNode("quickReply",p.x,p.y,{label:"Feedback",text:"How was your experience with the sample?",store:"feedback",buttons:[{id:uid(),label:"Loved it"},{id:uid(),label:"It was okay"},{id:uid(),label:"Not for me"}]});
      const n2=Canvas.addNode("question",p.x+380,p.y,{label:"Tell us more",text:"Thanks! One line on what stood out, good or bad.",store:"feedback_text"});
      const n3=Canvas.addNode("flowComplete",p.x+760,p.y+40,{});
      if(a.type==="flowComplete"){} else this.wire(a,n1,a.type==="quickReply"||a.type==="list"?"sync-next":(a.type==="apiFetch"?"success":null));
      n1.data.buttons.forEach(b=>this.wire(n1,n2,b.id)); this.wire(n2,n3); Canvas.commit("ai"); Canvas.fit(0.62); done("Applied 3 changes");
      this.tasks(ai,[["add",'Added quickReply “How was your experience with the sample?”'],["add",'Added question “Thanks! One line on what stood out…”'],["add","Added flowComplete"],["wire","5 edges wired"]]);
      await this.stream(ai,`Added a **follow-up feedback** step after **${a.data.label}**. The rating is stored as \`{{feedback}}\` and the open text as \`{{feedback_text}}\`, so both are available for cohorts and the Day-7 report.`);
      const d2=await this.tool(ai,"Validating flow…",700); d2("Flow validates · 0 blockers");
    } else if(/condition|routing|branch/.test(q)){
      const done=await this.tool(ai,"Applying changes…",1200); const a=this.lastNode(); const p=this.place(a); const g=uid(); const src=a.data.store||"feedback";
      const c=Canvas.addNode("condition",p.x,p.y-40,{label:"Route by answer",groups:[{id:g,mode:"ALL",rules:[{field:src,op:"equals",value:"Loved it"}]}]});
      const y=Canvas.addNode("text",p.x+380,p.y-160,{label:"Happy path",text:"So glad to hear it 💜 Here is 15% off your first full pack: SILK15"});
      const n=Canvas.addNode("transfer",p.x+380,p.y+120,{label:"Needs attention",team:"Sampling Support"});
      this.wire(a,c,a.type==="quickReply"||a.type==="list"?"sync-next":(a.type==="apiFetch"?"success":null)); this.wire(c,y,g); this.wire(c,n,"else"); Canvas.commit("ai"); Canvas.fit(0.62); done("Applied 3 changes");
      this.tasks(ai,[["add",`Added condition “${src} equals Loved it”`],["add","Added text “So glad to hear it…”"],["add","Added transfer “Sampling Support”"],["wire","3 edges wired"]]);
      await this.stream(ai,`Added **conditional routing** on \`{{${src}}}\`. Positive answers get a coupon; everything else goes to **Sampling Support** through the Else branch.`);
    } else if(/copy|improve|rewrite|shorter|friendlier/.test(q)){
      const done=await this.tool(ai,"Applying changes…",1000); const n=(Canvas.sel&&Canvas.node(Canvas.sel))||Canvas.nodes.find(x=>x.type==="text"); if(n&&n.data.text!=null){ const old=n.data.text; n.data.text=old.replace(/^Hi \{\{first_name\}\} 👋 /,"Hey {{first_name}} 👋 ").replace(/Takes under a minute\./,"Under a minute, promise.").replace(/Share your 6-digit pincode for delivery\./,"Drop your 6-digit pincode and we'll check delivery 📍"); if(n.data.text===old)n.data.text=old.trim()+" 💜"; Canvas.commit("ai"); done("Updated 1 node"); this.tasks(ai,[["upd",`Updated ${n.data.label} (text)`]]); await this.stream(ai,`Tightened the copy on **${n.data.label}**. Kept it under 160 characters and on brand voice. Undo with ⌘Z if you prefer the original.`); } else { done("Nothing to update"); await this.stream(ai,"Select a message node first and I'll rewrite its copy."); }
    } else if(/delete|remove/.test(q)){
      const done=await this.tool(ai,"Applying changes…",800); const n=Canvas.sel&&Canvas.node(Canvas.sel); if(n&&n.type!=="start"){ const l=n.data.label; Canvas.removeNode(n.id); done("Applied 1 change"); this.tasks(ai,[["rem",`Removed ${l}`]]); await this.stream(ai,`Removed **${l}**. Edges into it were dropped; reconnect the previous node if needed.`);} else { done("Nothing removed"); await this.stream(ai,"Select the node you want removed, then ask again."); }
    } else if(/publish/.test(q)){
      const done=await this.tool(ai,"Validating flow…",900); const issues=Canvas.validate(); Canvas.render(); done(issues.length?`${issues.length} blockers found`:"Flow validates · 0 blockers"); await this.stream(ai,issues.length?`I can't publish yet:\n\n${issues.map(i=>`- **${Canvas.node(i[1]).data.label}**: ${i[0]}`).join("\n")}\n\nFix these and I'll publish.`:"Everything validates. Opening the publish dialog."); if(!issues.length)setTimeout(()=>UI.publish(App.flow),400);
    } else {
      const done=await this.tool(ai,"Applying changes…",1000); const a=this.lastNode(); const p=this.place(a); const n=Canvas.addNode("text",p.x,p.y,{label:"Message",text:text.replace(/^(add|send|say|tell them)\s+/i,"").replace(/^(a|an)\s+message\s+(saying|that says)\s+/i,"")}); this.wire(a,n,a.type==="quickReply"||a.type==="list"?"sync-next":(a.type==="apiFetch"?"success":null)); Canvas.commit("ai"); done("Applied 1 change"); this.tasks(ai,[["add",`Added text “${n.data.text.slice(0,40)}”`],["wire","1 edge wired"]]); await this.stream(ai,`Added a **WhatsApp Message** after **${a.data.label}** with your text. Tell me if it should be a question or quick reply instead.`);
    }
    }catch(err){ console.error(err); await this.stream(ai,"Something went wrong applying that. Nothing was changed."); Canvas.nodes=JSON.parse(before).nodes; Canvas.edges=JSON.parse(before).edges; Canvas.render(); }
    this.busy=false; this.render();
  }
};

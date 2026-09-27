/* node type registry, palette categories, demo flows · mirrors constants/node-categories.ts and utils/node-presentation.ts */
const NODE_TYPES={
  start:{label:"Start",icon:"play",color:"#22c55e",w:300},
  text:{label:"WhatsApp Message",icon:"message-circle",color:"var(--platform-accent)",w:280,cat:"Interaction",desc:"Send a one-way message (NOT for questions — use question type instead)"},
  question:{label:"Question",icon:"circle-help",color:"var(--platform-accent)",w:280,cat:"Interaction",desc:"Ask users a question and wait for their text reply"},
  quickReply:{label:"Quick Reply",icon:"list-checks",color:"var(--platform-accent)",w:300,cat:"Interaction",desc:"Question with button options"},
  list:{label:"List",icon:"list",color:"var(--platform-accent)",w:320,cat:"Interaction",desc:"Interactive list menu"},
  carousel:{label:"Media Carousel",icon:"gallery-horizontal-end",color:"var(--platform-accent)",w:300,cat:"Interaction",desc:"Send 2–10 swipeable image or video cards"},
  condition:{label:"Condition",icon:"git-branch",color:"#6366f1",w:300,cat:"Logic",desc:"Branch flow based on conditions"},
  delay:{label:"Delay",icon:"clock-3",color:"#d97706",w:260,cat:"Logic",desc:"Wait silently before continuing"},
  flowComplete:{label:"Complete",icon:"circle-check",color:"#059669",w:240,cat:"Logic",desc:"Explicitly end the flow at this point"},
  apiFetch:{label:"API Call",icon:"braces",color:"#1a365d",w:280,cat:"Action",desc:"Make HTTP request and map response to variables"},
  transfer:{label:"Transfer",icon:"headset",color:"#7c2d12",w:270,cat:"Action",desc:"Transfer conversation to an agent or team"},
  template:{label:"Template Message",icon:"file-text",color:"#075e54",w:280,cat:"Action",desc:"Send a pre-approved WhatsApp template message"},
  action:{label:"Action",icon:"zap",color:"#9333ea",w:270,cat:"Action",desc:"Set variables and/or manage contact tags"},
  waFlow:{label:"WhatsApp Flow",icon:"form-input",color:"var(--platform-accent)",w:280,cat:"Action",desc:"Send a WhatsApp interactive form (Meta Flows)"}
};
const TEMPLATES_PAL=[["Name","question","Collect and validate user's name",{text:"What's your name?",store:"name",expect:"Text"}],["Email","question","Collect and validate user's email",{text:"What's your email address?",store:"email",expect:"Email"}],["DOB","question","Collect and validate user's date of birth",{text:"What's your date of birth? (DD/MM/YYYY)",store:"dob",expect:"Date"}],["Address","question","Collect and validate user's address",{text:"Please share your full delivery address.",store:"address",expect:"Text"}]];
const CATEGORIES=[["Templates","layers"],["Interaction","message-circle"],["Logic","git-branch"],["Action","zap"],["Integrations","plug"]];
const INTEGRATIONS=[["Shiprocket · Create order","truck","#7c3aed","Book a courier for the claimed sample"],["FreeStand · Allocate SKU","package","#0a3578","Run the SKU rule table on collected answers"],["Blinkit · Issue coupon","ticket","#f59e0b","Generate a unique quick-commerce coupon"]];

function uid(){ return Math.random().toString(36).slice(2,9); }
function defaults(type){
  switch(type){
    case "start": return {label:"Start",triggers:[]};
    case "text": return {label:"WhatsApp Message",text:""};
    case "question": return {label:"Question",text:"",store:"",expect:"Text",retry:true,maxRetries:3,error:""};
    case "quickReply": return {label:"Quick Reply",text:"",store:"",buttons:[{id:uid(),label:"Option 1"},{id:uid(),label:"Option 2"}]};
    case "list": return {label:"List",header:"",text:"Choose an option:",footer:"",cta:"View options",options:[{id:uid(),label:"Option 1"},{id:uid(),label:"Option 2"},{id:uid(),label:"Option 3"}]};
    case "carousel": return {label:"Media Carousel",cards:2};
    case "condition": return {label:"Condition",mode:"AND",groups:[{id:uid(),mode:"ALL",rules:[{field:"",op:"equals",value:""}]}]};
    case "delay": return {label:"Delay",amount:2,unit:"hours"};
    case "flowComplete": return {label:"Complete"};
    case "apiFetch": return {label:"API Call",method:"GET",url:"",maps:0,fallback:"Continue on error"};
    case "transfer": return {label:"Transfer",team:"General Queue"};
    case "template": return {label:"Template Message",name:"",category:"UTILITY",buttons:[]};
    case "action": return {label:"Action",sets:[],tags:[]};
    case "waFlow": return {label:"WhatsApp Flow",form:""};
    case "integration": return {label:"Integration"};
  }
  return {label:type};
}

/* demo flow · Cadbury Silk sample claim on WhatsApp */
function demoFlow(){
  const n=(id,type,x,y,data)=>({id,type,x,y,data:Object.assign(defaults(type),data)});
  const b1=uid(),b2=uid(),b3=uid(),g1=uid();
  const nodes=[
    n("start","start",60,300,{triggers:[{type:"keyword",keywords:["SAMPLE","Hi Cadbury","Silk"]},{type:"qr",label:"Pack QR · utm retail_qr"}]}),
    n("welcome","text",440,300,{label:"Welcome",text:"Hi {{first_name}} 👋 Claim a free Cadbury Silk sample, delivered to your door. Takes under a minute."}),
    n("flavour","quickReply",800,260,{label:"Pick a flavour",text:"Which Silk would you like to try?",store:"flavour",buttons:[{id:b1,label:"Silk Hazelnut"},{id:b2,label:"Silk Oreo"},{id:b3,label:"Silk Bubbly"}]}),
    n("pin","question",1180,300,{label:"Pincode",text:"Share your 6-digit pincode for delivery.",store:"pincode",expect:"Number",retry:true,maxRetries:2,error:"That doesn't look like a pincode. Try 6 digits, e.g. 411038."}),
    n("api","apiFetch",1540,300,{label:"Serviceability check",method:"GET",url:"https://api.freestand.in/v1/serviceability/{{pincode}}",maps:3,fallback:"Route to agent"}),
    n("cond","condition",1900,240,{label:"Deliverable?",groups:[{id:g1,mode:"ALL",rules:[{field:"serviceable",op:"equals",value:"true"},{field:"stock",op:"greater than",value:"0"}]}]}),
    n("addr","question",2280,140,{label:"Address",text:"Great, we deliver to {{city}}. What's your full address?",store:"address",expect:"Text"}),
    n("confirm","text",2640,140,{label:"Confirmation",text:"Done ✅ Your {{flavour}} sample ships today via {{courier}}. Tracking arrives here on WhatsApp."}),
    n("delay","delay",3000,140,{label:"Wait for delivery",amount:3,unit:"days"}),
    n("tmpl","template",3340,140,{label:"Day-3 feedback",name:"silk_feedback_v2",category:"MARKETING",buttons:[{id:uid(),label:"Loved it"},{id:uid(),label:"It was okay"},{id:uid(),label:"Not for me"}]}),
    n("done","flowComplete",3720,180,{}),
    n("sorry","text",2280,480,{label:"Not serviceable",text:"We can't deliver to {{pincode}} yet. We'll message you the moment we can 🙏"}),
    n("agent","transfer",2640,480,{label:"Talk to a human",team:"Sampling Support"})
  ];
  const e=(s,t,sh)=>({id:uid(),source:s,target:t,sourceHandle:sh||null});
  const edges=[e("start","welcome"),e("welcome","flavour"),e("flavour","pin",b1),e("flavour","pin",b2),e("flavour","pin",b3),e("pin","api"),e("api","cond","success"),e("api","agent","error"),e("cond","addr",g1),e("cond","sorry","else"),e("addr","confirm"),e("confirm","delay"),e("delay","tmpl"),e("tmpl","done","sync-next"),e("sorry","agent")];
  return {nodes,edges};
}

const FLOWS=[
  {id:"f1",name:"Cadbury Silk · sample claim",desc:"WhatsApp sampling with pincode check and Day-3 feedback",platform:"whatsapp",status:"live",version:4,updated:"2 hours ago",keywords:["SAMPLE","Silk"],graph:demoFlow(),analytics:{sessions:18420,completed:"71%",deliveries:12890}},
  {id:"f2",name:"Oreo x BTS · scan-a-pack",desc:"Pack code → adaptive 3-question form → contest entry",platform:"whatsapp",status:"changes",version:2,updated:"Yesterday",keywords:["OREO","BTS"],graph:null,analytics:{sessions:9310,completed:"64%",deliveries:0}},
  {id:"f3",name:"Bournvita · Joy Club enrolment",desc:"Points, receipt upload, reorder reminders",platform:"whatsapp",status:"draft",version:1,updated:"3 days ago",keywords:["JOYCLUB"],graph:null,analytics:{sessions:0,completed:"–",deliveries:0}},
  {id:"f4",name:"Dairy Milk · Instagram giveaway",desc:"Story reply → DM → coupon",platform:"instagram",status:"disabled",version:3,updated:"Last week",keywords:["GIVEAWAY"],graph:null,analytics:{sessions:4120,completed:"58%",deliveries:0}}
];
function emptyFlow(){ return {nodes:[{id:"start",type:"start",x:120,y:260,data:defaults("start")}],edges:[]}; }

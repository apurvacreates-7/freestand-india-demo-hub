/* Studio embed: runs Magic Flow inside Freestand Studio's "Interaction design" tab.
   ?embed=1&channel=whatsapp|instagram|line|web
   Studio sends the campaign's flow with postMessage; the builder reports publishes back. */
(function () {
  const q = new URLSearchParams(location.search);
  const EMBED = q.get("embed") === "1";
  const CH = {
    whatsapp: { label: "WhatsApp", msg: "WhatsApp Message", icon: "message-circle", accent: "#25d366", account: "Mondelēz India · +91 80 4718 2200", link: "wa.me/918047182200", drop: [] },
    instagram: { label: "Instagram", msg: "Instagram DM", icon: "instagram", accent: "#E1306C", account: "@cadburyindia · Instagram Business", link: "ig.me/m/cadburyindia", drop: ["template", "waFlow", "list"] },
    line: { label: "LINE", msg: "LINE Message", icon: "message-square", accent: "#06C755", account: "Cadbury · LINE Official Account", link: "lin.ee/cadbury", drop: ["template", "waFlow"] },
    web: { label: "Web app", msg: "Web message", icon: "globe", accent: "#0a3578", account: "cadbury.in · web widget", link: "cadbury.in/claim", drop: ["template", "waFlow"] },
  };
  const key = CH[q.get("channel")] ? q.get("channel") : "whatsapp";
  const ch = CH[key];

  // Channel theme and node vocabulary.
  const st = document.createElement("style");
  st.textContent = `[data-platform="${key}"]{--platform-accent:${ch.accent}}
  body.embed #sidebar{display:none}
  body.embed #shell{grid-template-columns:1fr!important}
  body.embed .fh #back{display:none}
  body.embed .fh{flex-wrap:nowrap;min-width:0}
  body.embed .fh .name{min-width:0;max-width:300px}
  body.embed .fh .name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block;max-width:260px;vertical-align:middle}
  body.embed .fh .rt{flex-shrink:0}
  @media (max-width:1180px){body.embed .fh .save,body.embed .fh .rt>.btn.outline:not(#layout),body.embed .fh [data-tip="Flow Graph"],body.embed .fh .div{display:none}}
  @media (max-width:960px){body.embed .fh #layout,body.embed .fh .tg{display:none}}
  .platb.ch{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;color:#fff;background:${ch.accent}}
  .platb.ch svg{width:13px;height:13px}`;
  document.head.appendChild(st);
  if (typeof NODE_TYPES !== "undefined") {
    NODE_TYPES.text.label = ch.msg;
    NODE_TYPES.text.icon = ch.icon;
    NODE_TYPES.text.desc = `Send a one-way ${ch.label} message (NOT for questions — use question type instead)`;
    ch.drop.forEach((t) => delete NODE_TYPES[t]);
  }

  // Words tied to WhatsApp follow the chosen channel everywhere outside what the user types.
  const swap = (t) =>
    key === "whatsapp"
      ? t
      : t
          .replace(/Test on WhatsApp/g, "Test on " + ch.label)
          .replace(/Published to WhatsApp/g, "Published to " + ch.label)
          .replace(/pushed to WhatsApp/g, "pushed to " + ch.label)
          .replace(/WhatsApp Account/g, ch.label + " account")
          .replace(/Add WhatsApp Message/g, "Add " + ch.msg)
          .replace(/Type your WhatsApp message/g, "Type your " + ch.label + " message")
          .replace(/Mondelez India · \+91 80 4718 2200/g, ch.account)
          .replace(/wa\.me\/918047182200/g, ch.link);
  const fix = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement && n.parentElement.closest("[contenteditable]")) continue;
      const v = swap(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
    root.querySelectorAll && root.querySelectorAll("[placeholder]").forEach((el) => (el.placeholder = swap(el.placeholder)));
  };
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((a) => (a.nodeType === 1 ? fix(a) : a.nodeType === 3 && fix(a.parentNode || document.body))))).observe(document.body, { childList: true, subtree: true });

  // Header badge shows the channel.
  const rh = App.renderHeader.bind(App);
  App.renderHeader = function () {
    rh();
    const b = document.querySelector(".fh .platb");
    if (b) {
      b.className = "platb ch";
      b.innerHTML = `<i data-lucide="${ch.icon}"></i>${ch.label}`;
      lucide.createIcons({ nameAttr: "data-lucide" });
    }
  };

  // Tell Studio about publishes.
  const toast = UI.toast.bind(UI);
  UI.toast = function (title, desc, kind) {
    toast(swap(title), desc && swap(desc), kind);
    if (EMBED && /^Published/.test(title) && App.flow)
      parent.postMessage({ source: "magicflow", type: "published", flow: App.flow.name, channel: ch.label, version: App.flow.version, nodes: Canvas.nodes.length }, "*");
  };

  if (!EMBED) return;
  document.body.classList.add("embed");
  document.body.dataset.platform = key;
  // Studio sends the campaign's flow; open straight into the editor.
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.source !== "studio" || d.type !== "flow") return;
    const f = { id: d.id, name: d.name, desc: d.desc || "", platform: key, status: d.status || "live", version: d.version || 4, updated: "Just now", keywords: d.keywords || [], graph: d.graph, analytics: { sessions: 0, completed: "–", deliveries: 0 } };
    const i = FLOWS.findIndex((x) => x.id === f.id);
    if (i >= 0) FLOWS[i] = f;
    else FLOWS.unshift(f);
    App.openEditor(f.id);
    document.body.dataset.platform = key;
    if (d.layout)
      setTimeout(() => {
        Canvas.autoLayout();
        Canvas.history = [];
        Canvas.dirty = false;
        App.changes = [];
        f.status = d.status || "live";
        App.renderHeader();
        setTimeout(() => Canvas.fit(0.5), 80);
      }, 60);
  });
  // After the app has initialised (its DOMContentLoaded listener was registered first).
  window.addEventListener("DOMContentLoaded", () => parent.postMessage({ source: "magicflow", type: "ready", channel: key }, "*"));
})();

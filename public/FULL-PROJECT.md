# פרויקט צ'אט קהילתי - חיבור וניתוק בקליק
## קובץ מרוכז לכל הפרויקט

---

## מטרה
צ'אט קהילתי להטמעה ב-WordPress Elementor HTML Widget, עם:
- כניסת אורחים (בלי רישום)
- כניסת מנויים (עם אימות מייל OTP)
- פאנל ניהול (השתקה, חסימה, אזהרות)
- הודעות בזמן אמת
- עיצוב כהה מותאם

---

## הגדרות חשובות

```
SUPABASE_URL: https://wbjofameqaftxricclmd.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiam9mYW1lcWFmdHhyaWNjbG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTI0MTcsImV4cCI6MjA5MzA2ODQxN30.x_9XRxjDBpiZpASt6Xb_SJk1lgntPzzPFucamaumfhY
ADMIN_EMAIL: arielgabayyy@gmail.com
API_BASE: https://v0-chat-psi.vercel.app/api (צריך לעדכן לכתובת הנכונה)
LOGO: https://nitukbeclick.co.il/wp-content/uploads/2025/01/חיבור-וניתוק-בקליק-לוגו.png
```

---

## סכמת מסד נתונים (Supabase)

### טבלת chat_users
```sql
CREATE TABLE chat_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT DEFAULT '#3b82f6',
  user_type TEXT CHECK (user_type IN ('guest', 'subscriber', 'newsletter', 'admin')) DEFAULT 'guest',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ,
  messages_count INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  warning_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### טבלת chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES chat_users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### טבלת otp_codes
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### טבלת muted_users
```sql
CREATE TABLE muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES chat_users(id),
  muted_by UUID REFERENCES chat_users(id),
  muted_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### טבלת banned_users
```sql
CREATE TABLE banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES chat_users(id),
  email TEXT,
  banned_by UUID REFERENCES chat_users(id),
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## קובץ 1: nituk-elementor.html (להטמעה ב-Elementor)

```html
<div id="nkChat"></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
(function(){
  var SUPABASE_URL='https://wbjofameqaftxricclmd.supabase.co';
  var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indiam9mYW1lcWFmdHhyaWNjbG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTI0MTcsImV4cCI6MjA5MzA2ODQxN30.x_9XRxjDBpiZpASt6Xb_SJk1lgntPzzPFucamaumfhY';
  var ADMIN_EMAIL='arielgabayyy@gmail.com';
  var API_BASE='https://v0-chat-psi.vercel.app/api';
  var LOGO='https://nitukbeclick.co.il/wp-content/uploads/2025/01/חיבור-וניתוק-בקליק-לוגו.png';
  var sb,user=null,msgs=[],channel=null,pendingUser={};
  var colors=['#3b82f6','#ef4444','#22c55e','#f97316','#a855f7','#ec4899','#06b6d4','#14b8a6'];
  var selColor=colors[0];

  var css=`
#nkChat,#nkChat *{box-sizing:border-box!important;margin:0!important;padding:0!important;font-family:'Segoe UI',Tahoma,Arial,sans-serif!important;line-height:1.4!important}
#nkChat{direction:rtl!important;background:#060d1a!important;border-radius:16px!important;width:100%!important;max-width:420px!important;height:85svh!important;min-height:500px!important;max-height:650px!important;margin:0 auto!important;display:block!important;overflow:hidden!important;border:1px solid rgba(255,255,255,0.1)!important;position:relative!important}
#nkChat .scr{display:none!important;position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:#060d1a!important;flex-direction:column!important}
#nkChat .scr.on{display:flex!important}
#nkChat .land{padding:32px 20px!important;text-align:center!important;flex:1!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important}
#nkChat .logo{width:64px!important;height:64px!important;border-radius:14px!important;margin-bottom:14px!important;background:#fff!important;padding:6px!important}
#nkChat h2{color:#fff!important;font-size:20px!important;font-weight:700!important;margin-bottom:6px!important}
#nkChat .sub{color:#94a3b8!important;font-size:13px!important;margin-bottom:20px!important}
#nkChat .stats{display:flex!important;gap:20px!important;justify-content:center!important;margin-bottom:24px!important}
#nkChat .stat{text-align:center!important}
#nkChat .stat b{display:block!important;color:#00d4a1!important;font-size:24px!important;font-weight:700!important}
#nkChat .stat span{color:#64748b!important;font-size:11px!important}
#nkChat .btn{width:100%!important;max-width:260px!important;padding:14px 20px!important;border:none!important;border-radius:12px!important;font-size:15px!important;font-weight:600!important;cursor:pointer!important;margin:5px 0!important;display:block!important;text-align:center!important;min-height:48px!important}
#nkChat .btn1{background:#00d4a1!important;color:#060d1a!important}
#nkChat .btn2{background:transparent!important;color:#fff!important;border:2px solid rgba(255,255,255,0.2)!important}
#nkChat .btn:disabled{opacity:0.6!important;cursor:not-allowed!important}
#nkChat .form{padding:28px 20px!important;flex:1!important;display:flex!important;flex-direction:column!important;align-items:center!important;overflow-y:auto!important}
#nkChat .form h3{color:#fff!important;font-size:18px!important;margin-bottom:6px!important}
#nkChat .form p{color:#94a3b8!important;font-size:13px!important;margin-bottom:20px!important}
#nkChat .form input[type="text"],#nkChat .form input[type="email"]{width:100%!important;max-width:280px!important;padding:12px 14px!important;border:2px solid #1e293b!important;border-radius:10px!important;font-size:16px!important;background:#0d1829!important;color:#fff!important;margin-bottom:10px!important;direction:rtl!important;text-align:right!important}
#nkChat .form input::placeholder{color:#64748b!important}
#nkChat .form input:focus{border-color:#00d4a1!important;outline:none!important}
#nkChat .colors{display:flex!important;gap:8px!important;justify-content:center!important;margin:12px 0 20px!important;flex-wrap:wrap!important}
#nkChat .col{width:36px!important;height:36px!important;border-radius:50%!important;border:3px solid transparent!important;cursor:pointer!important}
#nkChat .col.sel{border-color:#fff!important;transform:scale(1.1)!important}
#nkChat .back{color:#00d4a1!important;font-size:13px!important;cursor:pointer!important;margin-top:12px!important;background:none!important;border:none!important}
#nkChat .hdr{background:linear-gradient(135deg,#0ea5e9,#0284c7)!important;padding:12px 14px!important;display:flex!important;align-items:center!important;gap:10px!important;flex-shrink:0!important}
#nkChat .hdr img{width:40px!important;height:40px!important;border-radius:10px!important;background:#fff!important;padding:3px!important}
#nkChat .hdr .info{flex:1!important}
#nkChat .hdr .info h4{color:#fff!important;font-size:15px!important;font-weight:600!important;margin:0!important}
#nkChat .hdr .info span{color:rgba(255,255,255,0.8)!important;font-size:11px!important}
#nkChat .hdr .btns{display:flex!important;gap:6px!important}
#nkChat .hdr button{width:36px!important;height:36px!important;border-radius:8px!important;border:none!important;cursor:pointer!important;font-size:14px!important;display:flex!important;align-items:center!important;justify-content:center!important}
#nkChat .hdr .srch{background:rgba(255,255,255,0.2)!important;color:#fff!important}
#nkChat .hdr .exit{background:#ef4444!important;color:#fff!important}
#nkChat .hdr .adm{background:#f59e0b!important;color:#fff!important;display:none!important}
#nkChat .msgs{flex:1!important;overflow-y:auto!important;padding:14px!important;background:#0d1829!important}
#nkChat .msg{display:flex!important;gap:8px!important;margin-bottom:12px!important;align-items:flex-start!important}
#nkChat .msg.me{flex-direction:row-reverse!important}
#nkChat .msg .av{width:32px!important;height:32px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;font-weight:600!important;font-size:13px!important;flex-shrink:0!important;cursor:pointer!important}
#nkChat .msg .bub{max-width:70%!important;padding:10px 14px!important;border-radius:14px!important;background:#1e293b!important}
#nkChat .msg.me .bub{background:#00d4a1!important;color:#060d1a!important}
#nkChat .msg .nm{font-size:11px!important;color:#00d4a1!important;margin-bottom:3px!important;font-weight:600!important;display:flex!important;align-items:center!important;gap:6px!important}
#nkChat .msg.me .nm{color:#060d1a!important}
#nkChat .msg .badge{background:#f59e0b!important;color:#000!important;padding:2px 6px!important;border-radius:4px!important;font-size:9px!important}
#nkChat .msg .txt{color:#fff!important;font-size:13px!important;line-height:1.4!important;word-wrap:break-word!important}
#nkChat .msg.me .txt{color:#060d1a!important}
#nkChat .msg .tm{font-size:9px!important;color:#64748b!important;margin-top:3px!important}
#nkChat .msg.me .tm{color:rgba(6,13,26,0.5)!important}
#nkChat .inp{padding:10px 14px!important;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))!important;background:#060d1a!important;border-top:1px solid #1e293b!important;display:flex!important;gap:8px!important;align-items:center!important;flex-shrink:0!important}
#nkChat .inp button{width:40px!important;height:40px!important;border-radius:50%!important;border:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;flex-shrink:0!important;min-height:44px!important}
#nkChat .inp .emo{background:#1e293b!important;color:#fff!important}
#nkChat .inp input{flex:1!important;padding:10px 14px!important;border:2px solid #1e293b!important;border-radius:20px!important;font-size:16px!important;background:#0d1829!important;color:#fff!important;direction:rtl!important}
#nkChat .inp input:focus{border-color:#00d4a1!important;outline:none!important}
#nkChat .inp .snd{background:#00d4a1!important;color:#060d1a!important}
#nkChat .toast{position:absolute!important;bottom:70px!important;left:50%!important;transform:translateX(-50%)!important;background:#1e293b!important;color:#fff!important;padding:10px 20px!important;border-radius:8px!important;font-size:13px!important;z-index:100!important;opacity:0!important;transition:opacity 0.3s!important;white-space:nowrap!important}
#nkChat .toast.on{opacity:1!important}
#nkChat .emojis{position:absolute!important;bottom:60px!important;right:14px!important;background:#1e293b!important;border-radius:10px!important;padding:10px!important;display:none!important;flex-wrap:wrap!important;gap:6px!important;width:200px!important;z-index:50!important}
#nkChat .emojis.on{display:flex!important}
#nkChat .emojis span{font-size:20px!important;cursor:pointer!important;padding:4px!important}
#nkChat .vcode{display:flex!important;gap:6px!important;justify-content:center!important;direction:ltr!important;margin-bottom:16px!important}
#nkChat .vcode input{width:40px!important;height:48px!important;text-align:center!important;font-size:20px!important;font-weight:700!important;border:2px solid #1e293b!important;border-radius:10px!important;background:#0d1829!important;color:#fff!important}
#nkChat .vcode input:focus{border-color:#00d4a1!important;outline:none!important}
#nkChat .modal{position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:rgba(0,0,0,0.7)!important;display:none!important;align-items:center!important;justify-content:center!important;z-index:200!important;padding:20px!important}
#nkChat .modal.on{display:flex!important}
#nkChat .modal-box{background:#0d1829!important;border-radius:16px!important;width:100%!important;max-width:320px!important;max-height:80%!important;overflow:hidden!important}
#nkChat .modal-hdr{padding:14px!important;background:#1e293b!important;display:flex!important;justify-content:space-between!important;align-items:center!important;color:#fff!important;font-weight:600!important}
#nkChat .modal-hdr button{background:none!important;border:none!important;color:#fff!important;font-size:18px!important;cursor:pointer!important}
#nkChat .modal-body{padding:16px!important;overflow-y:auto!important;color:#e2e8f0!important}
#nkChat .profile-av{width:60px!important;height:60px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;font-size:24px!important;font-weight:700!important;margin:0 auto 12px!important}
#nkChat .profile-name{font-size:18px!important;font-weight:600!important;text-align:center!important;margin-bottom:4px!important}
#nkChat .profile-type{font-size:12px!important;color:#94a3b8!important;text-align:center!important;margin-bottom:16px!important}
#nkChat .profile-stats{display:flex!important;justify-content:center!important;gap:20px!important;margin-bottom:16px!important}
#nkChat .profile-stat{text-align:center!important}
#nkChat .profile-stat b{display:block!important;color:#00d4a1!important;font-size:18px!important}
#nkChat .profile-stat small{color:#64748b!important;font-size:10px!important}
#nkChat .admin-btns{display:flex!important;flex-direction:column!important;gap:8px!important;margin-top:16px!important}
#nkChat .admin-btns button{padding:10px!important;border-radius:8px!important;border:none!important;cursor:pointer!important;font-size:14px!important}
#nkChat .warn-btn{background:#f59e0b!important;color:#000!important}
#nkChat .mute-btn{background:#6366f1!important;color:#fff!important}
#nkChat .ban-btn{background:#ef4444!important;color:#fff!important}
@media(max-width:480px){#nkChat{height:100dvh!important;max-height:none!important;border-radius:0!important;max-width:100%!important}}
  `;

  var root=document.getElementById('nkChat');
  var style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);

  root.innerHTML=`
    <div id="sLand" class="scr on">
      <div class="land">
        <img class="logo" src="${LOGO}" alt="לוגו" onerror="this.style.display='none'">
        <h2>חיבור וניתוק בקליק</h2>
        <p class="sub">הצ'אט הקהילתי להשוואת מחירים</p>
        <div class="stats">
          <div class="stat"><b id="stM">0</b><span>חברים</span></div>
          <div class="stat"><b id="stG">0</b><span>הודעות</span></div>
          <div class="stat"><b id="stO">0</b><span>מחוברים</span></div>
        </div>
        <button class="btn btn1" onclick="NK.go('sMem')">כניסת מנויים</button>
        <button class="btn btn2" onclick="NK.go('sGst')">כניסה כאורח</button>
      </div>
    </div>
    <div id="sGst" class="scr">
      <div class="form">
        <h3>כניסה כאורח</h3>
        <p>בחרו שם וצבע</p>
        <input type="text" id="gN" placeholder="השם שלך" maxlength="20">
        <div class="colors" id="gC"></div>
        <button class="btn btn1" onclick="NK.joinG()">כניסה לצ'אט</button>
        <button class="back" onclick="NK.go('sLand')">חזרה</button>
      </div>
    </div>
    <div id="sMem" class="scr">
      <div class="form">
        <h3>כניסת מנויים</h3>
        <p>הזינו אימייל לקבלת קוד אישור</p>
        <input type="text" id="mN" placeholder="השם שלך" maxlength="20">
        <input type="email" id="mE" placeholder="כתובת אימייל">
        <div class="colors" id="mC"></div>
        <button class="btn btn1" id="sendBtn" onclick="NK.sendOTP()">שלח קוד אישור</button>
        <button class="back" onclick="NK.go('sLand')">חזרה</button>
      </div>
    </div>
    <div id="sVer" class="scr">
      <div class="form">
        <h3>הזינו קוד אישור</h3>
        <p>שלחנו קוד בן 6 ספרות למייל שלכם</p>
        <div class="vcode">
          <input type="text" maxlength="1" id="c1" oninput="NK.cNext(this,'c2')">
          <input type="text" maxlength="1" id="c2" oninput="NK.cNext(this,'c3')">
          <input type="text" maxlength="1" id="c3" oninput="NK.cNext(this,'c4')">
          <input type="text" maxlength="1" id="c4" oninput="NK.cNext(this,'c5')">
          <input type="text" maxlength="1" id="c5" oninput="NK.cNext(this,'c6')">
          <input type="text" maxlength="1" id="c6" oninput="NK.cNext(this,'')">
        </div>
        <button class="btn btn1" id="verBtn" onclick="NK.verifyOTP()">אימות וכניסה</button>
        <button class="back" onclick="NK.go('sMem')">חזרה</button>
      </div>
    </div>
    <div id="sChat" class="scr">
      <div class="hdr">
        <img src="${LOGO}" alt="לוגו" onerror="this.style.display='none'">
        <div class="info">
          <h4>חיבור וניתוק בקליק</h4>
          <span id="onl">0 מחוברים</span>
        </div>
        <div class="btns">
          <button class="adm" id="admB" onclick="NK.openAdmin()">⚙</button>
          <button class="srch" onclick="NK.tSrch()">🔍</button>
          <button class="exit" onclick="NK.out()">🚪</button>
        </div>
      </div>
      <div id="srchBox" style="display:none;padding:8px 14px;background:#0d1829">
        <input type="text" id="srchIn" placeholder="חיפוש הודעות..." oninput="NK.doSrch()" style="width:100%;padding:10px;border-radius:8px;border:1px solid #1e293b;background:#060d1a;color:#fff;font-size:14px">
      </div>
      <div class="msgs" id="mL"></div>
      <div class="inp">
        <button class="emo" onclick="NK.tEmo()">😊</button>
        <input type="text" id="mI" placeholder="כתבו הודעה..." onkeypress="if(event.key==='Enter')NK.snd()">
        <button class="snd" onclick="NK.snd()">➤</button>
      </div>
      <div class="emojis" id="eP"></div>
    </div>
    <div class="toast" id="tst"></div>
    <div class="modal" id="profModal">
      <div class="modal-box">
        <div class="modal-hdr"><span>פרופיל משתמש</span><button onclick="NK.cModal('profModal')">✕</button></div>
        <div class="modal-body" id="profBody"></div>
      </div>
    </div>
    <div class="modal" id="admModal">
      <div class="modal-box" style="max-width:360px">
        <div class="modal-hdr"><span>פאנל ניהול</span><button onclick="NK.cModal('admModal')">✕</button></div>
        <div style="display:flex;background:#1e293b">
          <button onclick="NK.admTab('muted')" style="flex:1;padding:10px;border:none;background:none;color:#94a3b8;cursor:pointer" id="tabMuted">מושתקים</button>
          <button onclick="NK.admTab('banned')" style="flex:1;padding:10px;border:none;background:none;color:#94a3b8;cursor:pointer" id="tabBanned">חסומים</button>
        </div>
        <div class="modal-body" id="admBody"></div>
      </div>
    </div>
  `;

  function $(id){return document.getElementById(id)}
  function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
  function rCol(cid){
    var h='';
    for(var i=0;i<colors.length;i++){
      var s=colors[i]===selColor?'sel':'';
      h+='<div class="col '+s+'" style="background:'+colors[i]+'" onclick="NK.pCol(\''+colors[i]+'\',\''+cid+'\')"></div>';
    }
    $(cid).innerHTML=h;
  }

  window.NK={
    init:function(){
      sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      rCol('gC');rCol('mC');
      this.lSt();
      var em=['😀','😂','😍','🥰','😎','🤔','👍','👎','❤️','🔥','✅','⭐','🎉','💪','🙏','😢','🤣','😊','🙌','💯'];
      var eh='';for(var i=0;i<em.length;i++){eh+='<span onclick="NK.aEmo(\''+em[i]+'\')">'+em[i]+'</span>';}
      $('eP').innerHTML=eh;
      
      var saved=localStorage.getItem('nitkuk_user');
      if(saved){
        try{
          user=JSON.parse(saved);
          sb.from('chat_users').update({is_online:true,last_seen:new Date().toISOString()}).eq('id',user.id).then(function(){NK.enter()});
        }catch(e){localStorage.removeItem('nitkuk_user')}
      }
    },
    lSt:function(){
      sb.from('chat_users').select('*',{count:'exact',head:true}).then(function(r){$('stM').textContent=r.count||0});
      sb.from('chat_messages').select('*',{count:'exact',head:true}).then(function(r){$('stG').textContent=r.count||0});
      sb.from('chat_users').select('*',{count:'exact',head:true}).eq('is_online',true).then(function(r){$('stO').textContent=r.count||0});
    },
    go:function(id){
      var all=root.querySelectorAll('.scr');
      for(var i=0;i<all.length;i++){all[i].classList.remove('on')}
      $(id).classList.add('on');
    },
    pCol:function(c,cid){selColor=c;rCol(cid)},
    toast:function(m){var t=$('tst');t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on')},3000)},
    cNext:function(el,nxt){if(el.value&&nxt){$(nxt).focus()}},
    
    joinG:function(){
      var n=$('gN').value.trim();
      if(!n){NK.toast('נא להזין שם');return}
      sb.from('chat_users').insert({name:n,avatar_color:selColor,user_type:'guest',is_online:true,last_seen:new Date().toISOString()})
        .select().single().then(function(r){
          if(r.error){NK.toast('שגיאה בכניסה');console.error(r.error);return}
          user=r.data;
          localStorage.setItem('nitkuk_user',JSON.stringify(user));
          NK.enter();
        });
    },
    
    sendOTP:function(){
      var n=$('mN').value.trim(),e=$('mE').value.trim().toLowerCase();
      if(!n){NK.toast('נא להזין שם');return}
      if(!e||!e.includes('@')){NK.toast('נא להזין אימייל תקין');return}
      
      pendingUser={name:n,email:e,color:selColor};
      
      if(e===ADMIN_EMAIL){NK.crMem(true);return}
      
      sb.from('banned_users').select('*').eq('email',e).maybeSingle().then(function(r){
        if(r.data){NK.toast('המשתמש חסום מהצ\'אט');return}
        
        $('sendBtn').disabled=true;
        $('sendBtn').textContent='שולח...';
        
        fetch(API_BASE+'/send-otp',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email:e})
        })
        .then(function(res){return res.json()})
        .then(function(data){
          $('sendBtn').disabled=false;
          $('sendBtn').textContent='שלח קוד אישור';
          
          if(data.error){NK.toast(data.error);return}
          NK.toast(data.message||'קוד נשלח למייל');
          NK.go('sVer');
          
          if(data.devMode&&data.devCode){
            setTimeout(function(){NK.toast('קוד (dev): '+data.devCode)},1500);
          }
        })
        .catch(function(err){
          console.error('Send OTP error:',err);
          $('sendBtn').disabled=false;
          $('sendBtn').textContent='שלח קוד אישור';
          NK.toast('שגיאה בשליחת קוד');
        });
      });
    },
    
    verifyOTP:function(){
      var c=$('c1').value+$('c2').value+$('c3').value+$('c4').value+$('c5').value+$('c6').value;
      if(c.length!==6){NK.toast('נא להזין קוד בן 6 ספרות');return}
      
      $('verBtn').disabled=true;
      $('verBtn').textContent='מאמת...';
      
      fetch(API_BASE+'/verify-otp',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:pendingUser.email,code:c})
      })
      .then(function(res){return res.json()})
      .then(function(data){
        $('verBtn').disabled=false;
        $('verBtn').textContent='אימות וכניסה';
        
        if(data.error){NK.toast(data.error);return}
        if(data.verified){NK.crMem(false)}
      })
      .catch(function(err){
        console.error('Verify OTP error:',err);
        $('verBtn').disabled=false;
        $('verBtn').textContent='אימות וכניסה';
        NK.toast('שגיאה באימות');
      });
    },
    
    crMem:function(isAdm){
      sb.from('chat_users').select('*').eq('email',pendingUser.email).maybeSingle().then(function(r){
        if(r.data){
          sb.from('chat_users').update({
            name:pendingUser.name,
            avatar_color:pendingUser.color,
            is_online:true,
            last_seen:new Date().toISOString()
          }).eq('id',r.data.id).select().single().then(function(r2){
            if(r2.error){NK.toast('שגיאה בכניסה');return}
            user=r2.data;
            localStorage.setItem('nitkuk_user',JSON.stringify(user));
            NK.enter();
          });
        }else{
          sb.from('chat_users').insert({
            name:pendingUser.name,
            email:pendingUser.email,
            avatar_color:pendingUser.color,
            user_type:isAdm?'admin':'subscriber',
            is_online:true,
            last_seen:new Date().toISOString()
          }).select().single().then(function(r2){
            if(r2.error){NK.toast('שגיאה ביצירת חשבון');console.error(r2.error);return}
            user=r2.data;
            localStorage.setItem('nitkuk_user',JSON.stringify(user));
            NK.enter();
          });
        }
      });
    },
    
    enter:function(){
      NK.go('sChat');
      if(user.user_type==='admin'){$('admB').style.display='flex'}
      NK.lMsg();NK.sub();NK.uOnl();
      setInterval(NK.uOnl,30000);
    },
    
    lMsg:function(){
      sb.from('chat_messages').select('*,chat_users(name,avatar_color,user_type)').order('created_at',{ascending:true}).limit(100).then(function(r){
        if(r.data){msgs=r.data;NK.rMsg()}
      });
    },
    
    rMsg:function(filter){
      var h='';
      var filtered=filter?msgs.filter(function(m){return m.content.toLowerCase().includes(filter.toLowerCase())}):msgs;
      
      for(var i=0;i<filtered.length;i++){
        var m=filtered[i],u=m.chat_users||{},me=user&&m.user_id===user.id;
        var cl=me?'msg me':'msg';
        var ini=(u.name||'?').charAt(0);
        var tm=m.created_at?new Date(m.created_at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'';
        var badge=u.user_type==='admin'?'<span class="badge">מנהל</span>':'';
        
        h+='<div class="'+cl+'">';
        h+='<div class="av" style="background:'+(u.avatar_color||'#666')+'" onclick="NK.openProf(\''+m.user_id+'\')">'+ini+'</div>';
        h+='<div class="bub"><div class="nm">'+badge+esc(u.name||'אנונימי')+'</div><div class="txt">'+esc(m.content)+'</div><div class="tm">'+tm+'</div></div></div>';
      }
      $('mL').innerHTML=h;$('mL').scrollTop=$('mL').scrollHeight;
    },
    
    sub:function(){
      channel=sb.channel('nk-chat-'+Date.now()).on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},function(p){
        sb.from('chat_messages').select('*,chat_users(name,avatar_color,user_type)').eq('id',p.new.id).single().then(function(r){
          if(r.data){msgs.push(r.data);NK.rMsg()}
        });
      }).subscribe();
    },
    
    snd:function(){
      var t=$('mI').value.trim();
      if(!t||!user)return;
      
      sb.from('muted_users').select('*').eq('user_id',user.id).gt('muted_until',new Date().toISOString()).maybeSingle().then(function(r){
        if(r.data){
          var until=new Date(r.data.muted_until).toLocaleString('he-IL');
          NK.toast('אתה מושתק עד '+until);
          return;
        }
        
        sb.from('chat_messages').insert({user_id:user.id,content:t}).then(function(r2){
          if(!r2.error){
            $('mI').value='';
            sb.from('chat_users').update({
              messages_count:(user.messages_count||0)+1,
              points:(user.points||0)+1,
              last_seen:new Date().toISOString()
            }).eq('id',user.id);
          }
        });
      });
    },
    
    uOnl:function(){
      sb.from('chat_users').select('*',{count:'exact',head:true}).eq('is_online',true).then(function(r){$('onl').textContent=(r.count||0)+' מחוברים'});
    },
    
    tSrch:function(){var b=$('srchBox');b.style.display=b.style.display==='none'?'block':'none';if(b.style.display==='block')$('srchIn').focus()},
    doSrch:function(){NK.rMsg($('srchIn').value)},
    
    tEmo:function(){$('eP').classList.toggle('on')},
    aEmo:function(e){$('mI').value+=' '+e;$('eP').classList.remove('on');$('mI').focus()},
    
    cModal:function(id){$(id).classList.remove('on')},
    
    openProf:function(uid){
      sb.from('chat_users').select('*').eq('id',uid).single().then(function(r){
        if(!r.data)return;
        var u=r.data;
        var types={guest:'אורח',subscriber:'מנוי',admin:'מנהל'};
        
        var h='<div class="profile-av" style="background:'+(u.avatar_color||'#666')+'">'+(u.name||'?').charAt(0)+'</div>';
        h+='<div class="profile-name">'+esc(u.name||'אנונימי')+'</div>';
        h+='<div class="profile-type">'+(types[u.user_type]||'משתמש')+'</div>';
        h+='<div class="profile-stats">';
        h+='<div class="profile-stat"><b>'+(u.messages_count||0)+'</b><small>הודעות</small></div>';
        h+='<div class="profile-stat"><b>'+(u.points||0)+'</b><small>נקודות</small></div>';
        h+='<div class="profile-stat"><b>'+(u.level||1)+'</b><small>רמה</small></div>';
        h+='</div>';
        
        if(user.user_type==='admin'&&uid!==user.id){
          h+='<div class="admin-btns">';
          h+='<button class="warn-btn" onclick="NK.warn(\''+uid+'\')">שלח אזהרה</button>';
          h+='<button class="mute-btn" onclick="NK.mute(\''+uid+'\')">השתק לשעה</button>';
          h+='<button class="ban-btn" onclick="NK.ban(\''+uid+'\',\''+(u.email||'')+'\')">חסום</button>';
          h+='</div>';
        }
        
        $('profBody').innerHTML=h;
        $('profModal').classList.add('on');
      });
    },
    
    warn:function(uid){
      sb.from('chat_users').select('warning_count').eq('id',uid).single().then(function(r){
        var cnt=(r.data&&r.data.warning_count||0)+1;
        sb.from('chat_users').update({warning_count:cnt}).eq('id',uid).then(function(){
          NK.toast('אזהרה נשלחה ('+cnt+')');
          NK.cModal('profModal');
        });
      });
    },
    mute:function(uid){
      var until=new Date(Date.now()+60*60*1000);
      sb.from('muted_users').insert({user_id:uid,muted_until:until.toISOString(),muted_by:user.id,reason:'השתקה על ידי מנהל'}).then(function(){
        NK.toast('המשתמש הושתק לשעה');
        NK.cModal('profModal');
      });
    },
    ban:function(uid,email){
      sb.from('banned_users').insert({user_id:uid,email:email,banned_by:user.id,reason:'חסימה על ידי מנהל'}).then(function(){
        NK.toast('המשתמש נחסם');
        NK.cModal('profModal');
      });
    },
    
    openAdmin:function(){NK.admTab('muted');$('admModal').classList.add('on')},
    admTab:function(tab){
      $('tabMuted').style.color=tab==='muted'?'#00d4a1':'#94a3b8';
      $('tabBanned').style.color=tab==='banned'?'#00d4a1':'#94a3b8';
      
      if(tab==='muted'){
        sb.from('muted_users').select('*,chat_users(name)').gt('muted_until',new Date().toISOString()).then(function(r){
          if(!r.data||!r.data.length){$('admBody').innerHTML='<p style="text-align:center;color:#94a3b8">אין משתמשים מושתקים</p>';return}
          var h='';
          for(var i=0;i<r.data.length;i++){
            var m=r.data[i];
            h+='<div style="padding:12px;background:#1e293b;border-radius:8px;margin-bottom:8px">';
            h+='<div style="font-weight:600">'+((m.chat_users&&m.chat_users.name)||'לא ידוע')+'</div>';
            h+='<div style="font-size:12px;color:#94a3b8">עד: '+new Date(m.muted_until).toLocaleString('he-IL')+'</div>';
            h+='<button onclick="NK.unmute(\''+m.id+'\')" style="margin-top:8px;padding:6px 12px;background:#10b981;border:none;border-radius:6px;color:#fff;cursor:pointer">הסר השתקה</button>';
            h+='</div>';
          }
          $('admBody').innerHTML=h;
        });
      }else{
        sb.from('banned_users').select('*,chat_users(name)').then(function(r){
          if(!r.data||!r.data.length){$('admBody').innerHTML='<p style="text-align:center;color:#94a3b8">אין משתמשים חסומים</p>';return}
          var h='';
          for(var i=0;i<r.data.length;i++){
            var b=r.data[i];
            h+='<div style="padding:12px;background:#1e293b;border-radius:8px;margin-bottom:8px">';
            h+='<div style="font-weight:600">'+((b.chat_users&&b.chat_users.name)||b.email||'לא ידוע')+'</div>';
            h+='<div style="font-size:12px;color:#94a3b8">'+new Date(b.banned_at).toLocaleString('he-IL')+'</div>';
            h+='<button onclick="NK.unban(\''+b.id+'\')" style="margin-top:8px;padding:6px 12px;background:#10b981;border:none;border-radius:6px;color:#fff;cursor:pointer">הסר חסימה</button>';
            h+='</div>';
          }
          $('admBody').innerHTML=h;
        });
      }
    },
    unmute:function(id){sb.from('muted_users').delete().eq('id',id).then(function(){NK.toast('ההשתקה הוסרה');NK.admTab('muted')})},
    unban:function(id){sb.from('banned_users').delete().eq('id',id).then(function(){NK.toast('החסימה הוסרה');NK.admTab('banned')})},
    
    out:function(){
      if(user){sb.from('chat_users').update({is_online:false}).eq('id',user.id)}
      if(channel){channel.unsubscribe()}
      localStorage.removeItem('nitkuk_user');
      user=null;msgs=[];NK.go('sLand');NK.lSt();
    }
  };

  window.addEventListener('beforeunload',function(){
    if(user&&navigator.sendBeacon){
      navigator.sendBeacon(SUPABASE_URL+'/rest/v1/chat_users?id=eq.'+user.id+'&apikey='+SUPABASE_KEY,JSON.stringify({is_online:false}));
    }
  });

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',function(){NK.init()})}
  else{NK.init()}
})();
</script>
```

---

## קובץ 2: app/api/send-otp/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 })
    }

    const supabase = await createClient()
    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await supabase.from('otp_codes').delete().eq('email', email.toLowerCase())

    const { error: insertError } = await supabase.from('otp_codes').insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error('Error inserting OTP:', insertError)
      return NextResponse.json({ error: 'שגיאה בשליחת קוד' }, { status: 500 })
    }

    const emailHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0891b2;">חיבור וניתוק בקליק</h1>
        <h2>קוד האימות שלך: <strong>${code}</strong></h2>
        <p>הקוד תקף ל-10 דקות בלבד</p>
      </div>
    `

    // Resend
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev',
          to: email,
          subject: `${code} - קוד אימות`,
          html: emailHtml,
        }),
      })

      if (response.ok) {
        return NextResponse.json({ success: true, message: 'קוד נשלח למייל' })
      }
    }

    // Dev mode - show code
    return NextResponse.json({ 
      success: true, 
      message: 'קוד אימות',
      devCode: code,
      devMode: true
    })

  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
```

---

## קובץ 3: app/api/verify-otp/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'קוד שגוי או פג תוקף' }, { status: 400 })
    }

    await supabase.from('otp_codes').update({ verified: true }).eq('id', otpRecord.id)
    await supabase.from('otp_codes').delete().eq('email', email.toLowerCase()).neq('id', otpRecord.id)

    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
```

---

## מה צריך לעשות

### 1. להגדיר RESEND_API_KEY
- להירשם ב-https://resend.com (חינם עד 100 מיילים ביום)
- להוסיף את ה-API key בהגדרות Vercel

### 2. לעדכן API_BASE
בקובץ ה-HTML, לשנות את שורה 8:
```javascript
var API_BASE='https://YOUR-VERCEL-APP.vercel.app/api';
```

### 3. להדביק ב-Elementor
להעתיק את כל הקוד מקובץ 1 ולהדביק ב-Elementor HTML Widget

---

## פיצ'רים קיימים

- כניסת אורחים (בלי רישום)
- כניסת מנויים (עם אימות OTP)
- מנהל נכנס ישירות ללא אימות
- הודעות בזמן אמת
- בחירת צבע אווטאר
- חיפוש הודעות
- אמוג'ים
- פרופיל משתמש
- פאנל ניהול (מנהל בלבד):
  - שליחת אזהרות
  - השתקה לשעה
  - חסימה
  - הסרת השתקה/חסימה
- שמירת סשן ב-localStorage
- עיצוב כהה רספונסיבי

---

## בעיות ידועות

1. **שליחת מיילים** - צריך להגדיר RESEND_API_KEY כדי שמיילים יישלחו באמת
2. **API_BASE** - צריך לעדכן לכתובת הנכונה של האפליקציה ב-Vercel

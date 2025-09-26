/* User App - Fiber Bay
 - Separate Firebase config placeholder for User
 - Role-based registration and UI sections
*/

(function(){
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

  // Firebase availability
  const useFB = !!(window.fb && window.fb.db);
  const db = window.fb?.db;
  const fs = window.fb?.fs;

  // get role from URL
  const params = new URLSearchParams(location.search);
  const role = params.get('role') || 'customer';

  const roleInfo = {
    technician: { title: 'تسجيل الفني', badge: 'للفني', badgeClass:'primary', showAddress:false, isSeller:true },
    customer:   { title: 'تسجيل الزبون', badge: 'للزبون', badgeClass:'secondary', showAddress:true, isSeller:false },
    commercial: { title: 'تسجيل الكوميرسيال', badge: 'للكوميرسيال', badgeClass:'accent', showAddress:false, isSeller:true },
  }[role];

  $('#roleTitle').textContent = roleInfo.title;
  const badge = $('#roleBadge');
  badge.textContent = roleInfo.badge;
  badge.classList.add(roleInfo.badgeClass);
  $('#addressRow').style.display = roleInfo.showAddress ? 'block' : 'none';

  // Simulate approval flow using localStorage until Firebase is connected
  const LS_KEY = 'fiberbay_user';
  const state = JSON.parse(localStorage.getItem(LS_KEY) || 'null');

  function saveState(v){ localStorage.setItem(LS_KEY, JSON.stringify(v)); }

  function showApp(){
    $('#section-register').hidden = true;
    $('#section-app').hidden = false;
    $('#appTitle').textContent = 'مرحباً بك';

    if (roleInfo.isSeller) {
      $('#sellerUI').hidden = false;
      $('#customerUI').hidden = true;
      renderMyProducts();
    } else {
      $('#sellerUI').hidden = true;
      $('#customerUI').hidden = false;
      renderMarket();
    }
  }

  function showPending(){
    $('#submitMsg').style.display = 'block';
  }

  // Existing state routing
  if (state && state.role === role) {
    if (useFB && state.id) {
      // Subscribe to user doc approval changes
      const ref = fs.doc(db, 'users', state.id);
      fs.onSnapshot(ref, snap => {
        if (!snap.exists()) {
          // reset if deleted by admin
          saveState(null);
          $('#section-register').hidden = false;
          $('#section-app').hidden = true;
          $('#submitMsg').style.display = 'none';
          return;
        }
        const data = snap.data();
        const approved = !!data.approved;
        const merged = { ...state, approved };
        saveState(merged);
        if (approved) showApp();
        else showPending();
      });
    } else {
      if (state.approved) showApp();
      else showPending();
    }
  }

  // Handle registration submit
  $('#registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    // Trim inputs
    payload.firstName = (payload.firstName || '').trim();
    payload.lastName = (payload.lastName || '').trim();
    payload.email = (payload.email || '').trim();
    payload.phone = (payload.phone || '').trim();
    payload.address = (payload.address || '').trim();
    payload.role = role;
    payload.approved = false;

    // Validation rules
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const phoneRe = /^[+\d][\d\s\-()]{6,}$/; // basic phone validation
    const errs = [];
    if (!payload.firstName || payload.firstName.length < 2) errs.push('الاسم الشخصي مطلوب (على الأقل حرفان)');
    if (!payload.lastName || payload.lastName.length < 2) errs.push('الاسم العائلي مطلوب (على الأقل حرفان)');
    if (!payload.email || !emailRe.test(payload.email)) errs.push('الرجاء إدخال بريد إلكتروني صالح');
    if (!payload.phone || !phoneRe.test(payload.phone)) errs.push('الرجاء إدخال رقم هاتف صالح');
    if (role === 'customer') {
      if (!payload.address || payload.address.length < 3) errs.push('عنوان السكن مطلوب للزبون');
    }

    if (errs.length) {
      alert('تحقق من الحقول التالية قبل الإرسال:\n\n- ' + errs.join('\n- '));
      return; // do not send to admin/Firestore
    }

    if (useFB) {
      const col = fs.collection(db, 'users');
      const body = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        address: payload.address || '',
        role: payload.role,
        approved: false,
        createdAt: fs.serverTimestamp(),
      };
      fs.addDoc(col, body)
        .then(ref => {
          const stateNew = { ...payload, id: ref.id };
          saveState(stateNew);
          $('#submitMsg').style.display = 'block';
          alert('تم الإرسال للمراجعة. سيتم إشعارك عند الموافقة.');
          // subscribe to approval
          const docRef = fs.doc(db, 'users', ref.id);
          fs.onSnapshot(docRef, snap => {
            if (!snap.exists()) return; // wait until exists
            const data = snap.data();
            if (data.approved) {
              const st = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
              if (st && st.id === ref.id) {
                st.approved = true;
                saveState(st);
              }
              showApp();
            }
          });
        })
        .catch(err => {
          console.error(err);
          alert('حدث خطأ أثناء الإرسال: ' + err.message);
        });
    } else {
      // Local fallback
      payload.id = (role[0] || 'u') + '-' + Math.random().toString(36).slice(2,8);
      saveState(payload);
      $('#submitMsg').style.display = 'block';
      alert('تم الإرسال للمراجعة. (نموذج تجريبي — اربط Firebase لاعتماد حقيقي)');
    }
  });

  // CUSTOMER: render market (mock)
  const market = [
    { id:'p1', title:'كونكتور LC', price: '50 MAD', seller:'TechPro' },
    { id:'p2', title:'كيبل فيبر 10م', price: '120 MAD', seller:'FiberShop' },
    { id:'s1', title:'تركيب منزلي', price: '300 MAD', seller:'Ahmed Tech' },
  ];
  function renderMarket() {
    const list = $('#marketList');
    list.innerHTML = '';
    market.forEach(item => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `<div><strong>${item.title}</strong><div class="muted">${item.seller}</div></div><div>${item.price}</div>`;
      list.appendChild(div);
    });
  }

  // SELLER: products (mock local)
  const MY_KEY = 'fiberbay_my_products';
  function getMyProducts(){ return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); }
  function setMyProducts(v){ localStorage.setItem(MY_KEY, JSON.stringify(v)); }
  function renderMyProducts(){
    const list = $('#myProducts');
    list.innerHTML = '';
    const items = getMyProducts();
    if (!items.length) {
      const hint = document.createElement('div');
      hint.className = 'muted';
      hint.textContent = 'لا توجد منتجات. اضغط على الزر العائم لإضافة منتج.';
      list.appendChild(hint);
    } else {
      items.forEach(it => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<div><strong>${it.title}</strong><div class=\"muted\">${it.price}</div></div><button class=\"button ghost\" data-id=\"${it.id}\">حذف</button>`;
        div.querySelector('button').addEventListener('click', () => {
          const rest = getMyProducts().filter(x => x.id !== it.id);
          setMyProducts(rest);
          renderMyProducts();
        });
        list.appendChild(div);
      });
    }
  }

  $('#addProductFab').addEventListener('click', () => {
    const title = prompt('اسم المنتج/الخدمة:');
    if (!title) return;
    const price = prompt('السعر:');
    const item = { id: 'p-' + Math.random().toString(36).slice(2,8), title, price: price || '—' };
    const items = getMyProducts();
    items.push(item);
    setMyProducts(items);
    renderMyProducts();
  });

  // HELP center & messages visibility (customer only)
  $('#helpBtn')?.addEventListener('click', () => {
    $('#helpSection').hidden = false;
    $('#messagesSection').hidden = true;
  });
  $('#inboxBtn')?.addEventListener('click', () => {
    $('#helpSection').hidden = true;
    $('#messagesSection').hidden = false;
  });
  $('#inboxBtn2')?.addEventListener('click', () => {
    $('#messagesSection').hidden = false;
  });

  $('#contactAdmin').addEventListener('click', () => {
    $('#messagesSection').hidden = false;
    alert('اكتب رسالتك في الأسفل ثم اضغط إرسال. (نموذج تجريبي)');
  });

  // Messaging (mock to localStorage)
  const INBOX_KEY = 'fiberbay_inbox';
  function getInbox(){ return JSON.parse(localStorage.getItem(INBOX_KEY) || '[]'); }
  function setInbox(v){ localStorage.setItem(INBOX_KEY, JSON.stringify(v)); }
  function renderInbox(){
    const box = $('#inbox');
    if (!box) return;
    box.innerHTML = '';
    if (useFB) {
      const st = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!st || !st.id) return;
      // subscribe (or fetch) messages for this user
      // We set up a live subscription once at startup; here we only render from cache
      fbInbox.items.slice().sort((a,b)=>{
        const ta = a.at?.seconds ? a.at.seconds : new Date(a.at).getTime()/1000;
        const tb = b.at?.seconds ? b.at.seconds : new Date(b.at).getTime()/1000;
        return tb - ta;
      }).forEach(m => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const meta = m.at?.toDate ? m.at.toDate().toLocaleString() : (m.at || '');
        div.innerHTML = `<div><strong>${m.from === st.id ? 'إلى' : 'من'}:</strong> ${m.from === st.id ? (m.to || '') : (m.from || '')}</div><div class="muted">${m.text}</div><div class="muted">${meta}</div>`;
        box.appendChild(div);
      });
    } else {
      getInbox().slice().reverse().forEach(m => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<div><strong>من:</strong> ${m.from}</div><div class="muted">${m.text}</div><div class="muted">${m.at}</div>`;
        box.appendChild(div);
      });
    }
  }
  const fbInbox = { unsubIn:null, unsubOut:null, items: [] };

  function teardownMsgSubs(){
    try { fbInbox.unsubIn && fbInbox.unsubIn(); } catch(_){}
    try { fbInbox.unsubOut && fbInbox.unsubOut(); } catch(_){}
    fbInbox.unsubIn = fbInbox.unsubOut = null;
    fbInbox.items = [];
  }

  function subscribeUserMessages(uid){
    if (!useFB || !uid) return;
    teardownMsgSubs();
    const qIn = fs.query(fs.collection(db,'messages'), fs.where('to','==', uid));
    const qOut = fs.query(fs.collection(db,'messages'), fs.where('from','==', uid));
    fbInbox.unsubIn = fs.onSnapshot(qIn, snap => {
      const arr = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      fbInbox.items = mergeMsgs(fbInbox.items, arr, m => m.id);
      renderInbox();
    });
    fbInbox.unsubOut = fs.onSnapshot(qOut, snap => {
      const arr = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      fbInbox.items = mergeMsgs(fbInbox.items, arr, m => m.id);
      renderInbox();
    });
  }

  function mergeMsgs(existing, incoming, key){
    const map = new Map(existing.map(x => [key(x), x]));
    incoming.forEach(x => map.set(key(x), x));
    return Array.from(map.values());
  }

  // subscribe if we already have a registered doc id
  if (useFB && state && state.id) {
    subscribeUserMessages(state.id);
  }
  renderInbox();

  $('#sendMsg').addEventListener('click', async () => {
    const to = $('#msgTo').value.trim() || 'admin';
    const text = $('#msgBody').value.trim();
    if (!text) return alert('أدخل نص الرسالة');
    $('#msgBody').value='';
    if (useFB) {
      const st = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!st || !st.id) return alert('سجّل أولاً قبل إرسال الرسائل');
      try {
        await fs.addDoc(fs.collection(db,'messages'), { from: st.id, to, text, at: fs.serverTimestamp() });
      } catch (err) {
        alert('تعذر إرسال الرسالة: ' + err.message);
      }
    } else {
      const item = { from: 'me', to, text, at: new Date().toLocaleString() };
      const box = getInbox();
      box.push(item);
      setInbox(box);
      renderInbox();
      alert('تم إرسال الرسالة (نموذج تجريبي). عند ربط Firebase ستظهر المحادثات الحقيقية.');
    }
  });

})();


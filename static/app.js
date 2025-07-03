document.addEventListener('DOMContentLoaded', () => {
  const MODEL_INFO = {
    'openchat': {
      label: 'OpenChat – chytrý AI asistent 🌐',
      web: true,
      desc: 'Chytrý AI asistent. Vhodný pro běžné otázky, dialog a porozumění pokynům.'
    },
    'nous-hermes2': {
      label: 'Nous Hermes 2 – jemně doladěný Mistral 🌐',
      web: true,
      desc: 'Dobře zvládá otázky, formální texty i instrukce, vhodný i pro složitější dotazy s doplněním z internetu.'
    },
    'llama3:8b': {
      label: 'LLaMA 3 8B – velký jazykový model 🌐',
      web: true,
      desc: 'Vysoká přesnost, vhodný pro složitější dotazy, rozumí webovému obsahu i dokumentům.'
    },
    'command-r': {
      label: 'Command R – model pro RAG 🌐',
      web: true,
      desc: 'Optimalizovaný pro programování, Python, shell, kódové úkoly.'
    },
    'api': {
      label: 'Externí API',
      web: false,
      desc: 'Externí API – dotazy jsou posílány do API.'
    }
  };

  function authHeader() {
    const token = localStorage.getItem('token') || '';
    const key = localStorage.getItem('apikey') || '';
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (key) headers['X-API-Key'] = key;
    return headers;
  }

  async function doLogin() {
    const nick = document.getElementById('nick').value;
    const password = document.getElementById('password').value;
    const apiKey = document.getElementById('apikey').value;
    document.getElementById('login-status').textContent = '⏳ Logging in…';
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        if (apiKey) localStorage.setItem('apikey', apiKey);
        else localStorage.removeItem('apikey');
        document.getElementById('token-display').textContent = data.token;
        document.getElementById('login').style.display = 'none';
        document.getElementById('interface').style.display = 'block';
        loadModel();
        loadTopics();
      } else {
        document.getElementById('login-status').textContent = '❌ ' + (data.error || res.status);
      }
    } catch (err) {
      document.getElementById('login-status').textContent = '❌ ' + err;
    }
  }

  function copyToken() {
    const token = localStorage.getItem('token') || '';
    if (token) navigator.clipboard.writeText(token);
  }

  async function loadModel() {
    setProgress(true);
    try {
      const res = await fetch('/model', { headers: authHeader() });
      const data = await res.json();
      const model = data.model || '';
      document.getElementById('current-model').textContent = model;
      const select = document.getElementById('model-select');
      if (select) select.value = model;
      const info = MODEL_INFO[model];
      document.getElementById('model-desc').textContent = info ? info.desc : '';
    } catch (err) {
      console.error(err);
    } finally {
      setProgress(false);
    }
  }

  async function switchModel() {
    const select = document.getElementById('model-select');
    const model = select.value;
    document.getElementById('model-status').textContent = '⏳ Switching…';
    setProgress(true);
    try {
      const res = await fetch('/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ model })
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('model-status').textContent = '🔄 Restarting…';
        document.getElementById('current-model').textContent = model;
        const info = MODEL_INFO[model];
        document.getElementById('model-desc').textContent = info ? info.desc : '';
      } else {
        document.getElementById('model-status').textContent = '❌ ' + (data.error || res.status);
      }
    } catch (err) {
      document.getElementById('model-status').textContent = '❌ ' + err;
    } finally {
      setProgress(false);
    }
  }

  function setProgress(on) {
    const el = document.getElementById('progress');
    if (el) el.style.display = on ? 'block' : 'none';
  }

  async function loadTopics() {
    setProgress(true);
    try {
      const res = await fetch('/knowledge/topics', { headers: authHeader() });
      const data = await res.json();
      const topics = Array.isArray(data) ? data : Object.keys(data);
      const container = document.getElementById('topic-checkboxes');
      if (container) {
        container.innerHTML = '';
        topics.forEach(t => {
          const label = document.createElement('label');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = t;
          label.appendChild(cb);
          label.appendChild(document.createTextNode(' ' + t));
          container.appendChild(label);
          container.appendChild(document.createElement('br'));
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProgress(false);
    }
  }

  async function ask() {
    const msg = document.getElementById('message').value;
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];
    const isPrivate = document.getElementById('memory-private').checked;
    const save = document.getElementById('save-txt').checked;
    const topics = Array.from(
      document.querySelectorAll('#topic-checkboxes input:checked')
    ).map(cb => cb.value);

    setProgress(true);
    document.getElementById('activity').textContent = '⏳ Čekejte…';

    try {
      let data;
      if (file) {
        const form = new FormData();
        form.append('message', msg);
        form.append('file', file);
        form.append('private', isPrivate ? '1' : '0');
        if (topics.length) form.append('topics', topics.join(','));
        if (save) form.append('save', '1');
        const res = await fetch('/ask_file', {
          method: 'POST',
          headers: authHeader(),
          body: form
        });
        data = await res.json();
      } else {
        const payload = { message: msg, private: isPrivate };
        if (topics.length) payload.topics = topics;
        const res = await fetch('/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload)
        });
        data = await res.json();
      }

      if (data.response) {
        document.getElementById('response').textContent = data.response;
        document.getElementById('debug').textContent = (data.debug || []).join('\n');
        if (data.download_url) {
          const dl = document.getElementById('download');
          dl.href = data.download_url;
          dl.style.display = 'inline';
        } else {
          document.getElementById('download').style.display = 'none';
        }
        document.getElementById('feedback').style.display = 'block';
        document.getElementById('activity').textContent = '✅ Hotovo';
      } else if (data.error) {
        document.getElementById('activity').textContent = '❌ ' + data.error;
      }
    } catch (err) {
      document.getElementById('activity').textContent = '❌ ' + err;
    } finally {
      setProgress(false);
    }
  }

  async function sendFeedback(type) {
    const question = document.getElementById('message').value;
    const answer = document.getElementById('response').textContent;
    const correction = document.getElementById('correction-text').value;
    const payload = { agree: type === 'good', question, answer };
    if (type === 'bad') payload.correction = correction;
    document.getElementById('feedback-status').textContent = '⏳ Odesílám…';
    setProgress(true);
    try {
      const res = await fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        document.getElementById('feedback-status').textContent = '✅ Díky za hodnocení';
      } else {
        const data = await res.json();
        document.getElementById('feedback-status').textContent = '❌ ' + (data.error || res.status);
      }
    } catch (err) {
      document.getElementById('feedback-status').textContent = '❌ ' + err;
    } finally {
      setProgress(false);
    }
  }

  window.loadModel = loadModel;
  window.switchModel = switchModel;
  window.ask = ask;
  window.sendFeedback = sendFeedback;
  window.submitCorrection = () => sendFeedback('bad');
  window.showCorrection = () => {
    document.getElementById('correction').style.display = 'block';
  };
  window.doLogin = doLogin;
  window.copyToken = copyToken;
  window.authHeader = authHeader;

  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const model = modelSelect.value;
      const info = MODEL_INFO[model];
      document.getElementById('model-desc').textContent = info ? info.desc : '';
    });
  }

  const storedToken = localStorage.getItem('token');
  const loginDiv = document.getElementById('login');
  const interfaceDiv = document.getElementById('interface');
  if (storedToken) {
    if (loginDiv) loginDiv.style.display = 'none';
    if (interfaceDiv) interfaceDiv.style.display = 'block';
    document.getElementById('token-display').textContent = storedToken;
    loadModel();
    loadTopics();
  } else {
    if (loginDiv) loginDiv.style.display = 'block';
    if (interfaceDiv) interfaceDiv.style.display = 'none';
  }
});

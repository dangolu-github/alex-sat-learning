(() => {
  'use strict';
  const data=window.ALEX_WORDS || {themes:[],words:[]};
  const state={known:new Set(),query:'',unchecked:false,open:new Set(),busy:new Set(),ready:false};
  let printSnapshot=null;
  const list=document.getElementById('word-groups'),status=document.getElementById('words-status');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const countWords=n=>n+' '+(n===1?'word':'words');
  const matches=w=>(!state.unchecked||!state.known.has(w.id))&&(!state.query||[w.word,w.definition,w.example,w.pos].join(' ').toLowerCase().includes(state.query));
  function wordsFor(theme){return data.words.filter(w=>(!theme||w.theme===theme)&&matches(w));}
  const wordConnections=w=>{const show=v=>Array.isArray(v)?v.join(', '):String(v||'');const entries=[['Synonyms',w.synonyms],['Contrast',w.contrast],['Word family',w.family]].filter(x=>show(x[1]));return entries.length?'<details class="word-detail"><summary>Word connections</summary><dl>'+entries.map(x=>'<dt>'+esc(x[0])+'</dt><dd>'+esc(show(x[1]))+'</dd>').join('')+'</dl></details>':'';};
  function render(){
    document.getElementById('words-count').textContent=countWords(data.words.length)+' · '+state.known.size+' marked Known';
    list.innerHTML=data.themes.map(t=>{const all=data.words.filter(w=>w.theme===t.id),words=all.filter(matches);if(!words.length)return '';return '<details class="word-group" data-theme="'+esc(t.id)+'"'+(state.open.has(t.id)||state.query?' open':'')+'><summary><span>'+esc(t.title)+'</span><small>'+countWords(words.length)+'</small></summary><div class="group-actions"><button type="button" data-copy="'+esc(t.id)+'">Copy unchecked</button><button type="button" data-download="'+esc(t.id)+'">Download .txt</button></div><ul>'+words.map(w=>'<li class="word-row'+(state.known.has(w.id)?' is-known':'')+'"><div class="word-body"><h3>'+esc(w.word)+' <small>'+esc(w.pos)+'</small></h3><p>'+esc(w.definition)+'</p><p class="example">'+esc(w.example)+'</p>'+wordConnections(w)+'</div><label class="known"><input type="checkbox" data-known="'+esc(w.id)+'"'+(state.known.has(w.id)?' checked':'')+(!state.ready||state.busy.has(w.id)?' disabled':'')+'> Known</label></li>').join('')+'</ul></details>';}).join('')||'<p class="empty">'+(data.words.length?'No words match this view.':'No words yet.')+'</p>';
  }
  function exportWords(theme){return [...new Set(wordsFor(theme).filter(w=>!state.known.has(w.id)&&! /\s/.test(w.word.trim())).map(w=>w.word.trim()))].join('\n');}
  function say(text){status.textContent=text;}
  async function copy(theme){const text=exportWords(theme);if(!text){say('No unchecked words in this view.');return;}try{await navigator.clipboard.writeText(text);say('Copied '+countWords(text.split('\n').length)+'.');}catch{const box=document.getElementById('copy-fallback');box.value=text;box.hidden=false;box.focus();box.select();say('Select and copy the words below.');}}
  function download(theme){const text=exportWords(theme);if(!text){say('No unchecked words in this view.');return;}const url=URL.createObjectURL(new Blob([text+'\n'],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Alex-SAT-unchecked-words.txt';a.click();URL.revokeObjectURL(url);say('Downloaded '+countWords(text.split('\n').length)+'.');}
  async function toggle(id,known){if(!state.ready||state.busy.has(id))return;const previous=state.known.has(id);known?state.known.add(id):state.known.delete(id);state.busy.add(id);render();say('Saving…');try{const access=window.AlexPortalAccess;await access.ensureFreshAccess();const endpoint=(window.ALEX_PORTAL_CONFIG||{}).submissionEndpoint;if(!endpoint)throw Error('Unavailable');const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveVocabularyState',accessToken:access.getToken(),wordId:id,known,eventId:crypto.randomUUID()})});const result=await response.json();if(!response.ok||!result.ok||result.wordId!==id||result.known!==known)throw Error('Not saved');say('Saved');}catch{previous?state.known.add(id):state.known.delete(id);say('We could not confirm that choice. Please try again.');}finally{state.busy.delete(id);render();}}
  document.getElementById('word-search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();render();});
  document.getElementById('only-unchecked').addEventListener('change',e=>{state.unchecked=e.target.checked;render();});
  list.addEventListener('toggle',e=>{if(printSnapshot)return;const key=e.target.dataset.theme;if(!key)return;e.target.open?state.open.add(key):state.open.delete(key);},true);
  list.addEventListener('change',e=>{if(e.target.dataset.known)toggle(e.target.dataset.known,e.target.checked);});
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-copy'))copy(b.dataset.copy);if(b.hasAttribute('data-download'))download(b.dataset.download);if(b.id==='print-words')window.print();});
  window.addEventListener('beforeprint',()=>{
    if(printSnapshot)return;
    printSnapshot=[...document.querySelectorAll('.word-group, .word-detail')].map(node=>({node,open:node.open}));
    printSnapshot.forEach(({node})=>node.open=true);
  });
  window.addEventListener('afterprint',()=>{
    if(!printSnapshot)return;
    printSnapshot.forEach(({node,open})=>node.open=open);
    printSnapshot=null;
  });
  render();
  (async()=>{try{await window.AlexPortalAccess.ready;const r=await window.AlexPortalAccess.request('getVocabularyState',{});if(!r.ok||!Array.isArray(r.known))throw Error('Unavailable');const ids=new Set(data.words.map(w=>w.id));state.known=new Set(r.known.filter(id=>ids.has(id)));state.ready=true;say('');render();}catch{say('Your Known choices could not be opened. You can still read and search the words.');}})();
})();

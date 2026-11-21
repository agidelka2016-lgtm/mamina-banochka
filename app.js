import {initial,draw,normalize,validate,merge,exportData,giftLink,readGiftLink} from './core.js';
const $=s=>document.querySelector(s),dialog=$('#dialog'),content=$('#content'),key='mamina-banochka-v1:'+new URL('./',location.href).pathname;
let state,loadFailed=false,storageOK=true,pending=null,mode='backup',timer,busy=false;
function notify(text){$('#status').textContent=text;clearTimeout(timer);timer=setTimeout(()=>$('#status').textContent='',5500);}
function render(){ $('#count').textContent=`Внутри ${state.notes.length} тёплых записок`; }
function persist(next){if(loadFailed&&!confirm('Сохранённые данные не удалось прочитать. Заменить их текущей баночкой?'))return false;try{localStorage.setItem(key,JSON.stringify(exportData(next)));state=next;loadFailed=false;storageOK=true;render();return true;}catch{storageOK=false;notify('Не удалось сохранить. Освободите место или разрешите хранение данных в браузере.');return false;}}
try{const raw=localStorage.getItem(key);if(raw){const data=validate(JSON.parse(raw));state={notes:data.notes,seen:data.seen,last:data.last};}else{state=initial();persist(state);}}catch{state=initial();loadFailed=true;storageOK=false;notify('Хранилище недоступно или повреждено. Сохраните копию перед изменениями.');}
render();
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function button(text,fn,cls='primary'){const b=node('button',text,cls);b.type='button';b.onclick=fn;return b;}
function show(title){content.replaceChildren();content.append(node('h2',title));if(!dialog.open)dialog.showModal();}
function close(){dialog.close();$('#jar').classList.remove('open');busy=false;$('#draw').disabled=false;}
$('.close').onclick=close;dialog.addEventListener('cancel',()=>{$('#jar').classList.remove('open');busy=false;$('#draw').disabled=false;});
function field(label,tag='input',value='',max=4000){const id=crypto.randomUUID();const l=node('label',label);l.htmlFor=id;const input=node(tag);input.id=id;if(tag==='input')input.type='text';input.value=value;input.maxLength=max;content.append(l,input);return input;}
function copyState(){return structuredClone(state);}
function edit(note){show(note?'Ваша записочка':'Положить благодарность');const text=field('Тёплые слова для мамы','textarea',note?.text||'');text.placeholder='Мам, спасибо тебе за…';content.append(node('p','До 4000 символов. Напишите то, что хочется сказать маме.','hint'));const save=button(note?'Сохранить':'Положить в баночку',()=>{const value=text.value.trim();if(!value){text.focus();return;}const next=copyState();if(next.notes.some(n=>n.id!==note?.id&&normalize(n.text)===normalize(value))){notify('Такая записочка уже есть в баночке.');return;}if(note)next.notes.find(n=>n.id===note.id).text=value;else next.notes.push({id:crypto.randomUUID(),text:value,kind:'personal'});if(persist(next)){close();notify('Благодарность бережно сохранена');}});content.append(save);text.focus();}
async function openNote(){if(busy)return;busy=true;$('#draw').disabled=true;const next=copyState();let note;try{note=draw(next);}catch(e){notify(e.message);busy=false;$('#draw').disabled=false;return;}if(!persist(next)){busy=false;$('#draw').disabled=false;return;}$('#jar').classList.add('open');await new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:850));show('Немного тепла для вас');content.className='note';const heart=node('div',undefined,'heart-note');heart.append(node('p',note.text));content.append(heart,button('Бережно закрыть',close));}
dialog.addEventListener('close',()=>content.className='');
function collection(){show('Мои записочки');content.append(node('p','Все слова вашей баночки. Готовые фразы можно читать, личные и подаренные — изменять.','hint'));for(const n of state.notes){const row=node('div',undefined,'row');row.append(node('p',n.text));if(n.kind!=='standard'){row.append(button('Изменить',()=>edit(n),'text-button'),button('Удалить',()=>{if(confirm('Удалить эту благодарность?')){const next=copyState();next.notes=next.notes.filter(x=>x.id!==n.id);next.seen=next.seen.filter(id=>id!==n.id);if(persist(next))collection();}},'text-button danger'));}content.append(row);}}
function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const filename=type=>`mamina-banochka-${type}-${new Date().toISOString().slice(0,10)}.json`;
function gift(){show('Подарить баночку');content.append(node('p','Выберите слова, которые хотите подарить. Мама получит ссылку и сразу увидит ваш подарок.','hint'));const sender=field('От кого (необязательно)','input','',100),message=field('Подпись к подарку','textarea','Мамочке с любовью',500);const selected=new Set(state.notes.filter(n=>n.kind!=='standard').map(n=>n.id));const list=node('div');for(const n of state.notes){const label=node('label',undefined,'check');const check=node('input');check.type='checkbox';check.checked=selected.has(n.id);check.onchange=()=>check.checked?selected.add(n.id):selected.delete(n.id);label.append(check,node('span',n.text));list.append(label);}content.append(list,button('Подготовить подарок',()=>{if(!selected.size){notify('Выберите хотя бы одну благодарность.');return;}const data=exportData({notes:state.notes.filter(n=>selected.has(n.id))},'gift',{sender:sender.value.trim(),message:message.value.trim()});giftReady(data);}));}
function giftReady(data){
 let url;try{url=giftLink(data,location.href);}catch(e){notify(e.message);return;}
 show('Ваша баночка готова к подарку');
 content.append(node('p',`Внутри — ${data.notes.length} ваших записок. Скопируйте ссылку и вставьте её в сообщение маме. Она откроет подарок одним нажатием.`));
 const feedback=node('p','', 'hint');feedback.setAttribute('role','status');
 const area=node('textarea');area.readOnly=true;area.value=url;area.setAttribute('aria-label','Ссылка на подарок');area.style.minHeight='80px';
 const copy=button('Скопировать ссылку на подарок',async()=>{
  let ok=false;try{await navigator.clipboard.writeText(url);ok=true;}catch{}
  if(!ok){area.focus();area.select();area.setSelectionRange(0,area.value.length);try{ok=document.execCommand('copy');}catch{}}
  feedback.textContent=ok?'Ссылка скопирована! Теперь откройте переписку с мамой, вставьте ссылку и отправьте.':'Ссылка выделена ниже. Нажмите и удерживайте текст, затем выберите «Копировать». На компьютере — Ctrl+C.';
 });
 content.append(copy,feedback);
 if(navigator.share)content.append(button('Отправить через…',async()=>{try{await navigator.share({title:'Мамина баночка',text:'Мам, эта баночка — для тебя. С любовью!',url});}catch(e){if(e.name!=='AbortError')feedback.textContent='Не удалось открыть отправку. Нажмите «Скопировать ссылку на подарок».';}},'text-button'));
 content.append(node('p','Ссылку сможет открыть любой, кому её перешлют. Отправляйте её лично маме.','hint'),area);
}
function pick(type){mode=type;$('#file').value='';$('#file').click();}
$('#file').onchange=async()=>{const file=$('#file').files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('Файл слишком большой (максимум 5 МБ).');pending=validate(JSON.parse(await file.text()));if(mode==='gift'&&pending.type!=='gift')throw Error('Это резервная копия. Откройте её через «Восстановить».');previewImport();}catch(e){pending=null;notify(e instanceof SyntaxError?'Не удалось прочитать файл баночки.':e.message);}};
function previewImport(){const data=pending;show(data.type==='gift'?'Вам подарили тепло':'Восстановить баночку');if(data.sender)content.append(node('p',`От: ${data.sender}`));if(data.message)content.append(node('p',data.message));content.append(node('p',`Внутри ${data.notes.length} записок. Повторяющиеся записки не будут добавлены второй раз.`));const details=node('details'),summary=node('summary','Посмотреть записки');details.open=data.type==='gift';details.append(summary);for(const n of data.notes)details.append(node('p',n.text));content.append(details,button(data.type==='gift'?'Положить в мою баночку':'Добавить к моим запискам',()=>{const next=copyState(),count=merge(next,data);if(persist(next)){pending=null;close();notify(count?`Добавлено записок: ${count}`:'Все эти записочки уже есть в баночке');}}));if(data.type==='backup')content.append(button('Заменить содержимое копией',()=>{if(!confirm('Все текущие записки будут заменены содержимым копии. Продолжить?'))return;if(persist({notes:data.notes,seen:data.seen,last:data.last})){pending=null;close();notify('Баночка восстановлена');}},'text-button danger'));}
$('#draw').onclick=openNote;$('#jar').onclick=openNote;$('#add').onclick=()=>edit();$('#collection').onclick=collection;$('#backup').onclick=()=>{download(exportData(state),filename('kopiya'));notify('Копия подготовлена для сохранения');};$('#restore').onclick=()=>pick('backup');$('#receive').onclick=()=>pick('gift');$('#gift').onclick=gift;
$('#help').onclick=()=>{show('Баночка всегда рядом');content.append(node('p','На iPhone откройте ссылку в Safari, нажмите «Поделиться», затем «На экран Домой». На Android откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».'));content.append(node('p','Если вы открыли баночку внутри соцсети, сначала выберите «Открыть в браузере». Пользуйтесь одним браузером: в другом ваши записки не появятся автоматически.'));content.append(node('p','После подготовки для работы без интернета баночка открывается без сети. Очистка данных сайта может удалить записки — сохраняйте копию. Старые записи из Android-приложения сюда автоматически не переносятся.','hint'));};
window.addEventListener('storage',e=>{if(e.key===key){try{const data=validate(JSON.parse(e.newValue));state={notes:data.notes,seen:data.seen,last:data.last};render();close();notify('Баночка обновлена в другой вкладке');}catch{notify('Данные изменились в другой вкладке. Перезагрузите страницу.');}}});
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('#offline').textContent='Баночка готова к работе без интернета';}).catch(()=>{$('#offline').textContent='Пока нужна сеть. Откройте баночку онлайн ещё раз.';});}
if(!storageOK)$('#offline').textContent='Личное хранение сейчас недоступно';
function receiveLink(){
 try{const data=readGiftLink(location.hash);if(!data)return;pending=data;previewImport();history.replaceState(null,'',location.pathname+location.search);}
 catch(e){show('Не получилось открыть подарок');content.append(node('p',e.message));}
}
window.addEventListener('hashchange',receiveLink);receiveLink();
$('#receive').onclick=()=>{show('Открыть подарок');content.append(node('p','Если вам прислали ссылку, просто нажмите на неё в сообщении — подарок откроется сам.'));content.append(button('Открыть старый подарок из файла',()=>pick('gift'),'text-button'));};
let reloadingForUpdate=false;
if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{
 if(reloadingForUpdate)return;reloadingForUpdate=true;
 // Never reload over an unsaved note or a gift currently being read.
 if(!dialog.open){location.reload();return;}
 $('#offline').textContent='Доступно обновление. Закончите работу и обновите страницу.';
});}





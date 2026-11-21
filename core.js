export const phrases = [
 'Мам, спасибо тебе за жизнь.',
 'Мам, я тебя люблю. Просто за то, что ты есть.',
 'Мам, твои объятия — самые тёплые на свете.',
 'Мам, спасибо за твою заботу — даже в самых маленьких мелочах.',
 'Мам, мне так нравится видеть твою улыбку.',
 'Мам, спасибо, что веришь в меня.',
 'Мам, рядом с тобой мне тепло и спокойно.',
 'Мам, спасибо за твою любовь, которую я чувствую даже на расстоянии.',
 'Мам, я очень дорожу нашими минутами вместе.',
 'Мам, как хорошо, что ты у меня есть.'
];
export function initial(){return {notes:phrases.map((text,i)=>({id:`standard-${i+1}`,text,kind:'standard'})),seen:[],last:null};}
export function normalize(text){return text.normalize('NFC').trim().replace(/\s+/g,' ');}
export function draw(state, random=Math.random){
 if(!state.notes.length) throw Error('В баночке пока нет записок.');
 let pool=state.notes.filter(n=>!state.seen.includes(n.id));
 if(!pool.length){state.seen=[];pool=state.notes.filter(n=>n.id!==state.last);if(!pool.length)pool=state.notes;}
 const note=pool[Math.floor(random()*pool.length)];state.seen.push(note.id);state.last=note.id;return note;
}
export function validate(input){
 if(!input||input.app!=='mamina-banochka'||input.version!==1||!['backup','gift'].includes(input.type)||!Array.isArray(input.notes)||input.notes.length>5000)throw Error('Это не файл «Маминой баночки» поддерживаемой версии.');
 const notes=input.notes.map(n=>{
  if(!n||typeof n.id!=='string'||!n.id.length||n.id.length>100||typeof n.text!=='string'||!n.text.trim()||n.text.length>4000)throw Error('В файле есть повреждённая записка.');
  return {id:n.id,text:n.text.trim(),kind:input.type==='gift'?'gift':(['standard','personal','gift'].includes(n.kind)?n.kind:'personal')};
 });
 if(new Set(notes.map(n=>n.id)).size!==notes.length)throw Error('В файле повторяются идентификаторы записок.');
 const clean=s=>typeof s==='string'?s.slice(0,500):'';
 return {app:'mamina-banochka',version:1,type:input.type,notes,sender:clean(input.sender),message:clean(input.message),seen:Array.isArray(input.seen)?input.seen.filter(id=>notes.some(n=>n.id===id)):[],last:notes.some(n=>n.id===input.last)?input.last:null};
}
export function merge(state,incoming){
 const ids=new Set(state.notes.map(n=>n.id)),texts=new Set(state.notes.map(n=>normalize(n.text)));let added=0;
 for(const note of incoming.notes){if(ids.has(note.id)||texts.has(normalize(note.text)))continue;state.notes.push({...note});ids.add(note.id);texts.add(normalize(note.text));added++;}return added;
}
export function exportData(state,type='backup',extra={}){return {app:'mamina-banochka',version:1,type,created:new Date().toISOString(),notes:state.notes,...(type==='backup'?{seen:state.seen,last:state.last}:{}),...extra};}
// The fragment is carried by the recipient's link, not sent in HTTP requests.
export function giftLink(data, base){
 const gift=validate(data);
 if(gift.type!=='gift'||!gift.notes.length)throw Error('Выберите хотя бы одну благодарность.');
 const compact={v:1,n:gift.notes.map(n=>[n.id,n.text]),s:gift.sender,m:gift.message};
 const bytes=new TextEncoder().encode(JSON.stringify(compact));
 const encoded=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const url=new URL('./',base);url.hash='gift='+encoded;
 if(url.href.length>8000)throw Error('Для одной ссылки слишком много текста. Выберите меньше записок и подарите остальные второй баночкой.');
 return url.href;
}
export function readGiftLink(hash){
 if(!hash.startsWith('#gift='))return null;
 const value=hash.slice(6);
 if(value.length>8000||!value||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Ссылка на подарок повреждена. Попросите отправить её целиком.');
 try{
  const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
  if(raw.v!==1||!Array.isArray(raw.n)||!raw.n.length)throw Error();
  return validate({app:'mamina-banochka',version:1,type:'gift',notes:raw.n.map(n=>({id:n[0],text:n[1]})),sender:raw.s,message:raw.m});
 }catch{throw Error('Ссылка на подарок повреждена. Попросите отправить её целиком.');}
}

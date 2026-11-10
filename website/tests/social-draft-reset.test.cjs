const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{readFileSync}=require('node:fs'),ts=require('typescript');
const code=ts.transpileModule(readFileSync('lib/social/studio-drafts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function harness(records,studio='post') {
 let slots=[],index=0,effects=[],pending=[],timers=new Map(),timerId=0,output;
 const react={
  useState(value){const i=index++;if(!(i in slots))slots[i]=value;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useRef(value){const i=index++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useEffect(run,deps){const i=index++;const previous=effects[i];if(!previous||deps.some((v,j)=>v!==previous.deps[j]))pending.push(()=>{previous?.cleanup?.();effects[i]={deps,cleanup:run()};});}
 };
 const indexedDB={open(){const request={};setImmediate(()=>{request.result={close(){},transaction(){const transaction={};transaction.objectStore=()=>({get(key){return task(()=>records.get(key));},put(value,key){return task(()=>{records.set(key,structuredClone(value));});},delete(key){return task(()=>records.delete(key));}});function task(action){const req={};setImmediate(()=>{req.result=action();req.onsuccess?.();transaction.oncomplete?.();});return req;}return transaction;}};request.onsuccess();});return request;}};
 const sandbox={exports:{},require(name){if(name==='react')return react;if(name.includes('supabase-browser'))return {getSocialSupabase:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})}})};throw Error(name);},indexedDB,window:{setTimeout(callback){timers.set(++timerId,callback);return timerId;},clearTimeout(id){timers.delete(id);}}};
 vm.runInNewContext(code,sandbox);
 return {
  render(draft,restore){index=0;output=sandbox.exports.useStudioDraft(studio,draft,restore);for(const effect of pending.splice(0))effect();return output;},
  timers(){for(const [id,callback]of [...timers]){timers.delete(id);callback();}},
  unmount(){for(const effect of effects)effect?.cleanup?.();},
 };
}
test('reset is persisted after queued autosaves and does not clear the other studio',async()=>{
 const old={topic:'old Kashmir',result:{caption:'old'},singleImage:'old-photo'},empty={topic:'',result:null,singleImage:''};
 const records=new Map([['owner:post',old],['owner:carousel',{topic:'saved carousel'}]]);
 const hook=harness(records);let current=empty;
 hook.render(current,value=>{current=value;});await flush();
 assert.equal(current.topic,'old Kashmir');
 const ready=hook.render(current,value=>{current=value;});assert(ready.loaded);
 hook.timers(); // The previous draft write is now queued.
 current=empty;await ready.replace(empty);hook.render(current,value=>{current=value;});
 hook.unmount();await flush();assert.deepEqual(records.get('owner:post'),empty);
 assert.equal(records.get('owner:carousel').topic,'saved carousel');
 const reopened=harness(records);let recovered;
 reopened.render(empty,value=>{recovered=value;});await flush();assert.deepEqual(recovered,empty);
 reopened.unmount();
});

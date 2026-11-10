const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync('app/api/social/image/route.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const env = { NEXT_PUBLIC_SOCIAL_SUPABASE_URL:'https://auth.example.test', NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY:'public-key', CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32), CLOUDFLARE_API_TOKEN:'private-test-token' };
function route(fetch, overrides={}) {
  const exports={};
  vm.runInNewContext(source,{exports, require:()=>({NextResponse:Response}),process:{env:{...env,...overrides}},fetch,Buffer,AbortSignal,Set});
  return exports;
}
const auth=()=>Response.json({id:'test-user'});
const request=(body={prompt:'A mountain landscape',format:'4:5'},signed=true)=>new Request('https://social.example.test/api/social/image',{method:'POST',headers:{'Content-Type':'application/json',...(signed?{Authorization:'Bearer user-session'}:{})},body:JSON.stringify(body)});
test('requires authentication before contacting providers',async()=>{
  let calls=0;const r=route(async()=>{calls++;return auth()});
  assert.equal((await r.POST(request(undefined,false))).status,401);assert.equal(calls,0);
});
test('rejects expired sessions without calling Cloudflare',async()=>{
  let calls=0;const r=route(async()=>{calls++;return Response.json({}, {status:401})});
  assert.equal((await r.POST(request())).status,401);assert.equal(calls,1);
});
test('rejects long prompts and invalid formats before generation',async()=>{
  let calls=0;const r=route(async()=>{calls++;return auth()});
  assert.equal((await r.POST(request({prompt:'a'.repeat(1601),format:'4:5'}))).status,413);
  assert.equal((await r.POST(request({prompt:'mountains',format:'7:3'}))).status,400);assert.equal(calls,2);
});
test('reports missing configuration without exposing credentials',async()=>{
  const r=route(async()=>auth(),{CLOUDFLARE_API_TOKEN:''});
  const response=await r.POST(request());assert.equal(response.status,503);
  const status=await r.GET(new Request('https://social.example.test',{headers:{Authorization:'Bearer user-session'}}));
  assert.equal((await status.json()).configured,false);
});
test('uses the fixed model and returns an image while keeping provider secrets server-side',async()=>{
  const calls=[];const image=Buffer.from([255,216,255,224,0,0]).toString('base64');
  const r=route(async(url,options)=>{calls.push({url,options});return calls.length===1?auth():Response.json({success:true,result:{image}})});
  const response=await r.POST(request());assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.image,'data:image/jpeg;base64,'+image);
  assert.match(calls[1].url, /@cf\/black-forest-labs\/flux-1-schnell$/);
  assert.equal(calls[1].options.headers.Authorization,'Bearer private-test-token');
  assert.ok(!JSON.stringify(result).includes('private-test-token'));assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('quota errors do not retry or expose raw provider details',async()=>{
  let calls=0;const r=route(async()=>++calls===1?auth():Response.json({error:'private account details'}, {status:429}));
  const response=await r.POST(request());assert.equal(response.status,429);assert.equal(calls,2);
  assert.ok(!(await response.text()).includes('private account details'));
});
test('rejects a successful provider response with no valid image',async()=>{
  let calls=0;const r=route(async()=>++calls===1?auth():Response.json({success:true,result:{image:'aGVsbG8='}}));
  assert.equal((await r.POST(request())).status,502);
});
test('clears in-flight guard after provider failure so the user can retry',async()=>{
  const r=route(async(url)=>url.includes('/auth/')?auth():Promise.reject(new Error('offline')));
  assert.equal((await r.POST(request())).status,504);
  assert.equal((await r.POST(request())).status,504);
});
const clientSource = ts.transpileModule(readFileSync('lib/social/image-generation.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
for (const [format,height] of [['1:1',1080],['4:5',1350],['9:16',1920]]) {
  test('crops generated artwork to '+format+' without browser provider credentials', async()=>{
    const exports={},calls=[],draw=[];
    const canvas={width:0,height:0,getContext:()=>({drawImage:(...args)=>draw.push(args)}),toDataURL:()=>'data:image/jpeg;base64,test-output'};
    class Image { naturalWidth=1024; naturalHeight=1024; set src(value){queueMicrotask(()=>this.onload());} }
    vm.runInNewContext(clientSource,{exports,require:()=>({getSocialSupabase:()=>({auth:{getSession:async()=>({data:{session:{access_token:'session'}}})}})}),fetch:async(url,options)=>{calls.push({url,options});return Response.json({image:'data:image/jpeg;base64,/9j/4AAQ'})},Image,document:{createElement:()=>canvas},Promise,Error});
    assert.equal(await exports.generateSocialImage('mountains',format),'data:image/jpeg;base64,test-output');
    assert.equal(canvas.width,1080);assert.equal(canvas.height,height);assert.equal(calls[0].url,'/api/social/image');
    assert.equal(calls[0].options.headers.Authorization,'Bearer session');
    assert.equal(draw.length,1);assert.ok(draw[0][3]>=canvas.width&&draw[0][4]>=canvas.height);
  });
}

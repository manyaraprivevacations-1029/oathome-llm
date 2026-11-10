const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const ts=require('typescript');
const source=ts.transpileModule(readFileSync('lib/social/poster.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function moduleFor(document={}) { const context={exports:{},document};vm.runInNewContext(source,context);return context.exports; }
function context(){return {font:'',measureText(text){const size=Number.parseInt(this.font);return {width:Array.from(text).length*size*.65};}};}
for(const title of ['Kerala','Long destination names wrap across lines','A'.repeat(100),'తెలుగు ప్రయాణం కేరళ']){
 test('fits title without clipping: '+title.slice(0,24),()=>{
  const ctx=context(),fit=moduleFor().fitPosterText(ctx,title,920,200,158,'serif');
  assert(fit.lines.length*fit.size*1.2<=200);
  assert(fit.lines.every(line=>ctx.measureText(line).width<=920));
  assert.equal(fit.lines.join('').replaceAll(' ',''),title.replaceAll(' ',''));
 });
}
test('disabled poster returns original pixels without loading fonts or images',async()=>{
 assert.equal(await moduleFor().composePoster('original','4:5',{title:'Kerala',details:'',cta:''},false,'light'),'original');
});
test('excessive copy fails rather than silently removing text',()=>{
 assert.throws(()=>moduleFor().fitPosterText(context(),'x'.repeat(5000),20,20,30,'serif'),/Shorten/);
});
test('layout safely clamps restored positions and sizes without mutating defaults',()=>{
 const api=moduleFor();
 const layout=api.safePosterLayout({title:{x:-50,y:150,size:Infinity,width:250}});
 assert.equal(layout.title.x,5);assert.equal(layout.title.y,92);assert.equal(layout.title.width,92);
 assert.equal(layout.title.size,api.defaultPosterLayout.title.size);
 assert.equal(api.defaultPosterLayout.title.x,50);
});

const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),{readFileSync}=require('node:fs'),ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/social/creative-brief.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {creativePrompt,normalizeCreativeResult,briefKey,anchoredImagePrompt,selectedImagePrompt}=context.exports;
const brief={topic:'5 reasons to visit chardham',destination:'chardham',facts:'',tone:'Warm',format:'4:5',language:'Telugu-English',carousel:true};
function draft(){return {caption:'మన కుటుంబంతో Char Dham యాత్రను plan చేద్దాం',poster_cta:'DM చేసి plan చేద్దాం',slides:Array.from({length:5},(_,i)=>({title:'Char Dham యాత్ర '+i,body:'మన కుటుంబంతో divine journey అనుభూతిని పొందండి',image_prompts:['Kedarnath temple, Uttarakhand, framed by Himalayan peaks, soft morning light, no text','Close view of Kedarnath temple exterior, Uttarakhand, realistic architecture, no text','Pilgrims approaching Kedarnath temple, Uttarakhand, respectful human-interest scene, no text']}))};}
test('Char Dham grounding names the actual four shrines and Telugu script requirement',()=>{const prompt=creativePrompt(brief);for(const name of ['Yamunotri','Gangotri','Kedarnath','Badrinath','Unicode Telugu','THREE DISTINCT'])assert(prompt.includes(name));});
test('accepts complete bilingual slides with three distinct shrine prompts',()=>{const result=normalizeCreativeResult(JSON.stringify(draft()),brief);assert.equal(result.slides.length,5);assert.equal(result.slides[0].image_prompts.length,3);});
test('rejects English-only captions despite saved language preferences',()=>{const data=draft();data.caption='A spiritual journey through the Himalayas';assert.throws(()=>normalizeCreativeResult(JSON.stringify(data),brief),/language/);});
test('rejects a single English-only slide',()=>{const data=draft();data.slides[2].body='Amazing spiritual experience';data.slides[2].title='Visit Char Dham';assert.throws(()=>normalizeCreativeResult(JSON.stringify(data),brief),/Every slide/);});
test('rejects generic mountains instead of Char Dham landmark prompts',()=>{const data=draft();data.slides[0].image_prompts[0]='Cinematic mountain panorama at sunrise';assert.throws(()=>normalizeCreativeResult(JSON.stringify(data),brief),/shrine/);});
test('rejects duplicate image prompt choices',()=>{const data=draft();data.slides[0].image_prompts[1]=data.slides[0].image_prompts[0];assert.throws(()=>normalizeCreativeResult(JSON.stringify(data),brief),/distinct/);});
test('changing topic, destination or language invalidates the generated brief key',()=>{for(const field of ['topic','destination','language'])assert.notEqual(briefKey(brief),briefKey({...brief,[field]:'changed'}));});
test('selected option is sent, with current destination context appended',()=>{const result=normalizeCreativeResult(JSON.stringify(draft()),brief);result.slides[0].selected_prompt=2;const chosen=selectedImagePrompt(result,0);assert.match(chosen,/Pilgrims/);assert.match(anchoredImagePrompt(chosen,brief,result.slides[0].title),/Yamunotri/);});
test('edited generic Char Dham prompt is blocked, and oversized prompts are not truncated',()=>{assert.throws(()=>anchoredImagePrompt('mountains only',brief,'Char Dham'),/shrine/);assert.throws(()=>anchoredImagePrompt('Kedarnath '.repeat(200),brief,'Char Dham'),/Shorten/);});
test('English output remains available when explicitly selected',()=>{const data=draft();data.caption='Explore Char Dham';data.slides.forEach(s=>{s.title='Char Dham';s.body='Pilgrimage inspiration'});assert.equal(normalizeCreativeResult(JSON.stringify(data),{...brief,language:'English'}).caption,data.caption);});
test('Kerala prompts cannot be reused for Kashmir',()=>{const data=draft();data.caption='Explore Kashmir';data.slides.forEach(s=>{s.title='Kashmir';s.body='Visit the valley';s.image_prompts=['Kerala backwaters','Kerala tea gardens','Kerala houseboat']});assert.throws(()=>normalizeCreativeResult(JSON.stringify(data),{...brief,destination:'Kashmir',topic:'Family trip',language:'English'}),/current destination/);});
test('Pan-India Char Dham does not inherit Uttarakhand-only grounding',()=>{assert(!creativePrompt({...brief,destination:'Dwarka Puri Rameswaram Badrinath pan-India Char Dham'}).includes('Destination grounding: Char Dham Yatra, Uttarakhand'));});
test('3-slide topic produces an exact three-slide instruction and accepts exactly three',()=>{
 const b={...brief,topic:'Make 3 slides about Char Dham'};
 assert.match(creativePrompt(b),/exactly 3 connected/);
 const data=draft();data.slides=data.slides.slice(0,3);
 assert.equal(normalizeCreativeResult(JSON.stringify(data),b).slides.length,3);
 assert.throws(()=>normalizeCreativeResult(JSON.stringify(draft()),b),/exactly 3 complete slides/);
});
test('count selector is authoritative; count parsing recognizes numbers, words and Telugu',()=>{
 const {requestedSlideCount,carouselSlideCount}=context.exports;
 assert.equal(requestedSlideCount('make three slides for Kashi'),3);
 assert.equal(requestedSlideCount('make 3-slide carousel'),3);
 assert.equal(requestedSlideCount('Kashi 3slides'),3);
 assert.equal(requestedSlideCount('మూడు స్లైడ్లు'),3);
 assert.equal(requestedSlideCount('3 reasons to visit Kashi'),undefined);
 assert.equal(carouselSlideCount({topic:'make 3 slides',slideCount:4}),4);
 assert.throws(()=>carouselSlideCount({topic:'make 1 slide'}),/2 to 10/);
});
test('10-slide requests do not silently fall back to five',()=>{
 const b={...brief,topic:'10 slides for Char Dham',slideCount:10};
 const data=draft();data.slides=[...data.slides,...data.slides];
 assert.equal(normalizeCreativeResult(JSON.stringify(data),b).slides.length,10);
 assert.throws(()=>normalizeCreativeResult(JSON.stringify(draft()),b),/exactly 10/);
});
test('Ganga Aarti prompt retains the ritual lamp and active ceremony, not only a priest',()=>{
 const prompt=anchoredImagePrompt('A priest performing the Ganga Aarti at Dashashwamedh Ghat in Kashi, surrounded by devotees.',{...brief,topic:'Kashi Ganga Aarti',destination:'Kashi'},'Ganga Aarti');
 assert.match(prompt,/multi-tier brass aarti lamp/);assert.match(prompt,/both hands and the whole lamp/);
 assert.match(prompt,/generic sadhu portrait/);assert(prompt.length<=1600);
});
test('Kashi and Varanasi are accepted as aliases for the same destination',()=>{
 const data=draft();data.caption='Explore Kashi';data.slides.forEach(s=>{s.title='Kashi';s.body='Ganga Aarti';s.image_prompts=['Varanasi Ganga Aarti, wide view','Varanasi Dashashwamedh Ghat close view','Varanasi priest performing Ganga Aarti']});
 assert.equal(normalizeCreativeResult(JSON.stringify(data),{...brief,topic:'Kashi',destination:'Kashi',language:'English'}).slides.length,5);
});

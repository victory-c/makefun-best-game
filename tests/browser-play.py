"""Browser play-test and unedited screenshots. Optional dependency: pip install playwright.
Run `node serve.ts` first, then this script with --out pointing outside the repository.
Only ordinary input events are sent; no simulation state is changed or staged.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import argparse,json,time

parser=argparse.ArgumentParser()
parser.add_argument('--out',required=True)
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(args.out).resolve();OUT.mkdir(parents=True,exist_ok=True)
policy=(ROOT/'tests/play-policy.mjs').read_text().replace('export const ','const ').replace('export function ','function ')
controls=r"""
window.testHeld=new Set();window.testFiring=false;
setInterval(() => {
  const s=wickwarden.snapshot();
  if(s.phase!=='play')return;
  const action=playPolicy(s), want=new Set();
  if(action.moveX<0)want.add('a');if(action.moveX>0)want.add('d');
  if(action.moveY<0)want.add('w');if(action.moveY>0)want.add('s');
  for(const key of testHeld)if(!want.has(key))window.dispatchEvent(new KeyboardEvent('keyup',{key}));
  for(const key of want)if(!testHeld.has(key))window.dispatchEvent(new KeyboardEvent('keydown',{key}));
  window.testHeld=want;
  const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
  const pos={clientX:r.left+action.aimX/1280*r.width,clientY:r.top+action.aimY/720*r.height};
  canvas.dispatchEvent(new MouseEvent('mousemove',pos));
  if(action.fire&&!testFiring)canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,...pos}));
  if(!action.fire&&testFiring)window.dispatchEvent(new MouseEvent('mouseup',{button:0}));
  window.testFiring=action.fire;
  for(const key of [action.dash?' ':null,action.flare?'e':null])if(key){window.dispatchEvent(new KeyboardEvent('keydown',{key}));window.dispatchEvent(new KeyboardEvent('keyup',{key}));}
},50);
window.testChoose=chooseOffer;
"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    errors=[];external=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
        if r.request.url.startswith('http://127.0.0.1:8080/') or r.request.url.startswith('data:'):r.continue_()
        else:external.append(r.request.url);r.abort()
    page.route('**/*',route)
    page.clock.install();page.goto('http://127.0.0.1:8080');page.wait_for_function('window.wickwarden')
    page.clock.pause_at(int(time.time()*1000)+1000)
    page.clock.run_for(500)
    page.screenshot(path=str(OUT/'title.jpg'),type='jpeg',quality=87)
    page.evaluate('(() => {'+policy+controls+'})()')
    page.keyboard.press('Enter');page.clock.run_for(50)
    captured=set();history=[];candidates=[]
    for tick in range(240):
        s=page.evaluate('wickwarden.snapshot()')
        if s['phase'] in ['won','lost']:
            page.clock.run_for(1000)
            page.screenshot(path=str(OUT/'result.jpg'),type='jpeg',quality=87)
            print('RESULT',json.dumps(s),flush=True);break
        if s['phase']=='upgrade':
            page.screenshot(path=str(OUT/f'kindling-{s["wave"]}.jpg'),type='jpeg',quality=87)
            history.append({'wave':s['wave'],'hp':s['hp'],'light':round(s['light']),'time':round(s['time']),'score':s['score']})
            print('NIGHT',history[-1],flush=True)
            i=page.evaluate('(s)=>testChoose(s.offers,s.hp,s.light)',s)
            page.keyboard.press(str(i+1));page.clock.run_for(100);continue
        wave=s['wave'];enemies=len(s['enemies'])
        if wave in [4,5,6,8,9,10] and s['nightTime']>6:
            category=f'{wave}-{min(5,int(s["nightTime"]//4))}'
            if category not in captured and (enemies>=5 or any(e['type']=='boss' for e in s['enemies'])):
                captured.add(category)
                name=f'play-{wave:02}-{tick:04}.jpg'
                page.screenshot(path=str(OUT/name),type='jpeg',quality=87)
                candidates.append({'file':name,'wave':wave,'enemies':enemies,'hp':s['hp'],'light':round(s['light']),'score':s['score']})
        page.clock.run_for(2500)
        if tick%10==0:print('PROGRESS',tick,s['wave'],round(s['time']),flush=True)
    else:raise AssertionError('run did not end within ten virtual minutes')
    assert not errors,errors
    assert not external,external
    (OUT/'run.json').write_text(json.dumps({'history':history,'candidates':candidates,'result':s,'errors':errors,'external':external},indent=2))
    print('CANDIDATES',json.dumps(candidates),flush=True)
    browser.close()

"""Read Unity text assets into a compact, traceable study index. Source assets stay in place.

Usage: python tools/research/unity_prefab_index.py ROOT OUTPUT --select RELATIVE_PREFAB ...
Requires PyYAML. This inspects serialized configuration; it does not simulate Unity rendering.
"""
import argparse
from collections import Counter
import json
import math
from pathlib import Path
import re
import yaml


def documents(path):
    text = path.read_text(encoding='utf-8-sig')
    starts = list(re.finditer(r'^--- !u!(\d+) &(-?\d+)([^\n]*)\n', text, re.M))
    result = {}
    for i, match in enumerate(starts):
        body = text[match.end():starts[i + 1].start() if i + 1 < len(starts) else len(text)]
        # Unity stores packed vertex-stream bytes as text. YAML 1.1 otherwise treats digits as octal.
        body = re.sub(r'^(\s*m_(?:VertexStreams|TrailVertexStreams):\s*)([0-9a-fA-F]+)\s*$',r'\1"\2"',body,flags=re.M)
        record = yaml.load(body, Loader=yaml.CSafeLoader)
        if record:
            kind = next(iter(record))
            result[match[2]] = {'kind':kind, 'type':int(match[1]), 'line':text.count('\n', 0, match.start()) + 1,
                'stripped':'stripped' in match[3], 'data':record[kind]}
    return result


def compact(value):
    if isinstance(value, list):
        return [compact(v) for v in value]
    if not isinstance(value, dict):
        if isinstance(value,float) and not math.isfinite(value):
            return 'Infinity' if value>0 else '-Infinity' if value<0 else 'NaN'
        return value
    if 'minMaxState' in value and 'scalar' in value:
        mode = value['minMaxState']
        keys = ['minMaxState', 'scalar']
        if mode == 3:
            keys += ['minScalar']
        if mode in (1, 2):
            keys += ['maxCurve']
        if mode == 2:
            keys += ['minCurve']
        return {k:compact(value[k]) for k in keys if k in value}
    return {k:compact(v) for k,v in value.items() if k not in ('serializedVersion','m_ObjectHideFlags')}


def study(root, selections):
    files = [p for p in root.rglob('*') if p.is_file()]
    guids = {}
    for path in files:
        if path.suffix != '.meta':
            continue
        match = re.search(r'^guid: (\w+)',path.read_text(encoding='utf-8-sig'),re.M)
        if match:
            guids[match[1]] = path.with_suffix('').relative_to(root).as_posix()
    def reference(value):
        return {'fileID':value.get('fileID'), 'guid':value.get('guid'), 'path':guids.get(value.get('guid'))}
    materials = {}
    def material(value):
        ref = reference(value)
        path = ref['path']
        if path and path not in materials:
            doc = next((r for r in documents(root/path).values() if r['kind']=='Material'),None)
            if doc:
                data = doc['data']; props = data.get('m_SavedProperties',{})
                materials[path] = {'source':path, 'line':doc['line'], 'shader':reference(data.get('m_Shader',{})),
                    'keywords':data.get('m_ValidKeywords',data.get('m_ShaderKeywords','')),
                    'floats':props.get('m_Floats',[]), 'ints':props.get('m_Ints',[]), 'colors':props.get('m_Colors',[]),
                    'textures':[{key:{'asset':reference(item.get('m_Texture',{})),
                        'scale':item.get('m_Scale'), 'offset':item.get('m_Offset')}}
                        for entry in props.get('m_TexEnvs',[]) for key,item in entry.items()]}
        return ref
    cases = []
    for selected in selections:
        path = (root/selected).resolve()
        if not path.is_relative_to(root) or path.suffix != '.prefab':
            raise ValueError('Select a prefab inside the source root')
        docs = documents(path)
        objects = {i:d['data'] for i,d in docs.items() if d['kind']=='GameObject'}
        transforms = {i:d['data'] for i,d in docs.items() if d['kind']=='Transform'}
        by_object = {str(d['m_GameObject']['fileID']):d for d in transforms.values() if 'm_GameObject' in d}
        def active(go, seen=None):
            seen = set() if seen is None else seen
            if go in seen or go not in objects:
                return None
            seen.add(go)
            if not objects[go].get('m_IsActive',1):
                return False
            parent = by_object.get(go,{}).get('m_Father',{}).get('fileID',0)
            if not parent:
                return True
            transform = transforms.get(str(parent))
            return active(str(transform['m_GameObject']['fileID']),seen) if transform and 'm_GameObject' in transform else None
        layers = []
        for identity,doc in docs.items():
            data = doc['data']; kind = doc['kind']
            if kind not in ('ParticleSystem','TrailRenderer','LineRenderer','ParticleSystemForceField','MonoBehaviour'):
                continue
            go = str(data.get('m_GameObject',{}).get('fileID',0)); obj = objects.get(go,{})
            row = {'fileID':identity,'line':doc['line'],'kind':kind,'name':obj.get('m_Name'),
                'activeInHierarchy':active(go),'transform':compact(by_object.get(go,{}))}
            if kind == 'ParticleSystem':
                render = next((r['data'] for r in docs.values() if r['kind']=='ParticleSystemRenderer' and
                    str(r['data'].get('m_GameObject',{}).get('fileID'))==go),{})
                row['timing'] = {k:compact(data[k]) for k in ('lengthInSec','looping','simulationSpeed','startDelay','moveWithTransform','scalingMode') if k in data}
                row['modules'] = {k:compact(v) for k,v in data.items() if k.endswith('Module') and isinstance(v,dict) and v.get('enabled')}
                row['disabledModules'] = [k for k,v in data.items() if k.endswith('Module') and isinstance(v,dict) and not v.get('enabled')]
                row['renderer'] = {k:render[k] for k in ('m_Enabled','m_RenderMode','m_RenderAlignment','m_SortMode','m_LengthScale','m_VelocityScale','m_VertexStreams') if k in render}
                row['materials'] = [material(v) for v in render.get('m_Materials',[])]
                if render.get('m_RenderMode')==4:
                    row['mesh'] = reference(render.get('m_Mesh',{}))
            else:
                row['settings'] = compact({k:v for k,v in data.items() if not k.startswith('m_Prefab') and k not in ('m_GameObject','m_CorrespondingSourceObject')})
                row['materials'] = [material(v) for v in data.get('m_Materials',[])]
                if kind == 'MonoBehaviour':
                    row['script'] = reference(data.get('m_Script',{}))
            layers.append(row)
        cases.append({'source':path.relative_to(root).as_posix(),'layers':layers,
            'nestedPrefabInstances':[reference(d['data'].get('m_SourcePrefab',{})) for d in docs.values() if d['kind']=='PrefabInstance']})
    return {'sourceRoot':str(root),'scope':'Serialized configuration only; nested prefab overrides and shader execution are not simulated.',
        'inventory':dict(Counter(p.suffix.lower() for p in files)), 'cases':cases,'materials':materials}


def reader(result, output):
    payload=json.dumps(result,ensure_ascii=False).replace('<','\\u003c')
    page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>MasterMagicFX · 源码拆解</title>
<style>body{margin:0;background:#13181e;color:#d9e1ea;font:15px/1.6 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1120px;margin:36px auto;padding:0 24px}h1{font-size:26px}h2{font-size:19px}p{max-width:900px}select,input{font:inherit}select{max-width:100%;padding:8px;background:#25303b;color:inherit;border:1px solid #617a90}article{margin:20px 0;padding:18px;background:#1c252e;border-left:3px solid #6dadc8}small{color:#9cabb9}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}.fact{padding:9px;background:#23313c}details{margin-top:12px}summary{cursor:pointer;color:#9fdae5}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace}a{color:#9fdae5;overflow-wrap:anywhere}.badge{color:#ebc489}footer{margin:36px 0}</style>
<main><h1>MasterMagicFX · 真实配置拆解</h1>
<p>按 Prefab → 已启用组件 → 材质关键词 → 贴图与 Shader 追踪。这里展示源配置，不是 Unity 动画预览；尺寸采用资产局部单位，时间为秒。参数范围需在实际画面中另行验证。</p>
<p>重点比较：WindCharge / HealCharge 的成组变化；Cosmo / Water 的不同拖尾组合；火、毒、水接触的短峰与余留。根节点可以是透明驱动源；启用组件数不等于可见层数。</p>
<select id="choice"></select> <label><input id="active" type="checkbox" checked>仅显示层级中启用的组件</label>
<div id="body"></div><footer>商业素材留在提供的 Unity 目录；本页只含解析后的文本配置与原文件链接。</footer></main>
<script>const data=PAYLOAD;
const esc=s=>String(s==null?'—':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=p=>'file:///'+(data.sourceRoot+'/'+p).replaceAll('\\\\','/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/,'$1:');
const link=p=>p?'<a href="'+url(p)+'">'+esc(p)+'</a>':'内置或未在本包解析的引用';
const dump=v=>'<pre>'+esc(JSON.stringify(v,null,2))+'</pre>';
function val(v){if(v==null)return '—';if(typeof v!=='object')return String(v);if(v.minMaxState===0)return String(v.scalar);if(v.minMaxState===3)return v.minScalar+' … '+v.scalar;if(v.minMaxState===1||v.minMaxState===2)return '曲线 × '+v.scalar+'（展开原值）';return '见原值';}
const choice=document.getElementById('choice'),active=document.getElementById('active');
data.cases.forEach((v,i)=>choice.add(new Option(v.source,i)));
function render(){const c=data.cases[Number(choice.value)||0];let html='<h2>'+link(c.source)+'</h2>';
if(c.nestedPrefabInstances.length)html+='<p class="badge">含嵌套 Prefab；本页未展开其继承覆盖。</p>';
c.layers.filter(v=>!active.checked||v.activeInHierarchy!==false).forEach(v=>{const m=v.modules||{},t=v.timing||{},init=m.InitialModule||{},em=m.EmissionModule;
html+='<article><h2>'+esc(v.name)+' <small>'+esc(v.kind)+' · 源文件第 '+v.line+' 行</small></h2>';
if(v.kind==='ParticleSystem'){html+='<div class="facts">'+[['循环',t.looping],['启动延迟',val(t.startDelay)],['单粒寿命',val(init.startLifetime)],['起始尺寸',val(init.startSize)],['起始速度',val(init.startSpeed)],['发射率/秒',em?val(em.rateOverTime):'Emission关闭'],['按距离',em?val(em.rateOverDistance):'关闭'],['渲染模式',v.renderer.m_RenderMode+'；启用='+v.renderer.m_Enabled]].map(x=>'<div class="fact"><small>'+x[0]+'</small><br>'+esc(x[1])+'</div>').join('')+'</div>';
if(em&&em.m_Bursts?.length)html+='<p>实际 Burst：'+em.m_Bursts.map(b=>esc(b.time)+'s × '+esc(val(b.countCurve))).join('；')+'</p>';
html+='<p>启用模块：'+esc(Object.keys(m).join(' · '))+'</p>';if(v.mesh)html+='<p>当前 Mesh：'+link(v.mesh.path)+'</p>';}
(v.materials||[]).forEach(r=>{const material=data.materials[r.path];html+='<details><summary>材质：'+esc(r.path||r.guid||r.fileID)+'</summary>';if(material){html+='<p>'+link(r.path)+'</p><p>Shader：'+link(material.shader.path)+'</p><p class="badge">实际关键词：'+esc(Array.isArray(material.keywords)?material.keywords.join(' · '):material.keywords)+'</p><p>保存的参数需要结合关键词与 Shader 连线判断是否生效。</p>';html+=material.textures.map(entry=>Object.entries(entry).map(([key,value])=>'<div>'+esc(key)+' → '+link(value.asset.path)+'</div>').join('')).join('');html+='<details><summary>保存的材质参数</summary>'+dump({floats:material.floats,ints:material.ints,colors:material.colors})+'</details>';}html+='</details>';});
html+='<details><summary>组件、曲线及变换原值</summary>'+dump(v)+'</details></article>';});document.getElementById('body').innerHTML=html;}
choice.onchange=active.onchange=render;render();</script></html>'''
    output.write_text(page.replace('PAYLOAD',payload),encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root',type=Path); parser.add_argument('output',type=Path)
    parser.add_argument('--select',nargs='+',required=True)
    args=parser.parse_args()
    result=study(args.root.resolve(),args.select)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    reader(result,args.output.with_suffix('.html'))
    print(f"Indexed {len(result['cases'])} selected prefabs and {len(result['materials'])} referenced materials; source files unchanged.")

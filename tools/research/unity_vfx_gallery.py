"""Build a local HTML viewer from actual UnityVfxCapture PNGs and frame metadata.

Usage: python tools/research/unity_vfx_gallery.py CAPTURE_DIRECTORY [--output gallery.html]
The viewer embeds its data, CSS and JavaScript. Images remain relative links to the
existing captured PNGs; source-package assets are neither read nor copied.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib.parse import quote


def read_json(path: Path, warnings: list[str], required: bool = False):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        if required or path.exists():
            warnings.append(f"{path.name}: {type(error).__name__}; may still be writing")
        return {}


def relative_url(path: Path, parent: Path) -> str:
    return quote(Path(os.path.relpath(path, parent)).as_posix(), safe="/.-_")


def frame_record(path: Path, data: dict, html_parent: Path):
    # The sibling PNG continues to work when an entire capture directory is moved.
    image = path.with_suffix(".png")
    if not image.is_file():
        return None
    shader_errors = []
    shader_names = set()
    for material in data.get("shaders", []):
        shader_names.add(material.get("shader", "<unknown>"))
        prefix = f"{material.get('renderer') or '<root>'} · {material.get('material', '?')}"
        if not material.get("supported", True):
            shader_errors.append(f"{prefix}: unsupported shader {material.get('shader', '?')}")
        shader_errors.extend(f"{prefix}: {error}" for error in material.get("errors", []))
    return {
        "image": relative_url(image, html_parent), "metadata": relative_url(path, html_parent),
        "view": data.get("view", "camera"), "time": data.get("actualTime", 0),
        "requested": data.get("requestedTime", 0), "globalTime": data.get("globalTime"),
        "frame": data.get("frame"), "particles": data.get("particleCount", 0),
        "changedPixels": data.get("changedPixels", 0), "bounds": data.get("changedBounds", []),
        "empty": bool(data.get("emptyCandidate")), "magenta": bool(data.get("magentaCandidate")),
        "rootMissing": bool(data.get("rootMissing")), "shaderErrors": sorted(set(shader_errors)),
        "shaderNames": sorted(shader_names), "messages": data.get("messages", []),
        "cameraPosition": data.get("cameraPosition"), "cameraEuler": data.get("cameraEuler"),
        "fieldOfView": data.get("fieldOfView"), "orthographic": data.get("orthographic", False),
        "orthographicSize": data.get("orthographicSize"), "rootPosition": data.get("rootPosition"),
        "peakLinearRgb": data.get("peakLinearRgb"), "clippedHdrPixels": data.get("clippedHdrPixels"),
        "conditions": data.get("renderConditions", {}), "notes": data.get("notes", ""),
        "stop": data.get("requestedStop"), "motion": data.get("suppliedMotion"),
        "laser": data.get("suppliedLaser"),
        "companions": data.get("companions", []),
    }


def collect(directory: Path, output: Path):
    warnings: list[str] = []
    run = read_json(directory / "capture-run.json", warnings, required=True)
    config = read_json(directory / "input-config.json", warnings)
    calibration = read_json(directory / "color-calibration.json", warnings)
    cases = {}
    for item in config.get("cases", []):
        cases[item["id"]] = {
            "id": item["id"], "prefab": item.get("prefab", ""), "status": "pending",
            "notes": item.get("notes", ""), "error": "", "frames": [],
            "stop": item.get("stop"), "motion": item.get("motion"), "laser": item.get("laser"),
            "companions": item.get("companions", []),
        }
    for item in run.get("cases", []):
        case = cases.setdefault(item["id"], {"id": item["id"], "frames": []})
        case.update({k: item.get(k, "") for k in ("prefab", "status", "error")})
    missing_images = 0
    # Completed-case lists are written after a whole case. Scan frame records too
    # so a generated snapshot can include images from a case still in progress.
    for path in sorted(directory.rglob("*.json")):
        if path.parent == directory:
            continue
        data = read_json(path, warnings)
        if not isinstance(data, dict) or not data.get("caseId") or not data.get("image"):
            continue
        record = frame_record(path, data, output.parent)
        if record is None:
            missing_images += 1
            continue
        case = cases.setdefault(data["caseId"], {
            "id": data["caseId"], "prefab": data.get("prefab", ""), "status": "partial",
            "notes": data.get("notes", ""), "error": "", "frames": [],
        })
        if case.get("status") == "pending":
            case["status"] = "partial"
        case["frames"].append(record)
    result_cases = []
    for case in cases.values():
        case["frames"].sort(key=lambda f: (f["view"], f["requested"], f["time"], f["image"]))
        case["views"] = list(dict.fromkeys(frame["view"] for frame in case["frames"]))
        case["flags"] = {
            "empty": sum(f["empty"] for f in case["frames"]),
            "magenta": sum(f["magenta"] for f in case["frames"]),
            "shader": sum(bool(f["shaderErrors"]) for f in case["frames"]),
        }
        if case["frames"]:
            # A thumbnail is an overview, not a claim that this is the whole effect.
            case["representative"] = max(range(len(case["frames"])),
                key=lambda i: (not case["frames"][i]["shaderErrors"], not case["frames"][i]["magenta"], case["frames"][i]["changedPixels"]))
        result_cases.append(case)
    calibration["images"] = [relative_url(p, output.parent) for p in sorted(directory.glob("color-calibration-*.png"))]
    baselines = [{"view": p.stem.removeprefix("baseline-"), "image": relative_url(p, output.parent)}
                 for p in sorted(directory.glob("baseline-*.png"))]
    return {
        "title": directory.name, "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "run": {k: run.get(k) for k in ("status", "startedUtc", "finishedUtc", "error", "conditions",
            "environmentMessages", "captureMessages", "shaderMessages")},
        "cases": result_cases, "calibration": calibration, "baselines": baselines,
        "warnings": warnings, "missingImages": missing_images,
        "frameCount": sum(len(case["frames"]) for case in result_cases),
        "runMetadata": relative_url(directory / "capture-run.json", output.parent),
        "calibrationMetadata": relative_url(directory / "color-calibration.json", output.parent),
    }


HTML = r'''<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unity 原生特效参考</title>
<style>
:root{color-scheme:dark;--bg:#10141a;--panel:#171d25;--line:#2d3542;--text:#edf0f4;--muted:#a0adbd;--accent:#9dcdfb;--warn:#f0c47b;--bad:#ffacac}
*{box-sizing:border-box}body{margin:0;font:14px/1.55 system-ui,"Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text)}
button,input,select{font:inherit}button,select,input[type=search]{color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:8px 10px}button{cursor:pointer}button:hover{border-color:var(--accent)}button:disabled{opacity:.35;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}a{color:var(--accent)}
header{padding:17px 24px;border-bottom:1px solid var(--line);display:flex;gap:20px;align-items:center;justify-content:space-between}h1{font-size:19px;margin:0 0 2px}header p{margin:0;color:var(--muted);font-size:12px}.summary{font-size:12px;color:var(--muted);text-align:right;white-space:pre-line}.layout{display:grid;grid-template-columns:290px minmax(0,1fr);min-height:calc(100vh - 85px)}aside{border-right:1px solid var(--line);padding:14px;position:sticky;top:0;height:calc(100vh - 1px);overflow:auto}.search{width:100%;margin-bottom:9px}.filter{width:100%;margin-bottom:13px}.case{display:grid;grid-template-columns:75px minmax(0,1fr);gap:10px;text-align:left;width:100%;margin-bottom:7px;padding:7px;background:transparent;border:1px solid transparent;border-radius:8px}.case.selected{background:#253445;border-color:#719dc7}.case img{width:75px;height:58px;object-fit:cover;border-radius:4px;background:#202731}.case .name{font-size:12px;overflow-wrap:anywhere}.case small{display:block;color:var(--muted);font-size:11px}.case .placeholder{height:58px;background:#202731;display:grid;place-items:center;color:var(--muted);font-size:11px}
main{padding:19px 24px 36px;min-width:0;max-width:1600px;width:100%;margin:auto}.heading{display:flex;align-items:center;gap:12px;justify-content:space-between}.heading h2{font-size:19px;margin:0;overflow-wrap:anywhere}.chips{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px;min-height:25px}.chip{font-size:11px;border:1px solid var(--line);border-radius:20px;padding:2px 9px;color:var(--muted)}.chip.warn{color:var(--warn);border-color:#796136}.chip.bad{color:var(--bad);border-color:#8a5555}.stage{margin:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#090c11;position:relative}.stage img{display:block;width:100%;height:min(67vh,800px);object-fit:contain}.stage .empty{display:none;height:55vh;place-items:center;color:var(--muted)}figcaption{padding:8px 12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted)}
.controls{display:grid;grid-template-columns:auto minmax(100px,1fr) auto;align-items:center;gap:12px;margin:13px 0 7px}.controls input{width:100%;accent-color:var(--accent)}.sampling{color:var(--muted);font-size:11px;margin-bottom:11px}.strip{display:flex;gap:7px;overflow-x:auto;padding-bottom:8px}.thumb{flex:0 0 101px;padding:4px;background:transparent}.thumb.active{border-color:var(--accent);background:#253445}.thumb img{display:block;width:91px;height:66px;object-fit:cover}.thumb span{font-size:11px;display:block;margin-top:2px}.source{font-size:12px;color:var(--muted);overflow-wrap:anywhere;margin:13px 0 5px}.notes{font-size:12px;color:var(--muted);margin:4px 0 13px}.info{border-top:1px solid var(--line);padding-top:12px;margin-top:14px}.info details{margin:9px 0;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 13px}.info summary{cursor:pointer;color:#d2dbe7}.facts{display:grid;grid-template-columns:150px minmax(0,1fr);gap:5px 12px;font-size:12px;margin:12px 0}.facts dt{color:var(--muted)}.facts dd{margin:0;overflow-wrap:anywhere}.diagnostics{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--warn)}.calibration{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.swatch{min-width:90px;font-size:11px;color:var(--muted)}.swatch img{display:block;width:48px;height:36px;border:1px solid #555;image-rendering:pixelated;margin-bottom:4px}.contact{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:11px}.contact button{padding:5px}.contact img{width:100%;height:90px;object-fit:contain;background:#090c11}.contact span{display:block;font-size:11px;color:var(--muted)}.footer{font-size:11px;color:var(--muted);margin-top:20px}.muted{color:var(--muted)}.no-results{padding:20px 5px;color:var(--muted);font-size:12px}
@media(max-width:900px){header{padding:13px 14px}.layout{grid-template-columns:220px minmax(0,1fr)}aside{padding:10px}main{padding:15px 14px}.case{grid-template-columns:55px minmax(0,1fr)}.case img{width:55px;height:48px}.stage img{height:55vh}.facts{grid-template-columns:110px 1fr}}
@media(max-width:620px){header{align-items:flex-start;gap:8px}.summary{max-width:130px}.layout{display:block}aside{height:auto;position:static;border-right:0;border-bottom:1px solid var(--line)}#case-list{display:flex;overflow-x:auto;gap:7px}.case{flex:0 0 180px;margin:0}.search{width:57%;margin-right:2%}.filter{width:40%}.stage img{height:48vh}.heading{align-items:flex-start}.facts{grid-template-columns:90px 1fr}}
</style>
<header><div><h1>Unity 原生特效参考</h1><p>真实 PNG · 离散时间采样，非连续录像 · 原资产参考预览</p></div><div id="summary" class="summary"></div></header>
<div class="layout"><aside><input id="search" class="search" type="search" placeholder="搜索名称或源路径" aria-label="搜索特效"><select id="filter" class="filter" aria-label="筛选"><option value="all">全部样本</option><option value="ready">已有图像</option><option value="pending">待采集 / 采集中</option><option value="shader">含 Shader 问题</option><option value="empty">含空画面标记</option><option value="magenta">含疑似粉色标记</option></select><div id="case-list"></div></aside>
<main><div class="heading"><h2 id="case-name"></h2><select id="view" aria-label="视角"></select></div><div id="chips" class="chips"></div>
<figure class="stage"><img id="main-image" alt="原生 Unity 特效截图"><div id="empty-state" class="empty">此样本尚无完整 PNG</div><figcaption><span id="caption"></span><a id="image-link" target="_blank" rel="noopener">查看原图</a></figcaption></figure>
<div class="controls"><button id="previous" title="方向键 ←">← 上一张</button><input id="time" type="range" min="0" max="0" step="1" value="0" aria-label="离散采样时刻"><button id="next" title="方向键 →">下一张 →</button></div><div id="sampling" class="sampling"></div><div id="strip" class="strip"></div>
<div id="source" class="source"></div><div id="notes" class="notes"></div><div id="inputs" class="notes"></div>
<section class="info"><details><summary>当前帧与渲染条件</summary><dl id="facts" class="facts"></dl><a id="metadata-link" target="_blank" rel="noopener">查看这一帧的原始记录</a></details>
<details id="issues-details"><summary id="issues-title">图像与 Shader 检查</summary><div id="issues" class="diagnostics"></div></details>
<details><summary>本样本接触表 · 同一视角的全部采样时刻</summary><div id="contact" class="contact"></div></details>
<details><summary id="calibration-title">颜色校准</summary><div id="calibration" class="calibration"></div><div id="calibration-note" class="notes"></div><a id="calibration-link" target="_blank" rel="noopener">查看颜色校准原始记录</a></details>
<details><summary>采集状态与环境记录</summary><div id="run-info" class="diagnostics"></div><a id="run-link" target="_blank" rel="noopener">查看采集总记录</a></details></section>
<div class="footer" id="footer"></div></main></div>
<script id="capture-data" type="application/json">__DATA__</script>
<script>
(()=>{'use strict';
const D=JSON.parse(document.getElementById('capture-data').textContent),$=id=>document.getElementById(id);
let selected=D.cases.findIndex(c=>c.frames.length),view='',index=0,frames=[];if(selected<0)selected=0;
const number=(n,d=3)=>typeof n==='number'?n.toFixed(d):'—';
const vector=v=>v?['x','y','z'].map(k=>number(v[k],2)).join(', '):'—';
const color=v=>v?['r','g','b'].map(k=>number(v[k],3)).join(', '):'—';
const status=s=>({captured:'已采集',partial:'采集中',pending:'待采集',failed:'失败'})[s]||s||'—';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function badge(text,cls=''){ $('chips').append(node('span',text,'chip '+cls)); }
function flagText(c){return c.flags.shader?'Shader 检查异常':c.flags.magenta?'有疑似粉色帧':c.flags.empty?'含起止空帧标记':'';}
function list(){const query=$('search').value.trim().toLowerCase(),filter=$('filter').value,container=$('case-list');container.replaceChildren();let count=0;
 D.cases.forEach((c,i)=>{if(query&&!`${c.id} ${c.prefab}`.toLowerCase().includes(query))return;
  if(filter==='ready'&&!c.frames.length||filter==='pending'&&!['pending','partial'].includes(c.status)||['shader','empty','magenta'].includes(filter)&&!c.flags[filter])return;
  count++;const b=node('button',undefined,'case'+(i===selected?' selected':''));b.title=c.prefab||c.id;b.setAttribute('aria-pressed',String(i===selected));
  if(c.frames.length){const img=node('img');img.src=c.frames[c.representative||0].image;img.loading='lazy';img.alt='代表采样帧';b.append(img);}else b.append(node('span','待采集','placeholder'));
  const label=node('span');label.append(node('span',c.id,'name'),node('small',`${c.frames.length} 张 · ${status(c.status)}`));if(flagText(c))label.append(node('small',flagText(c)));b.append(label);b.onclick=()=>choose(i);container.append(b);
 });if(!count)container.append(node('div','没有符合条件的样本','no-results'));
}
function choose(i,keepTime=null){selected=i;const c=D.cases[i];if(!c)return;const lastView=view;view=c.views.includes(lastView)?lastView:(c.views[0]||'');$('view').replaceChildren();c.views.forEach(v=>{const o=node('option',v);o.value=v;$('view').append(o);});$('view').value=view;
 frames=c.frames.filter(f=>f.view===view);if(keepTime!==null)index=nearest(keepTime);else{const representative=c.frames[c.representative||0];index=Math.max(0,frames.indexOf(representative));if(index===0&&representative)index=nearest(representative.time);}
 $('case-name').textContent=c.id;$('source').textContent='源 Prefab · '+(c.prefab||'—')+((c.companions||c.frames[0]?.companions||[]).length?'；组合随附 · '+(c.companions||c.frames[0]?.companions).join('；'):'');$('notes').textContent=c.notes||'';list();buildStrip();draw();history.replaceState(null,'','#'+encodeURIComponent(c.id));
}
function nearest(t){return frames.reduce((best,f,i)=>Math.abs(f.time-t)<Math.abs(frames[best].time-t)?i:best,0);}
function buildStrip(){const strip=$('strip'),contact=$('contact');strip.replaceChildren();contact.replaceChildren();frames.forEach((f,i)=>{for(const [container,cls] of [[strip,'thumb'],[contact,'']]){const b=node('button',undefined,cls);const img=node('img');img.src=f.image;img.loading='lazy';img.alt=`${number(f.time)} 秒`;b.append(img,node('span',number(f.time)+' s'+(f.empty?' · 空':'')));b.onclick=()=>{index=i;draw();};container.append(b);}});}
function addFact(name,value){$('facts').append(node('dt',name),node('dd',String(value)));}
function inputText(c,f){const stop=f?.stop||c.stop,motion=f?.motion||c.motion,laser=f?.laser||c.laser,parts=[];
 if(motion?.enabled)parts.push(motion.kind==='orbit'?`输入运动：绕轴 ${number(motion.degreesPerSecond,1)}°/s，半径 ${number(motion.radius,2)}`:`输入运动：线速度 (${vector(motion.velocity)})`);
 if(laser?.enabled)parts.push(`输入束端点：(${vector(laser.start)}) → (${vector(laser.end)})`);
 if(stop?.enabled){let text=`${number(stop.at)} s 施加停止输入`;if(stop.freezeMotion)text+=' · 冻结输入运动';if(stop.stopTrails)text+=' · 停止独立尾迹添点';parts.push(text);}
 return parts.length?'研究者施加的输入 · '+parts.join('；'):'研究输入：固定放置；按资产原始声明播放。';
}
function draw(){const c=D.cases[selected];if(!c)return;const f=frames[index];$('chips').replaceChildren();badge(status(c.status));badge(view||'无视角');$('inputs').textContent=inputText(c,f);$('facts').replaceChildren();
 $('time').max=Math.max(0,frames.length-1);$('time').value=index;$('time').disabled=!frames.length;$('previous').disabled=index<=0;$('next').disabled=index>=frames.length-1;
 [...$('strip').children].forEach((b,i)=>b.classList.toggle('active',i===index));
 if(!f){$('main-image').style.display='none';$('empty-state').style.display='grid';$('caption').textContent='生成页面时尚无可用帧';$('sampling').textContent='页面是生成时的快照；采集完成后重新生成即可。';$('image-link').removeAttribute('href');$('metadata-link').removeAttribute('href');$('issues-title').textContent='图像与 Shader 检查';$('issues').textContent='尚无当前帧记录。';return;}
 $('main-image').style.display='block';$('empty-state').style.display='none';$('main-image').src=f.image;$('main-image').alt=`${c.id} · ${view} · 实际 ${number(f.time)} 秒`;$('image-link').href=f.image;
 $('caption').textContent=`实际 ${number(f.time)} s · 第 ${index+1} / ${frames.length} 张 · ${f.particles} 粒`;
 $('sampling').textContent=`采样时刻间隔不等。← / → 逐张查看；拖动滑块切换离散帧。当前请求 ${number(f.requested)} s，实际 ${number(f.time)} s。`;
 if(f.empty)badge('空画面候选','warn');if(f.magenta)badge('疑似粉色候选','warn');if(f.shaderErrors.length)badge('Shader 异常','bad');if(f.rootMissing)badge('根对象已销毁','warn');
 const cond=f.conditions||D.run.conditions||{};addFact('实际 / 全局时间',`${number(f.time)} / ${number(f.globalTime)} s`);addFact('Unity / 渲染管线',`${cond.unity||'—'} · ${cond.pipeline||'—'}`);addFact('分辨率 / 时间步',`${cond.width}×${cond.height} · ${number(cond.dt,6)} s`);addFact('摄像机位置',vector(f.cameraPosition));addFact('摄像机旋转',vector(f.cameraEuler));addFact('投影',f.orthographic?`正交 · ${number(f.orthographicSize,2)}`:`透视 · FOV ${number(f.fieldOfView,1)}°`);addFact('背景 / 地面 RGB',`${color(cond.background)} / ${color(cond.groundColor)}`);addFact('研究 Bloom',`${number(cond.bloomIntensity,2)} · 阈值 ${number(cond.bloomThreshold,2)}`);addFact('PNG 色彩',cond.pngEncoding||'旧记录未包含编码说明');addFact('HDR 峰值 / 裁切',`${number(f.peakLinearRgb,2)} / ${f.clippedHdrPixels??'—'} 像素`);addFact('变化像素',f.changedPixels);addFact('Shader',f.shaderNames.join('；'));$('metadata-link').href=f.metadata;
 const issues=[];if(f.empty)issues.push('空画面候选：相对空舞台变化很少。起始、消散结束或视野之外都可能出现；请结合完整时序判断。');if(f.magenta)issues.push('疑似粉色候选：仅颜色筛查，紫色作品也可能被标记；请查看 Shader 记录。');if(f.rootMissing)issues.push('源 Prefab 的根对象已销毁。');issues.push(...f.shaderErrors,...f.messages);$('issues').textContent=issues.length?[...new Set(issues)].join('\n\n'):'当前帧没有记录到 Shader 错误或图像筛查标记。';$('issues-title').textContent=`图像与 Shader 检查${issues.length?' · '+issues.length+' 条':''}`;
}
function globalInfo(){const complete=D.cases.filter(c=>c.status==='captured').length;$('summary').textContent=`${complete} / ${D.cases.length} 样本 · ${D.frameCount} 张\n${D.run.status==='running'?'采集中快照':'采集状态：'+(D.run.status||'未知')}`;$('footer').textContent=`${D.title} · 页面生成 ${D.generated} · 图片直接引用已存在的采集 PNG；未复制 Unity 原始素材。`;
 const cal=D.calibration||{};$('calibration-title').textContent=cal.passed===true?'颜色校准 · 通过':cal.passed===false?'颜色校准 · 未通过':'颜色校准 · 尚无记录';(cal.samples||[]).forEach((s,i)=>{const cell=node('div',undefined,'swatch');if(cal.images?.[i]){const img=node('img');img.src=cal.images[i];img.alt='已知颜色实际渲染';cell.append(img);}cell.append(node('div',`输出 ${s.actualPng?.r}, ${s.actualPng?.g}, ${s.actualPng?.b}`),node('div',`最大误差 ${s.maxByteError} / 255`));$('calibration').append(cell);});$('calibration-note').textContent=cal.samples?.length?`${cal.samples.length} 个已知颜色经真实摄像机、浮点读取与 PNG 编码校准。${cal.pngEncoding||''}`:'此页面不能据缺失记录推断颜色校准结果。';$('calibration-link').href=D.calibrationMetadata;
 const lines=[`状态：${D.run.status||'未知'}`,`已完成 ${complete} 个；发现 ${D.frameCount} 张真实 PNG；缺失配对图片 ${D.missingImages} 张。`];if(D.run.error)lines.push('采集失败：'+D.run.error);if(D.run.captureMessages?.length)lines.push('捕获运行记录：\n'+D.run.captureMessages.join('\n'));if(D.run.environmentMessages?.length)lines.push('独立的编辑器 / 环境记录：\n'+D.run.environmentMessages.join('\n'));if(D.warnings.length)lines.push('读取中的文件：\n'+D.warnings.join('\n'));$('run-info').textContent=lines.join('\n\n');$('run-link').href=D.runMetadata;
}
$('search').oninput=list;$('filter').onchange=list;$('view').onchange=()=>{const t=frames[index]?.time||0;view=$('view').value;choose(selected,t);};$('time').oninput=()=>{index=Number($('time').value);draw();};$('previous').onclick=()=>{if(index>0){index--;draw();}};$('next').onclick=()=>{if(index<frames.length-1){index++;draw();}};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft'){$('previous').click();e.preventDefault();}if(e.key==='ArrowRight'){$('next').click();e.preventDefault();}});
globalInfo();let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}const fromHash=D.cases.findIndex(c=>c.id===hash);if(fromHash>=0)selected=fromHash;if(D.cases.length)choose(selected);else{$('case-name').textContent='尚无可用样本';list();}
})();
</script></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("capture", type=Path, help="Capture directory or capture-run.json")
    parser.add_argument("--output", type=Path, help="Defaults to CAPTURE_DIRECTORY/gallery.html")
    args = parser.parse_args()
    directory = args.capture.resolve()
    if directory.is_file():
        directory = directory.parent
    if not directory.is_dir():
        parser.error(f"Capture directory does not exist: {directory}")
    output = (args.output or directory / "gallery.html").resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    data = collect(directory, output)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    output.write_text(HTML.replace("__DATA__", payload), encoding="utf-8")
    print(f"Gallery: {output}\n{len(data['cases'])} cases; {data['frameCount']} actual PNG frames; {len(data['warnings'])} pending/unreadable records")


if __name__ == "__main__":
    main()

"""Create the Chinese landing page for actual MasterMagicFX study captures.

Usage: python tools/research/unity_study_landing.py build/research-mastermagicfx
Existing captured PNG/WebP files remain in place. This tool starts no browser or Unity.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import quote

from unity_vfx_gallery import collect


RUNS = [
    ("unity-broad", "基础样本", "57 个原生样本的时间与视角浏览"),
    ("unity-volume", "体积与独显", "抬高观察及 WindCharge 各组 Renderer 独显"),
    ("unity-wide", "宽视角补拍", "高火柱、喷射、大范围法阵与爆发"),
    ("unity-detail", "运动与退出补拍", "束端点、弹体与尾迹组合、停止和水流落地"),
    ("unity-continuous", "连续采样原帧", "5 个样本，原生固定步长模拟、约 30 fps 采样"),
    ("unity-condition-base", "条件：暗背景", "Bloom 1、阈值 0.6"),
    ("unity-condition-no-bloom", "条件：无 Bloom", "相同暗背景，关闭 Bloom"),
    ("unity-condition-light", "条件：浅背景", "Bloom 1、阈值 0.6"),
]


def build(root: Path):
    output = root / "study-gallery.html"
    datasets = {name: collect(root / name, output) for name, _, _ in RUNS}

    def case(run, identifier):
        found = next((c for c in datasets[run]["cases"] if c["id"] == identifier), None)
        if not found or not found["frames"]:
            raise ValueError(f"Missing captured case {run}/{identifier}")
        return found

    def selection(run, identifier, label, explanation, preferred_time=.7):
        item = case(run, identifier)
        preferred_view = "detail" if "detail" in item["views"] else item["views"][0]
        frames = [f for f in item["frames"] if f["view"] == preferred_view]
        nearest = min(frames, key=lambda f: abs(f["time"] - preferred_time))
        return {
            "id": identifier, "label": label, "explanation": explanation,
            "run": run, "prefab": item["prefab"], "view": preferred_view,
            "frames": [{k: f.get(k) for k in ("image", "time", "requested", "metadata", "view")} for f in frames],
            "poster": nearest["image"], "posterTime": nearest["time"],
            "gallery": f"{run}/gallery.html#{quote(identifier)}",
        }

    animations = []
    for identifier, label, explanation, time in [
        ("u12-par-waterlaser", "水束：持续到结束", "看主水束退去后，细线与泡泡怎样接尾。研究输入：束端点固定，2.5 秒调用原始 StopLaser。", 1),
        ("u19-par-frostshoot-bullet-with-trail", "冰弹体与原配尾迹", "研究输入：约 50 单位/秒绕圈；2.5 秒冻结运动并停止独立尾迹添点。", .7),
        ("u47-frozesector2", "冰霜扇区", "看扇区内局部事件如何接续出现。固定放置，按资产原始声明播放。", .4),
        ("u29-par-poisonfields", "毒雾领域", "研究输入：3 秒停止发射，并停止独立尾迹添点。", 1),
        ("u52-par-blueflashend", "蓝色闪光退场", "固定放置，按资产原始声明播放。", .1),
    ]:
        item = selection("unity-continuous", identifier, label, explanation, time)
        animation = root / "unity-continuous" / identifier / "native-animation.webp"
        if not animation.is_file():
            raise FileNotFoundError(animation)
        item["animation"] = animation.relative_to(root).as_posix()
        tail_run = "unity-detail" if identifier in {"u12-par-waterlaser", "u19-par-frostshoot-bullet-with-trail"} else "unity-broad"
        item["tailGallery"] = f"{tail_run}/gallery.html#{quote(identifier)}"
        item["duration"] = max(f["time"] for f in item["frames"]) - min(f["time"] for f in item["frames"])
        item["sourceSamples"] = len(item["frames"])
        animations.append(item)

    representatives = [
        selection("unity-wide", "u04-par-fireexplosion", "火焰爆发", "看尖锐主体、软烟和细火星如何先后退场。", .1),
        selection("unity-broad", "u05-par-poisonshoot-hit", "毒液命中", "看最初放射形怎样交给液体薄片、液滴和云团。", .2),
        selection("unity-broad", "u06-par-waterexplosion", "水花爆发", "看水花、水纹环、星点与上升泡泡的空间分工。", .2),
        selection("unity-volume", "u00-windcharge", "风系蓄能", "完整体积补拍：中心、弯曲纹理、流线和散点。", 1.5),
        selection("unity-volume", "u01-healcharge", "治疗蓄能", "与风系蓄能对照形状、色谱和伴随星芒的变化。", 1.5),
        selection("unity-volume", "u35-par-holyshield", "护盾体积", "观察亮面、暗面、轮廓和体积之间的关系。", 1.5),
    ]
    layers = [selection("unity-volume", identifier, label, "", .7) for identifier, label in [
        ("u00-windcharge", "完整组合"),
        ("wind-isolation-rings", "中心与环"),
        ("wind-isolation-curved-texture", "弯曲纹理"),
        ("wind-isolation-flow-trails", "轨迹流线"),
        ("wind-isolation-points", "散点"),
    ]]
    comparisons = []
    for identifier, label in [("u00-windcharge", "风系蓄能"), ("u04-par-fireexplosion", "火焰爆发"),
                              ("u29-par-poisonfields", "毒雾领域"), ("u34-par-greenshield", "绿色护盾")]:
        comparisons.append({"label": label, "variants": [
            selection(name, identifier, title, "", .7) for name, title in [
                ("unity-condition-base", "暗背景 · Bloom 1"),
                ("unity-condition-no-bloom", "暗背景 · 无 Bloom"),
                ("unity-condition-light", "浅背景 · Bloom 1"),
            ]
        ]})
    links = [{"href": f"{name}/gallery.html", "label": label, "explanation": explanation,
              "frames": datasets[name]["frameCount"], "cases": len(datasets[name]["cases"])} for name, label, explanation in RUNS]
    links += [{"href": "expanded-index.html", "label": "扩展资产索引", "explanation": "源资产结构、参数和参考入口；属于结构证据。"}]
    data = {
        "animations": animations, "representatives": representatives, "layers": layers,
        "comparisons": comparisons, "links": links,
        "frames": sum(d["frameCount"] for d in datasets.values()),
        "calibrated": sum(d["calibration"].get("passed") is True for d in datasets.values()),
    }
    return output, data


HTML = r'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MasterMagicFX · 原生参考研究</title>
<style>
:root{color-scheme:dark;--bg:#11161d;--panel:#1b232e;--line:#344252;--muted:#a6b4c6;--text:#f0f3f7;--accent:#a3d3fd}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,"Microsoft YaHei",sans-serif}button,select{font:inherit;color:var(--text);border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:9px 13px;cursor:pointer}button:hover,button.active{border-color:var(--accent);background:#2b4055}button:focus-visible,a:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}a{color:var(--accent)}header,main{max-width:1320px;margin:auto;padding:27px 28px}header{padding-bottom:17px}h1{font-size:26px;letter-spacing:.02em;margin:0 0 7px}h2{font-size:20px;margin:0 0 7px}p{margin:5px 0}.muted,.note{color:var(--muted)}.note{font-size:12px}.kicker{color:var(--accent);font-size:12px;letter-spacing:.08em;margin-bottom:8px}.topline{display:flex;justify-content:space-between;align-items:flex-start;gap:30px}.stats{font-size:12px;color:var(--muted);text-align:right;white-space:pre-line}nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:21px;border-bottom:1px solid var(--line);padding-bottom:15px}main{padding-top:9px}.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin:17px 0}.toolbar.small button{font-size:12px;padding:7px 10px}.large{margin:15px 0;background:#0b0f15;border:1px solid var(--line);border-radius:11px;overflow:hidden}.large img{display:block;width:100%;height:min(64vh,780px);object-fit:contain}.large figcaption{display:flex;justify-content:space-between;gap:15px;padding:9px 13px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.strip{display:flex;gap:7px;overflow-x:auto;margin:13px 0;padding-bottom:8px}.strip button{padding:4px;flex:0 0 100px}.strip img{display:block;width:90px;height:68px;object-fit:contain;background:#0b0f15}.strip span{font-size:11px}.source{font-size:11px;overflow-wrap:anywhere;color:var(--muted);margin-top:10px}.conditions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:17px}.conditions figure,.layer-grid figure{margin:0;background:#0b0f15;border:1px solid var(--line);border-radius:9px;overflow:hidden}.conditions img,.layer-grid img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain}.conditions figcaption,.layer-grid figcaption{padding:9px 11px;font-size:12px;color:var(--muted)}.layer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.layer-layout{display:grid;grid-template-columns:1.15fr 1fr;gap:15px;align-items:start;margin:18px 0}.layer-layout>.large{margin:0}.layer-layout>.large img{height:auto;aspect-ratio:4/3}.resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin:20px 0}.resource{display:block;text-decoration:none;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:17px}.resource strong{display:block;color:var(--text);font-size:15px}.resource span{display:block;font-size:12px;color:var(--muted);margin-top:7px}.resource:hover{border-color:var(--accent)}footer{max-width:1320px;margin:0 auto;padding:20px 28px 35px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}.inline-links{display:flex;flex-wrap:wrap;gap:15px;font-size:12px;margin:12px 0}.control-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.badge{font-size:11px;border:1px solid var(--line);border-radius:20px;padding:4px 10px;color:var(--muted)}
@media(max-width:900px){.topline{display:block}.stats{text-align:left;margin-top:10px;white-space:normal}.layer-layout{grid-template-columns:1fr}.conditions{gap:7px}.resource-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){header,main{padding:20px 14px}.large img{height:48vh}.conditions{grid-template-columns:1fr}.resource-grid{grid-template-columns:1fr}.conditions img{max-height:45vh}.layer-grid{gap:7px}h1{font-size:22px}nav button{padding:8px;font-size:13px}}
</style>
<header><div class="kicker">MASTER MAGIC FX / 原生参考研究</div><div class="topline"><div><h1>先看实际画面，再看它如何组成</h1><p class="muted">这里展示 Unity 原资产的后台渲染参考，不是 Minecraft 已实现的效果。</p><p class="note">运动、停止、背景和 Bloom 属于明确标注的研究输入；材质和粒子模块来自原资产。</p></div><div id="stats" class="stats"></div></div><nav id="nav"></nav></header>
<main id="content"></main><footer>画面按需加载。连续动画来自密集原生采样；其他缩略序列是离散时刻，不能当作连续录像。每一批画廊都保留源路径、实际时刻、渲染条件和颜色校准记录。</footer>
<script id="study-data" type="application/json">__DATA__</script><script>
(()=>{'use strict';const D=JSON.parse(document.getElementById('study-data').textContent),$=id=>document.getElementById(id),main=$('content');let tab='motion',aIndex=0,rIndex=0,cIndex=3,layerTime=.7,conditionTime=.7;const titles={motion:'连续画面',examples:'代表样例',layers:'拆开 WindCharge',conditions:'条件对照',resources:'全部资料'};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},n=v=>Number(v).toFixed(3),nearest=(item,t)=>item.frames.reduce((a,b)=>Math.abs(a.time-t)<Math.abs(b.time-t)?a:b);
function link(text,href){const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener';return a;}
function intro(title,note){main.append(el('h2',title),el('p',note,'note'));}
function buttons(items,index,callback,cls=''){const bar=el('div',undefined,'toolbar '+cls);items.forEach((item,i)=>{const b=el('button',item.label);if(i===index)b.classList.add('active');b.onclick=()=>callback(i);bar.append(b);});return bar;}
function figure(src,caption,large=false){const f=el('figure',undefined,large?'large':'');const img=el('img');img.src=src;img.alt=caption;const cap=el('figcaption');cap.append(el('span',caption),link('原图',src));f.append(img,cap);return f;}
function show(){main.replaceChildren();[...$('nav').children].forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));if(tab==='motion')motion();if(tab==='examples')examples();if(tab==='layers')layers();if(tab==='conditions')conditions();if(tab==='resources')resources();history.replaceState(null,'','#'+tab);}
function motion(){intro('约四秒的原生连续片段','点击播放才加载当前动画。固定步长模拟、约 30 fps 密集采样。片段循环跳回不代表源特效退场；更长尾部可从下方采样入口查看。');main.append(buttons(D.animations,aIndex,i=>{aIndex=i;show();}));const item=D.animations[aIndex];main.append(el('p',item.explanation,'note'));const control=el('div',undefined,'control-row'),play=el('button','播放当前连续画面'),still=el('button','返回代表静帧');control.append(play,still,el('span',`${item.sourceSamples} 个原生采样时刻 · 约 ${Math.round(item.duration)} 秒`,'badge'));main.append(control);let current=figure(item.poster,`代表静帧 · 实际 ${n(item.posterTime)} s`,true);main.append(current);play.onclick=()=>{const next=figure(item.animation,`原生连续采集 · 约 ${Math.round(item.duration)} 秒循环`,true);current.replaceWith(next);current=next;};still.onclick=()=>{const next=figure(item.poster,`代表静帧 · 实际 ${n(item.posterTime)} s`,true);current.replaceWith(next);current=next;};const links=el('div',undefined,'inline-links');links.append(link('连续片段的逐帧记录',item.gallery),link('较长尾部采样',item.tailGallery));main.append(links,el('div','源 Prefab · '+item.prefab,'source'));}
function examples(){intro('代表样例：看层次怎样交接','这些是离散采样图。选择样本，再点击下面的时刻；完整视角和检查记录在各自画廊。');main.append(buttons(D.representatives,rIndex,i=>{rIndex=i;show();}));const item=D.representatives[rIndex];main.append(el('p',item.explanation,'note'));let frame=nearest(item,item.posterTime),current=figure(frame.image,`实际 ${n(frame.time)} s · ${frame.view}`,true);main.append(current);const strip=el('div',undefined,'strip');item.frames.forEach(f=>{const b=el('button'),img=el('img');img.src=f.image;img.loading='lazy';img.alt=`${n(f.time)} 秒`;b.append(img,el('span',n(f.time)+' s'));b.onclick=()=>{const next=figure(f.image,`实际 ${n(f.time)} s · ${f.view}`,true);current.replaceWith(next);current=next;[...strip.children].forEach(x=>x.classList.toggle('active',x===b));};strip.append(b);});main.append(strip,link('进入该样本的完整画廊',item.gallery));}
function timeButtons(values,selected,callback){return buttons(values.map(t=>({label:n(t)+' s'})),values.indexOf(selected),i=>callback(values[i]),'small');}
function layers(){intro('一套 WindCharge，分开看各组 Renderer','看中心、长曲线、细流与散点如何分担不同尺度的表现。独显只改变可见 Renderer；模拟、粒子配置和源脚本照常运行。完整组合与单组画面来自独立采集。');main.append(timeButtons([.2,.7,1.5],layerTime,t=>{layerTime=t;show();}));const full=nearest(D.layers[0],layerTime),layout=el('div',undefined,'layer-layout');layout.append(figure(full.image,`完整组合 · ${n(full.time)} s`,true));const grid=el('div',undefined,'layer-grid');D.layers.slice(1).forEach(item=>{const f=nearest(item,layerTime);grid.append(figure(f.image,`${item.label} · ${n(f.time)} s`));});layout.append(grid);main.append(layout,link('查看全部独显时刻与另一视角','unity-volume/gallery.html#wind-isolation-rings'));}
function conditions(){intro('同一参考效果，三种研究观察条件','尤其注意浅背景下外壳和细边的弱化。材质与粒子模块保持原样；三组独立采集只改变所标注的 Bloom 或背景，完整条件及全局 Shader 时间留在帧记录中。');main.append(buttons(D.comparisons,cIndex,i=>{cIndex=i;conditionTime=[1.5,.2,1.5,.7][i];show();}));main.append(timeButtons([.05,.2,.7,1.5],conditionTime,t=>{conditionTime=t;show();}));const grid=el('div',undefined,'conditions');D.comparisons[cIndex].variants.forEach(item=>{const f=nearest(item,conditionTime),fig=figure(f.image,`${item.label} · ${n(f.time)} s`);grid.append(fig);});main.append(grid,el('p','所有 Bloom 开启组均为研究强度 1、阈值 0.6；并非宣称复现作者演示视频的后处理设置。','note'));const links=el('div',undefined,'inline-links');D.comparisons[cIndex].variants.forEach(item=>links.append(link(item.label+'：完整记录',item.gallery)));main.append(links);}
function resources(){intro('完整画廊与结构证据','从各批入口查看全部时刻、视角和诊断；资产索引对应结构分析。');const grid=el('div',undefined,'resource-grid');D.links.forEach(item=>{const a=el('a',undefined,'resource');a.href=item.href;a.append(el('strong',item.label),el('span',item.explanation));if(item.frames)a.append(el('span',`${item.cases} 个采集案例 · ${item.frames} 张原生 PNG`));grid.append(a);});main.append(grid);}
Object.entries(titles).forEach(([key,title])=>{const b=el('button',title);b.dataset.tab=key;b.onclick=()=>{tab=key;show();};$('nav').append(b);});$('stats').textContent=`层次交接 · 尺度分工 · 条件可读性\n按需播放 5 段原生连续画面\n${D.calibrated} 批颜色校准通过`;const hash=location.hash.slice(1);if(titles[hash])tab=hash;show();})();
</script></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    output, data = build(root)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    output.write_text(HTML.replace("__DATA__", payload), encoding="utf-8")
    print(f"Study landing: {output}\n5 real animations; {data['frames']} captured PNG frames; {data['calibrated']} calibrated runs")


if __name__ == "__main__":
    main()

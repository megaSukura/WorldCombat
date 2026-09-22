# WorldCombat 粒子引擎（已实现）

2026-09-18：引擎随 `world-combat-core` 完成并通过构建与纯逻辑检查。作者面是定义格式 v2，运行面是 `ParticleDirector` + `EmitterRuntime`，粒子的模拟与渲染交给 MadParticle 1.21.1。本文说明现状、用法与限制；格式字段以 [format-v2.md](../../build/p5-engine/format-v2.md) 为准，底层事实以 [madparticle-integration.md](../../build/p5-engine/madparticle-integration.md) 为准。

## 架构

| 层 | 职责 | 代码 |
| --- | --- | --- |
| 单元定义（作者） | 用 moment、发射器、形状、绑定、初速、子粒子写表现，客户端注册 | 单元 `presentation.ts`（`clientSources`） |
| 引擎上层（我们的 Java） | 条目触达、moment 生命周期、锚点、LOD 与预算、生成点/初速/尾迹/子事件调度 | `client/particles/`（`ParticleDirector`、`ParticleInstance`、`EmitterRuntime`、`Shapes`、`Values`、`Anchors`、`ParticleBudget`） |
| 底层（MadParticle） | 每个粒子的模拟、碰撞、表达式运动与实例化渲染 | `MadParticleSink` 把生成描述映射为 `MadParticleOption`，调用 `AddParticleHelper.addParticleClient*` |

- 触达与同步复用现有表现通道：服务端 `world.present`／`world.presentFor` → `SceneState`／`SceneDelta` → 客户端 `ClientPresentation`，不新增粒子专用网络层。
- `ParticleDirector` 在客户端 tick 推进发射器；场景条目只负责标记实例存活与刷新 moment/scale/intensity/tint。条目停止更新超过 10 tick 即按定义 `interrupt` 收束。
- `hide()` 只能停止生成，已交给 MadParticle 的粒子走完自身寿命；`drain` 会等存活粒子自然消亡。

## 单元怎么写

单元在自己的 `unit.json` 声明 `"clientSources": ["presentation.ts"]`，构建把它编译进 profile 的 `client.js`，KubeJS 作为客户端脚本加载。`presentation.ts` 调用：

```ts
WorldCombatParticles.scene("your_namespace:your_effect", 1, definition);   // 定义格式 v2
```

- 定义结构：`{ moments: { <name>: { duration?, exit?, emitters, children? } }, interrupt? }`。`data.moment` 选择 moment，默认 `main`。
- 发射器侧字段：`bind`（`source`/`target`/`projectile`/`point`/`path`）、`offset`、`height`、`orient`（`fixed`/`direction`/`toward`/`velocity`：每 tick 把形状的局部 +Y 转向载荷的 `data.direction`、目标锚点或锚点自身的运动）、`trail`、`start`/`stop`、`rate`/`burst`、`shape`、`speed`/`spread`/`direction`、`lifetime`、`amount`、`positionJitter`/`velocityJitter`、`maxParticles`。
- 形状：`point`/`box`/`sphere`/`hemisphere`/`sphere_surface`/`circle`/`ring`/`arc`/`cone`/`cone_volume`/`line`/`torus`/`cylinder` 围绕单个锚点采样；`polyline`（可 `closed`）与 `polygon` 配 `bind: "path"`，沿载荷 `data.path` 列出的顶点连线或在顶点围成的面内采样，顶点是实体引用（`"source"`/`"target"`/`"projectile"`/UUID）或 `[x, y, z]`，实体顶点每帧跟随。
- 粒子侧字段：`particle`、`spriteFrom`、`size`/`sizeMode`、`color`、`alpha`/`alphaMode`、`roll`/`spin`、`gravity`/`drag`/`deflection`、`velocity`（exp4j，唯一变量 `t`）、`collision`、`interact`、`render`、`light`、`bloom`、`preCalculate`/`reverse`、`child`（该类粒子死亡时由 MadParticle 生成）。
- 完整字段与默认值见 [SDK 类型](../../sdk/client/index.d.ts)；严格校验在 `DefinitionParser`（未知字段、越界、缺必填都会报错）。
- 测试夹具 [particle-sample](../../tests/content/extensions/particle-sample/) 只用于验证持续环绕、爆发+子粒子+表达式螺旋+碰撞碎屑、尾迹三类能力能跑通，用作字段写法参考；正式效果的观感规则见 [视觉语言](P5-visual-language.md)，范本从用户认可的正式内容中选。

## 服务端怎么触发

服务端只发单元 id、参数与绑定，一行即可。一次性（命中、爆发）：

```ts
WorldFeedback.emit(world, "checks:particle_sample", 1, point, { moment: "impact" }, 40);
```

持续（引导、光环，按 key 刷新续期；owner 结束时自动撤回）：

```ts
WorldFeedback.keep(world, "aura", "checks:particle_sample", 1, point, { moment: "main" }, 40);
```

`data` 可带 `moment`/`seed`/`scale`/`intensity`/`tint`/`event`/`direction`/`path`；`scale` 乘尺寸，`intensity` 乘发射量，`tint` 与 `color` 逐通道相乘，`direction` 供 `orient: "direction"` 的发射器定向，`path` 供 `bind: "path"` 的发射器取顶点（实体引用用 `String(actor.ref())`）。实现见 [world-feedback.ts](../../content/mechanisms/world-feedback.ts)，夹具触发见 [particle-sample/rules.ts](../../tests/content/extensions/particle-sample/rules.ts)。

## 粒子类型与贴图

- `particle` 取已注册类型 id：原版如 `minecraft:flame`、`minecraft:end_rod`；Cobblemon 贴图用 `world_combat_core:cobblemon/<path>`。
- 贴图清单 [particle_types.txt](../../mods/world-combat-core/src/main/resources/assets/world_combat_core/particle_types.txt)：每行 `cobblemon/<path> <帧数> <帧宽>x<帧高>`，例如 `cobblemon/generic/impact/impact_electric 7 8x8`；类型 id 为 `world_combat_core:cobblemon/<path>`。
- Cobblemon 的粒子贴图大多是序列帧条。生成工具 [generate-particle-types.mjs](../../tools/generate-particle-types.mjs) 读 Cobblemon jar 里的 Bedrock 粒子定义（`bedrock/particles/**.particle.json` 的 flipbook 网格）确定每张贴图的帧矩形，写出 `assets/minecraft/atlases/particles.json` 的 `unstitch` 图集源，把每帧登记为独立 sprite `world_combat_core:cobblemon/<path>/<n>`，粒子 JSON 按顺序列出各帧。没有定义覆盖的贴图按方形帧条推断，否则整图一帧。贴图仍是对 Cobblemon PNG 的引用。
- `spriteFrom` 默认 `age`：多帧类型在粒子寿命内播放一遍（等价于 Bedrock 的 stretch_to_lifetime）；`random` 固定取一帧。按固定 fps 循环的帧动画没有对应，用寿命长度控制播放速度。

## 预览

客户端命令 `/wcparticle <id> [moment] [ticks] [here]`：默认在视线落点播放 `main` 60 tick；加 `here` 在脚下播放并以玩家为 `source`；`moment` 与 `ticks` 可选。定义未注册会提示 unknown。`/wcparticle stats` 打印定义数、实例、sink 计数、粒子引擎总数、实例化渲染数与 MadParticle 开关；`/wcparticle oit <true|false>` 运行时切换 MadParticle 的半透明方式用于对比。实现见 `ParticleCommand`。

## 限制

- `hide` 只停止生成；已生成的粒子无法召回，跟随类效果用「短寿命 + 持续生成」近似，粒子本身不能跟随实体。
- 尺寸是近似值：MadParticle 的基准 quad 在 0.1–0.2 块间随机，`size` 按 `blocks / 0.15` 映射，存在固有抖动。
- `color` 单色；渐变用多层发射器或子粒子。单轴 `velocity` 表达式会覆盖该轴的 gravity/drag/deflection。
- 粒子 quad 是正方形；非方形帧（如 114x14 的闪电条）会被压成方形，选贴图时看清单里的帧尺寸。
- MadParticle 的 `takeOverRendering/takeOverTicking` 由核心 Mod 在客户端启动时从 `ALL` 改为 `VANILLA` 并写回配置：`ALL` 会把 Cobblemon 的 Snowstorm 粒子放到工作线程 tick（捕获时闪退）并改写其渲染队列；`VANILLA` 只接管原版粒子类，我方粒子固定走 `INSTANCED` 不受影响。实现见 `MadParticleCompat`。
- T88 的网络分析器会在工作线程上对每个收发的包再调一次 `encode` 来量尺寸，且没有开关。任何把未解码字节留在一次性缓冲、到 `handle` 才解码的包都会被它先消费掉（Cobblemon 的 `set_party_pokemon` 就是这样，症状是队伍栏消失、伙伴菜单空白）。核心 Mod 用 `T88NetworkWatcherMixin` 直接取消 `NetworkWatcher.record`，整合包内所有 Mod 的包都不再被重编码；`T88Compat` 另把四个已知的 Cobblemon 包 id 写进 T88 自带的黑名单作为兜底。客户端日志出现 `WorldCombat disabled the T88 network analyzer` 即表示已生效。
- MadParticle 版本：1.21.1 NeoForge 只有 0.8.21（2025-01）；1.0.0 预览版面向 1.21.7/8，26.1 系列面向 MC 26.1。后续若需要 1.0 的渲染改进，从 0.8.21 对应提交 fork 出 1.21.1 分支回移。
- 需要 OpenGL 4.0；渲染走 MadParticle 的实例化层。
- **前置**：MadParticle（GPL-3.0，© USS_Shenzhou，[项目主页](https://modrinth.com/mod/mad-particle)）与 T88 是必需外部前置，不内嵌、不复制代码；发行说明与 `neoforge.mods.toml` 已标注。两者为 CLIENT 侧依赖，客户端实例的 `mods/` 必须安装，专服不需要。

## 检查与构建

```powershell
node tools/check-content-syntax.mjs tests/content/extensions/particle-sample
node tools/build-content.mjs --tests
.\gradlew.bat :world-combat-core:build --offline --console=plain --no-daemon
```

`build-content` 对每个 profile 分别用服务端与客户端 SDK 做类型检查；`build` 运行 `particleChecks` 等纯逻辑检查，并构建两个 Mod。

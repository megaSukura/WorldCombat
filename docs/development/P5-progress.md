# P5 开发交接

## 2026-09-21：自由验收手册

756 招已装配到独立 `review-world`。双击 `启动验收.cmd` 直接进入，右键手册提供可搜索筛选的任意招式选择、正式伙伴指挥与施放、玩家亲自对战、目标与条件工具。反馈按可编辑条目保存，历史条目可复制改写；操作后停留当前招式。用法与步数见[验收手册](review-workbench.md)，原始要求与处理范围见[反馈记录](../../archive/feedback/2026-09-21-review-workbench.md)。

本轮技术结果见 `build/review-checks/latest.json`；编译和内容装配日志为 `build/review-free-build.log`、`build/review-free-content.log`。沿用之前完成的内容与粒子定义检查，客户端体验由用户试玩确认。本轮未开启可见客户端。

首次全量装配修复的广域战力 / 精神场地注册冲突及其回归结果保留在反馈记录中。

## 2026-09-21：756招首轮源码交付收尾

- 已按756招清单收齐189份本轮报告，入口为 `build/p5-batch/reports/full-moves-g<组号>.md`。批量任务采用 `deepseek/deepseek-flash`、16并行，作者时限经用户调整为一小时；最新补交沿用已有源码完成验证与报告。
- 第140组由协调者手动收尾：补齐气旋攻击配置默认值，叶刃场景在有正护甲的存活目标上验证削防，四招静态检查与冒烟通过。冒烟工具现在捕获启动期脚本失败、及时输出日志，并按退出路径回收专服；7项中性回归已接入 `checkSmokeRunner`。
- 按用户最新决定，本轮以现有源码、189份报告和已有验证结果收尾。后续从实际装配或试玩遇到的具体问题推进，修改与验证按影响范围执行。
- 源码入口为 `content/moves/`；作者反馈与建议保留在各组报告。当前交付范围为源码与报告，本批全量运行包的装配及人工体验尚待完成。
- 正式内容与启动入口统一为 `play`：`--phase play`、`runs/play-client`、`build/play-launch`。已有实例和冻结包随命名迁移，启动方法见[运行说明](P5-use.md)。
- 后续按[体验反馈与有限范围改进](../authoring/feedback.md)处理：用户反馈实际玩到的部分，协调者限定每轮修改与验证范围，按根因选择内容或共享层修复；处理结果与认可范围落盘供后续会话接手。

## 2026-09-21：空招式生产基线与派发

- `content/moves/` 已清空旧任务卡检验内容，仅保留 `.gitkeep`；共享内容、单元索引与分发产物已刷新。目录选集支持生产前的空目录，10项隔离检查与装配通过。
- 正式范围为756招、189组、每组4招，采用[正式派发模板](../authoring/moves-template.md)与 `build/p5-batch/full-moves-items.json`。按既定整批回收、统一补缺与返修流程交付；内容集成完成后安排人工试玩。
- 本次派发前按创意、区分度、表现、玩家体验审阅任务卡，组合能力按设计需要选择，资源结算与状态结束后的衔接交由内容决定。执行参数为 `batch_task`、默认 Agent、`deepseek/deepseek-flash`、16并行；用户已授权保存 Git 后启动全量。

## 2026-09-21：动作与持续效果组合能力

- 同一主体可按内容声明的兼容性并行动作，提交后可启动独立子动作；父子生命周期、资源结算和控制权分别管理。持续效果与实体脑可以持有原生投射物，命中回调使用当前有效作用域。作者入口见[组合契约](../CONTENT_AUTHORING.md#动作持续效果与投射物组合)与 SDK。
- 手动输入、伙伴／野生 AI 和原生配招已接通动作实例身份、兼容性判断与暂停恢复。独立复核发现的问题已修正并复核关闭；工程记录见 `build/p5-composition/`。
- 完整 `check assembleDist`、针对性 JVM／脚本回归、两类隐藏原生专服检查通过。当时另以四个旧任务卡检验单元执行了兼容性冒烟；这些单元随后已从正式目录清理。
- 网络协议为 `p5.composition.1`，客户端、专服及共享内容使用同批产物。全量内容交付时，人工体验检查包含持续按键与兼容施放／多步选点并存，以及前台动作和请求结果显示。

## 2026-09-20：共享契约集成完成，准备全量

- 16组设计与本批反馈已归档至[设计演练记录](../../archive/design-pilot-2026-09-20/README.md)，其中包含实体统计、分组口径与工程复核结果。
- 共享事实、元数据、动作许可与资源身份、状态载体、AI选目标与站位、几何/粒子数值绑定，以及注册表Tag、组件物品栈和原生世界操作已完成通用化对接。当前用法从[创作指南](../CONTENT_AUTHORING.md)、SDK与对应共享代码读取。
- 完整构建与回归、28场景/120 moment回放、隐藏专服加载、现有四招smoke、私有构建隔离均通过；验证命令保存在归档的 `review/verification.json`。动态视觉与操作体验按人工试玩安排。
- 正式任务卡已纳入版本管理：[任务正文](../authoring/moves-task.md)、[派发模板](../authoring/moves-template.md)。756招/189组派发单及完整上下文预览已重新生成；单服启动描述、共享产物与单元索引已准备。全量作者尚未派发。

## 2026-09-20：首批16位作者设计演练

- 用户决定先演练正式清单前 16 组、每组 4 招；审阅本批设计后再决定后续派发。作者使用完整正式任务卡，追加设计阶段约定，写入各自 JSON 设计报告，最终只回 `DONE`／`PARTIAL`。
- 已通过 `batch_task` 派发默认 Agent、`deepseek/deepseek-flash`、16 并行；16 位作者全部交回，约 10 分钟，64 招报告的结构与分配覆盖检查通过。设计与实现可行性等待审阅，后续源码生产尚未启动。
- 审阅入口：[64招设计总览](../../archive/design-pilot-2026-09-20/designs/overview.md)，链接每组完整设计与作者原始报告；[缺口与待确认事项](../../archive/design-pilot-2026-09-20/designs/issues.md)保留作者原文。24 条候选共享缺口含重复与待核实请求，处理结果见归档复核记录。

## 2026-09-20：转入全量正式生产

- 用户决定结束内容试点，使用当前完整正式任务卡进入全量生产，交付继续按四个核心及实现、说明、表现的一致性检查。
- 用户将本轮范围定为已有实装学习者的 756 招。协调者用 [plan-move-batches.py](../../tools/plan-move-batches.py) 按原生说明文本接近度编组，再按每组最大学习者数排列，组内也按学习者数排序；已生成 `build/p5-batch/full-moves-items.json`，189 组、每组 4 招，覆盖与唯一归属校验通过。分组与核对由本机脚本完成，子代理承担各组正式创作。
- 私有构建隔离已修复：完整构建发布单元路径索引，作者构建只读取所选目录及依赖。9 项隔离回归、正式／测试内容构建与组合检查通过；两个隐藏专服并行完成四招冒烟。源入口为 [content-manifest.mjs](../../tools/content-manifest.mjs)，作者继续使用原来的两项验证命令。
- 用户接受整批收齐后的统一返修，按 `batch_task` 的 collect-all 返回方式执行：首轮全部作者返回后汇总并核实共享缺口，补共享能力，再批量派发补接、返修与验证，最后统一集成。具体职责见[集成约定](../authoring/integration.md)，正式任务卡与创作指南已同步。派发单已准备，756 招正式创作尚未派发。

## 2026-09-20：正式任务卡第三轮检验

- 共享源码入口已补调用契约；任务卡与创作指南补齐简单招式的机制数值表现关联，以及配置实际有效区间／最终结算的取舍核对。
- 一位默认 Agent（显式 `deepseek/deepseek-flash`）生成四招，作者会话 `ses_f4592d4c9ffeQzQPHh50umzPhm`。四招单元检查、批量冒烟及集成构建／28 场景回放／隐藏专服加载通过，verdant 快照已准备。
- 规则检验及复核：四招均有机制值到特效的接线。寄生种子实际存在抽取速度／单目标总回复的取舍，配置说明“每跳回补更多”与结算不符；剑舞沉稳模式仍会在没有可用攻击时近身起舞，与所写安全条件不符。进取模式近身降权符合其共享顺序设计，满攻击等级时也可有推人／压草收益；初审对取舍与起手限制的判断已据此收窄。
- 以上复核执行了实际公式、效果处理器与共享 AI 调度，使用中性模拟宿主，结论限于脚本逻辑。
- 生产资料已据此小幅更新：正式任务卡明确 AI 施放条件与选择偏好的落实方式，交付前沿完整调度核对包括只有本招可选时的行为；共享入口补充低优先级的候选语义。试点继续用于检验完整原生招式清单并行生产所用的内核与正式任务卡，按四个核心及机制、配置、AI、说明、表现的一致性交付，具体体验由用户试玩。

## 2026-09-19：AI 时机条款局部修正（优先于下方历史记录）

- `build/p5-batch/moves-common.md` 仅修正按协议统一限制出手时机的条款：具体招式的出手条件、PP 取舍与重复施放判断由作者设计。原有一般交战可用性、AI 用途、场景验证要求与 `moves-template.md` 报告格式已恢复。
- 共享硬门已移除：[伙伴运行时](../../content/library/companions/runtime.ts) 删除三个协议的统一和平期 PP／间隔限制及专用施放记账，[用途库](../../content/behavior/world-methods.ts) 由招式自身回调判断战术条件。
- 验证：正式与测试内容构建、`check-content-composition`、`check-world-methods` 通过。新增回归先复现共享门阻挡作者允许的重复施放，再验证三个协议及攻击协议的作者时机、PP 取舍、就绪与忙碌状态；verdant 试玩快照已更新。
- 后续全量覆盖完整原生招式清单，包含已有实现与尚未实现的招式；188 招是此前批次规模。

## 2026-09-19（深夜）：重写前的共享层缺口；任务卡已按公式写法更新

- 用户试玩磨爪暴露四个共享层问题，均已修（`7d7c375`、`3e35a81`、`14b171d`）：prepare 协议理由标签"准备光能"→"准备"；lang 里 `%` 紧跟字母或收尾会让整串原样显示，`check-unit` 现在会查（全库只有磨爪 6 条）；**能力等级此前对非宝可梦静默无效**（54 招的加攻降防对玩家和原版生物是空的），现在 [CombatStages](../../content/mechanisms/combat-stages.ts) 把等级落到攻击/护甲/移速属性上并脱战消退，`NativeEffects.boost` 对所有对象有效；**维持类协议（prepare/fortify/reveal）的出手时机改为共享决定**（[runtime.ts](../../content/library/companions/runtime.ts) `fightAtHand` 与协议门：要打了才放，和平期留三分之一 PP、一分钟最多一次）。
- `smoke-unit.py` 支持一次多个单元（一台专服、每场景新场地、每单元一份判定），冒烟舞台新增 `attribute(actor, id)`；场地换位后等 20 tick 再铺地（新区块要加载）。
- 任务卡 `build/p5-batch/moves-common.md`／`moves-template.md` 已更新：参数由公式定义、伤害段写法、"威力"不再是交付概念、已有 `content/moves/<id>` 是要被替换的旧实现、维持类招式不自设时机选项、一人几招一次冒烟、场景代码写在回调内。
- 待用户确认：AGENTS.md 第 5 条（范本进提示词）与"任务卡不放例子"的方向冲突，建议改为"验收内容只作共享层与工具的验证材料"。
- 用户在游戏里可验证：玩家放剑舞后近战伤害上升（`/attribute @s minecraft:generic.attack_damage get`）；野外伙伴不再循环放增益。
- 下一步：用户确认任务卡 → 全量重写批次（deepseek，一人数招，16 并行）。

## 2026-09-19（夜）：提示词按四个核心重写；下一项是详情页悬浮公式

- 用户定下内容工作的四个核心：**创意**（一个念头展开的深度）、**区分度**（场上一眼分开；同一招在不同精灵手里也分开——所以参数大量依赖精灵数据并分散到多个参数，链条再传到表现）、**表现**（粒子画出范围、运动、数）、**玩家体验**。其余规则都是手段。任务卡 `build/p5-batch/moves-common.md` 与模板 `moves-template.md` 已按此重写；藏得深的"槽位式例子"（反制、走位要求、至少两类对象、家族差异候选、固定报告栏目）已去掉，改为"一切都是材料，念头用到才有"。`docs/CONTENT_AUTHORING.md`、`docs/plans/P5-visual-language.md` 只改了与核心直接冲突和事实过期的段落。
- **用户报告（已处理，见下条）**：招式详情页鼠标悬浮的数值说明不清晰。此前 `runs()`/`UiText` 只渲染一层"标签: 值"，伤害单独拼一串因子，看不出运算关系。
- **详情页悬浮公式（已实现，待用户可见验证）**：参数由 [Formula](../../content/mechanisms/formula.ts) 表达式树定义，出招走编译闭包（零标签分配），悬浮走 `Formula.explain` → 绑定 `{label, value, formula[], contributions[], description}` → [UiText.java](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/client/UiText.java) 渲染"值 → = 公式 → 逐项缩进递归（同一项只列一次，深度 ≤ 6）"。伤害走同一棵树：[CombatantStats.damageFormula](../../content/mechanisms/combatant-stats.ts) 由 `calculate`（实战）与 `PokemonDamage.explain`（悬浮）共同求值，威力参数作为其中一项展开；对手侧因子留在 `resolve`。`parameterContext` 改为懒加载 attributes/config（此前每次 `p()` 都读个体存储与配置）。范例 [tackle/parameters.ts](../../content/moves/tackle/parameters.ts)；作者写法见 `docs/CONTENT_AUTHORING.md`"参数由公式定义"。旧 `evaluate(scope, base)`／`contribute` 仅保证 188 个存量招式构建通过（静默 Scope），全量重写时换成公式。留待：`F.stat("speed")` 走原生属性未含世界修正；`preview()` 仅 weatherball/hiddenpower/terablast 三招还在用，重写时删。
- 之后：用户在游戏里打开 tackle 详情页看悬浮（冲量威力 → 理论伤害 → 基础值 → 威力 → 速度冲量 → 速度），确认可读性后再抽 20 招审阅。

## 2026-09-19（午）：TPS 诊断与脚本成本，下一步是 frame 下沉 Java

- 复现与量测：`python tools/profile-server.py --client`（无头专服 + 冻结的试玩客户端自动进服，脚本 [profile-load.js](../../tools/profile-load.js) 给伙伴与野生；会弹一个游戏窗口）。输出 `/debug` TPS、`/perf` 分层、JFR 采样与**脚本账本**。账本来自 [ScriptProfile](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/ScriptProfile.java)：钩子、效果处理器、动作步骤、战术脚本的墙钟时间按名字累计，游戏内 `/worldcombat profile` 查看并重置；脚本内可用 `WorldCombat.clock()`／`measured(key, t)` 细分。
- 根因：KubeJS 的 Rhino 只有解释器，脚本里的逐 tick 轮询和逐对象快照成本是 Java 的几十倍。已改：四个共享机制离开 `actor_tick`（新事件 `world_combat:actor_changed`——Pokemon 任一字段变化经 `Pokemon.onChange` mixin 合并为每 tick 一次；`world_combat:mob_effect_added`；野生控制器改为每个居民一个 `world_combat:wild/clock` 效果的定时器，受伤即 `…/wake`）；效果查询先按目标过滤；宝可梦域检查去掉关卡查表；`CombatWorld.survey()` 一次调用返回邻域 JSON（含域公开事实 `facts`）；`CobblemonCombat.pokemon()` 快照按 tick 缓存、写入即失效。测得 1 玩家 + 3 伙伴 + 约 70 只自然生成野生：10.5 → 20 TPS，但服务器线程仍满载。
- 剩余分母：野生一次决策约 2.3 ms 解释执行——`frame` 1.34 ms（[world-host.ts](../../content/behavior/world-host.ts) `capture`、[pokemon-host.ts](../../content/behavior/pokemon-host.ts) `frame` 的技能槽／属性／性格／装备拼装）与 `run` 0.93 ms（[composition.ts](../../content/behavior/composition.ts) 行为树运行时）。生态要上百只野生同时活着，节拍只能线性放大。
- 午后已做（已提交）：技能偏好有效值按个体×招式缓存，存储串不变即复用；野生时钟随局势调节（周围有玩家／敌对／有主宝可梦／被攻击者或动作进行中 4 tick，安静 20 tick，`damage_applied` 立刻 `…/wake`）；行为运行时四个阶段接入账本（`WorldBehavior.profile`，测试环境为空实现）；`raindance`／`sunnyday` 的目标先查自己有没有这招再查世界（原先每只宝可梦每次决策都扫全场效果，占决策 20%）。结果：决策 2.56 → 1.74 ms，服务器线程脚本占比 115% → 85%。
- 当前分解（每次决策）：frame 1.04（skills 0.57 = 4 槽 × describe+ready，capture 0.28 = survey JSON 解析，enrich 0.18）、run 0.60（propose goals 0.25：约 50 个目标提供者每次全跑）。70 只野生约占 6 ms/tick，可以接受；上百只需要下一步：**frame 下沉 Kotlin**（技能槽 describe 的 resolve 仍是各招式 TS，可保留为回调），以及目标提供者按招式声明 `use`，运行时只对持有该招的个体调用。后者同时是任务卡规则："目标先确认自己持有能力，再触碰世界"。
- 招式 bug 五类已落成共享层保证（提交 `0d0f108`）：宿主数组在 SDK 声明为 `readonly`（`.push` 在 check-unit 类型检查阶段报错）；`present` 的 key 接受拼接标签；`WorldFeedback` 时长由库收敛（上限 6000）；未注册 MobEffect id 与效果时长越界的报错写明修法与上限；check-unit 新增 MobEffects id 核对（`checkMobEffectIds`）；防御目标下所有攻击都拒绝远处威胁时，`engage` 给出 `close-in` 走近到最近射程。任务卡 `build/p5-batch/moves-common.md` 已补四条（距离归 approach、目标先查能力、状态从事件来／节奏从定时器来、数组与 key 约定）。agility 的效果 id 已改正，其余 116 个含 `maxChase` 的 `accepts` 保持原样，由 close-in 兜底。
- 下一步：frame 下沉 Kotlin、目标提供者按 `use` 声明；之后再议新一波招式。

## 2026-09-19（晚）：冒烟剧本——作者自己在无头专服上验证

- 用户决定：验证瓶颈在人，不在生成。机器只判最基础的事（脚本无 error、断言里的必然事实），"收不收干净"不管；不设第二个审阅 agent；作者**自己**跑专服。实测一次约 40 秒、2 GB，16 并行可行。
- 已交付（`98b14dd`）：`sdk/smoke/index.d.ts` 舞台接口；`content/smoke/runtime.ts`（单元 `world_combat:smoke`，用 KubeJS 全局与 Cobblemon 类布置竞技场、订阅 `committed`／`damage_applied`／`mob_effect_added`／`body_died` 记轨迹、评估断言、`stop`）；`build-content.mjs --scenario`（合成包 `world_combat:smoke_scenario`）；`tools/smoke-unit.py <单元目录>`（私有装配 → 隐藏专服随机端口 → 判定与 `build/smoke/<名>/trace.jsonl`、`server.log`）；`CombatAction.content()`；范例 `content/moves/tackle/scenario.ts`。AGENTS.md 第 6 条、任务卡"验证与边界"已更新。
- 已完成：188 招 batch（16 并行，78 分钟）187 通过、1 超时（megapunch，其半成品改动已回退，scenario 保留）。作者共修了 75 个招式的实现（提交 `797658d`）。归纳在 `build/p5-batch/scenario-shared.md`。据此改共享层（`0e7c967`）：`goalSubject` 在提案期回落到候选目标（12 招"AI 永不选这招"的根因）；`trace` 半径封顶 1、长线自动分段（8 招宽体/长线抛错）；`action.data` 裸键自动加命名空间；冒烟舞台记录效果全部 tag、`team` 原语、实体持久化、`position()` 修正、私有装配纳入 tackle/willowisp/thunderwave/protect 作对手与状态来源。
- 未做（留待）：舞台读取 `WorldEffects`／`WorldBodies` 的原语（43 招希望有）；`world.terrain` 对非整数坐标与被占格的处理；睡眠门对 sleeptalk 的豁免；icepunch/megakick 报告为空，需重跑一次 `smoke-unit` 看结果。
- 之后：用户用 `/wcreview` 抽 20 招看感觉、写备注；备注是单招事实，只交回该招作者；系统性信号改共享层或改卡后重生成，不做规则式批量回改。

## 2026-09-19：世界改动的判断、几何与朝向、原生对象、审阅工具

- 世界改动按性质分工具（[创作指南](../CONTENT_AUTHORING.md)"持久实体、方块与世界"）：租借地形 `terrain` 新增 `linger`（活过招式、按计时器消散）与还原时等活物走开；带方块实体的方块只能换状态；爆炸与落雷只剩冲击和光声。189 招按此重做（第 7–10 波），永久 `placeBlock` 归零，火与冰雪永久打掉，地面用同层替换表达。
- 粒子：`bind: "path"` + `polyline`／`polygon` 在多个实体或点之间画形状；发射器 `orient` 让形状每 tick 转向 `data.direction`、目标或运动方向（[Shapes](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/client/particles/Shapes.java)、[Anchors](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/client/particles/Anchors.java)）。机制侧对应 [`WorldGeometry`](../../content/mechanisms/world-geometry.ts)：扇形、走廊、矩形、环带、多边形在宿主球形查询之上选择对象。
- `world_combat:mob_effect_removed` 延后一 tick、可写，`cause` 区分到期与移除。
- 原生对象直达内容：`nativeEntity`／`nativeLevel`／`nativeBlock`／`nativeBlockEntity`／`nativeEntities`、`spawnEntity`（任意注册实体类型，可带 NBT 与寿命）、`command`；宿主守护的部分保持原样，其余由内容自己放回。
- 审阅工具：客户端 `/wcreview` 打开审阅屏（[ReviewScreen](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/client/ReviewScreen.java)），列出全部招式与判定，一键放出带该招的 50 级伙伴（技能栏第 1 格），一键记录判定并跳到下一待审招式；状态存于 `config/worldcombat/review.json`（[ReviewTool](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/review/ReviewTool.kt)）。
- 验证方式：`gradlew build`（含粒子纯逻辑检查）与 `node tools/build-content.mjs`；专服场景不再作为常规验证。

## 2026-09-18（夜）：宿主能力波，招式 1/4 修订

- 世界能力（[`CombatWorld`](../../sdk/core/world.d.ts)，实现 [`NativeWorldWrites`](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/NativeWorldWrites.java)）：永久放置／破坏方块、方块实体 NBT 读写、容器存取、掉落／给予物品、爆炸、落雷、点火、设仇恨、天气；任意实体的速度与骑乘；投射物追踪／穿透／弹墙（[`CombatProjectile`](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/CombatProjectile.java)）；外观新增方块形态与旋转。
- 自定义持久实体 [`ScriptedBody`](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/ScriptedBody.java)：脑是源与目标都为自身的持久效果，实体随原版 NBT 保存，效果随世界数据保存，重启后在 `restorePending` 重新接上；交互／触碰／碰壁／死亡走宿主钩子，[`WorldBodies`](../../content/mechanisms/world-bodies.ts) 路由到脑；友好关系沿召唤者、再沿主人玩家。专服验证 `python tools/check-server.py core --p4-script bodies`。
- 伙伴 AI 钩子（[`WorldMethods.Use`](../../content/behavior/world-methods.ts)）：`available` 收到提案目标、`priority`（≥100 视为紧急、越过共享目标顺序）、`approach`（怎样够到）、`after`（放完接什么）；`prepare` 目标在交战中也会提出。
- 招式 1/4 按用户试玩反馈修订一轮（AI 每招一套、表现按视觉语言重写、范围可读、数量放开）；报告 `build/p5-batch/reports/w6-moves-revise-g*.md`。核心修复：无选择的 AI 施放按声明步骤从目标合成（输入契约招式此前 AI 放不出）、未知音效不再禁用招式、`present` 裸 key 落到本招命名空间；check-unit 校验音效 id。
- 待办：作者报告里剩余的共享缺口（点绑定表现拿不到朝向、`kind:"self"` 招式 `reach` 不驱动接近、A→B 连线粒子绑定）；`--p5-status` 过时测试；近义状态身份合并。

## 2026-09-18（晚）：共享状态身份，招式全量第 1/4 装配

- 状态共享身份 = MobEffect tag `world_combat:status/<名>`：消费按身份、生产三条等价路线、词表从原作数据生成（[工具](../../tools/status-vocabulary.mjs)、[常量](../../content/mechanisms/status-vocabulary.ts)），共享 API 见 [combat-status.ts](../../content/mechanisms/combat-status.ts)，默认效果单元 [content/rules/combat-status](../../content/rules/combat-status/)。原生异常镜像只绑六个默认效果；变体的宝可梦层由单元设计。核心新增 `world.mobEffects(actor)` 与 `CombatMobEffect.tags()/tagged()`。旧的世界效果睡眠（`CombatantStatus`）已并入。
- 招式：756 个有已实装学习者的招式按学习者数排序四分，第 1 季度 189 招装进 [content/moves/](../../content/moves/)（分组 `build/p5-batch/w5-q1-items.json`，报告 `build/p5-batch/reports/w5-moves-q1-g*.md`，续做工具 `resume-move-batches.mjs`）。8 个试点招式归档到 `archive/moves-pilot-2026-09-18/`。作者共同提出并已处理：`stages` 改为位移、`resolve.range` 驱动实际接受（`maxRange`）、`windup` 收到 resolve 值、`CompanionBehavior.status` 按身份读状态；仍待处理的反馈见各组报告"规则反馈"（场地层无共享骨架、`impact({status})` 只覆盖主异常、挥发状态缺共享默认行为）。
- 集成时补的作者侧检查：场景定义用引擎 `DefinitionParser` 校验（gradle 输出 `build/particle-checks-classpath.txt`）、Rhino 参数重声明、效果声明正则不依赖变量名；启动 SDK `tag()` 改为单参数。
- 待办：`--p5-status` 剧毒治疗阶段依赖已归档特性，需改测试；宿主能力波清单未确认；作者发明的近义身份（`defense_shred`/`defense_down`/`defense_drop`/`armor_crack`、`soaked` 三个生产者）下一波前合并进词表。

## 2026-09-18：特性试点交付，转入招式

- 正式选集装配 [content/abilities/](../../content/abilities/) 24 个特性单元（3 个已验收范本＋21 个抽样通过），每个单元含机制、浮字与 `presentation.ts` 粒子表现；范本与反馈见[验收表](../authoring/accepted-content.md)。
- 作者侧只读检查 [check-unit.mjs](../../tools/check-unit.mjs)（类型、贴图、lang、图标、拒绝 `actor_tick`）；集成侧一条命令 [check-batch.py](../../tools/check-batch.py)（内容构建→场景抽取→定义回放→专服加载→装配试玩实例）。选集按目录前缀自动收录。
- 核心新增：`world_combat:mob_effect_removed` 事件、伤害载荷 `direct`、`observe().width()/height()`；粒子引擎 `fit: "body"` 按碰撞箱缩放实体绑定发射器；T88 网络分析器禁用（修复队伍不同步）。共享库交战／接触／免疫可破规则统一到所有敌对战斗者。
- 招式管线盘点见 `build/p5-batch/reports/{moves-infra-inventory,sdk-capability-gaps,move-data-source}.md`；宿主能力补齐清单见 `build/p5-batch/capability-wave-1.md`。招式单元进入 `content/moves/`，任务卡 `build/p5-batch/moves-template.md`。
- 试玩实例 `runs/play-client` 已装配当前内容与库；启动 `python tools/input-client.py launch --phase play --confirmed-visible-test`。

以下为历次工程记录。

2026-09-17：当前 26 招及其专属 AI 用途、参数、状态效果、说明、UI 与试玩材料已[归档](../../archive/skills-2026-09-17/README.md)。当前工作进入[共享语义与独立能力讨论](../plans/P5-shared-semantics.md)，基础调查见[168 项上游机制清单](../research/native-state-inventory.md)。下文保留历次工程记录。

> 当前表现方案（2026-09-16）：Photon 及技能视觉特效已归档；LDLib2 界面继续保留。下文的 Photon 检查、截图与特效验收条目属于历史记录，当前边界见[方案调整](particle-presentation.md)。

## 2026-09-15：研究落实为预制库

新增 21 套独立局部组合、100 个已制作配色资源与有限子事件，全部 26 招由各自 `visual.ts` 组合调用。公共材质与预制体采用授权的 MasterMagicFX 贴图、色谱、原网格；实现入口与创作方式见 [内容创作约定](content-authoring.md)。范围边界、主形体、余粒、质量权重分别处理；源研究中的材质内部变化、尺度分工和退场接替已进入实际资源。

已通过构建、发行打包、内容分层、命名预制体与原生播放回归。实际 Shader 检查覆盖 CPU／GPU 粒子与模型；[整件与单体预览](../../build/photon-scene-check/prefabs-v2/prefab-gallery.html)包含 1,400 帧，覆盖 26 招两档质量、21 套独立组合、实际 Birth／Death 子效果与完整清理。[目视复核](../../build/research-mastermagicfx/photon-prefab-v2-art-review.md)记录首轮画面暴露的问题及修正结果。GPU 专项和 CPU 整场景各自保留验证范围。

冻结版 `20260915-161407` 已准备，用户按 [P5-use](P5-use.md) 自行启动。此次未打开游戏窗口；游戏完整画面仍待试玩反馈，P5 阶段验收继续按原目标推进。

## 2026-09-15：特效落实与复验

已完成本批共享播放、真实轨迹、附着曲线和分层退场；八招客户端编排进入各自单元。修正 Photon 模块开关、速度单位和随机尺寸的真实互操作，主体、碎片与余粒分别设计。创作入口见 [内容约定](content-authoring.md)。

完整 [build assembleDist](../../build/vfx-build.log)、原生粒子采样、275 帧整件渲染及两组真实专服（17 招与八招支援）通过；坐标、出生、命中和结束均有实际执行检查。冻结版 `20260915-121734` 已准备，游戏观感由用户自行启动复验，入口见 [P5-use](P5-use.md)。本批未启动游戏窗口。

以下保留此前各批记录。

2026-09-14。**首轮人工反馈未通过；本轮整体返工和技术复验已完成，操作与画面待复验。** 问题集中在交互可用性、技能实际结果与表现的一致性，以及原生数据的适配。上一轮把接口接通和局部检查通过当成了可交付体验，交付判断需要以完整操作链、实际结算和可读性为依据。阶段范围见 [P5 目标](../plans/P5-goals.md)，分层约定见 [开放结构](../plans/P5-structure.md)。

## 本轮修正

- M/H 保持分页、悬停与控件；修复缺省 revision 和 Java/JS 字符串导致的设置写入失败，收放使用一致译名。26 招的说明重写为用途、条件和代价。
- G 使用开放的多层菜单贡献与命令分发，个体和技能可增删子项。基础指挥独立于可用技能数量。伙伴统一管理，提供同行、自主、驻守、原地待命；旧自由模式迁为自主活动。
- 自身技能直接作用自身；右 Alt 和 G 子项可指定玩家，具体技能判断对象是否合法。重复失败、条件不足和无效目标均进入即时反馈。
- 花瓣舞实际转向并结算三波，日光束与汲取逐波命中；区域指示使用技能真实范围。替身显示付费、耐久、承伤与破碎，毒性消费显示实际结果。挺住固定保留 1 HP，设置百分比明确为 AI 使用阈值。
- Photon 使用持续实例、原生时间轴、旋转和体积网格组织表现；修正预览重启、相对光束端点、脚部锚点与提示遮挡。持续效果与当前行动分别显示。
- 首族脚本将原生最大 HP 用作世界基础容量，普通世界伤害按同一 HP 单位结算。适配层保留原生整数 HP 的小数精度余量，并同步原版治疗；MC 力量／虚弱及兼容的原生攻击属性进入脚本物理伤害。

玩法、时序、AI 选择、菜单组成和表现留在脚本库及内容层；核心提供通用目标、属性观察、执行与事件能力，适配 Mod 负责原生对象、数据和生命同步。每招保留各自的全局默认与个体偏好。实现入口见 [已选技能](../../content/collections/p5.json)、[共享机制](../../content/mechanisms/)、[客户端](../../content/client/)及 [原生适配](../../mods/cobblemon-world-combat/src/main/)。

## 技术证据与剩余验证

统一构建和发行打包已通过；客户端检查实际运行锁定 Rhino 的生产绘制／设置调用，并用锁定 Photon 解析和采样资源、时间轴与网格。脚本检查还覆盖页面稳定、无技能伙伴指挥、嵌套贡献、真实范围与效果清理。它们验证执行和数据，最终画面与操作体验仍待复验。

本轮已通过的真实专服检查：

- [个体设置](../../build/p5-preferences-checks/full.json)：26 招、37 字段的首次修改、更新、过期拒绝、重置、个体隔离与保存。
- [技能执行](../../build/p5-verdant-checks/full.json)：17 招、花瓣舞三波与离场、日光束多波及原生力量／虚弱的实际扣血。
- [支援技能](../../build/p5-support-checks/full.json)：八招的实际防护池、替身、中毒消费、汲取、扎根、解除干扰和 1 HP 保命。
- [伙伴行为](../../build/p5-behavior-checks/full.json)：统一管理、待命、自主探索、主人移动后的跟随及工作与支援。
- [原生状态](../../build/p5-status-checks/full.json)与[完整重启](../../build/p5-status-checks/full-restart.json)：原版唯一结算、双向治愈、外部效果和保存关联。
- [培养与捕捉](../../build/p5-journey-checks/full.json)：实际击倒、反冲、经验／努力值、进化、个体状态保留和原生球捕捉。

- [生命与目标](../../build/p5-vitality-checks/full.json)：小数伤害累计、原版／技能治疗、收放与 NBT 保存后精度、等级稳定、自身生长、敌方治疗拒绝及玩家接受光合作用。
- [作物联动](../../build/p5-cultivation-checks/full.json)与[试玩场景](../../build/p5-playtest-checks/full.json)：原版／Farmer’s Delight 作物、真实治疗与偏好、四组配招、承伤／状态按钮及野外与远距辅助。

## 人工复验与后续

用户已自行保存退出上一轮客户端，本轮未启动新游戏窗口。最终构建与打包通过，记录见 [构建输出](../../build/p5-rework-final-build.log)。新冻结版为 `20260914-150308`，入口见 [frozen.json](../../build/play-launch/frozen.json)。独立存档仍为 **“P5 · 妙蛙族试玩”**，位于 `runs/play-client/saves/foundation-world`；已有队伍、操作设置与存档进度保留。

[P5-use](P5-use.md) 已改为针对反馈的重点复验，并保留关联范围及按需制造条件的场景按钮。正式技能、AI、UI 和表现均可评价；场景按钮负责提供观察条件。此次返工不等于整个 P5 验收完成，完整培养与性格差异、后续代表性内容、正常世界体验及多客户端验证按阶段目标继续推进。

此前 M 详情崩溃来自 Rhino 绘制重载歧义，Photon 运行失败来自泛型参数写入；两者已修复并保留真实互操作回归。首轮窗口及旧冻结版仅保留为反馈背景，新的可玩性结论以本轮复验为准。

## 脚本库结构返工（本次已完成）

用户要求立即完整修复脚本内部的复用结构。本次已将通用行为与宿主适配、技能目录服务、开放特性组合、Photon 播放器、UI／世界反馈和资源构建工具分开，首族内容实际迁入这些共享实现。漫游／退避参数、能力方法、特性事件、字段与菜单渲染、视觉层和资源命名空间均由调用方继续扩展。使用入口与独立消费者见 [复用脚本](script-libraries.md)。

构建逐包检查声明依赖，同时禁止公共包引用首族。独立机械主体、灌溉界面、Photon 组合和资源生成验证均未加载 Verdant；真实 Rhino 与 Photon 原生资源解析通过。[独立专服场景](../../build/p5-reuse-checks/full.json)只加载共享库及一份 Porygon 修复内容，通过特性叠加／替换／抑制、个体 CAS、原生 HP／PP、动作时序与 NBT。原有技能、伙伴与野生行为、状态、支援和培养捕捉专项也已通过。最终 [build assembleDist](../../build/p5-library-build.log) 成功。

新源码和 `dist` 已完成本轮结构交付。用户继续验证冻结版 `20260914-150308`；本轮没有刷新冻结入口、修改客户端目录或操作游戏窗口。人工反馈与这次结构改造分别记录。

## 统一结算、完整数值与表现加载修复

技能对活体采用同一条伤害计算和 MC 结算链，读取各自真实可用的属性。已移除按实体类别选择的归一化、伤害截断及受击者生命容量对伤害的反向放大；额外最大生命可以增加承伤能力。原生防御的重复投影只扣除已参与计算的部分，装备、属性修饰和原生减伤继续生效。通用睡眠共享时钟、行动限制与受击唤醒，原生状态镜像随效果生命周期清理。

26 招的执行与数值说明共用参数；详情展示用途、威力、次数、时序、距离、代价、偏好及属性来源，公共伤害说明包含同源暴击概率与倍率。依赖受益者、目标或原生状态结算的部分明确标出；场地维护边界与实际支付也如实展示。入口见 [技能单元](../../content/skills/) 和 [共同伤害结算](../../content/mechanisms/pokemon-damage.ts)。M/H 按需加载当前招式的完整详情，保留翻页和选择，使用原生译名。

冻结版特效消失来自资源 UUID 编码不符合 Photon 原生反序列化要求。资源已重新生成，播放器分别隔离失败资源并报告。回归现执行完整原生 FX 加载、运行对象创建和真实 Rhino 调用，并验证旧错误格式确实失败；最终屏幕表现仍由人工复验。另修复放出过程中尚未绑定个体实体时遗漏生命投影的问题，首次受击前的原生与世界满血及后续小数精度均已实测。

[完整构建与打包](../../build/p5-unified-build.log)通过，包含数值单源、原生护甲链和全部特效资源加载检查。真实专服通过[统一伤害与睡眠](../../build/p3-native-checks/full.json)、[17 招执行](../../build/p5-verdant-checks/full.json)、[支援](../../build/p5-support-checks/full.json)、[生命同步](../../build/p5-vitality-checks/full.json)、[状态](../../build/p5-status-checks/full.json)及[保存重启](../../build/p5-status-checks/full-restart.json)。[详情与偏好](../../build/p5-preferences-checks/full.json)覆盖全部 26 招、37 字段、四格装备与未装备详情，原生通道的最大完整回复为 10,344 字符。

新冻结版为 **`20260914-182628`**，已更新 [frozen.json](../../build/play-launch/frozen.json)。已有存档与操作设置沿用，本轮未启动游戏窗口。用户按 [P5-use](P5-use.md) 中原命令自行启动，重点复验表现恢复、数值说明和实际结算。

## 2026-09-15｜交互修复与独立创作单元

G 闪退来自 ARGB 颜色传入 Java `int` 时越界，共享 UI 边界已统一转换，并隔离输入、绘制和按钮回调异常。日光束提交后持有方向，首个目标倒下仍继续照射；共享 Photon 播放器恢复被引擎清空的持续实例，光带材质与完整照射期间的原生发射／顶点回归通过。

详情采用短说明与内联数字悬停，完整数据按需展开。实际源侧属性、能力等级、特性、携带物和环境与执行共用计算；目标因素明确留待命中确定。RPC 由原生队伍、MobEffect 和脚本效果变化驱动，关闭面板时保存失效状态。只读检查作用域随请求结束而失效，完整说明通过索引复用数值条目。

26 招迁入[独立单元](../../content/skills/)，[P5 选集](../../content/collections/p5.json)负责装配；每招的参数、专属效果与 AI 用途分别归回该单元。12 个伤害技能的 16 条分支独立设计基础值、系数、节奏与代价，允许额外贡献和特殊公式。对照及理由见[逐招报告](../../build/reports/verdant-balance.md)，参考与创作边界见[内容创作约定](content-authoring.md)。现有持久化和通信标识继续兼容。

两个 Mod 均明确依赖 LDLib2 与 Photon2，适配可深入覆盖和扩充 Cobblemon。共同执行仍归核心，领域接入归适配，玩法组合及独有创作归脚本；按实际需要扩展每一层。

[完整构建](../../build/p5-feedback-final-build.log)及[最终文案打包](../../build/p5-feedback-package.log)通过；真实专服通过[统一伤害／睡眠](../../build/p3-native-checks/full.json)、[技能执行](../../build/p5-verdant-checks/full.json)、[支援](../../build/p5-support-checks/full.json)、[伙伴行为](../../build/p5-behavior-checks/full.json)和[培养捕捉](../../build/p5-journey-checks/full.json)。[详情与订阅](../../build/p5-preferences-checks/full.json)覆盖 26 招、37 字段、实际力量增益及移除、只读作用域和原生变化通知，最大完整回复为 10,606 字符。屏幕观感与实际平衡体验继续由人工复验。

[原生区块卸载](../../build/p4-world-checks/core.json)也已验证临时实体在安全边界释放，缺少运行归属的旧临时实体会清理。新冻结版 **`20260915-030413`** 已准备，沿用现有存档与设置；本轮未操作游戏窗口。自行启动及重点观察见 [P5-use](P5-use.md)。

## 2026-09-15｜参考内容质量整改

按[已审阅方案](../plans/P5-quality-review.md)完成本轮实现。26 招各自定义等级阶段、正文和数值引用；共享求值保留正负、外部及嵌套贡献，说明与执行使用同一来源。旧统一摘要和“全部数值”入口退出生产路径。界面文档使用独立的有界数据格式，支持完整计算依据；原生个体存储和短期效果仍沿用各自限制。

表现层新增可复用的流动、编织、叶片与雾材质，以及原生 Trail、时序和尾段管理。替身具备立体草编主体、保护连接、实际承伤、断联、破碎和到期；毒液冲击依据真实结果区分保毒、消费、击败和截获。浮字与特效分别消费结果，支持聚合、优先级、换行和最后位置。F1 不影响效果生命周期维护。锁定 Photon 的 Trail 平滑细分会产生零长度段，当前以连续原生尾迹及宽度渐变实现，并保留可配置入口。

G 改为持键、点击进入中间层、末级松键执行，支持个人布局；M/H 使用 MC 主题与折叠偏好。25 个原生性格提供独立行为贡献，属性仍采用有效性格。67 项现有持有物规则迁入独立定义，特性和物品可参与非伤害求值。Curios 指南针训练佩饰拥有独立内容包，行为、提示、语言和槽位数据随该包安装。

[完整构建](../../build/p5-quality-final-build.log)、[无 Curios 的默认构建](../../build/p5-quality-default-build.log)与[最终增量检查及打包](../../build/p5-quality-package.log)通过。客户端技术检查包含真实 Rhino、原生 Component、KubeJS 提示事件、36 个完整 Photon 资源、Beam／Trail 实际顶点，以及隐藏 OpenGL 中 28 个 Shader 变体和像素结果；跨内容与单招独立装配通过。

真实专服通过[技能执行](../../build/p5-verdant-checks/full.json)、[支援](../../build/p5-support-checks/full.json)、[伙伴与世界行为](../../build/p5-behavior-checks/full.json)、[培养与捕捉](../../build/p5-journey-checks/full.json)、[Curios 装备与性格](../../build/p5-equipment-checks/full.json)及[完整详情与偏好](../../build/p5-preferences-checks/full.json)。详情验证覆盖 26 招、50 字段、四格与未装备招式、实际力量变化及恢复；完整回复最大 15,566 字符。

新冻结版 **`20260915-075242`** 已安装完整语言、所选内容数据与脚本，沿用原有存档及操作设置。本轮只使用不可见后台检查；Minecraft 整体画面、客户端交互和观感由用户按 [P5-use](P5-use.md) 自行启动复验。这是本轮质量整改交付，整个 P5 的代表性内容与正常世界体验继续按阶段目标推进。

## 2026-09-15｜试玩问题返修

`075242` 的日志确认自定义圆盘触发 Rhino 容器访问异常；真实 LDLib 编辑器检查进一步复现显示状态的重载边界。共享界面现通过原生容器回调访问滚动内容，折叠使用 LSS。世界文字的 X 轴多次翻转导致字形被背面剔除，已改为原生命名牌坐标基，并隔离复用绘制缓冲。

整件原生 FX 分时画面复现了粉色矩形、光束滚动 UV 裁切、范围放大装饰和场地满铺。返修后，花瓣舞按本招周期旋转连续扫击带，场地边界与内部形体分别编排，光束两端和保护连接保持各自尺度；准备、命中和收尾使用相应生命周期。阶段消息与真实命中分开传递。香气自主搜索复用场地查询、短期预约与发现记忆，减少重复区域施放；手动用途沿用技能规则。

[完整构建](../../build/p5-repair-final-build.log)与[最终打包](../../build/p5-repair-package.log)通过。验证包含真实 Rhino／LDLib 自定义与偏好操作、15 组视角的原生中英文字体像素、39 个原生 FX、42 个 GL 材质变体及[44 帧完整场景](../../build/photon-scene-check/final/contact-sheet.png)。[真实技能执行](../../build/p5-repair-verdant-retry.log)和[伙伴 AI](../../build/p5-repair-behavior-retry.log)专服回归通过。已准备冻结版 **`20260915-083909`**，用户按 [P5-use](P5-use.md) 自行启动，沿用现有存档与设置。

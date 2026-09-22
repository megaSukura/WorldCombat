# WorldCombat 内容作者任务（招式）

你是 WorldCombat 的独立内容作者 Agent，只做分配给你的单元。仓库根目录 `F:\MyProject\WorldCombat`，命令在根目录运行。

先读 `AGENTS.md` 与 `docs/CONTENT_AUTHORING.md`：项目是什么、战斗对象是任意生物、四层职责、招式的实现入口、数值怎样大量依赖精灵数据并分散到不同参数、配置项的双向代价与 AI 选项的可观察性、状态效果与粒子表现怎么写、单元怎样交付，都在那里。本任务卡写这份工作的四个核心、实现约定与交付格式。**代码是事实，文档是导读**：不一致时以代码为准，并在报告里指出。

## 四个核心

这份工作只为四件事服务，其余规则都是它们的手段：

1. **创意**：每招是 Minecraft 世界里一件有形状的事，原生名字、描述与机制提供灵感，世界提供材料。它可以服务战斗、探索、工作或生活，也可以完整地服务非战斗用途。创意是一个念头展开的深度。
2. **区分度**：玩家在场上能一眼把这招和别的招分开；同一招在两只精灵手里也能分开。后者靠数据：很多精灵学同一招，它们之间的区别就是种族值与个体数据，差距常常只有一两个点，所以**每招的参数都大量依赖精灵数据，并把不同来源分散到不同参数上**——依赖得越多、分得越开，小差距才会在场上变成看得见的不同；这条链再传到表现，粒子的数量、强度、范围按参数取值派生。共享范式（`dash`／`bolt`／`cloud`／`impact`）是材料，这招的身份来自它独有的部分；一条规则、一种写法在别的招上好用，只说明它在那一招上好用，这一招要按自己的念头重新决定。
3. **表现**：粒子、浮字、音效的任务是把这招的信息画出来——**范围**（作用到哪块区域，画面本身就是那块区域）、**运动**（什么沿什么轨迹以什么速度走）、**数**（几段、几发、多大程度，画面里的数量和强度与机制里的数一致）。
4. **玩家体验**：这招在其声明的适用情境里真的能使用，AI 会在有意义时选择它；每一幕玩家都能读到现在到了哪、下一幕在哪、还剩多少。通用效果对宝可梦、原版生物和玩家沿同一规则生效，宝可梦专属操作另保留其适用条件；世界是玩家的家，招式留下的东西按念头决定去留。

**下面的一切都是材料。** 幕、参与者、走位、时机、反制、配置项、世界里留下的东西、玩家的输入形状——一个念头用到哪几样由它自己决定，用不到的就没有；一件东西只因为它让这招成立而存在。

## 对象

招式在世界中执行，对象可以是宝可梦、原版生物、其他模组生物、玩家或环境；施法者也可能是玩家。原生的威力、PP、优先度、命中、次要效果与描述是灵感；你设计的是这招怎样开始、如何作用、留下什么结果。生物通用效果使用共享实体机制，宝可梦特有的招式表、属性相性等操作保留原生语义与对象条件。

扩展已有招式时保留其成立的宝可梦用途，再判断同一个核心机制能否自然作用于普通实体、物品、地形或世界过程。世界用途按需要设计，不规定每招的用途数量；专门用途也可以独立成立。核对最相近的现有内容，说明玩家因此能做出的不同选择。选用原生交互时确认触发条件、所有权、代价和可读结果。

**施加在战斗者身上的持续状态一律是 MobEffect**——对宝可梦和对原版生物是同一个状态效果，物品栏可见、`/effect` 可用。状态有一套**共享身份**：tag `world_combat:status/<名>`（`StatusVocabulary.tag(名)`）。消费方只问"有没有这个身份"（`CombatStatus.has(world, actor, "burn")`），不管是谁、用哪个效果施加的；生产方三条路等价：`CombatStatus.inflict(world, actor, "burn")` 施加共享默认效果（灼伤／麻痹／睡眠／冰冻／中毒／剧毒六个主异常有默认效果与默认行为：减速、无法行动、灼伤掉血、麻痹概率失手等）；或在 `startup.ts` 声明自己的变体并 `.tag("world_combat:status/burn")`，借身份也借默认行为；再加 `.tag("world_combat:status/identity_only")` 就只借身份、行为全由你写。词表 `build/p5-batch/status-vocabulary.md` 是从原作数据抽出的种子名单（6 主异常 + 103 挥发状态），**是给你用的字典，不是围栏**：你发明的新状态照样打 `world_combat:status/<你的名字>`，别的作者以后就能消费它。`impact(..., { status: "burn", chance })` 的次要状态经同一条路落到任何目标上。**宝可梦那一层是你的设计**：施加共享默认效果时，共享库会把它同步成 Cobblemon 原生异常（队伍 UI、物攻减半、原生特性道具都跟着生效）；你自己声明的变体只带身份、不会自动变成原生异常——宝可梦身上要不要再加一层、加什么（另掷一次 `CombatStatus.inflict`、开属性免疫窗口、别的东西），由你按这招的念头决定。API 见 `content/mechanisms/combat-status.ts`、`content/mechanisms/mob-effects.ts`（`tagged`／`consumeTagged`／`reactTagged`）。

## 创意：一招一个念头，把它展开成一段过程

从原生资料获得灵感，在世界里设计**有形状的一件事**——玩家一眼看懂它是什么，参与者能读出它。地形、距离、走位、时机、对象差异、别人留下的状态都是材料。

**一招只有一个念头**，参数、配置项、次要效果、粒子、浮字都为它服务。念头的分量来自它展开得多深：每个留下的元素都能回答"它让念头的哪一步成立"。剩下的东西越清楚，玩家越记得住，对手越能反应，这招和别的招的区别也越明显。

**念头的深度在于它怎样展开。** 一个念头展开成一段过程，过程里有一幕或几幕，每一幕都是同一个念头的下一步。展开时手边有这些维度：

- **时间**：前一幕的结果决定后一幕发生不发生、在哪发生、对谁发生。一个状态怎样结束也是分岔：走完自己的时间与被外力打断，通向的可以是不同的下一幕（`world_combat:mob_effect_removed` 带 `cause`，可写）。
- **参与者**：一招可以有施法者之外的参与者——命中的对象、由它派生出来的东西、留在世界里的活物。每个参与者有自己的角色、外观、寿命和结束方式；伤害与效果的来源可以是它们中的任何一个（持久实体的脑以实体自身为源）。参与者之间的关系也是设计：它们可以互为条件、互相依赖。
- **空间与运动**：作用范围的形状由念头决定。围绕一点、朝一个方向、沿一条线、由几个参与者共同撑起的面，都是现成的选择（`WorldGeometry`），表现用同一组顶点画出同一个形状（粒子 `bind: "path"`、`orient`）。运动同样是设计：什么东西沿什么轨迹走、多快、受不受重力、会不会转向、撞到东西之后怎样，都是这招的形状的一部分。
- **对手的余地**：念头本身会给出对手在每一幕里能做什么；这份余地从画面里读得出来时，它就是这招的一部分。
- **画面**：每一幕有自己的表现，表现告诉玩家现在到了哪一幕、下一幕会在哪、还剩多少时间。

**深度是一条连续的刻度。** 有的念头一幕就完整：一次接近、一次命中、一个结果，做透这一幕就是全部；有的念头是两幕：命中之后世界里多了一样东西，这样东西决定后面发生什么；有的念头值得走到三四幕。这条刻度上的每一点都是正当的位置，决定位置的是念头本身，每一幕都推进念头的一步，越复杂的招越要把每一幕的必要性说清楚。你交付的每一招，读报告的人应该能按幕复述出来。

**世界里已经存在的机制是最好的材料。** 一样东西天然会做的事——某种实体怎样跟随、牵引、承载、漂浮、爆炸，某种物品怎样被拾起和使用，某种方块怎样响应，别的 Mod 加进来的行为——让它按本来的行为参与这招。它自带的行为、反制和玩家早已熟悉的读法都跟着来，一个念头因此能用很少的代码得到很多层次。宿主把原生对象直接交给你（`nativeEntity`／`nativeEntities`／`spawnEntity` 等，见 `docs/CONTENT_AUTHORING.md`"持久实体、方块与世界"的"原生对象"），通过它们改动的东西由你放回。

配置项只在它真的让玩家在两种玩法之间取舍时才存在；AI 用途写这招在什么局面下有意义，填的是这招真会用到的钩子。

**配置取舍按实际结果核对**：包括 AI 数值选项，先找到真正的消费者，再确定有实际差异的可选范围；比较收益与代价时算到最终的取整、限幅、资源消耗与结算截断。保留各有适用局面的选择；某一方向只增加收益时，将该量交给精灵数据与公式。名称、帮助与说明写实际改变的行为。

## 能力面

- 你能用的 = 宿主 SDK（`sdk/core/index.d.ts` 的 `CombatAction`、`sdk/core/world.d.ts`、`sdk/cobblemon/index.d.ts`、`sdk/client/index.d.ts`）+ 共享库（`content/mechanisms/*.ts` 全部导出）+ 招式作者层（`content/library/skills/*.ts`：`PokemonSkills.define`、参数与伤害段、`dash`／`bolt`／`cloud`／`impact`／`hurt`／`heal` 等范式）。动手前通读。
- **玩家的输入形状**：一招可以要玩家选一个目标、一个点、一条多点路径、一块已有区域再加一个点，或按住技能键持续引导。声明方式与读取方式见 `docs/CONTENT_AUTHORING.md`"招式要玩家选什么"一节；形状按这招需要玩家做的操作来选。
- **世界交互按实际用途选择**：先说明玩家或其他实体能利用什么变化，再选择实现。声音、粒子和世界提示承载视觉痕迹；方块操作用于真实的通行、碰撞、物理性质或世界交互。涉及地形时，说明改动如何参与玩法、玩家如何应对以及何时恢复：
  - 需要临时方块的机制用 `world.terrain` 租借；`linger: true` 让它活过招式本身，`replace` 允许替换原有方块。恢复与后续建造的处理见 SDK；寿命按该机制的用途决定。
  - 世界里本来就会被消耗的东西，被招式消耗后就留在那个状态（`breakBlock`）。
  - 带方块实体的方块可以换状态；容器通过 `insertItem`／`extractItem` 走物品。
  - 持久实体带明确寿命，或随施法者收回一起离开。
  - 永久留下的东西满足一个条件：留下它本身就是这招，而且玩家想要它。
  留下什么、留多久，由这招的念头决定；伤害、状态、位置和时机本身就足以构成完整的一招。接口与写法见 `sdk/core/world.d.ts` 和 `docs/CONTENT_AUTHORING.md`"持久实体、方块与世界"。
- 接口与写法以 `sdk/`、`content/library/skills/*.ts`、`content/library/companions/*.ts` 与 `content/mechanisms/*.ts` 的当前代码为准；从原生资料独立设计分配到的招式。
- **跨模组识别与操作**：方块、物品、实体类型、流体及伤害类型按各自注册表与已加载 Tag 识别，优先利用 `minecraft:`、NeoForge 通用 `c:` 和相关模组标签。容器走 Capabilities，物品转移保留数据组件，属性、伤害与交互走原生规则；入口见创作指南的 Minecraft／NeoForge 一节与 `sdk/core/world.d.ts`。
- **几何与过滤**：`WorldGeometry` 提供区域，`select` 的回调组合可见性、阵营、标签、状态与自定义谓词；复合区域可以自己定义 `contains`。表现和判定消费同一份世界顶点或尺寸，坐标系与覆盖约定见 `docs/authoring/presentation.md`。
- **调用契约入口**：先读 `content/library/skills/catalogue.ts` 文件头的注册依赖，再读 `parameters.ts` 的上下文、`stages`、`p` 与伤害段注释；动作回调契约在 `NativeRepertoire.Skill`，AI 钩子调用时机在 `WorldMethods.Use`，表现载荷与锚点映射在 `WorldFeedback` 文件头。按这些入口查当前实现，有无法确认的调用契约就明确报告缺少的事实。
- **组合与所有权**：设计需要独立、并行或持续过程时，按[创作入口的组合契约](../CONTENT_AUTHORING.md#动作持续效果与投射物组合)选择能力。兼容关系、资源结算与结束后的衔接按本招的念头决定，表现让玩家读出各过程的来源、阶段与结果；异步命中使用重新取得的回调作用域。
- 优先用现有共享入口与原生 API 完成本招，独有逻辑写在自己的单元。**共享前置只记录核心玩法或正确运行确实依赖的能力缺口**：已查过哪些入口、还缺什么事实或操作、为何需要共享层支持、影响哪些招式、补齐后怎样验证。
- 发现阻塞时在本组报告中将受影响招式标为“待前置”，完成其余可完成的内容与验证后交回本组结果。首轮所有作者返回后，集成者统一汇总、核实并补齐共享能力，再批量派发补接与返修，由对应作者完成两项验证。便利性、可选复用与扩展想法写入规则反馈，已完成交付以当前能力实际达成的结果为准。

## 分组方式

按招式之间的机制联系识别家族，再让每个成员在场上有自己独有的样子，各成一个单元；两个成员在场上读起来一样，就有一个要重新想。报告里家族写一段总述，成员各写差异。每组是作者的工作分配，具体家族关系与每招的念头由作者判断。

## 实现层

- 注册 `PokemonSkills.define({...})`，字段见 `content/mechanisms/native-repertoire.ts` 的 `Skill`；`id` 就是 Cobblemon 招式 id，PP 与原生模板由此关联。
- **参数由公式定义**（`content/library/skills/parameters.ts`）。每个参数是一棵 `Formula` 树（`content/mechanisms/formula.ts`），用 `formula(node, 标签, 选项)`／`seconds`／`percent` 登记到 `actionParameters.define`；运行时取值一律 `p(id, key, action)`。变量：`F.stat("attack"|"defence"|"specialAttack"|"specialDefence"|"speed"|"hp")`、`F.level()`、`F.body("weight"|"height")`、`F.pref("路径")`（配置项，布尔或数值）、`F.world(id)`、`F.state(id)`；运算 `.plus .minus .times .div .max .min .clamp .pow .round`、分支 `F.when(cond, a, b)`、`.scale(lo, hi)`；`.as(标签)` 让一段子表达式在悬浮说明里成为独立一项。`stages(id, [...])` 的等级阶梯自动作为一项并入公式。同一棵树出招时求值、详情页悬浮时展开成"值 = 公式 → 每个量的当前值"，**玩家会把每个参数的依赖读个明白**——这就是对"大量依赖精灵数据、分散到不同参数"的检验。
- **伤害段**：`defineDamage(id, 段名, 规格)`，段名对应一个同名参数，这个参数就是这段伤害随精灵数据变化的那部分，名字按它在这招里的含义起；共享结算 `CombatantStats.damageFormula` 再乘上有效攻击、附加贡献、本系加成等（悬浮里全部展开，规格里 `base`／`coefficient` 可覆写默认映射）。对手的防御、相性、暴击在命中时由 `PokemonSkills.impact`／`hurt` 统一结算。原生的"威力"只是灵感来源里的一个数，不是你要交付的概念。
- **公式定义的是实际使用的最终值**：配置分支、成长、取整与限幅一起进入该值的公式；执行、AI、指示与说明消费同一个计算结果。几何与协议常量可以固定，动作速度、时长、距离等玩法参数按区分度要求关联精灵数据。伤害段在 `describe` 的 `values` 中绑定段名，显示的是我方理论伤害，标签与单位按伤害写；`impact`／`hurt` 使用自定义段时显式传 `damage: damageSpec(id, 段名)`，伤害类别由 `defineCategory` 声明或沿用原生类别。接口的事实读取范围以 `factsOf` 为准，所需输入能力写入共享前置。
- **事实与动态结算**：战斗者、个体培养、状态身份、动作、执行定义、支付资源和目标各按自己的作用域读取；自定义纯事实用 `defineFacts` 接入执行与说明，动态属性／类别用 `damageFeatures`。状态保存为 JSON 对象，公式可读数值／布尔叶。具体入口和缺省语义见 `parameters.ts` 的 `factContext`／`factsOf` 与 `formula.ts`。
- **配置项改变时序、射程要走 `resolve(pokemon, config, world, actor)`**：config 只在 `resolve`、`ready`、`windup`、`execute`、`indicator` 可见；公式里用 `F.pref("路径")` 读到的是同一份配置。`resolve` 返回的 `prepare`／`recover`／`cooldown`／`range` 就是这次施放真正用的值：`range` 驱动实际的目标接受（想让配置把射程抬到 `range` 以上，声明 `maxRange` 作为上限）。`windup(action, config, prepare)` 收到 `resolve` 算好的准备时长，返回它即沿用，不用写两遍。
- 布尔偏好写在偏好标签与 `help` 里；`description` 段落绑定数值参数。
- **节奏由招式自己定。** `prepare`／`active`／`recover`／`cooldown` 都是可选的：不填 `prepare` 的招在开始那一刻就提交（瞬发），不填的收招与冷却为 0。想要可打断的起手、蓄力、按住引导、多段各自结算、松手释放这些自有节奏，就写 `run(action, move, config)` 自己驱动整个动作（提交前 `sense()`／`present()`，`action.commit(cooldown)`，之后改世界，结束 `finish()`），不用 `execute`／`windup`／`ready`。`LivingActions.run` 只是"起手→执行→收招"这一种常见节奏的辅助函数。
- **提交前后两个世界**：提交（`action.commit`）是代价结清的时刻——PP 扣掉、冷却开始；之前的动作可以被打断而不花任何东西，所以那里只能用 `action.sense()` 观察、用 `action.present(key, scene, 1, point, JSON.stringify(data))` 播放预告；`action.world()` 在提交前会抛错，这一次施放作废（同一招连续出错多次才会被整个禁用）。共享节奏里 `windup`、`ready` 在提交前，`execute` 在提交后。单元检查会拒绝 `windup`／`ready` 里的 `action.world()`。
- **准备期表现**（共享节奏）在 `windup(action, config, prepare)` 回调里用 `action.present(...)` 播放，并返回准备时长。
- `execute(action, move, config, done)` 完成后必须调用 `done(action)`。
- `indicator(config, pokemon)` 返回瞄准指示的设计（字段见 `native-repertoire.ts` 的 `Skill.indicator`：`radius`、`geometry`、`style`、`label` 等）。
- **输入与说明接到实际动作上**：按本招真正需要的操作声明输入契约，并落实继续、结束与中断。输入入口见 `WorldCombat.preview`、`ActionInput` 和 `ActionRuntime`；玩家说明依据已接通的操作与结果编写。
- AI 用途 `CompanionBehavior.registerUse(id, { protocols, available, reach, accepts, ready, priority })`（`content/library/companions/runtime.ts`），放 `ai.ts`。**每招一套自己的 AI 逻辑**：什么局面有意义、对谁出手、出手前要做什么、够不到怎么办、放完之后接什么——攻击、增益、状态、场地、走位类招式各不相同，越复杂的招越要自己想清楚。一般交战里这招必须真的会被放出来；只在真有条件时才收紧。`reach` 与招式实际射程一致，`kind: "point"` 的招 AI 会以目标位置为点施放。报告写一句"什么局面下会出手"。AI 读状态用共享身份：`CompanionBehavior.status(context, target, "burn")`（任何 `world_combat:status/<名>`，包括别的单元发明的）。AI 选项落在这几个钩子上：多远出手、接受什么目标、几个候选之间怎么排。
- **出手时机按具体招式设计**：作者可按本招需要编写或扩展 AI 逻辑，包括出手条件、PP 取舍与重复施放判断；`prepare`／`fortify`／`reveal` 用于接入共享行为。共享层若妨碍本招的合理用法，写进“共享前置”，由集成者处理。
- **起手条件与选择偏好各自落到实际判断**：本招说明中的“只有……才／仅在……”由覆盖所有 AI 起手入口的条件校验保证；“优先／倾向”表达可用候选之间的偏好。条件通过 `available`／`ready` 与必要的目标校验接入（调用语义见 `WorldMethods.Use`），`priority` 用于排序，0 或负值仍可被共享顺序选中。配置说明与本招的条件、偏好及兜底用法一致；持续过程按本招的阶段判断是否继续。
- **距离归 `approach`，不归 `accepts`**：`accepts` 判断目标是否合适（阵营、状态、体型），共享任务负责走近到 `reach`；`approach(context, item, target, reach)` 决定怎么走近，回 `"wait"` 表示原地等。
- **选目标与站位**：`selectTarget` 决定候选对象，`approachTarget` 决定站位参照，`target` 调整施放落点；当前帧事实用于身份、运动与环境判断。动作许可和内联调用从 `NativeLoadout`／`CombatStatus.actions` 接入，执行身份与支付资源分别跟踪；生命周期中断见 `LivingActions`。
- **目标先确认自己有这招，再触碰世界**：`registry.goal` 的 `propose` 第一步取本招的 capability（`ready(context, protocol)` 或 `WorldBehavior.capabilities`），拿不到直接 `return []`；`WorldEffects.areas`、`world.query`、`observe` 这类世界查询放在其后。每只宝可梦每次决策都会运行全部目标提供者，这个顺序决定野生生态的容量。
- **状态从事件来，节奏从定时器来**：持续状态一律 MobEffect，读写用 `MobEffects.read/apply/consume(world, actor, id)`，`id` 是 `startup.ts` 里 `e.create("world_combat:<名>")` 的注册 id；`.tag("world_combat:status/<名>")` 是共享身份，用 `MobEffects.tagged/hasTag` 或 `CombatStatus.has` 读。周期性工作用效果的 `schedule` 或 `mob_effect_tick`；每 tick 只留连续运动。check-unit 会核对 MobEffects 的 id。
- **能力等级对所有战斗者有效**：`NativeEffects.boost(world, actor, "atk"|"def"|"spa"|"spd"|"spe", ±n)` 对宝可梦改原生等级，对玩家和其他生物落到攻击、护甲、移速属性上（`CombatStages`），脱战后同样消退。加攻、降防这类效果直接用它，一条路径覆盖所有对象。
- 宿主返回的数组（`world.query`、`effects`、`mobEffects`、`equipment`、`heard`）是定长 Java 数组，类型为 `readonly`；要增删先 `.slice()`。`action.present` 的 key 可由 id、槽位、actor ref 拼接（允许多个冒号）。效果时长受声明上限约束，`WorldFeedback.emit/keep/text` 自动收敛到 6000 tick 以内；自己声明的效果传超上限会报错并写明上限。
- **命名空间合并**：所有招式单元都写进 `namespace PokemonSkills`／`CompanionBehavior`，装配时合并成一个命名空间。命名空间级声明用 `const`／`let`／`function` 并带招式 id（`emberScene`、`emberAbove`），构建才能在重名时报错；命名空间级 `var` 与其他单元重名会被构建拒绝。
- 单元形态：`content/moves/<id>/`，`unit.json` 的 `id` 为 `world_combat:move/<id>`，`requires` 基线 `{"world_combat:skill_runtime": "0.1", "world_combat:companion_runtime": "0.1", "world_combat:mechanisms": "0.1", "world_combat:native": "0.1"}`（前两个是招式作者层与 AI 用途，后两个是 `WorldFeedback`／`WorldEffects`／`LivingActions` 与 `CobblemonCombat`／`NativeEffects`／`NativeModifiers`），其他包按 `content/packs.json` 补（单元只能依赖 `packs.json` 里的共享包）；`sources` 按 `parameters.ts`、`skill.ts`、`ai.ts` 顺序，`clientSources: ["presentation.ts"]`，声明新效果时加 `startupSources`。
- 文本键（中英同键）：`worldcombat.skill.<id>.summary`、`.use.<n>`、`.description.<n>`、`.timing`、`.growth.<n>`、`.value.<参数>`、`.preference.<路径>`；招式特有浮字 `world_combat.move.<id>.text.<含义>`。段落里的 `%1$s` 依 `describe` 的 `values` 顺序绑定；文本里紧跟字母或收尾的百分号写成 `%%`（check-unit 会查）。
- 本波只写自己的单元目录；共享库、SDK、选集、构建工具的需要写进"共享前置"。

## 表现

表现的任务是把这招的信息画出来。**先读 `docs/plans/P5-visual-language.md`**，按它工作：先用一句话写清"发生了什么、在谁身上、多大程度"，再为这句话安排层次、起击收三拍和一个色相家族。三样信息必须能从画面读出：
- **范围**：招式作用到哪块区域，表现本身就是那块区域，玩家一眼知道站哪会被打到；形状用与判定同一组顶点画（`bind: "path"`、`orient`）。
- **运动**：什么东西沿什么轨迹以什么速度走、在哪里停下，画面与机制同步。
- **数**：几段、几发、多大程度，粒子的数量与强度按机制里的数和实际伤害派生。引擎是高吞吐粒子库，一次命中几百到上千个细小粒子是正常量级，预算由引擎全局管。

粒子场景 id `world_combat:move_<id>`，moment 按这招真实发生的阶段命名，让画面读出演到哪一幕；动作内用 `action.present(key, scene, 1, point, data)`（key 在本招内唯一，随动作结束清理）或 `WorldFeedback.emit`／`keep`。投射物外观用 `LivingActions.projectile` 的 `appearance`。写法与"量从机制和体型派生"的规则见 `docs/CONTENT_AUTHORING.md` 的"粒子表现"一节；命中强弱按实际伤害传 `data`。音效 id 是 MC 1.21.1 或 Cobblemon 真实存在的事件（`tools/data/sound-ids.txt`），check-unit 会查。音效 `PokemonSkills.sound`；伤害与治疗浮字由 `PokemonDamage`／`PokemonSkills.heal` 自动产生，招式特有结果用 `PokemonSkills.result` 或 `WorldFeedback.text`。

**每招至少一处特效由本招计算出的机制数值驱动，简单招式同样执行。** 服务端提供机制值，客户端用实际读取这些值的字段把数量、强度或范围画出来；两端一起完成这条链。体型适配与位置跟随在此基础上处理。动态字段与绑定以 `sdk/client/index.d.ts`、`ParticleInstance`、`Anchors` 为准，核对实际尺寸、运动距离及两端位置与所表达的机制一致。

数值叶使用 `{ data: "路径", fallback: 数值 }` 绑定本次载荷；自定义结构、条件、过滤或精确持续图形由 `WorldCombatClient.scene` 回调计算。发射量、画面存活量、绑定坐标系与退出生命周期见 `docs/authoring/presentation.md`，按实际消费者完成这条链。

## 资料

- 原生事实：`python tools/native-reference.py move "名或ID" [--extract]`；完整字段在 `build/native-reference/1.8.0+1.21.1/data/moves.js`。
- 中文名与介绍：`build/state-inventory/zh_cn.json`（`cobblemon.move.<id>`、`.desc`）。
- 状态词表：`build/p5-batch/status-vocabulary.md`。天气用 `world.weather(kind, ticks)`；场地与撒菱一类概念在自己单元里实现，命名用 `world_combat:field/<名>` 方便以后合并。

## 验证与边界

每个单元两项都要 PASS 才记为完成，命令与结果写进报告。不构建、不写临时自测程序。本轮可验证的单元一起验，待前置单元写明阻塞位置与未完成部分：

交付前沿玩家说明核对执行、配置、AI 与表现的接线；AI 沿完整共享调度核对条件成立和不成立两侧，包含其他招式不可用、只剩本招可选时的最终选择。报告只记录已实现的行为和实际覆盖的验证。工具或共享接口阻塞设计时，把阻塞点与命令结果交给集成者处理；结果反馈按接口的实际成功与失败生成。

1. `node tools/check-unit.mjs <目录>`（每个目录一次）：类型、贴图 id、文本键、效果图标、MobEffect id、文本格式串。
2. `python tools/smoke-unit.py <目录1> <目录2> ...`（一次传本轮可验证的全部单元）：一台隐藏专服依次跑每招的 `scenario.ts`，每招一条判定；开服约 35 秒，之后每招约 15 秒，无窗口。判定、每条断言、你的 `note` 和整段轨迹在 `build/smoke/<招式>/trace.jsonl`；脚本报错在 `build/smoke/<招式>/server.log`。

`scenario.ts` 是这招的可执行设计说明，接口在 `sdk/smoke/index.d.ts`：
- 布置这招真正需要的场面：施术者与目标的种族、等级、技能表（只给这一招，AI 就只会用它）、距离、地形块（要割草就先 `stage.block` 放草）、天气、时间、目标状态、队友。`stage.hostile(a, b)` 让双方开战。原版生物会自己走动；要它留在某处就给它一个目标或用方块围住。
- 断言只写必然事实：这招被放出过（`stage.casts`）、造成过伤害或出现过效果（`damageTo`／`hadMobEffect`）、位移类招式移动过（`travelled`）、属性变过（`attribute(actor, "minecraft:generic.attack_damage")`）。命中率、暴击、附加效果概率这类随机结果写进 `stage.note(...)`，供你自己读轨迹判断。
- 用 `stage.until(限时, 条件, 然后, 标签)` 等待交战发生，再断言、`note`、`done()`。所有代码写在 `Smoke.scenario` 的回调里，别在文件顶层声明变量（几招的场景会装进同一个包）。
- 断言没过先读轨迹：是实现没做到，还是期待写错了。改期待要在 `note` 里写明依据的设计事实。

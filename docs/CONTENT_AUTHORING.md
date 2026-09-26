# WorldCombat 内容生产入口

你是本项目的独立内容开发 Agent。根据用户随本文件给出的任务，完成属于该任务的正式内容。所有相对链接以本文件为起点，命令在仓库根目录运行。先读 [AGENTS.md](../AGENTS.md)，再按任务查对应的代码。

## 你的职责

你负责查找资料、设计并实现用户指定的招式、精灵、Buff、物品、AI 行为或模组联动，交付源码和简短的操作说明。普通设计取舍由你完成，需要用户才能确定的事实再集中说明。

**你的验证有两项：静态检查跑 `node tools/check-unit.mjs <单元目录>`，交战验证跑 `python tools/smoke-unit.py <单元目录> [<单元目录> ...]`（见[交付一节](#一个独立单元怎样交付)）；后者把共享包和这些单元装配成私有内容，在一台隐藏的无头专服上依次跑每个单元自己的 `scenario.ts`，负责几招就一次传几个目录。** 构建、集成和安装由集成者统一完成，动态体验由用户验收。你可以阅读代码与资料，使用资料查询工具。

项目把 Cobblemon 的回合制战斗改造成 Minecraft 世界里的即时战斗，并保留收集、培养、学习、进化、道具、骑乘和世界生活。原生名字、介绍、生态与机制是设计灵感；内容也可以用于工作、探索、社交、恶作剧和模组联动。判断一个设计是否合适，要看实际用途、因果和操作体验。**战斗对象是任意生物**：宝可梦、原版生物、其他模组的生物都可能是对手或队友；规则以 MC 实体为对象，宝可梦特有数据只作为额外输入。

**复用与创造力同时成立。** 从现有库与原生 API 开始；独特玩法可以增加自己的算法、协议、数据、动作或交互。现有接口是起点，四层代码均可因任务需要修改。新增逻辑如果兼有通用执行和具体设计，把它们放进各自负责的层。局部特殊实现简短说明其理由，有实际共性的部分再提取复用。

## 当前基线与参考资格

版本以[依赖清单](../manifests/dependencies.toml)为准。当前为 MC 1.21.1、NeoForge、Cobblemon 1.8、KubeJS／Rhino、LDLib2，含 Curios 接入。服务端内容用 TypeScript 编写，编译为 Rhino 使用的 ES5 脚本。

实现基于通用能力、共享库和伙伴运行，接口与写法以当前代码为准。招式、物种、特性、性格、携带物是五条正式生产主线，装备与其他原创内容按需要加入。正式选集按 [p5.json](../content/collections/p5.json) 收录 `content/abilities/` 与 `content/moves/` 前缀的单元。每个单元同时交付玩法、交互反馈与粒子表现：使用 MC 粒子系统及 Cobblemon 粒子资源，表现放在单元自己的 `presentation.ts`，允许为了表现调整触发点与节奏。粒子运动与层次在客户端完成，复用实体同步和必要的效果事件。

**本文链接的接口、共享库和现有规则是理解实现的资料；玩法、AI、平衡及表现范本，取自[验收参考表](authoring/accepted-content.md)，实现细节直接读接口与共享库。**

## 先找到事实和现成能力

原生对象的名字、译名、描述、物种数据可直接从锁定依赖查询：

```powershell
python tools/native-reference.py move "招式名或ID" --extract
python tools/native-reference.py species "精灵名或ID" --extract
python tools/native-reference.py ability "特性名或ID" --extract
python tools/native-reference.py item "物品名或ID" --extract
```

这个工具读取本地依赖，返回原生身份、描述、物种 JSON，或提取的上游源码位置。对于多匹配结果先选准对象。特殊形态、学习表、原生注册和真实可用性分别核对；原生资料不包含的生态设定可继续查官方资料，区分来源事实与自己的设计。

已清点范围见[招式](../manifests/native-moves.csv)、[特性](../manifests/native-abilities.csv)、[物品](../manifests/native-items.csv)。需要追溯某个原作状态时，按需查[上游概念索引](research/native-state-inventory.md)。跨内容识别状态用[状态词表](../build/p5-batch/status-vocabulary.md)中的共享身份，可调用能力查当前 SDK 与共享代码；本招的状态行为按即时玩法设计。

从关键词和 ID 搜索 `content/`、`sdk/`、`mods/`。共享注册、函数签名和当前行为以代码为准；涉及原生执行时继续查锁定版本的 MC／NeoForge／Cobblemon 源码或 API。

按用途查当前公共能力，可读[共享能力入口](authoring/shared-capabilities.md)，涵盖公式、状态、场景、原生装备、队伍、AI 事实与粒子数据绑定。

招式的调用契约从[作者入口](../content/library/skills/catalogue.ts)文件头读起，沿其中链接查看参数上下文、动作回调、AI 钩子和表现载荷的语义。创作所需的接口与用法直接从这些当前共享入口确认。

### Minecraft／NeoForge 的跨模组能力

- **注册表与数据包 Tag**：按方块、物品、实体类型、流体、伤害类型各自的注册表识别对象，优先使用已加载的 `minecraft:`、NeoForge 通用 `c:` 及相关模组标签。标签成员由数据包与模组共同提供；明确需要单个对象时用其注册 id。`world.registry`、`block.tagged`、物品快照与流体读取见[世界 SDK](../sdk/core/world.d.ts)。实体记分板标签是另一类实体数据。
- **Capabilities**：通过能力接口与其他模组的容器、流体、能源协作。现有物品容器操作使用 NeoForge `ItemHandler`，其余能力通过原生对象及对应 Capability API 接入。
- **物品数据组件**：识别和转移物品时保留完整物品栈；`CombatItem` 与容器操作沿用原生组件编码，组件与物品 id 一起决定物品事实。
- **属性、伤害类型与事件**：用已注册 Attribute、伤害类型及其标签参与原生结算，响应宿主已桥接的原生事件。方块交互、投射物命中、状态与物品操作优先走现有原生入口，让已安装模组的规则参与。入口见 SDK 与[原生桥](../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/MinecraftCombat.java)；更多公开 API 可通过原生对象入口调用。

## 按职责落代码

| 层 | 负责什么 | 入口 |
| --- | --- | --- |
| 通用核心 Mod | 原生实体、碰撞、世界操作、权限、动作／效果生命周期、资源结算、网络和原生界面桥 | [核心代码](../mods/world-combat-core/src/main/java/dev/worldcombat/core/)、[服务端 SDK](../sdk/core/)、[客户端 SDK](../sdk/client/index.d.ts) |
| Cobblemon 适配 Mod | 原生个体、六维／培养、配招／PP、背包／携带物、成长与原生面板接入 | [适配代码](../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/)、[适配 SDK](../sdk/cobblemon/index.d.ts) |
| 共享脚本库 | 公式、行为方法、机制、公共属性、配置、交互组合 | [机制库](../content/mechanisms/)、[行为库](../content/behavior/)、[客户端库](../content/client/library/) |
| 最终内容单元 | 这一个招式、物种习性、Buff、特性、物品、装备、交互或联动的具体设计 | 在 `content/` 下建立属于这个设计的目录和 `unit.json` |

适配 Mod 可以侵入式修改、覆盖或补充 Cobblemon；根据职责选择。高频通用循环和原生执行可以进 Java／Kotlin，具体公式、选择和效果规则仍由脚本表达。一次创作可以同时包含多个职责，并以明确依赖连接。

## 任务到实现入口

| 你要生产什么 | 从哪里接入 |
| --- | --- |
| 游戏内招式 | [招式服务](../content/library/skills/)、[原生配招与执行](../content/mechanisms/native-repertoire.ts)、[配招适配](../content/mechanisms/native-loadout.ts)。通常依赖 `world_combat:skill_runtime`；动作、参数、配置、AI 用途、说明和界面属于同一个设计 |
| 原生四招之外的独立行动 | 用 `WorldCombat.registerAction` 定义执行，用 [WorldAbilities](../content/mechanisms/world-abilities.ts) 授予当前行为帧并调用。仍使用原生动作运行时；是否使用某种资源由行动决定 |
| 物种单元（一个物种的专属内容） | [PokemonIndividuals](../content/behavior/individuals.ts) 向已有个体贡献事实、能力、策略；`autonomous` 可让没有已实现配招的个体参与脚本行为，以 `matches` 表达适用范围。一个物种单元只做 2–3 个有辨识度的点（习性、战斗风格、专属行动或效果任选），其余沿用基线行为；专属行动按需要才做。通常依赖 `world_combat:companion_runtime` |
| AI 的感知、目标、方法、决策或工作 | [行为组合](../content/behavior/composition.ts)、[共享方法](../content/behavior/world-methods.ts)、[工作协议](../content/behavior/worksite.ts)，接到[伙伴运行](../content/library/companions/runtime.ts)已有宿主。通常依赖 `world_combat:companion_runtime` |
| 特性、性格、固有规则 | [开放规则组合](../content/traits/composition.ts)、[原生特性](../content/mechanisms/native-abilities.ts)、[性格](../content/behavior/native-natures.ts)。规则可以响应新的事件、影响公式或贡献行为。每个特性／性格是一个独立单元，按即时战斗与任意对手设计 |
| 携带物、消耗品、装备、饰品 | [原生携带物](../content/mechanisms/native-items.ts)、[装备行为](../content/behavior/equipment.ts)、SDK 的 `equipment`／原生物品操作。Curios 已接入[核心适配](../mods/world-combat-core/src/main/java/dev/worldcombat/core/integration/CuriosEquipment.java)；新增原生物品使用启动注册。每件原生携带物是一个独立单元，效果对任意对手成立 |
| Buff／Debuff | [MobEffects](../content/mechanisms/mob-effects.ts) 与 MC `MobEffect`，详见下一节。通常依赖 `world_combat:mechanisms` |
| 其他持续机制、连接、区域、延迟反应 | [效果库](../content/mechanisms/world-effects.ts)、[效果 SDK](../sdk/core/index.d.ts)、[世界操作 SDK](../sdk/core/world.d.ts)。已有防护、临时地形、辅助实体等能力可组合使用 |
| 公共属性及个体保存数据 | [IndividualAttributes](../content/mechanisms/individual-attributes.ts)、[当前公共定义](../content/mechanisms/pokemon-attributes.ts)。依赖 `world_combat:individual_attributes` |
| 菜单、HUD、详情、世界 UI、按键 | [客户端 SDK](../sdk/client/index.d.ts)、[LDLib2 交互库](../content/client/library/)、[伙伴界面贡献](../content/mechanisms/native-companion-menus.ts)。内容可添加子面板与有条件的操作；新增输入进入按键设置 |
| 培养、成长、进化或捕捉规则 | [成长贡献](../content/mechanisms/native-growth.ts)、[捕捉贡献](../content/mechanisms/native-capture.ts)，复用原生存储和结算入口 |
| 外部模组联动、世界工作、其他新内容 | 查目标模组真实 API／标签／事件，再接通用世界或物品／工作协议。缺少原生访问能力时补宿主接口，适配代码提供事实与操作，脚本决定用途 |

这些是入口索引，新增内容可以组合多行，也可以引入新的贡献方式。目录按一个具体设计组织，无需为了表格的分类建立固定类别体系。

### 动作、持续效果与投射物组合

动作在 `Skill.composition` 或 `WorldCombat.composition` 声明兼容性；需要并行时选择 `parallel`，列出本动作使用的移动、朝向、持续输入及自定义互斥资源。默认 `exclusive` 沿用单动作操作。动作提交后可用 `action.child` 启动独立实例；原生招式用 [`NativeLoadout.fork`](../content/mechanisms/native-loadout.ts) 明确支付槽和 `linked`／`independent` 生命周期，子招读取自己的配置、校验资格并独立支付 PP 与冷却。`NativeLoadout.call` 用于提交前沿用同一事务的内联转交。AI 以具体动作的 `world.readiness` 判断可用性，以实例身份追踪完成。

AI 执行回调调用宿主 `submit` 时，返回该次实例 id，让后续阶段、暂停和恢复跟随该次提交；入口见 [`WorldMethods.Use`](../content/behavior/world-methods.ts) 与 SDK。朝向与移动的控制声明接管原生导航，释放时按持有者归还控制。

持续发射交给托管效果或 [`WorldBodies`](../content/mechanisms/world-bodies.ts) 的脑：[`WorldEffects.projectile`](../content/mechanisms/world-effects.ts)／`effect.world().projectile` 复用原生碰撞、追踪、制导、穿透与反弹，命中和完成使用该效果的命名处理器。处理器从新收到的 `effect` 取得 `world()`，用 `effect.impact()` 和 `world.projectileHit` 结算原生命中。效果的 `actor`／`persistent` 生命周期允许它在施法动作结束后继续运行；原生飞行本身随持有者失效或重载清理，持久效果可在恢复后的命名定时器重新发射。具体接口和边界见 [SDK](../sdk/core/world.d.ts)。

MobEffect 的 added／tick／removed 和普通世界事件是同步回调作用域。需要持续发射时，由这些钩子创建或操作一个可复用的托管效果；状态移除后，各过程结束、继续或转入下一幕，由内容选择相应生命周期。托管效果保存状态和处理器名，回调内重新获取当前世界能力。

## 公共属性与状态

公共属性在所有精灵上都有明确的值。原生六维、生命、亲密度和体重直接读取 Cobblemon；暴击读取共用伤害计算。新增数值使用注册的 MC `Attribute`：`world_combat:skill_haste`、`world_combat:healing_received`、`world_combat:curiosity`、`world_combat:risk`、`world_combat:persistence`。含义和实际消费者见[公共定义](../content/mechanisms/pokemon-attributes.ts)。

这些新增数值已通过 NeoForge 属性事件加入生物实体，原生 `/attribute` 命令、装备属性修饰和其他模组的 `getAttribute` 都能操作。技能急速影响默认招式冷却，受治疗加成影响共用治疗入口；三种个体行为修正与原生性格、装备贡献一起参与 AI。Java 负责注册和原生桥，具体解释与公式在脚本中。

世界内用 `IndividualAttributes.live`，原生队伍请求用 `IndividualAttributes.request` 取得上下文。数值属性读取原生基础值和修饰器后的实际值。脚本临时修饰用 `world.attribute`，基础值修改用 `IndividualAttributes.update` 的比较写入；收回时保存原生基础值与永久修饰器，临时修饰随原生生命周期结束。当前 UI 没有可随意提高强度的编辑滑块。

属性通过 **M 原生详情页的「属性」按钮**或 **G →「属性」**查看：名称、数值、用途和来源都有中英文，变化通过原有 RPC／失效通知刷新，悬停和滚动位置保留。新增玩家相关的公共属性，应同时提供翻译键、用途说明、原生接入和面板数据，定义本身不向 HUD 堆叠状态条。

枚举、向量、结构和记忆可使用个体保存数据，始终提供完整默认和验证；这种数据不属于 MC 的数值 Attribute。外部模组可以复用其公开接口，但需要理解具体语义。任务需要新公共数值时补原生注册和消费者；复杂独有状态随具体内容设计。

**施加在战斗者身上的持续状态一律是真实的 MC 状态效果（MobEffect）。** 它对宝可梦、原版生物、其他模组生物和玩家是同一个东西：物品栏可见、`/effect` 可用、牛奶可解、其他模组能感知。状态有共享身份：tag `world_combat:status/<名>`。消费方用 [`CombatStatus.has`](../content/mechanisms/combat-status.ts) 按身份判断，不依赖生产方的效果 id；生产方三条路等价——`CombatStatus.inflict` 施加共享默认效果（六个主异常有默认效果与默认行为，见 [content/rules/combat-status](../content/rules/combat-status/)），或在 `startupSources` 声明自己的变体并 `.tag(...)` 借身份和默认行为，再加 `world_combat:status/identity_only` 只借身份。词表（[生成工具](../tools/status-vocabulary.mjs)，从原作数据抽出）是字典不是围栏：新概念照样打自己的 tag，别的单元就能消费。**宝可梦那一层是单元的设计**：共享默认效果会同步成 Cobblemon 原生异常（队伍 UI、物攻减半、原生特性道具随之生效）；自己的变体不自动同步，宝可梦身上加什么由单元决定。AI 用 `CompanionBehavior.status` 按身份读。图标、译名和资源随本单元交付；启动注册修改需要重启。

服务器用 `MobEffects.apply/read/consume` 操作它；持续、叠加、原生隐藏层和解除沿用 MC 行为。`consume` 成功后才结算依赖该次消费的收益。效果可以通过 `MobEffects.react` 响应受击、行动和交互事件，产生实际行为。复杂关系或世界过程根据需要使用现有动作／实体／效果运行时。独有状态跟着内容设计，共用状态共用同一个定义。

### 声明一个新状态效果

新增效果在单元的 `startupSources` 注册，服务端行为放 `sources`，名称和图标随本单元交付。接线以接口与共享库为准；需要例子时参考 [mob-effect-sample](../tests/content/extensions/mob-effect-sample/)。

- `unit.json` 同时声明 `"startupSources": ["startup.ts"]` 与 `"sources": ["rules.ts"]`，并依赖 `world_combat:mechanisms`。范例 [unit.json](../tests/content/extensions/mob-effect-sample/unit.json)。
- 启动脚本用 `StartupEvents.registry("mob_effect", …)` 注册。`.beneficial()`／`.harmful()`／`.category("neutral")` 选类别，`.color(0xRRGGBB)` 设颜色，`.modifyAttribute(attribute, modifier, amount, operation)` 加属性修饰。逐 tick 行为依赖 `.effectTick((entity, amplifier) => {})`，回调留空也要调用：KubeJS 效果没有该回调时原生 tick 不触发。范例 [startup.ts](../tests/content/extensions/mob-effect-sample/startup.ts)。
- 服务端用 `MobEffects.react` 在效果存在时响应事件，用 `WorldCombat.on(…, "world_combat:mob_effect_tick", "", …)` 处理逐 tick。事件数据是 `{"id":"<namespace>:<path>","amplifier":<n>}`，按 id 过滤出自己的效果。范例 [rules.ts](../tests/content/extensions/mob-effect-sample/rules.ts)。效果加到实体上（或被更高等级覆盖）后的下一个 tick 触发 `world_combat:mob_effect_added`，数据多 `duration` 与 `replaced`；效果结束（自然到期、牛奶／`/effect clear`、脚本移除）后的下一个 tick 触发可写主题 `world_combat:mob_effect_removed`，数据多一个 `cause`（`expired`／`removed`）：一个状态走完自己的时间之后该发生什么，从这里开始写。
- 战斗者自身的事实（生命、等级、状态槽、招式、持有物、形态……任何一项）变化后的下一个 tick 触发 `world_combat:actor_changed`，同一 tick 内多项变化合并为一次；由此维持派生状态一致，不必逐 tick 轮询。
- 名称写进 `lang/zh_cn.json` 和 `lang/en_us.json`，键为 `effect.<namespace>.<path>`（路径中的 `/` 写成 `.`）。范例 [lang/zh_cn.json](../tests/content/extensions/mob-effect-sample/lang/zh_cn.json)。
- 图标复用已有贴图，在 `unit.json` 用 `mobEffectIcons` 声明映射，见下面[效果图标复用已有贴图](#效果图标复用已有贴图)。
- 启动注册只在游戏启动时读取，改动后需要重启游戏。`startupSources` 只加载[启动 SDK](../sdk/startup/index.d.ts)，不能引用服务端库。

### 效果图标复用已有贴图

效果图标指向已有贴图，构建时合并成一份 `assets/minecraft/atlases/mob_effects.json`。单元的 `unit.json` 用 `mobEffectIcons` 声明效果 id 到贴图 id 的映射：

```json
"mobEffectIcons": {
  "your_namespace:your_effect": "minecraft:mob_effect/resistance"
}
```

- 采用 MC `single` sprite source 语义：`resource` 相对 `textures/`、省略 `.png`，键就是效果 id。范例 [unit.json](../tests/content/extensions/mob-effect-sample/unit.json)（测试夹具）。
- `resource` 可指向原版或 Cobblemon 的任意已有贴图，例如物品 `minecraft:item/diamond_sword`、粒子 `cobblemon:particle/balls/afterspark`。
- 同一效果只能声明一次；重复声明在构建时报错，多单元并行不会互相覆盖。
- 图标按原版状态效果槽位缩放显示，贴图尺寸不一致不影响使用。

### 粒子表现（presentation.ts）

范围、运动、数需要从画面读出时，就把客户端定义文件列进单元 `unit.json` 的 `clientSources`，在文件里用 `WorldCombatParticles.scene(id, version, definition)` 注册定义（格式 v2）：

```ts
// presentation.ts（unit.json 的 clientSources）
WorldCombatParticles.scene("your_namespace:your_effect", 1, {
  moments: {
    main: { emitters: [
      { name: "glow", bind: "source", offset: [0, 1, 0], particle: "world_combat_core:cobblemon/generic/orb/orb",
        rate: 8, shape: { kind: "sphere", radius: 0.4 }, lifetime: [12, 20], size: [0.2, 0.05],
        color: 0x66CCFF, alpha: [1, 0] }
    ] }
  }
});
```

- 服务端一行触发：`WorldFeedback.emit(world, "your_namespace:your_effect", 1, point, { moment: "main" }, 40)`；持续表现用 `WorldFeedback.keep(world, key, "your_namespace:your_effect", 1, point, { moment: "main" }, 40)` 定期续期。`data.moment` 缺省为 `main`。招式动作提交前（`ready`、`windup` 回调）没有可写世界，用 `action.present(key, "your_namespace:your_effect", 1, point, JSON.stringify({ moment: "windup" }))` 播放准备期表现，它随动作结束清理。
- 启动后在客户端用 `/wcparticle your_namespace:your_effect main 200 here` 就地预览；去掉 `here` 在视线落点播放。
- `particle` 用已注册类型 id：原版如 `minecraft:flame`，Cobblemon 贴图为 `world_combat_core:cobblemon/<path>`。`<path>`、帧数与帧尺寸在[贴图清单](../mods/world-combat-core/src/main/resources/assets/world_combat_core/particle_types.txt)里查（每行 `cobblemon/<path> <帧数> <宽>x<高>`）。多帧类型默认在粒子寿命内播放一遍，用 `lifetime` 控制快慢；只想固定一帧写 `spriteFrom: "random"`。粒子面是正方形，优先选方形帧。
- 完整字段见 [SDK 类型](../sdk/client/index.d.ts)，数值绑定与几何约定见[表现契约](authoring/presentation.md)。经用户验收的正式范本：[火焰之躯](../content/abilities/flamebody/presentation.ts)（受击反应、持续灼烧状态）、[威吓](../content/abilities/intimidate/presentation.ts)（一次性释放波与目标标记）、[青草制造者](../content/abilities/grassysurge/presentation.ts)（地面区域与区域内治疗），观感规则见[视觉语言](plans/P5-visual-language.md)。

表现里的量来自机制与体型，`presentation.ts` 不保存第二份常数：

**每招至少一处特效由本招计算出的机制数值驱动，简单招式同样执行。** 在体型适配与位置跟随之外，把实际机制值传给对应的表现消费者，形成数量、强度或范围的可见变化。载荷接线见 [WorldFeedback](../content/mechanisms/world-feedback.ts) 文件头的契约。

- 绑定到实体的发射器默认 `fit: "body"`，偏移、形状、尺寸、速度、尾迹间距按该实体碰撞箱缩放；定义按中等体型（约 0.9 宽 × 1.4 高）书写，实际体型由引擎处理。服务端可用 `world.observe(actor).width()/height()` 让机制值（半径、击退）同样随体型变化。
- 地面区域等 `point` 绑定不随体型缩放，跟随机制半径：服务端把 `data.scale = 实际半径 / 定义时的参考半径` 传入。
- 命中的强弱由机制结果决定：服务端把伤害占目标最大生命的比例、暴击、阶段数、层数等放进 `data`，客户端按它选择数量、亮度与持续。
- 形状有朝向：发射器的 `orient` 让形状的轴每 tick 转向 `data.direction`、目标锚点或锚点自身的运动，一条线、一个锥、一个环因此能指向机制真正指向的地方。
- 形状可以由几个对象共同撑起：`bind: "path"` 的发射器沿 `data.path` 里的顶点工作（实体引用 `String(actor.ref())` 或 `[x, y, z]`），`polyline` 沿顶点连线、`polygon` 填满顶点围成的面，实体顶点每帧跟随。机制侧的同一形状用 [`WorldGeometry`](../content/mechanisms/world-geometry.ts) 选择对象（扇形、走廊、矩形、环带、多边形），表现与结算读同一组顶点。
- 几何与对象条件共同决定命中：`WorldGeometry.select` 先筛区域，回调再按可见性、关系、注册表标签、状态或自定义谓词筛选。复合区域用 `Region.contains` 组合并提供覆盖范围；`selectEnemies` 的现有语义是非友方集合。原生非生物实体用 `world.nativeEntities` 查询后按实际类型与条件处理。
- 粒子定义的数值叶可用 `{ data: "路径", fallback: 数值 }` 读取本次表现载荷，绑定数量、尺寸、运动、时长等数值。结构、条件和精确的持续对象数量由 `WorldCombatClient.scene` 回调计算；两种入口与生命周期见[表现契约](authoring/presentation.md)。

### 持久实体、方块与世界

招式和特性可以在世界里留下东西，而不只是改数字。接口都在 [`CombatWorld`](../sdk/core/world.d.ts)，任何可写作用域（动作、效果、另一个实体的脑）都能调用：

- **自定义持久实体**：`world.spawn(point, body, definition, state, ticks)` 生成一个属于它自己的活体——外观（物品、方块、贴图）、尺寸、生命、速度、重力、可推、无敌、名字都由 `body` 配置；它的行为是一个持久效果（脑），源与目标都是它自己，所以动作结束、宝可梦被收回、区块卸载、服务器重启都不影响它。脑的处理器通过 `brain.world()` 拿到以实体为源的完整世界能力：寻路、发射、施加状态、放方块、开箱子、再生成实体。玩家右键、生物触碰、撞到方块、被杀，都会到达脑。共享层 [`WorldBodies.define / spawn`](../content/mechanisms/world-bodies.ts) 把回调对象翻译成脑，并把这些事件路由过去；`world.motion` 给它速度，`world.mount` 让别人骑上它。
- **方块**：按实际用途选择原生交互。改变通行、碰撞、物理性质或世界流程的机制可以使用方块；冲击与痕迹等画面信息由表现层承载。需要可恢复的临时方块时使用 `terrain`，其生命周期与所有权见[世界 SDK](../sdk/core/world.d.ts)；永久变化的去留由玩法决定。消耗世界中原有方块使用 `breakBlock`，沿原生保护事件与 mobGriefing 执行。带方块实体的方块可以换状态，宿主保留本体与数据；`blockData` 读取，`container`／`insertItem`／`extractItem` 走物品。
- **物品与世界现象**：`dropItem`、`giveItem`、`explode`（冲击与观感，不破坏方块、不点火）、`lightning`（光与声，不点火）、`ignite`、`target`（让生物仇恨谁）、`weather`（整个维度的天气）。
- **投射物**：动作内 `action.projectile` 的外观 JSON 同时携带飞行选项——`homing`（追踪目标、每刻转向角、延迟、感知范围）、`pierce`（穿透目标数）、`bounce`／`restitution`（弹墙）。
- **原生对象**：Minecraft 与已安装 Mod 能做的一切都是材料。上面的方法包住了宿主能为你守护和收拾的部分；其余通过 `nativeEntity`／`nativeLevel`／`nativeBlock`／`nativeBlockEntity`／`nativeEntities` 直接拿到原生 Java 对象（Rhino 可以调用它们的任何公开方法），`spawnEntity` 生成任何已注册的实体类型（可带 NBT、可带寿命），`command` 以控制玩家的身份执行命令。世界里已经存在的机制——某种实体、物品或方块天然会做的事，以及别的 Mod 加进来的行为——用它本身去做，它自带的行为、反制和玩家熟悉的读法都跟着来。通过原生对象改动的东西由内容自己放回：写在效果的 `end`、持久实体的脑里，或给生成物一个寿命。

### 中间实体与投射物的外观

`world.helper(...)`、持久实体的 `body.appearance` 与 [LivingActions.projectile](../content/mechanisms/living-actions.ts) `Flight.appearance` 使用同一种外观声明；声明后才渲染，只声明机制字段的中间产物保持隐藏。`{"block":"minecraft:ice"}` 以整块方块模型渲染，`"spin": true` 让物品与方块缓慢旋转。

- 物品形态 `{"item":"minecraft:iron_sword"}`：用 `ItemRenderer` 画物品模型，MC 与 Cobblemon 物品均可，像掉落物一样落地旋转、不上下浮动。
- 贴图形态 `{"sprite":"cobblemon:particle/balls/afterspark"}`：从对应图集取贴图、画面向相机的方块面；物品贴图用 `minecraft:item/...`。Cobblemon 的多帧贴图（[贴图清单](../mods/world-combat-core/src/main/resources/assets/world_combat_core/particle_types.txt)里帧数大于 1 的）按帧播放，每帧 2 刻，只显示当前一帧。
- 可选项：`scale`（正数倍率，默认 1）、`tint`（RGB，如 `0x66CCFF`，作用于贴图形态）、`glow`（自发光）。
- 范例 [rules.ts](../tests/content/extensions/visual-sample/rules.ts)（测试夹具）。

### 触发时的浮动文字

用 `WorldFeedback.text(world, point, key, args, ticks)` 在世界某点上方浮出一行本地化文字。文字键放在单元自己的 `lang/`，中英同键、`%1$s` 参数序号一致；翻译在客户端按玩家语言解析，`args` 按序号填入。

```ts
WorldFeedback.text(world, target.position(), "effect.your_namespace.your_effect.trigger", [value], 40);
```

`lang/zh_cn.json` 与 `lang/en_us.json` 各写一行同名键。渲染入口见 [world-feedback.ts](../content/mechanisms/world-feedback.ts) 与 [companion-world-ui.ts](../content/client/companion-world-ui.ts)。

## 数值、性格和用途

### 招式要玩家选什么

一招的输入形状是设计的一部分，和出手方式同等重要。客户端按动作声明的瞄准契约收集输入，服务端在 `action.control()` 里读到经校验的选择：

- 目标种类由 `Skill.kind` 决定：`enemy`／`friend`／`self`／`aim`（任意关系实体或点）／`point`（地点）／`motion`（位移终点）。实体输入的范围按施法者中心到目标真实碰撞箱最近点判断；`targetPosition()` 保留选中的身体局部瞄点，并随目标位置和尺寸变化。省略局部选点的中心输入保持中心，伤害仍须经过招式的真实碰撞与权限结算。
- 复杂选择用 `WorldCombat.preview("world_combat:<招式id>", JSON)` 声明（招式的动作 id 就是 `world_combat:<id>`）：`input.steps` 让玩家逐步确认多个选择（例如三个点连成一条路径、先选一块已有的区域再选一个点），每步是 `point`／`entity`／`field`；`input.sustained` 让玩家按住技能键持续引导，松手即停（`world_combat:input-stop`）；`cells`＋`rotation: "cardinal"` 给出可旋转的放置轮廓并做落点检查；`motion` 预览位移终点；`lineOfSight` 要求视线。字段与校验以 [ActionPreview](../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/ActionPreview.java)、[ActionInput](../mods/world-combat-core/src/main/java/dev/worldcombat/core/runtime/ActionInput.java) 为准，客户端流程见 [ComplexInput](../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/client/ComplexInput.java)。
- `field` 步骤能选中的是内容自己在表现数据里标了 `selectable: true` 与 `effect: <效果id>` 的区域。
- 接法范例（测试夹具，只演示写法）：[conduction.ts](../tests/content/workshop/conduction.ts) 里的三点路径、按住引导、区域连接。

逐个设计有意义的参数：准备／恢复时间、范围、弹道、数量、持续、控制、恢复、环境作用及资源代价。**每一招（包括简单招式）的参数都大量依赖精灵自身的数据，并把不同来源分散到不同参数上。** 理由是区分度：同一招很多精灵都能学，同一招在两只精灵手里的区别就来自它们的种族值与个体数据，而这些差距常常只有一两个点；参数依赖的数据越多、分得越开，这些小差距才会在场上变成看得见的不同。数据来源：原生六维（HP、攻击、防御、特攻、特防、速度）、体型（身高、体重、碰撞体积）、当前处境（生命比例、是否受伤、湿身、燃烧、在水中或空中、亲密度等自然语义上的状态），以及随等级阶梯变化的能力与数值（`stages`）。选有解释力的关联；几何或协议常量可以固定。这条链从数据到参数再到表现：粒子的数量、强度、范围按参数取值派生，两只精灵放同一招时画面也不同。每招拥有自己的公式与平衡，公共公式可复用、可扩展。动作时序由玩法决定，现有动画作为可以利用的资源。

**参数由公式定义。** 每个参数写成一棵 [Formula](../content/mechanisms/formula.ts) 表达式树，用 `formula(node, 标签, 选项)`（及 `seconds`／`percent`）登记到 `actionParameters.define`，接口见[参数库](../content/library/skills/parameters.ts)。同一棵树两用：出招时编译成纯数值闭包求值，详情页悬浮时展开成"值 = 公式，逐项列出每个量的当前值"。变量有 `F.stat(...)`、`F.level()`、`F.body(...)`、`F.pref(...)`（配置项，布尔或数值）、`F.world(...)`、`F.state(...)`；`.as(标签)` 让一段子表达式在悬浮里成为一项；`F.when` 表达分支，`stages()` 的等级阶梯自动并入公式。伤害段（`defineDamage`）在悬浮里显示施法者一侧的理论伤害，其公式在 [CombatantStats.damageFormula](../content/mechanisms/combatant-stats.ts)，威力参数作为其中一项展开；对手的防御、属性相性与暴击在命中时由共享结算统一乘入。依赖命中目标或现场环境的部分标注计算时机。

面向玩家的说明写清操作、目标、实际效果与条件。持续时间和比例用 `seconds` / `percent` 的类型化绑定显示单位；表现用的粒子数量、密度、发射次数保留在参数与表现文件中。公式的 `F.stat(...)` 和属性面板使用现场的临时能力等级，永久培养值仍从原生个体数据读取。公共的能力等级增减走 `NativeEffects.boost/read/write`，普通 MC 生物与宝可梦共用调用入口。


事实按作用域读取：通用战斗者、原生个体、动作、执行定义、支付资源、目标与状态身份分别取其当前事实；自定义纯事实通过 `defineFacts` 同时供执行和悬浮说明使用。持久状态根为 JSON 对象，公式读取其中数值或布尔叶；缺省事实保留未知语义。动态伤害属性、类别和标记通过 `damageFeatures` 接入同一份求值上下文。原生招式参数入口与通用 `factContext` 的适用范围见[参数库](../content/library/skills/parameters.ts)。

精灵设计通过身体、特性、性格、公共值、观察与记忆来改变目标和方法选择。共用能力按用途复用，一项能力可以有多个用途；专属行为可以授予原生配招之外的行动。复用通用方法，再补精灵真正有特色的部分。性格应体现为可观察的选择、节奏和反应，而不只是文字标签。

每一项具体内容定义自己的全局默认与个体偏好。招式配置由现有服务按招式保存；其他内容可复用[偏好库](../content/preferences/skill-preferences.ts)。偏好表达使用方式、AI 意图、环境影响许可和真实取舍。**数值型配置项必须双向有代价：向任一方向调整都同时改变收益与限制，玩家在任何设置下都要做取舍**；只改变强度而没有对应代价的数值，放进公式，不做成配置项。**AI 配置项必须对应玩家能预见、并能在游戏里观察到的行为差异**：优先提供组合策略层面的选项（触发条件、目标选择、风险取舍的整套倾向），每个选项用一句玩家能懂的话说明改动后会看到什么；说不清的选项不提供。配置变更要实际影响执行、AI 与对应说明。

上述取舍按实际消费者与最终结算核对，包含 AI 数值配置。先确认可选范围内的变化确实生效，再把取整、限幅、资源消耗与结算截断算进收益和代价；各选项应有适用局面，帮助文本与数值说明展示实际结果。

AI 说明区分施放条件与选择倾向，分别落实为条件校验与候选排序。沿共享调度核对包括只有本招可选时的最终行为，使其符合所写条件、偏好与兜底用法；接入语义见 [WorldMethods.Use](../content/behavior/world-methods.ts)。

选目标、站位对象与施放落点可分别声明；对象身份和运动通过当前决策帧的事实读取。动作许可、内联调用的执行身份／支付身份、作用域中断与效果回调，分别从[动作与配招](../content/mechanisms/native-loadout.ts)、[状态策略](../content/mechanisms/combat-status.ts)、[动作生命周期](../content/mechanisms/living-actions.ts)及[效果库](../content/mechanisms/world-effects.ts)接入，具体策略由内容定义。

## 原生生态、两端与生命周期

投射物使用 `CombatAction.projectile` 或 [LivingActions.projectile](../content/mechanisms/living-actions.ts)，进入原生实体跟踪、碰撞、弹反和 NeoForge 命中事件。数值结算、MC 属性、状态、方块／物品交互、导航、伤害事件和其他生态功能优先使用已有原生接口。

受击运动按单位选择 `world.knockback`（原生击退）、`world.hitImpulse`（叠加速度）或 `world.hitDisplace`（受碰撞限制的位移格数）。这些入口统一保留原生击退事件、抗性、敌我权限与骑乘边界；主动动作继续使用 `motion`／`displace`。具体返回值和事件约定见 [世界 SDK](../sdk/core/world.d.ts)。

一次动作的多段与派生效果，通过 `world.originInstance()`／`originData()`共享宿主来源与临时 JSON 决定。[MoveExecutions](../content/mechanisms/move-executions.ts) 在提交时复用伤害段声明，内容据此消费一次性效果；不要按首个受击对象代替整招。未接入动作运行时的原生攻击，以同一弹体或同一 `DamageSource` 的最早可观察交付为界；来源不推断其他 Mod 内部的施法过程，重载后清理。

能力等级转移调用 `NativeEffects.transferStage`：双方拦截先确定可守恒的有符号数量，再由 `world.compareEffectStates` 比较完整效果快照并一次提交。临时贡献沿用原拥有者和剩余时长；明确交接时先准备零贡献的自拥有载体。共享 CAS 只改状态，生命周期和所有权仍由效果接口管理，提交后的观察回调属于后续变化。见 [NativeEffects](../content/mechanisms/native-effects.ts) 与 [效果 API](../sdk/core/world.d.ts)。

[CombatEncounters](../content/mechanisms/combat-encounters.ts) 记录角色本场首动与有共同敌人证据的友方最终死亡；原生攻击以最早可观察事实为界。[NativeAttackProjection](../content/mechanisms/native-attack-projection.ts) 仅为明确支持的近战和原生弹体提供实际接触／飞行回放。[BodyScale](../content/mechanisms/body-scale.ts) 管理原生缩小及空间不足时有归属的待恢复状态；战斗增益应独立绑定原载体。


服务端决定命中、资源、状态、权限和 AI；客户端负责交互呈现、预览和纯表现。普通内容调用现有 SDK，具体通信由后端管理。新增通信只传当前相关且发生变化的数据，复用 RPC／订阅和现有实体同步；入口见[服务端 SDK](../sdk/core/index.d.ts)与[客户端 SDK](../sdk/client/index.d.ts)。技术检查按改动范围执行，操作体验由用户试玩。

`CombatWorld`、动作、效果和原生请求都是有作用域的句柄。延时执行通过动作／效果调度，回调中重新取得世界对象；保存原生个体 ID、普通 JSON 和必要的版本，避免保存实体句柄。动作中断、死亡、收回、目标离场、重载及内容移除时，资源和临时变化应随正确的拥有者结束。

## 一个独立单元怎样交付

在属于自己设计的目录编写 `unit.json`，声明命名空间 ID、版本、实际依赖以及服务端／客户端／启动源文件。资源和中英文说明放在同一个单元内；玩家可见的说明只写本单元新增的行为与规则，原生名称与介绍由游戏自带。准确格式以[加载器](../tools/content-manifest.mjs)和[资源装配](../tools/build-unit-assets.mjs)为准；现有单元声明可以作格式参考。

最小的声明形状如下，只展示装配格式：

```json
{
  "schema": 1,
  "id": "your_namespace:your_content",
  "version": "0.1",
  "requires": { "world_combat:mechanisms": "0.1" },
  "sources": ["main.ts"]
}
```

新增源文件按需要拆分，以独立命名空间避免不同作者的全局名称冲突。当前脚本使用 TypeScript namespace 与显式单元依赖装配；相同公共库加载一次。`lang/zh_cn.json`、`lang/en_us.json` 提供双语片段，原生资源放在 `resources/assets/` 和 `resources/data/`。编译会检查身份、依赖、类型、翻译和资源冲突。

交付前对自己的单元目录运行单元检查：

```powershell
node tools/check-unit.mjs content/abilities/<id>
node tools/check-unit.mjs content/moves/<id>
```

它按 `unit.json` 声明的依赖对服务端、客户端与启动源码做类型检查，并校验粒子贴图 id、中英 lang 键一致、代码引用的文本键存在、新状态效果有图标与译名，还查音效 id 与 MobEffect id，拒绝对全部生物逐刻广播的 `world_combat:actor_tick`。校验场景定义时会临时落盘并调用 java，任意数量作者可同时运行。把命令与结果写进报告。其他语言的改动交给集成者检查，在交付中注明。

提交自己的单元及必要的共享改动；指出单元 ID、依赖和启用方式。[正式选集](../content/collections/p5.json)按目录前缀自动收录正式单元目录；集成者按[集成职责](authoring/integration.md)进行构建、验证与安装。

## 并行生产的简单约定

你的任务可以与其他作者的任务同时开发。使用协调者提供的共同基线；任务之间有依赖时，交付中说明依赖的单元或共享变更。你无需等待其他无关内容完成。

在分配给你的单元目录内完成属于自己的内容 ID 和源码。先查现有共享入口与原生 API，独有逻辑由本单元实现。核心玩法或正确运行确实受能力缺口阻塞时，在报告的“共享前置”说明已查入口、缺少的事实或操作、为何需要共享层支持、受影响单元与预期验证方式；受影响单元标为“待前置”，完成其余内容与验证后交回本组结果。首轮所有作者返回后，集成者统一处理缺口并派发补接、返修任务；对应作者接入并完成 check-unit 与 smoke 验证后，再记为完成。便利性与可选复用建议放入规则反馈；派发和集成由协调者负责。

完成时给出：

- 内容与启用入口，实际实现的用途和可观察的行为。
- 必要的共享变更、依赖和外部模组条件。
- 语法检查结果，以及交给集成者验证和用户试玩的具体项目。
- 可直接操作的试玩方法：怎样取得内容、怎么触发、预期看到什么。
- 数值与配置说明：每个参数依赖哪些精灵数据（六维、体型、当前处境、等级阶梯）；每个配置项两个方向各有什么代价、玩家会看到什么变化。

根据用户反馈修改正式内容；验收后再由集成者更新范本范围。创作过程和未采用的方案只在解释实际取舍时保留。

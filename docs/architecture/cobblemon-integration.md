# Cobblemon 接入

接入基于锁定的 [Cobblemon 1.8.0 源码](https://gitlab.com/cable-mc/cobblemon/-/tree/b33536e8721c9419d664fee15aa9e35cbf1900a8)。基础接管见 [P1 检查](../development/P1-checks.md)，操作与捕捉见 [P2 检查](../development/P2-checks.md)，原生能力的当前适配范围见 [P3 进度](../development/P3-checks.md)。

**旧启动在创建对局前返回标准错误。** [注册入口拦截](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/mixin/BattleRegistryMixin.java)覆盖已知挑战路径及跳过取消事件的调用。启动预热由[订阅拦截](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/mixin/PrewarmSubscriptionMixin.java)单独处理，保留数据初始化与其他订阅。选择订阅点，是因为直接变换上游主类会在本版加载器重算栈帧时触发专服对客户端类的解析；该选择已通过专服加载验证。

**Minecraft 先执行受伤逻辑，适配再提交一次个体生命。** [伤害接入](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/mixin/PokemonDamageMixin.java)统一野生与有主个体，[生命投影](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/PokemonHealthBridge.kt)让恢复和原有成长结果反映到实体。正生命向上取整，保持个体倒下与实体归零一致。

**核心拥有瞬态动作，Cobblemon 拥有个体与成长。** [领域适配](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/PokemonCombatDomain.kt)以个体 UUID 识别伙伴，按当前实体与所属验证有效性。PC、交换及收回使旧控制句柄失效；骑乘、休息、进化时释放指挥，自由活动将原生 AI 交还上游，手动动作临时取得执行权。

**原生提供能力值，脚本组合即时规则。** [只读快照](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/PokemonView.kt)读取当前原生属性提供者的计算结果，包括培养与性格修正；[基础伤害脚本](../../content/mechanisms/pokemon-damage.ts)组合攻防、招式威力和原生属性关系，通过既有命中路径换算并结算个体生命。状态、特性与道具的战斗效果由 P3／P4 后续增量接通。

**配招和 PP 共用原生个体数据。** [脚本绑定](../../content/mechanisms/native-loadout.ts)决定每个原生招式对应的动作与资源用量，玩家指令和 AI 使用同一结果；原生换招或排序使技能栏随之更新。[PP 适配](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/NativeMoveResources.kt)在提交时复核招式身份和余额。学习／遗忘／回忆、恢复道具、PP 提升与保存继续走原生路径，代表操作及真实重启已检查。

**牧场个体沿用原生生命周期并进入伙伴控制。** [牧场适配](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/NativePasture.kt)以 Cobblemon 的 `Tethering`、PC、权限控制器和牧场方块实体为事实来源；牧场中的已加载个体可加入伙伴会话、G 面板和 HUD，脚本可以读取牧场位置、漫游边界、主人和冲突标记。导航目标先经过牧场边界契约，再交给 Minecraft／Cobblemon 原生寻路；越界仍由 Cobblemon 的拴绳检查负责召回。牧场权限、数量、召回、保存、重载和网络界面继续使用 Cobblemon 原生入口。

玩家在牧场界面点击自己拥有的已加载个体可以直接打开 WorldCombat 指挥；已有的召回和冲突按钮保持原优先级。也可以在 G 面板的“切换伙伴”中选择牧场个体。切换使用个体 UUID 与服务器回执，不把牧场成员伪装成队伍槽位；牧场个体的默认活动中心是牧场边界，独立工作和招式仍按各自内容定义。

**成长收益由脚本选择，经原生入口写入。** [成长策略](../../content/mechanisms/native-growth.ts)转译默认原生经验／EV 规则，读取配置、学习装置、幸运蛋、力量道具及亲密度等事实。当前野生击败收益归击败行动者，学习装置分享给原队伍中的合格个体。[适配事件](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/GrowthEvent.kt)暂存写入，回调成功后调用原生经验、EV 和进化进度存储；原生事件、上限、升级学招、亲密度与普通进化继续生效。

招式使用在成功提交后计入，受伤按实际个体 HP 减量记录。事件写入限定于当前脚本周期和服务器线程，回调结束后失效。锁定版原生序列化会将 `held_item` 等条件规范化，而击败进度保留逻辑比较原文；[存储兼容修复](../../mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/mixin/DefeatProgressMixin.java)在读取时重新关联等价的原生条件，保持既有进化规则及存储格式。

**捕捉继续使用原生投球、公式和捕获效果。** [条件脚本](../../content/mechanisms/native-capture.ts)将依赖旧对局的特殊球条件转为世界经过时间、当前放出的伙伴及玩家与目标的交互记录；[倍率适配](../../mods/cobblemon-world-combat/src/main/kotlin/dev/worldcombat/cobblemon/script/CaptureContent.kt)只提供原生事实、短期状态与倍率写入。原生世界捕捉的生命、状态、保底捕获和入队路径继续执行，记录按玩家及目标隔离，脚本重载后重新开始。

收回被取消时保持绑定，实际离场结束动作；重新放出保留尚未结束的冷却。生命、成长、配招和进化记录沿用原存储，瞬态动作在重载或停服时结束。

## P4 接续的共同要求

| 工作 | P5 前的可用结果 |
| --- | --- |
| 原生持续状态 | 单一原生状态数据与即时效果、恢复道具、捕捉修正协调；明确施加、解除、离场与重入语义 |
| 特性及携带物 | 通过通用效果协议实现触发、修正顺序、消耗与恢复；脚本定义具体规则，领域层维护原生事实 |
| 反伤与会心成长条件 | 从实际效果触发原生进度，定义遭遇内计数及重置；当前计数存储接口已提供，效果触发待接入 |
| 特殊形态与招式系统 | 核对 Mega、Z 招式、极巨化、太晶化等在锁定数据中的获得／调用路径及附属依赖，落实确认范围的效果、资源与生命周期 |
| 扩展验证 | 通用核心独立运行，用增量内容包验证状态、交互、AI 与表现组合；覆盖第 8 节与 T03 的原有要求 |
| 样机替换与 AI 边界 | 移动速度衔接原生能力与效果修正；区分指挥选择和出战管理；将选敌、追击、站位等玩法策略迁入可替换内容，实际验证移除旧技能／AI 样例后基础接入仍可用，并能装入新内容 |

原生钓鱼、图鉴及其他世界系统继续保留上游入口；牧场已经增加结构化适配，具体能力由脚本内容按需扩展。其他系统按实际交叉范围接入。

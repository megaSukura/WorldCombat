# 按需求复用共享能力

这是接口查找入口。每招的用途、公式、取舍、节奏与表现继续由该单元设计；实现和参数以链接代码为准。

| 需求 | 当前入口与约定 |
| --- | --- |
| 逐个目标计算、条件公式、配置分支与详情悬浮 | [参数上下文](../../content/library/skills/parameters.ts)和 [Formula](../../content/mechanisms/formula.ts)。同一公式服务执行与说明；`withTarget` 提供该次命中的目标，`defineFacts` 扩展原生之外的事实。`F.known` 区分未知与已知零值，`F.choice` 读取具名选项。 |
| 独立伤害公式、按另一能力结算、固定生命伤害 | [PokemonDamage](../../content/mechanisms/pokemon-damage.ts)。每段声明自己的公式；固定生命值用 `fixed` 并显式选择属性相性政策。实际损血看 `onDamageApplied`，可按动作、招式、伤害段过滤。 |
| 共享状态、临时能力等级与失败反应 | [CombatStatus](../../content/mechanisms/combat-status.ts)、[NativeEffects](../../content/mechanisms/native-effects.ts)。MC 效果标签表达身份；默认载体、变体、自定义行为均可组合。临时等级用 `boostWindow`，清零/复制走对应共享入口。拒绝后的反应接 `CombatStatus.rejected`，使用事件给出的具体原因和载体。 |
| 天气、地面场景、陷阱、屏障和环境采样 | [WorldEffects](../../content/mechanisms/world-effects.ts)、[WorldEnvironment](../../content/mechanisms/world-environment.ts)。生产者声明身份与类别；消费者按标签和实际位置查询。需要施法者退场后继续存在的场景，明确选择 `detachedField`。 |
| 地形写入与原生实体交付 | [世界 SDK](../../sdk/core/world.d.ts)、[LivingActions](../../content/mechanisms/living-actions.ts)。地形回执列出成功格与跳过原因；是否允许跳过由调用者决定。友方投射交付可设置 `hitAllies`，命中后的用途仍由回调决定。 |
| 装备转手、消耗、树果、原生队伍 | [NativeItems](../../content/mechanisms/native-items.ts)、[队伍接棒库](../../content/library/skills/party-relay.ts)。以当前槽位快照进行条件写入，按颗操作保留余量与组件；先检查原生操作回执再结算收益。树果基本摄食效果可注册，各招保留自己的摄取规则。 |
| AI 看谁、用什么、如何接近和收尾 | [WorldMethods](../../content/behavior/world-methods.ts)、[观察宿主](../../content/behavior/world-host.ts)和[宝可梦适配](../../content/behavior/pokemon-host.ts)。观察、用途与决策分开贡献；接战意愿与实际施放距离分别表达，使用当前个体的动态射程。 |
| 物种习惯、独立行为与原生配招之外的能力 | [个体贡献入口](../../content/behavior/individuals.ts)、[行为组合](../../content/behavior/composition.ts)、[独立世界能力](../../content/mechanisms/world-abilities.ts)。向现有主体贡献事实、能力和策略；招式说明自身用途，物种与性格决定怎样组合使用。 |
| 按数据变化的粒子颜色、运动、范围指示 | [客户端 SDK](../../sdk/client/index.d.ts)、[属性配色](../../content/mechanisms/type-colors.ts)、[指示几何](../../content/client/library/indicator-geometry.ts)。客户端组合支持数据绑定与多层表现；属性语义由脚本提供，通用渲染器读取数据。 |

以现场为条件的数值，在没有目标或世界的详情页保留“需要现场”的解释。体重沿 Cobblemon 原生单位（百克）读取；正文中的秒、百分比、距离等由参数的显示单位表达。音效以资源包 `sounds.json` 身份为准，也支持未登记在服务端注册表中的声音。

AI 的 `available/accepts` 决定是否值得执行、对象是否适合；需要通过移动满足的施放条件，在行动过程中确认。当前 `approach` 只处理射程外的接近；射程内选位或连续行为可由方法的 `compose` 与任务节点组织，`after` 承接实际施放结束。感知保留通视和最后观察位置的语义，具体调用契约以 `WorldMethods` 为准。

扩展到普通实体或世界交互时，先核对原生事实与操作，再选共享入口。例如声音、振动事件和仇恨分别有自己的消费者。具体设计确实需要新事实或操作时，再补对应的通用契约；内容的玩法仍由该单元定义。

验证入口见 [SDK 舞台](../../sdk/smoke/index.d.ts)。`stage.stages`、PP、命中/暴击与伤害回执提供真实探针；偏好、等级、场地和站位操作可布置必要条件。概率行为用轨迹与作者说明评价，确定性断言只覆盖条件明确时必然发生的事实。额外依赖用 `--with-units` 装入，同次运行只执行所提交单元的场景。

这些链接提供实现资料。可用于后续创作的玩法、AI、平衡和表现范本仍以[人工验收参考表](accepted-content.md)为准。

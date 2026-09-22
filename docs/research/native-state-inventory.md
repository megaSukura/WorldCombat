# 上游状态与机制清点 · 2026-09-17

依据项目锁定的 **Cobblemon 1.8.0+1.21.1、内置 Showdown 18**。本文用于按需追溯原作概念与来源，数量描述上游数据。项目可调用能力以当前 SDK 与共享代码为准，状态身份见[状态词表](../../build/p5-batch/status-vocabulary.md)，具体行为由各招的即时玩法决定。

## 如何得到数量

从实际依赖 JAR 读取 `data/cobblemon/showdown.zip`。Cobblemon 的 scripts 声明继承 base；按这一继承关系合并中央 Conditions，以及 Moves、Abilities、Items 内嵌的 condition。再解析状态添加、查询、消耗／移除和场地应用的字面引用，统一大小写与 ID。程序只读取语法，不执行上游战斗代码。

结果是 **168 个唯一机制定义：中央条件 34、招式内嵌 122、特性内嵌 10、道具内嵌 2**。检查的数据表分别含 952 个招式、314 个特性、537 个道具数据项，其中含历史、特殊规则及辅助条目。168 个定义中，130 个未标非现行，30 个标 Past、6 个 Gigantamax、1 个 Unobtainable、1 个 CAP。

代码入口：[清点程序](../../tools/inventory-native-states.mjs)，执行 `node tools/inventory-native-states.mjs --extract` 可重新从锁定依赖提取。[完整结构化结果](data/native-state-inventory.json)含每个定义的来源位置、回调、引用者及动态引用；[原始来源目录](../../build/state-inventory/source)保留本次提取内容。

## 数量与实际含义

| 引用归属 | 已找到定义 | 设计时要分清的内容 |
| --- | ---: | --- |
| 主要异常 | 6 | 灼伤、麻痹、睡眠、冰冻、中毒、剧毒；上游主异常槽互斥，世界中如何组合须自行决定 |
| 个体临时条件 | 101 | 控制、保护、锁定、准备、储备、反应、关系及若干内部记录 |
| 阵营条件 | 22 | 屏障、顺风、进入惩罚、誓约组合、极巨持续场地伤害 |
| 全场规则 | 9 | 重力、各类空间、妖精之锁、电离子与水／泥影响等 |
| 天气 | 8 | 晴天、雨、沙暴、冰雹、雪、强日照、强雨、乱流 |
| 地面场地 | 4 | 电气、青草、薄雾、精神 |
| 槽位／延迟条件 | 6 | 延迟招式、祈愿、治愈之愿、新月舞、复生与替换治疗记录 |
| 需沿动态路径理解的定义 | 12 | 下表末组列出，包含准备动作、誓约、类型规则与反射内部机制 |
| **合计** | **168** | 数量按本次已解析的定义归属去重 |

此外，能力阶级的 **攻击、防御、特攻、特防、速度、命中、闪避 7 个轴**另存于战斗个体，未计入上表。HP／PP、道具和特性更换、形态与属性类型改变，以及最后使用招式等战斗记忆，也有独立存储／事件路径；它们同样是共享机制设计的输入。

静态分析记录了 43 处动态参数调用；这不是 43 个额外状态。还有两处找不到本版本独立定义的引用：`sparklingaria`、历史 `mysteryberry` 使用的 `leppaberry`，清单将其单列，避免把引用误计为已实现状态。

## 用于招式设计

按本招需要查对应条目，理解其原作含义后设计即时玩法。施加在战斗者身上的持续状态使用 MobEffect，共享身份按 tag 识别；动作、关系、区域和实体等过程按其实际职责选择运行入口，见[创作指南](../CONTENT_AUTHORING.md)。

上游的互斥槽位与共存方式是参考规则。即时玩法中的共存、覆盖、分层和相互转化，按机制本身制定。例如中毒的施加、查询、治疗、消耗要先有共同语义；具体技能仍自行决定如何利用它。

## 定义清单

名称优先取锁定依赖的中文资源。`Past` 等为上游标记；没有标记也不代表本项目已采用。来源、完整引用者和回调见结构化结果。

### 主要异常（6）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `brn` | 灼伤 | Conditions |  |
| `frz` | 冰冻 | Conditions |  |
| `par` | 麻痹 | Conditions |  |
| `psn` | 中毒 | Conditions |  |
| `slp` | 睡眠 | Conditions |  |
| `tox` | 剧毒 | Conditions |  |

### 个体临时条件（101）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `allyswitch` | 交换场地 | Moves |  |
| `aquaring` | 水流环 | Moves |  |
| `attract` | 迷人 | Moves |  |
| `banefulbunker` | 碉堡 | Moves |  |
| `beakblast` | 鸟嘴加农炮 | Moves |  |
| `bide` | 忍耐 | Moves | Past |
| `bounce` | 弹跳 | Moves |  |
| `burningbulwark` | 火焰守护 | Moves |  |
| `charge` | 充电 | Moves |  |
| `choicelock` | 选择锁定 | Conditions |  |
| `commanded` | 被指挥 | Conditions |  |
| `commanding` | 正在指挥 | Conditions |  |
| `confusion` | 混乱 | Conditions |  |
| `counter` | 双倍奉还 | Moves |  |
| `cudchew` | 反刍 | Abilities |  |
| `curse` | 诅咒 | Moves |  |
| `defensecurl` | 变圆 | Moves |  |
| `destinybond` | 同命 | Moves |  |
| `disable` | 定身法 | Moves |  |
| `dragoncheer` | 龙声鼓舞 | Moves |  |
| `dynamax` | 极巨化 | Conditions |  |
| `electrify` | 输电 | Moves | Past |
| `embargo` | 查封 | Moves | Past |
| `encore` | 再来一次 | Moves |  |
| `endure` | 挺住 | Moves |  |
| `flashfire` | 引火 | Abilities |  |
| `flinch` | 畏缩 | Conditions |  |
| `fling` | 投掷 | Moves |  |
| `fly` | 飞翔 | Moves |  |
| `focusenergy` | 聚气 | Moves |  |
| `focuspunch` | 真气拳 | Moves |  |
| `followme` | 看我嘛 | Moves |  |
| `foresight` | 识破 | Moves | Past |
| `furycutter` | 连斩 | Moves |  |
| `gastroacid` | 胃液 | Moves |  |
| `gem` | 宝石消耗记录 | Conditions |  |
| `glaiverush` | 巨剑突击 | Moves |  |
| `gmaxchistrike` | 超极巨会心一击 | Moves | Gigantamax |
| `grudge` | 怨念 | Moves | Past |
| `healblock` | 回复封锁 | Moves | Past |
| `helpinghand` | 帮助 | Moves |  |
| `iceball` | 冰球 | Moves | Past |
| `imprison` | 封印 | Moves |  |
| `ingrain` | 扎根 | Moves |  |
| `kingsshield` | 王者盾牌 | Moves | Past |
| `laserfocus` | 磨砺 | Moves | Past |
| `leechseed` | 寄生种子 | Moves |  |
| `lockedmove` | 连续招式锁定 | Conditions |  |
| `lockon` | 锁定 | Moves |  |
| `magiccoat` | 魔法反射 | Moves | Past |
| `magnetrise` | 电磁飘浮 | Moves |  |
| `maxguard` | 极巨防壁 | Moves | Past |
| `mefirst` | 抢先一步 | Moves | Past |
| `metronome` | 节拍器 | Items |  |
| `micleberry` | 奇秘果 | Items |  |
| `minimize` | 变小 | Moves |  |
| `miracleeye` | 奇迹之眼 | Moves | Past |
| `mirrorcoat` | 镜面反射 | Moves |  |
| `mustrecharge` | 恢复阶段 | Conditions |  |
| `nightmare` | 恶梦 | Moves | Past |
| `noretreat` | 背水一战 | Moves |  |
| `obstruct` | 拦堵 | Moves | Past |
| `octolock` | 蛸固 | Moves | Past |
| `partiallytrapped` | 束缚 | Conditions |  |
| `perishsong` | 灭亡之歌 | Moves |  |
| `powder` | 粉尘 | Moves | Past |
| `powershift` | 力量转换 | Moves | Unobtainable |
| `powertrick` | 力量戏法 | Moves |  |
| `protect` | 守住 | Moves |  |
| `protosynthesis` | 古代活性 | Abilities |  |
| `quarkdrive` | 夸克充能 | Abilities |  |
| `rage` | 愤怒 | Moves | Past |
| `ragepowder` | 愤怒粉 | Moves |  |
| `rollout` | 滚动 | Moves |  |
| `rolloutstorage` | 滚动记录 | Conditions |  |
| `roost` | 羽栖 | Moves |  |
| `saltcure` | 盐腌 | Moves |  |
| `shelltrap` | 陷阱甲壳 | Moves | Past |
| `silktrap` | 线阱 | Moves |  |
| `skydrop` | 自由落体 | Moves | Past |
| `slowstart` | 慢启动 | Abilities |  |
| `smackdown` | 击落 | Moves |  |
| `snatch` | 抢夺 | Moves | Past |
| `spikyshield` | 尖刺防守 | Moves |  |
| `spotlight` | 聚光灯 | Moves | Past |
| `stall` | 连续防护记录 | Conditions |  |
| `stockpile` | 蓄力 | Moves |  |
| `substitute` | 替身 | Moves |  |
| `syrupbomb` | 糖浆炸弹 | Moves |  |
| `tarshot` | 沥青射击 | Moves |  |
| `taunt` | 挑衅 | Moves |  |
| `telekinesis` | 意念移物 | Moves | Past |
| `throatchop` | 地狱突刺 | Moves |  |
| `torment` | 无理取闹 | Moves |  |
| `trapped` | 困住 | Conditions |  |
| `truant` | 懒惰 | Abilities |  |
| `twoturnmove` | 跨回合动作 | Conditions |  |
| `unburden` | 轻装 | Abilities |  |
| `uproar` | 吵闹 | Moves |  |
| `yawn` | 哈欠 | Moves |  |
| `zenmode` | 达摩模式 | Abilities |  |

### 阵营条件（22）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `auroraveil` | 极光幕 | Moves |  |
| `craftyshield` | 戏法防守 | Moves | Past |
| `gmaxcannonade` | 超极巨水炮轰灭 | Moves | Gigantamax |
| `gmaxsteelsurge` | 超极巨钢铁阵法 | Moves | Gigantamax |
| `gmaxvinelash` | 超极巨灰飞鞭灭 | Moves | Gigantamax |
| `gmaxvolcalith` | 超极巨炎石喷发 | Moves | Gigantamax |
| `gmaxwildfire` | 超极巨地狱灭焰 | Moves | Gigantamax |
| `lightscreen` | 光墙 | Moves |  |
| `luckychant` | 幸运咒语 | Moves | Past |
| `matblock` | 掀榻榻米 | Moves | Past |
| `mist` | 白雾 | Moves |  |
| `pursuit` | 追打 | Moves | Past |
| `quickguard` | 快速防守 | Moves |  |
| `reflect` | 反射壁 | Moves |  |
| `safeguard` | 神秘守护 | Moves |  |
| `spikes` | 撒菱 | Moves |  |
| `stealthrock` | 隐形岩 | Moves |  |
| `stickyweb` | 黏黏网 | Moves |  |
| `tailwind` | 顺风 | Moves |  |
| `toxicspikes` | 毒菱 | Moves |  |
| `waterpledge` | 水之誓约 | Moves |  |
| `wideguard` | 广域防守 | Moves |  |

### 全场规则（9）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `echoedvoice` | 回声 | Moves |  |
| `fairylock` | 妖精之锁 | Moves |  |
| `gravity` | 重力 | Moves |  |
| `iondeluge` | 等离子浴 | Moves | Past |
| `magicroom` | 魔法空间 | Moves |  |
| `mudsport` | 玩泥巴 | Moves | Past |
| `trickroom` | 戏法空间 | Moves |  |
| `watersport` | 玩水 | Moves | Past |
| `wonderroom` | 奇妙空间 | Moves |  |

### 天气（8）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `deltastream` | 德尔塔气流 | Conditions |  |
| `desolateland` | 终结之地 | Conditions |  |
| `hail` | 冰雹 | Conditions |  |
| `primordialsea` | 始源之海 | Conditions |  |
| `raindance` | 求雨 | Conditions |  |
| `sandstorm` | 沙暴 | Conditions |  |
| `snow` | Snow | Conditions |  |
| `sunnyday` | 大晴天 | Conditions |  |

### 地面场地（4）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `electricterrain` | 电气场地 | Moves |  |
| `grassyterrain` | 青草场地 | Moves |  |
| `mistyterrain` | 薄雾场地 | Moves |  |
| `psychicterrain` | 精神场地 | Moves |  |

### 槽位与延迟条件（6）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `futuremove` | 延迟招式 | Conditions |  |
| `healingwish` | 治愈之愿 | Moves |  |
| `healreplacement` | 替换治疗 | Conditions |  |
| `lunardance` | 新月舞 | Moves |  |
| `revivalblessing` | 复生祈祷 | Moves |  |
| `wish` | 祈愿 | Moves |  |

### 动态路径与其他机制（12）

| ID | 名称／意义 | 定义来源 | 上游标记 |
| --- | --- | --- | --- |
| `alphaboost` | 头目强化 | Conditions |  |
| `arceus` | 阿尔宙斯类型规则 | Conditions |  |
| `dig` | 挖洞 | Moves |  |
| `dive` | 潜水 | Moves |  |
| `firepledge` | 火之誓约 | Moves |  |
| `grasspledge` | 草之誓约 | Moves |  |
| `magicbounce` | 魔法镜 | Abilities |  |
| `phantomforce` | 潜灵奇袭 | Moves |  |
| `rebound` | Rebound | Abilities | CAP |
| `shadowforce` | 暗影潜袭 | Moves |  |
| `silvally` | 银伴战兽类型规则 | Conditions |  |
| `trapper` | 拘束来源 | Conditions |  |

动态组中，潜地、潜水、潜灵奇袭、暗影潜袭与通用准备动作相关；火／草誓约由组合逻辑选择阵营效果；另外的类型、拘束来源、反射与头目机制应按其原调用语义分别设计。

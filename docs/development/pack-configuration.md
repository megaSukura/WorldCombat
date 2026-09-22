# 整合包全局配置

整合包作者在 `config/` 下调整世界遭遇与战斗表现。修改后重新进入单人世界，或重启服务器并重连，以一致应用配置。

## 原生遭遇密度

Cobblemon 自己的配置在 `config/cobblemon/main.json`（开发运行目录为 `runs/<运行名>/config/cobblemon/main.json`）。适配 Mod 通过 `PokemonSpawnDefaultsMixin` 只提供初始默认值，存档中已保存的设置优先：

| 字段 | 默认值 | 作用 |
| --- | --- | --- |
| `pokemonPerChunk` | `0.15` | 原生局部密度阈值（按区块计）；提高可容纳更多宝可梦 |
| `ticksBetweenSpawnAttempts` | `120` | 刷新尝试间隔；降低即提高频率 |
| `maximumSpawnsPerPass` | `2` | 单次通过最多生成的个体数 |
| `minimumDistanceBetweenEntities` | `16` | 个体最小间距；降低可在同一区域容纳更多个体 |

提高密度示例：在 `main.json` 把 `pokemonPerChunk` 调为 `0.3`、`ticksBetweenSpawnAttempts` 调为 `60`，即密度参数翻倍、尝试间隔减半。实际数量仍取决于栖息条件、已有生物与间距；若仍太少，可再把 `maximumSpawnsPerPass` 改为 `4`、`minimumDistanceBetweenEntities` 改为 `12`。

## WorldCombat 全局调节

适配 Mod 的整合包配置是 NeoForge 的服务端配置 `config/cobblemon_world_combat-server.toml`，由服务端装载并自动同步给每个连接的客户端，所以服务端的这份值同时决定模拟与客户端显示（PP、招式容量等）。`SERVER` 在使用世界时会优先读取该世界 `serverconfig/cobblemon_world_combat-server.toml` 的覆盖文件，没有覆盖时读取全局 `config/`。整合包分发的初始文件放在客户端与服务端共同的 `defaultconfigs/cobblemon_world_combat-server.toml`，首次创建时被复制到 `config/`。

配置尚未装载时使用内置默认值；进入世界后使用服务端的值，界面与容量一致。切换世界或服务器时由 NeoForge 重新装载或同步。修改后重新进入单人世界或重启服务器并重连，使两端和已有持续效果都采用新的配置。

### 速度六维到原生导航的映射（`[mobility]`）

战斗脚本（`content/mechanisms/native-mobility.ts`）把宝可梦的速度换算成世界移动倍率：先取相对等级中立的培养系数，再经下列参数形成最终系数。映射只作用于该脚本用 `NativeMobility.install` 安装的默认规则，其它技能与特性各自的玩法不受影响；脚本里的默认规则仅在读取不到原生配置桥时生效。

| 键 | 默认 | 范围 | 含义 |
| --- | --- | --- | --- |
| `baseMultiplier` | `1.35` | 0–10 | 基础倍率 |
| `growthInfluence` | `1.0` | 0–4 | 培养系数上的指数；0 表示忽略速度个体差异，1 为当前行为，大于 1 放大投入差 |
| `minimumMultiplier` | `0.9` | 0–10 | 速度映射系数下限 |
| `maximumMultiplier` | `1.8` | 0–10 | 速度映射系数上限；`0` 表示关闭映射上限，正值若低于下限则自动抬到下限 |

### 招式 PP 容量倍率（`[moves]`）

| 键 | 默认 | 范围 | 含义 |
| --- | --- | --- | --- |
| `ppCapacityMultiplier` | `1.0` | 0.1–10 | 每招原生基础 PP 的倍率，其它 PP 数值都由它推导；这是容量倍率，不是花费倍率 |

倍率为 `1` 时保留原生容量；例如改为 `2`，原生基础 PP 为 10 的招式会变为 20。缩放结果四舍五入，正值至少为 1，原生为 0 的占位保持 0。

- 学习新招时以缩放后的基础 PP 满起；PP 提升道具继续作用于缩放后的容量。
- 每次施放的花费与恢复规则由原招式决定，容量倍率不参与扣费。
- 旧招式保留当前 PP；缩小容量时压到新上限，扩大容量时保留已耗用的余额。
- 客户端与服务端需使用同版本适配 Mod；网络支持超过 255 的 PP。

脚本内只读入口：`CobblemonCombat.packConfig("ppCapacity")`。

### 战斗脱离重置时长（`[encounter]`）

| 键 | 默认 | 范围 | 含义 |
| --- | --- | --- | --- |
| `idleTicks` | `600` | 1–1200000 | 未造成或承受伤害多少刻后，能力阶级与交战状态重置；至少 1，上限与能力阶级效果载体的最大寿命一致 |

脚本内只读入口：`CobblemonCombat.packConfig("encounterIdleTicks")`。脚本在上场绑定时读取一次，因此服务端配置晚于脚本装载也能生效。

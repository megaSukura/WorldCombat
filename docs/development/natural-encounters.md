# 稀疏的自然遭遇

宝可梦作为探索途中偶遇的生物，物种、昼夜、天气、海拔、地表和稀有度继续由 Cobblemon 原生生成池决定。新安装的默认频率与密度已降低；仍使用原生 `config/cobblemon/main.json` 调整，无额外配置体系。

| 原生配置 | 本项目默认值 | 原生默认值 |
| --- | ---: | ---: |
| `pokemonPerChunk` | 0.15 | 1 |
| `ticksBetweenSpawnAttempts` | 120（6 秒） | 20（1 秒） |
| `maximumSpawnsPerPass` | 2 | 8 |
| `minimumDistanceBetweenEntities` | 16 格 | 8 格 |

密度是原生局部生成阈值。原生检查附近 3×3 区块，因此不是每个区块固定刷 0.15 只，也不保证每 6 秒出现一只。钓鱼、诱饵及物种稀有档位继续采用各自原生规则。已有配置优先于默认值；本仓库的 play、review、full-client、full-server 实例已迁移这四项。

原生生成池和群系标签的收集入口为 `python tools/inventory-native-spawning.py`。产物在 `build/native-spawning/`：1544 份生成池、4892 条生成记录、189 份群系标签，包含条件与可选模组依赖。原生标签已涵盖 Terralith、Biomes O’ Plenty、Biomes We’ve Gone、Wythers 等群系；适配层补入通用 `c:is_dry/overworld` 与 `c:is_icy` 分类，按栖息语义扩展，缺少相应模组时也能加载。新群系若提供 MC／NeoForge 的环境标签，便可沿这条链参与；具体整合包仍以其实际群系标签为准。

原生 NeoForge 群系修改器只加入植物等地物，未发现删除其他生物生成表的操作。但宝可梦原本会占用被动生物数量额度：适配层现通过 NeoForge 的 `getClassification(forSpawnCount)` 仅在生成计数时排除宝可梦，保留它们平时的生物分类，由 Cobblemon 自己管理宝可梦数量。牛羊及其他模组的生物名单、权重与额度保持原机制。

隐藏专服已验证真实 `NaturalSpawner` 统计：一只猪与一只宝可梦同场时，被动生物数量为 1；原生配置默认值与已保存的自定义值均正常生效。验收世界为手动布置环境，自然生成体验应在正常探索世界观察。尚未在额外群系模组齐全的实际整合包中人工验收遭遇频率。

# 原生运行与容量 · 2026-09-16

2026-09-17：本页所述原生运行能力继续保留；参与旧检查的正式招式已[归档](../../archive/skills-2026-09-17/README.md)。原生能力与旧招式检查的结论按各自范围理解。

投射物使用真实 MC `ThrowableProjectile` 实体，沿用原生逐刻移动、阻力、重力、碰撞、偏转、实体追踪及 NeoForge 命中事件。方块的投射物响应、发射／落地游戏事件和投射物伤害标签一并接通。脚本继续决定每招的参数、时序、伤害及附加效果；命中回调在服务端安全边界执行，动作生命周期负责清理。入口见[原生实体](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/CombatProjectile.java)和[共享动作库](../../content/mechanisms/living-actions.ts)。

场景在每个服务端刻末发送新增、修改和删除项；首次进入与内容换代发送基线，安静时只校准时钟。伙伴状态有变化即发，冷却在客户端递减。连续瞄准每刻检查变化，取消立即提交。轨迹由原生实体追踪处理，表现层可通过实体 UUID 关联。网络时延与服务器 TPS 仍决定实际到达时间。实现见[场景同步](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/WorldPresentations.java)。

取消自设的内容字符、注册数量、活跃动作及相关实例／结果截断。长 JSON 通过原生字节数组编解码，网络分包复用 NeoForge 已协商的能力；长存档数据使用[共用 NBT 存储](../../mods/world-combat-core/src/main/java/dev/worldcombat/core/world/NbtJson.java)。权限、有限数值、动作归属、递归保护和客户端请求秩序继续由宿主管理。

相邻能力复查后，世界听觉接入 NeoForge 原生声音事件，射线实体相交复用 `ProjectileUtil`，临时方块接入生物破坏权限事件。治疗、状态、属性、寻路、碰撞移动和道具使用原有路径已在复用原生机制。区域伤害的形状与结算属于技能规则，独立于会产生破坏、推力和火焰语义的原生爆炸。

本轮工程检查与实际体验分别记录；测试代码用于验证协议，不作为批量内容创作的玩法范本。技能自定义特效仍维持停用，后续原生粒子方案按表现计划推进。

已通过完整工程回归，以及隐藏专服的[原生命中／偏转／声音](../../build/native-runtime-checks/core.json)、[死亡与伙伴控制](../../build/p5-control-checks/full.json)、[17 招基础技能](../../build/p5-verdant-checks/full.json)、[8 招辅助技能](../../build/p5-support-checks/full.json)和[长数据原生保存](../../build/p5-content-checks/full.json)。单元检查覆盖 200 个并行动作、900 个效果与 900 条场景数据的完整处理；这些是容量与语义检查，不是多人性能基准。运行手感和动态表现由用户试玩判断。

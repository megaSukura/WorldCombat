# P1 开发示例

P1 提供通用投射动作与伙伴版本，用于检查接入、结算和清理。当前验证进度与实际结果见 [P1 检查记录](P1-checks.md)。

## 安装与运行

按[构建说明](getting-started.md)生成 `dist/`。把所需的自有 jar 放入游戏实例的 `mods/`，将 `dist/kubejs/` 合并到实例的 `kubejs/`；外部 Mod 按[版本配置](../../manifests/dependencies.toml)安装。核心可独立使用，完整组合再加入 Cobblemon、KFF 和适配。

仓库开发实例可以直接安装编译后的示例：

```powershell
node tools/install-demo.mjs runs/core-client
node tools/install-demo.mjs runs/full-client
```

客户端按构建说明启动。**Codex 启动可见窗口前先确认时机**；本页命令供确认后的测试或用户自行运行。

## 核心示例

创建超平坦、创造模式、允许命令的测试世界，在空地上逐条执行：

```mcfunction
/summon minecraft:pig ~ ~ ~ {NoAI:1b,Tags:["wc_actor"]}
/execute at @e[tag=wc_actor,limit=1] run summon minecraft:cow ~6 ~ ~ {NoAI:1b,Tags:["wc_target"]}
/worldcombat cast world_combat:training_bolt @e[tag=wc_actor,limit=1,sort=nearest] @e[tag=wc_target,limit=1,sort=nearest]
```

观察粒子从猪飞向牛。等两秒查询生命，首次命中后应为 `6.0f`：

```mcfunction
/data get entity @e[tag=wc_target,limit=1] Health
```

在路径中生成石墙，再次施法并查询生命，应保持 `6.0f`：

```mcfunction
/execute at @e[tag=wc_actor,limit=1] run fill ~3 ~ ~-1 ~3 ~2 ~1 minecraft:stone
```

`/worldcombat status` 查看可用动作及剩余实例。开发命令需要权限等级 2。

## 伙伴示例

使用完整组合，在新的测试场景中先生成并标记野生目标：

```mcfunction
/spawnpokemon rattata level=3
/tag @e[type=cobblemon:pokemon,limit=1,sort=nearest] add wc_target
/data merge entity @e[tag=wc_target,limit=1] {NoAI:1b}
/givepokemon bulbasaur level=6
```

离目标约 6–8 格，准星朝空地，按默认键 **R** 放出伙伴，等动画结束后执行：

```mcfunction
/worldcombat companion cobblemon_world_combat:training_bolt @e[tag=wc_target,limit=1,sort=nearest]
```

施法前后用下列命令比较个体生命，命中后应下降；准星指向野生目标按 **R**，会显示世界即时战斗的提示。

```mcfunction
/data get entity @e[tag=wc_target,limit=1] Pokemon.Health
```

继续检查时，先按 **M** 查看伙伴摘要中的经验值：

1. 离目标约 18–20 格，等伙伴跟到身边。准星朝空地，施法后看到投射开始便按 **R** 收回；目标生命应保持不变，`/worldcombat status` 的实例、任务、订阅计数归零。
2. 重新放出伙伴，靠近至 6–8 格，每次在游戏中间隔至少三秒施法，直到击败目标。按 **M** 确认经验增加。
3. 保存并退回标题画面，再进入同一个世界，确认伙伴与增加后的经验保留。

示例使用开发冷却与经验数值。正式招式的资源语义及成长条件随内容接入确定，操作界面与自主行为进入 P2。

## 修改示例

[测试投射机制](../../tests/content/mechanisms/training-bolt.ts)与[示例注册](../../tests/content/moves/training-demo.ts)是该历史样例的入口；[核心类型](../../sdk/core/index.d.ts)和[领域类型](../../sdk/cobblemon/index.d.ts)对应当前绑定。开发复查先执行 `node tools/build-content.mjs --tests`，再显式安装 `legacy` 组合。异常日志给出生成 JS 的源位置，随附 source map 保留 TypeScript 源码。

脚本重载会结束当前动作，再启用通过加载检查的内容。长期效果保存和其他成长条件按后续实际功能接入。

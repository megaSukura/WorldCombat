# 当前运行与后续验收

2026-09-21：756 招已装入独立的自由验收包。双击 [启动验收.cmd](../../启动验收.cmd)，进入世界即打开手册，自行搜索筛选并选择招式。快捷栏第 9 格的手册可右键重开，提供完整伙伴指挥、玩家参战、多种目标和可编辑复用的反馈条目。用法与操作步数见[验收手册](review-workbench.md)。

本轮使用 `runs/review-client`；日常 `play` 实例保留。技术结果见[开发交接](P5-progress.md)。

旧批次26招的操作与场景保存在[归档](../../archive/skills-2026-09-17/README.md)；共享能力入口见[创作指南](../CONTENT_AUTHORING.md)。

如需自行查看当前基础交互，可沿用启动入口与自己的存档：

```powershell
cd F:\MyProject\WorldCombat
$env:JAVA_HOME = 'C:\Program Files\Zulu\zulu-21'
python tools/input-client.py launch --phase play --confirmed-visible-test
```

`play` 表示正式可玩内容，实例目录为 `runs/play-client`，冻结构建位置见 [frozen.json](../../build/play-launch/frozen.json)。启动沿用实例已安装的产物；构建后运行 `python tools/input-client.py prepare --phase play` 更新实例。原生配招继续由 Cobblemon 保管。

## 体验反馈

按正常游玩反馈实际接触到的部分即可：一次战斗、一套配招、几段文字或几招的对比。直接提供感受、原文、截图或发生过程，协调者负责定位、限定本轮修改范围并说明预期变化。处理方式见[体验反馈与有限范围改进](../authoring/feedback.md)。

## 粒子预览

粒子引擎随核心 Mod 装载，客户端实例的 `mods/` 需要已放入 **MadParticle** 与 **T88** 两枚前置（`input-client.py` 在准备与启动时自动从 Gradle 缓存复制；缺少时命令会提示先跑 `gradlew :world-combat-core:dependencies`）。定义要随当前内容 profile 一起加载；测试夹具 `checks:particle_sample` 在 `visual-fixtures` profile 里。

启动后执行：

```text
/wcparticle checks:particle_sample main 200 here
/wcparticle checks:particle_sample impact
/wcparticle checks:particle_sample trail 200 here
```

- `main`：脚下升起一圈细小光尘与末地烛光点，腰胸高度有青、粉两组光点缓慢环绕，持续 200 tick。
- `impact`：在视线落点炸开电光冲击（粒子消亡时冒出青色烟），白色火花沿螺旋飞散，岩石碎屑落地弹跳后消散。
- `trail`：移动时沿身后轨迹留下橙色火星、青色烟与少量火焰尾迹。

## 本轮属性入口

进入世界后，按 M 打开精灵详情，点击右下角「属性」；或在 G 菜单选择「属性」。收回的精灵也可以通过 M 查看。悬停名称或数值可看作用和来源，切换语言后整页随之切换。

原生属性 ID 见[生产指令](../CONTENT_AUTHORING.md#公共属性与状态)。有命令权限时，可用原版 `/attribute` 读取和改变 `world_combat:skill_haste` 等值。常驻修饰随精灵收回和重新放出保留；临时修饰按原生生命周期结束。实际显示与操作体验等待用户试玩，不作为已经认可的内容范本。

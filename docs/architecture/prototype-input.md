# 原型输入约定

参考值集中在 [prototype-defaults.toml](../../manifests/prototype-defaults.toml)，由 P1／P2 的适配玩法接入。

快放直接提交技能意图；精确指令按住修饰键选择与预览，松开后提交。未选择、打开界面或失焦时取消尚未提交的内容并释放输入捕获。已提交动作按技能规则处理中止、资源与清理。

客户端预览从伙伴位置计算，服务端决定请求是否有效。行动状态与失败原因应让玩家理解伙伴当前的执行情况。手动与 AI 共用动作入口，临时技能结束后继续原有持续意图。

锁定源码中的[骑乘自由视角](https://gitlab.com/cable-mc/cobblemon/-/blob/1.8.0/common/src/main/kotlin/com/cobblemon/mod/common/client/keybind/keybinds/RidingFreelookBinding.kt) 已使用左 Alt，因此参考精确修饰键改为反引号。四个独立技能键与当前默认 Cobblemon 键位未见重叠；用户自定义映射、操作负担和真实挖建共存留到 P2 集中试玩。

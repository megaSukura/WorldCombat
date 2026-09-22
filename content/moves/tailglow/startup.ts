// 凝神：一段可见的窗口状态，只承载共享身份 world_combat:status/tailglow。
// 特攻等级本身由 NativeEffects.boost 写入公共能力阶梯；窗口走完、或被攻击打散时由本单元 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tailglow_focus")
    .beneficial()
    .color(0xD9E85A)
    .tag("world_combat:status/tailglow")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

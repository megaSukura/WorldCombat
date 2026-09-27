// 凝神：一段可见的窗口状态，只承载共享身份 world_combat:status/tailglow。
// 特攻等级本身是本单元 skill.ts 用 NativeEffects.boostWindow 挂在这条载体上的临时窗口（+gift 正贡献）；窗口走完、或被攻击打散时随载体一起收回，只撤本招自己那一份。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tailglow_focus")
    .beneficial()
    .color(0xD9E85A)
    .tag("world_combat:status/tailglow")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

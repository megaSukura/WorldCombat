// 席盾：一段只吃招式伤害的整队防御窗口，承载共享身份 world_combat:status/matblock。
// 伤害的按量吸收由共享 GuardEffects 的 pool 承担（只接受 kind=move 的敌对伤害）；变化招式不带伤害，根本不进池。
// 身份只是「谁躲在席子后面」的读法与 AI 的重复施放判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:mat_block")
    .beneficial()
    .color(0xD9C08A)
    .tag("world_combat:status/matblock")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

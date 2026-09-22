// 通畅：一段可见的点穴窗口，承载共享身份 world_combat:status/acupressure。
// 这一次被点起来的能力与级数另存在 world_combat:acupressure_mark 里（每只被点过的战斗者一份），
// 窗口走完或被清除时由本单元 skill.ts 从移除事件里照数、照项收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:acupressure_flow")
    .beneficial()
    .color(0xE8B45A)
    .tag("world_combat:status/acupressure")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

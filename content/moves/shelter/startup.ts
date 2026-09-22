// 铁壳：两个真实有益 MobEffect，共享同一身份 world_combat:status/shelter，代表「闭关」的两种形态。
// shelter_shell —— 缩壳：不钉住自己，可以带着壳走位。
// shelter_sealed —— 铁盾：壳更厚更久，但整段把移动速度归零（钉在原地），攻击仍可进行。
// 承伤额度由本单元 skill.ts 的 GuardEffects 池承担；防御等级由 NativeEffects.boost 写入公共能力阶梯；
// 窗口走完或被清除时由 skill.ts 从移除事件里原样收回。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:shelter_shell")
    .beneficial()
    .color(0x9BB0C9)
    .tag("world_combat:status/shelter")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:shelter_sealed")
    .beneficial()
    .color(0x7E93AD)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:shelter_sealed_root", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:shelter_sealed_flying", -1, "add_multiplied_total")
    .tag("world_combat:status/shelter")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

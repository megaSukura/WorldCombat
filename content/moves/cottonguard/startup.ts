// 绒衣：一层可见的窗口状态，承载共享身份 world_combat:status/cottonguard，amplifier 记录这段防护抬起的级数。
// 防御等级由 NativeEffects.boost 写入公共能力阶梯；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 厚裹额外挂一层独立的「绒衣沉坠」移速减益（amplifier 0，只按额定量生效一次）。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:cotton_coat")
    .beneficial()
    .color(0xF6F3EA)
    .tag("world_combat:status/cottonguard")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:cotton_slow")
    .category("neutral")
    .color(0xE4D6C4)
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:cotton_guard_weight", -0.25, "add_multiplied_total")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

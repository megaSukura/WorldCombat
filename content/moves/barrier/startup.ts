// 屏障：一段可见窗口状态，只承载共享身份 world_combat:status/barrier。
// 防御等级本身由 NativeEffects.boost 写入公共能力阶梯；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 墙体是 world.terrain 租借出去的真实方块，不依赖这个效果。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:barrier_veil")
    .beneficial()
    .color(0x9FC7FF)
    .tag("world_combat:status/barrier")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

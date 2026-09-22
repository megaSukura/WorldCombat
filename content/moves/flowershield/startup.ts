// 护瓣：鲜花防守扫到的草属性身上落的一层花瓣，承载共享身份 world_combat:status/petaled。
// amplifier 记录这圈花浪抬了几级防御；窗口走完或被清除时由本单元 skill.ts 从移除事件里原样收回。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:flowershield_guard")
    .beneficial()
    .color(0xE89AC0)
    .tag("world_combat:status/petaled")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));

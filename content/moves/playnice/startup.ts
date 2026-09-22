// 和睦相处：被劝住的身份。只借共享身份 world_combat:status/befriended，行为（下降攻击等级、平息敌意）写在
// 本单元的 skill.ts 里，由 NativeEffects.boost 与原生 target 归零落到任何对象上，别的作者以后可以用同一个
// tag 消费「和睦」。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:befriended_offer")
    .beneficial()
    .color(0x6FC26F)
    .tag("world_combat:status/befriended")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

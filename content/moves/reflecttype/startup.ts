// 镜面属性：一个承载共享身份 world_combat:status/reflecttype 的可见状态，告诉玩家「这层照来的属性
// 还剩多久」。真正的属性变化由 NativeModifiers 的 types 层承担（技能脚本写入，与效果同寿命、到期还原），
// 标记本身供别的作者按身份消费。
StartupEvents.registry("mob_effect", event => event.create("world_combat:reflecttype")
    .beneficial()
    .color(0xD98CE8)
    .tag("world_combat:status/reflecttype")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

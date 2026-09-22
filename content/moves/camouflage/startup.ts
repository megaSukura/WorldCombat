// 保护色：一个承载共享身份 world_combat:status/camouflage 的可见状态，告诉玩家「身上这层颜色是什么、
// 还剩多久」。真正的属性变化由 NativeModifiers 的 types 层承担（技能脚本写入，与效果同寿命、到期还原），
// 标记本身供别的作者按身份消费。
StartupEvents.registry("mob_effect", event => event.create("world_combat:camouflage")
    .beneficial()
    .color(0x8FD8B0)
    .tag("world_combat:status/camouflage")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

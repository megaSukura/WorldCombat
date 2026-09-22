// 甜甜香气：被香气浸透的身份。只借共享身份 world_combat:status/scented，行为（放大一切打在这个目标
// 身上的伤害）写在本单元的 skill.ts 里，经 MobEffects.reactTagged 读取；效果等级记录浸透强度。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:sweet_scent")
    .harmful()
    .color(0xF0C64B)
    .tag("world_combat:status/scented")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

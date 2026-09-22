// 电磁飘浮的磁场载体：一个真实有益 MobEffect，对任何活体是同一个身份
// world_combat:status/magnetrise；免疫与弹开写在本单元 skill.ts 的入场伤害规则，
// 消费方用 CombatStatus.has(world, actor, "magnetrise") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:magnetrise_field")
    .beneficial()
    .color(0xFFD54A)
    .tag("world_combat:status/magnetrise")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

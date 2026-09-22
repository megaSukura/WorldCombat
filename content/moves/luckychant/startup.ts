// 幸运咒语的祝福载体：一个真实有益 MobEffect，对任何活体是同一个身份
// world_combat:status/luckychant；暴击抚平写在本单元 skill.ts 的入场伤害规则，
// 消费方用 CombatStatus.has(world, actor, "luckychant") 按身份读取，不依赖这个 id。
StartupEvents.registry("mob_effect", event => event.create("world_combat:luckychant_ward")
    .beneficial()
    .color(0xFFD26E)
    .tag("world_combat:status/luckychant")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

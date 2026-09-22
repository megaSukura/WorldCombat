// 爆炸烈焰的过热载体：借共享身份 world_combat:status/mustrecharge，行为写在本单元 skill.ts 的门禁与监听里。
// movement_speed/flying_speed 归零让「无法移动」对所有活体成立；「无法行动」由 CombatStatus.actions 的门禁补上。
StartupEvents.registry("mob_effect", event => event.create("world_combat:blastburn_overheat")
    .harmful()
    .color(0xC2521E)
    .tag("world_combat:status/mustrecharge")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:blastburn_overheat_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:blastburn_overheat_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

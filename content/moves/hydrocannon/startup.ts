// 加农水炮的两个载体，都在本单元 skill.ts 里接线：
//  - world_combat:hydrocannon_spent：借共享身份 world_combat:status/mustrecharge（力竭），行为由门禁与监听实现。
//  - world_combat:hydrocannon_drench：泼在目标身上的浸湿，带共享身份 world_combat:status/soaked，供别的作者消费。
// movement_speed/flying_speed 归零让「无法移动」对所有活体成立；「无法行动」由 CombatStatus.actions 的门禁补上。
StartupEvents.registry("mob_effect", event => event.create("world_combat:hydrocannon_spent")
    .harmful()
    .color(0x3E8FD0)
    .tag("world_combat:status/mustrecharge")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:hydrocannon_spent_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:hydrocannon_spent_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:hydrocannon_drench")
    .category("neutral")
    .color(0x6FC3E8)
    .tag("world_combat:status/soaked")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));

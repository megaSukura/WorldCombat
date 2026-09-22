// 挡路的封锁载体：借共享身份 world_combat:status/trapped（别的单元可据此判断「被围住、走不了」）。
// 行为由本单元写：移动与飞行速度被压到 55%，导航速度再由 skill.ts 的监听压到三成；落栅那一下另有共享 rooted 钉住。
// identity_only：只借身份；具体压制写在 skill.ts 与状态效果自带的属性修饰里。
StartupEvents.registry("mob_effect", event => event.create("world_combat:block_penned")
    .harmful()
    .color(0x8FA1B0)
    .tag("world_combat:status/trapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:block_penned_speed", -0.45, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:block_penned_flying", -0.45, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

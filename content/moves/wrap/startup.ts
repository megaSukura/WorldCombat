// 紧束的藤茧载体：借共享身份 world_combat:status/partiallytrapped（原生 volatile），
// 行为（钉住不动）由这里的移动归零与 skill.ts 的 rooted 导航监听共同完成；
// 攻击被压住由 skill.ts 的 NativeEffects.boost 落到攻击等级／攻击力属性上。
StartupEvents.registry("mob_effect", event => event.create("world_combat:wrap_coil")
    .harmful()
    .color(0x7E9C5A)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:wrap_coil_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:wrap_coil_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

// 沥青射击的糊身载体：共享身份 world_combat:status/tarshot（别的单元与 PokemonDamage.metadata
// 都可以据此判断「身上糊着沥青、怕火」）。行为由本单元写：常规移动速度被压到 65%，
// 导航速度再由 skill.ts 的监听压到六成；速度等级的下降由 skill.ts 的 NativeEffects.boost 落地。
// identity_only：只借身份；宝可梦身上不再另加原生异常——怕火这件事由本单元自己在伤害结算里读取。
StartupEvents.registry("mob_effect", event => event.create("world_combat:tar_coated")
    .harmful()
    .color(0x1E1A17)
    .tag("world_combat:status/tarshot")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:tar_coated_speed", -0.35, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:tar_coated_flying", -0.35, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

/**
 * 延后 / quash 的“压制”状态。
 *
 * 本单元自己的变体：带共享身份 `world_combat:status/quash` 与 identity_only，行为全由本单元写
 * （提交前拦下第一次出手、配合命中时的降速级数）。它不会自动镜像成 Cobblemon 原生异常——
 * 原作靠回合先后表达“行动最后”，即时战斗里没有对应的原生状态，所以宝可梦身上只带这一层压制。
 * 消费方用 `CombatStatus.has(world, actor, "quash")` 读。
 */
StartupEvents.registry("mob_effect", event => event.create("world_combat:quash")
    .harmful()
    .color(0x6A4FA8)
    .tag("world_combat:status/quash")
    .tag("world_combat:status/identity_only")
    // 压制期间移动被拖慢；修饰随效果结束一起消失，不会跨次叠加。
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:quash_speed", -0.3, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

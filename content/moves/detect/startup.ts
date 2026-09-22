/**
 * 看穿 / detect 的“先机”标记。
 *
 * 本单元自己的变体：带共享身份 `world_combat:status/opening` 与 identity_only，行为全由本单元在
 * 读中那一刻写（NativeEffects.boost 抬速度或攻击）。它不是主异常，不参与共享异常行为；图标与译名随本单元交付。
 * 别的作者日后要读这次先机，用 `CombatStatus.has(world, actor, "opening")`。
 */
StartupEvents.registry("mob_effect", event => {
    event.create("world_combat:opening")
        .category("beneficial").color(0x66CCFF)
        .tag("world_combat:status/opening").tag("world_combat:status/identity_only")
        .effectTick((entity: any, amplifier: number) => { });
});

/**
 * 冰锥的霜寒行为：把「被霜附着」翻成实际减速，并让表现随载体生灭。
 *
 * `world_combat:iciclespear_chill` 只借共享身份 `world_combat:status/chill`，减速由该载体自己拥有：
 *   `MobEffects.dynamicAttributes` 在这个载体存在的每一刻，按它的振幅给目标挂一条
 *   `minecraft:generic.movement_speed` 的负修正（纯碎 −15%、霜附 −30%，即 MC 缓慢 I/II），
 *   并随振幅刷新。载体自然到期、被牛奶或 /effect clear 清除时，属性窗口同步结束，减速立刻收回，
 *   不会像外部 slowness 标记那样多留一段。同一窗口用 `WorldFeedback.onEffect` 续上简短霜纹，
 *   读的就是载体自己的剩余时间，驱散后画面一起收掉。
 */
namespace PokemonSkills {
    MobEffects.dynamicAttributes("world_combat:iciclespear_chill_slow", icicleSpearChill,
        function (world: CombatWorld, actor: CombatActor, carrier: CombatMobEffect): MobEffects.FixedAttribute[] {
            return [{ id: "minecraft:generic.movement_speed",
                amount: -0.15 * (carrier.amplifier() + 1), operation: "add_multiplied_total" }];
        }, 10, function (effect: CombatEffect): void {
            const world = effect.world(), actor = effect.target(), body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.onEffect(world, effect.id(), "iciclespear:chill:" + String(actor.ref()), icicleSpearScene, 1,
                body.position(), { moment: "chill", target: String(actor.ref()) });
        });
}

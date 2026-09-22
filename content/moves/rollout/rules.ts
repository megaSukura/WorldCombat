/**
 * 滚动层数的生命周期，对所有战斗者一致。
 *
 * `world_combat:rollout_momentum` 只借共享身份 `world_combat:status/rollout`，行为全部在这里写：
 *   - 换招打断：任何不是滚动的招式提交时，层数立刻清零（原生「打断就归零」的另一半）。
 *   - 存续提示：每 20 刻按当前层数续一次石球聚气，让玩家读出现在滚到第几层。
 *   - 自然散去：走完自己的时间就安静褪去；接满 5 趟或落空时由 skill.ts 直接清掉，不再重复播放。
 */
namespace PokemonSkills {
    MobEffects.react("world_combat:move_rollout/break", rolloutMomentum, "world_combat:before_commit",
        function (event) { return event.actor(); },
        function (event, actor, state) {
            const action = event.action();
            if (action !== null && String(action.content()) === "world_combat:" + rolloutId) return;
            const world = event.world();
            if (!world.removeMobEffect(actor, state.id(), state.key())) return;
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.emit(world, rolloutScene, 1, body.position(), { moment: "drop" }, 22);
        });

    WorldCombat.on("world_combat:move_rollout/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rolloutMomentum || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, rolloutMomentum);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_rollout/aura/" + String(actor.ref()), rolloutScene, 1, body.position(),
            { moment: "aura", stage: effect.amplifier(), scale: 0.7 + effect.amplifier() * 0.3 }, 40);
    });

    WorldCombat.on("world_combat:move_rollout/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rolloutMomentum || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, rolloutScene, 1, body.position(), { moment: "fade" }, 20);
    });
}

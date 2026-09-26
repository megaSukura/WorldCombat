/**
 * 连斩层数的生命周期，对所有战斗者一致。
 *
 * `world_combat:furycutter_momentum` 只借共享身份 `world_combat:status/furycutter`，行为全部在这里写：
 *   - 换招打断：任何不是连斩的招式提交时，层数立刻清零（原生「连续命中」的另一半）。
 *   - 存续提示：每 20 刻按当前层数续一次刃上聚气，让玩家读出现在攒到第几层。
 *   - 自然散去：走完自己的时间就安静褪去；被换招打断时由上面那条岔路直接清掉，不再重复播放。
 * 层数一结束（换招或自然散去），刃上聚气的续期也立刻收短，散锋之后不再留下同样时长的残气。
 */
namespace PokemonSkills {
    /** 层数结束时把这条续期中的刃气收短到一瞬，避免层数已经清零、聚气还按原时长继续播。 */
    function furycutterStopAura(world: CombatWorld, actor: CombatActor, point: CombatPoint): void {
        WorldFeedback.keep(world, "world_combat:move_furycutter/aura/" + String(actor.ref()), furycutterScene, 1, point,
            { moment: "streak", stage: 1, cuts: 1, aura: 0.06 }, 1);
    }

    MobEffects.react("world_combat:move_furycutter/break", furycutterMomentum, "world_combat:before_commit",
        function (event) { return event.actor(); },
        function (event, actor, state) {
            const action = event.action();
            if (action !== null && String(action.content()) === "world_combat:" + furycutterId) return;
            const world = event.world();
            if (!world.removeMobEffect(actor, state.id(), state.key())) return;
            const body = world.observe(actor);
            if (body !== null) {
                furycutterStopAura(world, actor, body.position());
                WorldFeedback.emit(world, furycutterScene, 1, body.position(), { moment: "drop" }, 22);
            }
        });

    WorldCombat.on("world_combat:move_furycutter/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== furycutterMomentum || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, furycutterMomentum);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_furycutter/aura/" + String(actor.ref()), furycutterScene, 1, body.position(),
            { moment: "streak", stage: effect.amplifier() + 1, cuts: Math.pow(2, effect.amplifier()),
                aura: 0.06 + effect.amplifier() * 0.03 }, 40);
    });

    WorldCombat.on("world_combat:move_furycutter/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== furycutterMomentum || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        furycutterStopAura(world, actor, body.position());
        WorldFeedback.emit(world, furycutterScene, 1, body.position(), { moment: "fade" }, 20);
    });
}

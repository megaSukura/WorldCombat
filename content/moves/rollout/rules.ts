/**
 * 滚动层数的生命周期，对所有战斗者一致。
 *
 * `world_combat:rollout_momentum` 只借共享身份 `world_combat:status/rollout`，行为全部在这里写：
 *   - 换招打断：别的招式**真正 committed**（成本已付、冷却已记）时才清层；被门禁拒绝、根本没提交的招式不算换招。
 *   - 取消本趟：这一趟滚动被中断/取消时记下，下一次该载体 tick 在自己的可写作用域里明确清层并播散架；
 *     自然收招（finished）与松手（input-stopped）保留上一层。
 *   - 存续提示：每 20 刻按当前层数续一次石球聚气；石壳尺寸固定为实际碰撞半径，层数只提高气壳密度。
 *   - 自然散去：走完自己的时间就安静褪去；接满 5 趟或落空时由 skill.ts 直接清掉，不再重复播放。
 */
namespace PokemonSkills {
    /** 被取消的滚动实例按角色 ref 记账；action_ended 作用域只读，实际清层交给随后可写的载体 tick。 */
    const rolloutCancelled: { [ref: string]: boolean } = Object.create(null);

    /** 清掉当前连滚载体并报散架；没有载体时返回 false，避免重复播放。 */
    function rolloutDrop(world: CombatWorld, actor: CombatActor): boolean {
        const held = MobEffects.read(world, actor, rolloutMomentum);
        if (held === null || !world.removeMobEffect(actor, held.id(), held.key())) return false;
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, rolloutScene, 1, body.position(), { moment: "drop" }, 22);
        return true;
    }

    // 只有别的招式真正付了成本、提交成功，才算「换招」断掉连滚。
    MobEffects.react("world_combat:move_rollout/break", rolloutMomentum, "world_combat:committed",
        function (event) { return event.actor(); },
        function (event, actor) {
            const action = event.action();
            if (action !== null && String(action.content()) === "world_combat:" + rolloutId) return;
            rolloutDrop(event.world(), actor);
        });

    // 取消本趟滚动（中断、取消、目标失效等）只记账；自然收招 finished 与松手 input-stopped 不算取消。
    WorldCombat.on("world_combat:move_rollout/cancel", "world_combat:action_ended", "", function (event) {
        const data = JSON.parse(String(event.data())), reason = String(data.reason);
        if (String(data.content) !== "world_combat:" + rolloutId || reason === "finished" || reason === "input-stopped") return;
        rolloutCancelled[String(event.actor().ref())] = true;
    });

    WorldCombat.on("world_combat:move_rollout/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rolloutMomentum) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref());
        // 上一趟被取消：在本载体的可写 tick 里立刻清层，不把失效层留到窗口结束。
        if (rolloutCancelled[ref]) {
            delete rolloutCancelled[ref];
            if (rolloutDrop(world, actor)) return;
        }
        if (world.tick() % 20 !== 0 || String(actor.domain()) !== "cobblemon") return;
        const effect = MobEffects.read(world, actor, rolloutMomentum);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        // 石壳用实际判定半径（不随层数膨胀），层数只提高气壳密度，画面与真实碰撞一致。
        const scale = Math.max(0.7, Math.min(2.2, p(rolloutId, "radius", { world: world, actor: actor }) / rolloutReference));
        WorldFeedback.keep(world, "world_combat:move_rollout/aura/" + ref, rolloutScene, 1, body.position(),
            { moment: "aura", stage: effect.amplifier(), scale: scale, density: 4 + effect.amplifier() * 4 }, 40);
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

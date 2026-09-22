/**
 * 着迷的行为，对所有战斗者一致。
 *
 * 任何活体只要带着 `world_combat:status/attract` 身份，在提交出招时都会按 tether 记录的几率心软：
 * 该次动作被拒绝，并被牵向施放者一步；此外每 20 刻还有一次持续牵引——目标离施放者超过 leash 就被拽回，
 * 所以它真的会被拴住、跑不远。tether 是一条记录施放者与力度参数的世界效果（施放者即其 source）。
 * 牵引要求施放者与目标之间视线畅通——躲到墙后、拉开距离，线就断了（snap），这也是对飞吻最直接的反制。
 * 宝可梦的异性门槛在 skill.ts 的 ready 里检查；原版生物与玩家没有性别概念，走同一条判定。
 * 状态按自己的时间走完是「自散」，被外力（牛奶／`/effect` clear）打断则只有动作停止、画面安静收场。
 */
namespace PokemonSkills {
    function attractAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }
    function attractTethers(world: CombatWorld, actor: CombatActor): CombatEffectView[] {
        return world.effects(actor, attractTether).filter(function (view) {
            return MobEffects.present(world, JSON.parse(view.data()).carrierLease);
        });
    }
    function attractTetherSource(world: CombatWorld, actor: CombatActor): CombatActor | null {
        const views = attractTethers(world, actor);
        if (!views.length) return null;
        const source = views[0].source();
        return world.valid(source) ? source : null;
    }

    WorldCombat.effect(attractTether, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.chance !== "number" || !isFinite(value.chance) || value.chance < 0 || value.chance > 1)
            throw new Error("Invalid attract chance");
        if (typeof value.pull !== "number" || !isFinite(value.pull) || value.pull < 0 || value.pull > 8)
            throw new Error("Invalid attract pull");
        if (typeof value.leash !== "number" || !isFinite(value.leash) || value.leash < 0 || value.leash > 32)
            throw new Error("Invalid attract leash");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(attractTether, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        const status = MobEffects.apply(world, target, attractStatus, effect.remaining(), 0);
        data.carrierLease = MobEffects.bind(world, target, attractStatus, status);
        if (!data.carrierLease) { effect.end(); return; }
        effect.state(JSON.stringify(data));
    });
    WorldCombat.effectHandler(attractTether, "operation:world_combat:dispel", effect => effect.end());

    // 心软：提交出招被拒，并被牵向施放者一步；视线断了则只停在原地。
    function attractHesitate(event: CombatWorldEvent): void {
        const world = event.world(), actor = event.actor();
        if (!CombatStatus.has(world, actor, "attract")) return;
        const views = attractTethers(world, actor);
        if (!views.length) return;
        const value = JSON.parse(String(views[0].data()));
        const chance = value.chance, pull = value.pull, source = views[0].source();
        if (!world.valid(source)) return;
        if (world.random() >= chance) return;
        event.reject("attracted");
        const body = world.observe(actor);
        if (body === null) return;
        const here = body.position();
        WorldFeedback.emit(world, attractScene, 1, here, { moment: "hesitate", target: String(actor.ref()) }, 30);
        WorldFeedback.text(world, attractAbove(here), attractHesitateText, [], 28);
        const from = world.observe(source);
        if (from === null) return;
        const delta = from.position().minus(here);
        if (delta.length() <= 0.35) return;
        if (!world.clear(here, from.position())) {
            views.forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
            WorldFeedback.emit(world, attractScene, 1, here, { moment: "snap", target: String(actor.ref()) }, 18);
            WorldFeedback.text(world, attractAbove(here), attractSnapText, [], 24);
            return;
        }
        const step = Math.min(delta.length(), pull);
        if (world.displace(actor, delta.unit().scale(step)) <= 0.01) return;
        const after = world.observe(actor);
        if (after === null) return;
        const action = event.action();
        if (action !== null) action.face(from.position(), 20, 20);
        WorldFeedback.emit(world, attractScene, 1, after.position(), { moment: "pull", target: String(actor.ref()) }, 26);
    }
    WorldCombat.on("world_combat:move_attract/hesitate", "world_combat:before_commit", "", attractHesitate);
    WorldCombat.on("world_combat:move_attract/native-hesitate", "world_combat:damage_incoming", "", function (event) {
        const target = event.target();
        if (target === null || String(target.ref()) === String(event.actor().ref()) || event.action() !== null) return;
        // Scripted moves already rolled when committing; ordinary native attacks meet the same chance at impact.
        if (JSON.parse(event.data()).move) return;
        attractHesitate(event);
    });

    // 牵引：着迷期间每 20 刻检查一次，离施放者超过 leash 就被拽回，直到拉进牵引距离。
    WorldCombat.on("world_combat:move_attract/leash", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== attractStatus || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const views = attractTethers(world, actor);
        if (!views.length) return;
        const value = JSON.parse(String(views[0].data()));
        if (!(value.leash > 0)) return;
        const source = attractTetherSource(world, actor);
        if (source === null) return;
        const body = world.observe(actor), from = world.observe(source);
        if (body === null || from === null) return;
        const delta = from.position().minus(body.position()), dist = delta.length();
        if (dist <= value.leash) return;
        if (!world.clear(body.position(), from.position())) {
            views.forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
            WorldFeedback.emit(world, attractScene, 1, body.position(), { moment: "snap", target: String(actor.ref()) }, 18);
            return;
        }
        const step = Math.min(dist - value.leash, Math.max(1.2, value.pull * 2));
        if (world.displace(actor, delta.unit().scale(step)) <= 0.01) return;
        const after = world.observe(actor);
        if (after === null) return;
        WorldFeedback.emit(world, attractScene, 1, after.position(), { moment: "leash", target: String(actor.ref()) }, 24);
    });

    // 着迷状态本身：每 20 刻续一次头顶爱心，低密度、不遮挡目标。
    WorldCombat.on("world_combat:move_attract/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== attractStatus || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (!attractTethers(world, actor).length) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_attract/linger/" + String(actor.ref()), attractScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });

    // 时间走完：不吵不闹地散掉（被外力清除时不播）。
    WorldCombat.on("world_combat:move_attract/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== attractStatus) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, attractStatus) !== null) return;
        world.effects(actor, attractTether).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, attractScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 20);
    });
}

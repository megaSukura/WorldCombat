/**
 * 着迷的行为，对所有战斗者一致。
 *
 * 任何活体只要带着 `world_combat:status/attract` 身份，在提交出招时都会按 tether 记录的几率心软：
 * 该次动作被拒绝，它转过身来看向施放者。tether 是一条记录施放者、心软几率与羁绊范围的世界效果
 * （施放者即其 source）；着迷只在双方视线畅通且目标仍在羁绊范围内时维持——躲到墙后或走远，关系就解除
 * （snap）。没有任何强制位移：它只是不肯出手，不会被拽走。这也是对飞吻最直接的反制。
 * 宝可梦的异性门槛在 skill.ts 的命中层检查；原版生物与玩家没有性别概念，走同一条判定。
 * 状态按自己的时间走完是「自散」，被外力（牛奶／`/effect` clear）打断则只有动作停止、画面安静收场。
 */
namespace PokemonSkills {
    function attractAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }
    function attractDirection(from: CombatPoint, to: CombatPoint): number[] {
        const delta = to.minus(from), length = delta.length();
        if (!(length > 1e-4)) return [0, 1, 0];
        return [delta.x() / length, delta.y() / length, delta.z() / length];
    }
    function attractTethers(world: CombatWorld, actor: CombatActor): CombatEffectView[] {
        return world.effects(actor, attractTether).filter(function (view) {
            return MobEffects.present(world, JSON.parse(view.data()).carrierLease);
        });
    }

    WorldCombat.effect(attractTether, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.chance !== "number" || !isFinite(value.chance) || value.chance < 0 || value.chance > 1)
            throw new Error("Invalid attract chance");
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
        effect.schedule("watch", "watch", 1, "{}");
    });
    // The bond holds only while the two can still see each other and stay inside the leash. Breaking either
    // releases the infatuation; the heart line simply stops, nothing is dragged back.
    WorldCombat.effectHandler(attractTether, "watch", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target) || !MobEffects.present(world, data.carrierLease)) { effect.end(); return; }
        const source = effect.source();
        const body = world.observe(target), from = world.valid(source) ? world.observe(source) : null;
        if (body === null || from === null) { effect.end(); return; }
        const delta = from.position().minus(body.position());
        if (delta.length() > data.leash || !world.clear(body.position(), from.position())) {
            world.operation(effect.id(), "world_combat:dispel", "{}");
            return;
        }
        if (world.tick() - Number(data.presentedAt || 0) >= 20) {
            data.presentedAt = world.tick();
            effect.state(JSON.stringify(data));
            // Owned by this tether: expiry, dispel and source departure release the heart line with it.
            WorldFeedback.onEffect(world, effect.id(), "linger", attractScene, 1, body.position(),
                { moment: "linger", target: String(target.ref()), path: [String(source.ref()), String(target.ref())],
                    direction: attractDirection(body.position(), from.position()), chance: data.chance });
        }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(attractTether, "operation:world_combat:dispel", effect => effect.end());

    // 心软：提交出招被拒，转身看向施放者；视线断了或超出羁绊范围则解除关系，不阻挠这次出手。
    function attractHesitate(event: CombatWorldEvent): void {
        const world = event.world(), actor = event.actor();
        if (!CombatStatus.has(world, actor, "attract")) return;
        const views = attractTethers(world, actor);
        if (!views.length) return;
        const view = views[0], value = JSON.parse(String(view.data())), source = view.source();
        if (!world.valid(source)) return;
        const body = world.observe(actor), from = world.observe(source);
        if (body === null || from === null) return;
        const delta = from.position().minus(body.position());
        if (delta.length() > value.leash || !world.clear(body.position(), from.position())) {
            views.forEach(entry => world.operation(entry.id(), "world_combat:dispel", "{}"));
            WorldFeedback.emit(world, attractScene, 1, body.position(), { moment: "snap", target: String(actor.ref()) }, 18);
            WorldFeedback.text(world, attractAbove(body.position()), attractSnapText, [], 24);
            return;
        }
        if (world.random() >= value.chance) return;
        event.reject("attracted");
        WorldFeedback.emit(world, attractScene, 1, body.position(),
            { moment: "hesitate", target: String(actor.ref()), direction: attractDirection(body.position(), from.position()) }, 30);
        WorldFeedback.text(world, attractAbove(body.position()), attractHesitateText, [], 28);
        const action = event.action();
        if (action !== null) action.face(from.position(), 20, 20);
    }
    WorldCombat.on("world_combat:move_attract/hesitate", "world_combat:before_commit", "", attractHesitate);
    WorldCombat.on("world_combat:move_attract/native-hesitate", "world_combat:damage_incoming", "", function (event) {
        const target = event.target();
        if (target === null || String(target.ref()) === String(event.actor().ref()) || event.action() !== null) return;
        // Scripted moves already rolled when committing; ordinary native attacks meet the same chance at impact.
        if (JSON.parse(event.data()).move) return;
        attractHesitate(event);
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

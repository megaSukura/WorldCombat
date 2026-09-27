/** A symmetric, finite boundary with normal movement inside and native refusal-aware edge restraint. */
namespace PokemonSkills {
    const fairyReferenceRadius = 5.0;
    function fairyPoint(state: any): CombatPoint { return WorldCombat.point(state.position[0], state.position[1], state.position[2]); }
    function fairyRelease(world: CombatWorld, ref: string, state: any): void {
        const actor = world.actor(ref), carrier = state.carriers[ref];
        if (actor && world.valid(actor) && carrier && MobEffects.matches(world, actor, carrier)) {
            const effect = MobEffects.read(world, actor, fairySeal); if (effect) world.removeMobEffect(actor, fairySeal, effect.key());
        }
        delete state.carriers[ref];
    }
    /** 真正脱锁（被拉出范围或原生拒绝牵制）才给这一位短解锁反馈；整场到期收束走 end，不走这里。 */
    function fairyEscape(world: CombatWorld, ref: string, state: any, body: CombatObservation | null): void {
        fairyRelease(world, ref, state);
        if (body !== null) WorldFeedback.emit(world, fairyScene, 1, body.position(),
            { moment: "freed", target: ref, bars: state.bars, lattice: state.lattice }, 16);
    }
    WorldCombat.effect(fairyNet, 1, 600, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(fairyNet, "start", effect => effect.schedule("scan", "scan", 1, "{}"));
    WorldCombat.effectHandler(fairyNet, "scan", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state()), centre = fairyPoint(state);
        const found = world.query(centre, Math.min(32, state.radius + 2), false), present: string[] = [], members: string[] = [];
        for (let i = 0; i < found.length; i++) {
            const actor = found[i], body = world.observe(actor); if (!body) continue;
            const ref = String(actor.ref()), delta = body.position().minus(centre), distance = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
            present.push(ref);
            if (distance > state.radius + .4 || Math.abs(delta.y()) > 3) {
                if (state.carriers[ref]) fairyEscape(world, ref, state, body); else fairyRelease(world, ref, state);
                delete state.refused[ref]; continue;
            }
            if (state.refused[ref]) continue;
            const current = MobEffects.read(world, actor, fairySeal);
            if (!current) {
                if (distance > state.radius) continue;
                // 只在能直连到场地中心时才加入：隔墙、隔层不算同一连通场地，不会被锁进去。
                if (!world.clear(centre, body.position())) { state.refused[ref] = true; continue; }
                const carrier = MobEffects.apply(world, actor, fairySeal, effect.remaining(), 0);
                if (!carrier) { state.refused[ref] = true; continue; }
                state.carriers[ref] = MobEffects.anchor(carrier);
                WorldFeedback.emit(world, fairyScene, 1, body.position(), { moment: "caught", target: ref, bars: state.bars, lattice: state.lattice }, 18);
            } else {
                // 另一场刷新过的载体（新 revision）也照样采纳并继续牵制，不能因旧 anchor 偶然失效就放人。
                state.carriers[ref] = MobEffects.anchor(current);
            }
            const result = WorldBoundaries.contain(world, actor, { centre, radius: state.radius, margin: .4, height: 3, step: .45 },
                function (target, delta) { return world.friendly(target) ? world.displace(target, delta) : world.hitDisplace(target, delta); });
            if (result === "escaped" || result === "refused") { fairyEscape(world, ref, state, body); state.refused[ref] = true; continue; }
            members.push(ref);
        }
        Object.keys(state.carriers).forEach(ref => { if (present.indexOf(ref) < 0) fairyRelease(world, ref, state); });
        Object.keys(state.refused).forEach(ref => { if (present.indexOf(ref) < 0) delete state.refused[ref]; });
        if (!state.announced) {
            state.announced = true;
            WorldFeedback.emit(world, fairyScene, 1, centre, { moment: "seal", radius: state.radius, bars: state.bars, lattice: state.lattice, scale: state.scale, members: members.length }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), fairySealText, [members.length], 28);
        }
        state.members = members; effect.state(JSON.stringify(state)); effect.schedule("scan", "scan", 1, "{}");
    });
    WorldCombat.effectHandler(fairyNet, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(fairyNet, "end", function (effect) {
        const state = JSON.parse(effect.state()), world = effect.world();
        Object.keys(state.carriers).forEach(ref => fairyRelease(world, ref, state));
        WorldFeedback.emit(world, fairyScene, 1, fairyPoint(state), { moment: "release", radius: state.radius, scale: state.scale }, 24);
    });
    define({
        freeMovement: true,
        id: fairyId,
        cooldownParameter: "recharge",
        name: "妖精之锁",
        description: "脚下围起对等光栅，自己、伙伴与敌人在圈内都能正常走位；靠近边缘才收束。被外力带出范围或原生拒绝牵制就脱锁，新进场者会加入。",
        uses: ["把逃向出口的对手关进一块地对等锁住等队友集火", "在狭窄地形限制混战双方的外撤", "把高机动目标关进一小块地里让它没法拉开"],
        kind: "self",
        range: 5,
        maxRange: 8,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 120,
        style: "fairy",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 10, minTargets: 1, catchRunners: true, leaveStation: false } },
        fields: [
            field(pathOf("deep"), "深锁", "boolean", { help: "开启（深锁）：封印时长 ×1.4；代价是半径 ×0.8、起手 +4 刻、冷却 +20 刻——锁得更久，但圈更小、更慢更费。关闭（广域锁）：圈更大、更快、冷却更短；代价是锁得更短。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[fairyId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(fairyId, "tempo", context)),
                recover: Math.round(p(fairyId, "aftercast", context)),
                cooldown: Math.round(p(fairyId, "recharge", context)),
                active: 1,
                range: p(fairyId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fairylock:charge", fairyScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon, inspection) {
            const context: NumberContext | null = pokemon ? { pokemon, skill: skills[fairyId], detail: { values: config },
                world: inspection && inspection.world, actor: inspection && inspection.actor,
                attributes: inspection && inspection.attributes, state: inspection && inspection.state } : null;
            return { radius: context ? p(fairyId, "radius", context) : p(fairyId, "radius"), geometry: "area", style: "fairy", color: 0xF7A8D8,
                label: config && config.deep === true ? "妖精之锁 · 深锁" : "妖精之锁" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(3, p(fairyId, "radius", action));
            const sealTicks = Math.max(40, Math.round(p(fairyId, "sealTicks", action)));
            const lattice = Math.max(10, Math.round(p(fairyId, "lattice", action)));
            const bars = Math.max(4, Math.round(p(fairyId, "bars", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / fairyReferenceRadius));
            const intensity = Math.max(0.6, Math.min(2.2, lattice / 20 + bars / 14));
            const state: any = { position: [centre.x(), centre.y(), centre.z()], radius: radius,
                sealTicks: sealTicks, lattice: lattice, bars: bars, scale: scale, intensity: intensity, members: [], carriers: {}, refused: {} };

            const existing = world.effects(self, fairyNet);
            for (let index = 0; index < existing.length; index++) world.operation(existing[index].id(), "world_combat:dispel", "{}");

            const net = world.effect(fairyNet, self, JSON.stringify(state), sealTicks);
            WorldFeedback.onEffect(world, net, "fairy:net:" + net, fairyScene, 1, centre,
                { moment: "net", radius, bars, lattice, scale });
            // 稳定立柱沿实际半径与固定上下高度画，不吃 data.scale；少而固定的根数比一团柱状粒子更像一道边界。
            WorldFeedback.onEffect(world, net, "fairy:posts:" + net, fairyPostsScene, 1, centre,
                { radius, bars, height: 3, scale });
            sound(action, "minecraft:block.beacon.activate");
            sound(action, "minecraft:block.amethyst_block.chime");
            done(action);
        }
    });
}

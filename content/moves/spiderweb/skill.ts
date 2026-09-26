/** Silk coats actual living contacts or weaves a finite web over the native impacted surface. */
namespace PokemonSkills {
    const spiderwebId = "spiderweb";
    const spiderwebScene = "world_combat:move_spiderweb";
    const spiderwebWrapped = "world_combat:spiderweb_wrapped";
    const spiderwebCocoon = "world_combat:spiderweb_cocoon";
    const spiderwebKey = "spiderweb:cocoon:";
    const spiderwebSlowFallback = 0.34;
    const spiderwebWrapText = "world_combat.move.spiderweb.text.wrap";
    const spiderwebBurnText = "world_combat.move.spiderweb.text.burn";
    const spiderwebFadeText = "world_combat.move.spiderweb.text.fade";

    function spiderwebCocoonData(json: string): string {
        const value = JSON.parse(json);
        ["layers", "threads", "scale", "slow"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid spider web state");
        });
        return JSON.stringify(value);
    }

    /** 找到目标的茧并取它这一次的每层减速；没有茧时用兜底值。 */
    function spiderwebSlow(world: CombatWorld, victim: CombatActor): number {
        const cocoons = world.effects(victim, spiderwebCocoon);
        for (let i = 0; i < cocoons.length; i++) {
            try {
                const state = JSON.parse(String(cocoons[i].data()));
                if (state && typeof state.slow === "number" && isFinite(state.slow)) return state.slow;
            } catch (error) { }
        }
        return spiderwebSlowFallback;
    }

    WorldCombat.effect(spiderwebCocoon, 1, 600, "actor", spiderwebCocoonData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spiderwebCocoon, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        if (!state.carrier || !MobEffects.matches(world, victim, state.carrier)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body) WorldFeedback.onEffect(world, effect.id(), spiderwebKey + effect.id(), spiderwebScene, 1, body.position(),
            { moment: "cocoon", target: String(victim.ref()), layers: state.layers, threads: state.threads, scale: state.scale });
        effect.schedule("weave", "weave", 4, "{}");
    });
    WorldCombat.effectHandler(spiderwebCocoon, "weave", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        if (!state.carrier || !MobEffects.matches(world, victim, state.carrier)) { effect.end(); return; }
        effect.schedule("weave", "weave", 4, "{}");
    });
    // 同一目标再中一次：旧茧先让位，避免它到点时把新层一起清掉。
    WorldCombat.effectHandler(spiderwebCocoon, "operation:world_combat:spiderweb/replace", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const state = JSON.parse(effect.state());
        state.replaced = true; effect.state(JSON.stringify(state));
        effect.end();
    });
    // 火一燎就把整圈丝烧开：由 damage_applied 监听触发，触发者不是施法者，因此不校验归属。
    WorldCombat.effectHandler(spiderwebCocoon, "operation:world_combat:spiderweb/burn", function (effect) {
        const state = JSON.parse(effect.state());
        state.burned = true; effect.state(JSON.stringify(state));
        effect.end();
    });
    WorldCombat.effectHandler(spiderwebCocoon, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        const state = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const web = MobEffects.read(world, victim, spiderwebWrapped);
            if (web !== null && state.carrier && MobEffects.matches(world, victim, state.carrier)) world.removeMobEffect(victim, spiderwebWrapped, web.key());
        }
        if (state.replaced || !world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        const at = body.position();
        if (state.burned) {
            WorldFeedback.emit(world, spiderwebScene, 1, at, { moment: "burn", target: String(victim.ref()), layers: state.layers }, 24);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), spiderwebBurnText, [], 26);
            world.sound("minecraft:block.fire.extinguish", at, 12, "{}");
        }
        else {
            WorldFeedback.emit(world, spiderwebScene, 1, at, { moment: "fade", target: String(victim.ref()), layers: state.layers }, 24);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), spiderwebFadeText, [], 24);
        }
    });

    // 层数越多越难走：导航速度按层数线性压下去，三层以上归零（完全钉住）。
    WorldCombat.on("world_combat:move_spiderweb/weave", "world_combat:navigate", "", function (event) {
        const world = event.world(), actor = event.actor();
        const web = MobEffects.read(world, actor, spiderwebWrapped);
        if (web === null) return;
        const factor = Math.max(0, 1 - (web.amplifier() + 1) * spiderwebSlow(world, actor));
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * factor);
        event.data(JSON.stringify(data));
    });

    // 火属性伤害或身上的火：把目标的丝一次烧光（别的来源的 trapped 不动）。
    WorldCombat.on("world_combat:move_spiderweb/burn", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), target = event.target();
        if (target === null || !world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        const fire = (Array.isArray(data.damageTags) && data.damageTags.indexOf("minecraft:is_fire") >= 0) || data.type === "fire"
            || ["inFire", "onFire", "lava", "hotFloor", "fireball", "unattributedFireball", "campfire"].indexOf(String(data.cause || "")) >= 0;
        if (!fire) return;
        world.effect(spiderwebHeat, target, "{}", 20);
        if (MobEffects.read(world, target, spiderwebWrapped) === null) return;
        const cocoons = world.effects(target, spiderwebCocoon);
        for (let i = 0; i < cocoons.length; i++) {
            if (world.operation(cocoons[i].id(), "world_combat:spiderweb/burn", "{}")) return;
        }
        const web = MobEffects.read(world, target, spiderwebWrapped);
        if (web !== null) world.removeMobEffect(target, spiderwebWrapped, web.key());
    });

            function spiderwebWrap(scope: CombatWorld, victim: CombatActor, options: any): void {
                const { layerCap, wrapTicks, layerBonus, threads, slow } = options;
                const existing = MobEffects.read(scope, victim, spiderwebWrapped);
                const held = existing === null ? 0 : existing.amplifier() + 1;
                const layers = Math.min(layerCap, held + 1);
                const ticks = Math.max(40, Math.round(wrapTicks + (layers - 1) * layerBonus));
                const cocoons = scope.effects(victim, spiderwebCocoon);
                for (let i = 0; i < cocoons.length; i++) scope.operation(cocoons[i].id(), "world_combat:spiderweb/replace", "{}");
                const carrier = MobEffects.apply(scope, victim, spiderwebWrapped, ticks, layers - 1);
                if (!carrier) return;
                const body = scope.observe(victim);
                const scale = body === null ? 1 : Math.max(0.6, Math.min(2.4, body.width() / 0.9));
                const data = { layers: layers, threads: threads, scale: scale, slow: slow, carrier: MobEffects.anchor(carrier) };
                scope.effect(spiderwebCocoon, victim, JSON.stringify(data), ticks);
                WorldFeedback.emit(scope, spiderwebScene, 1, body === null ? WorldCombat.point(0, 0, 0) : body.position(),
                    { moment: "wrap", target: String(victim.ref()), layers: layers, threads: threads,
                        scale: scale, intensity: Math.max(0.6, Math.min(2.4, 0.7 + layers * 0.4)) }, 30);
                WorldFeedback.text(scope, (body === null ? WorldCombat.point(0, 0, 0) : body.position()).plus(WorldCombat.point(0, 1.1, 0)),
                    spiderwebWrapText, [layers, Math.round(ticks / 20 * 10) / 10], 30);
                scope.sound("minecraft:block.cobweb.place", body === null ? WorldCombat.point(0, 0, 0) : body.position(), 14, "{}");
            }

    const spiderwebSurface = "world_combat:spiderweb_surface", spiderwebHeat = "world_combat:spiderweb_heat";
    WorldCombat.effect(spiderwebHeat, 1, 20, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spiderwebHeat, "start", function () {});
    WorldCombat.effect(spiderwebSurface, 1, 600, "actor", json => json, EffectProtocols.unchanged);
    function spiderwebPoint(v: number[]): CombatPoint { return WorldCombat.point(v[0], v[1], v[2]); }
    function spiderwebTouch(body: CombatObservation, state: any): boolean {
        const delta = body.position().minus(spiderwebPoint(state.centre)), n = state.normal, u = state.u, v = state.v;
        const dot = function (axis: number[]) { return delta.x() * axis[0] + delta.y() * axis[1] + delta.z() * axis[2]; };
        const extent = function (axis: number[]) { return Math.abs(axis[0]) * body.width() / 2 + Math.abs(axis[1]) * body.height() / 2 + Math.abs(axis[2]) * body.width() / 2; };
        return Math.abs(dot(n)) <= .16 + extent(n) && Math.abs(dot(u)) <= state.half + extent(u) && Math.abs(dot(v)) <= state.half + extent(v);
    }
    WorldCombat.effectHandler(spiderwebSurface, "start", effect => effect.schedule("contact", "contact", 1, "{}"));
    WorldCombat.effectHandler(spiderwebSurface, "contact", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state()), centre = spiderwebPoint(state.centre);
        let burned = false;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
            const p = centre.plus(spiderwebPoint(state.u).scale(a * state.half)).plus(spiderwebPoint(state.v).scale(b * state.half));
            const block = world.block(p), fluid = world.fluid(p);
            if (block && block.tagged("minecraft:fire") || fluid && fluid.tagged("minecraft:lava")) burned = true;
        }
        const nearby = world.query(centre, Math.min(12, state.half * 2 + 4), false);
        for (let i = 0; i < nearby.length; i++) {
            const actor = nearby[i], body = world.observe(actor); if (!body || !spiderwebTouch(body, state)) continue;
            if (CombatStatus.has(world, actor, "burn") || world.effects(actor, spiderwebHeat).length) { burned = true; break; }
            if (world.friendly(actor)) continue;
            const ref = String(actor.ref());
            if ((state.next[ref] || 0) > world.tick()) continue;
            spiderwebWrap(world, actor, state.options); state.next[ref] = world.tick() + 40;
        }
        if (burned) { state.burned = true; effect.state(JSON.stringify(state)); effect.end(); return; }
        effect.state(JSON.stringify(state)); effect.schedule("contact", "contact", 2, "{}");
    });
    WorldCombat.effectHandler(spiderwebSurface, "end", function (effect) {
        const state = JSON.parse(effect.state());
        WorldFeedback.emit(effect.world(), spiderwebScene, 1, spiderwebPoint(state.centre),
            { moment: state.burned ? "burn" : "fade", path: state.path, layers: 1 }, 22);
    });
    function spiderwebLay(world: CombatWorld, hit: CombatImpact, half: number, ticks: number, options: any): void {
        const normals: any = { up: [0, 1, 0], down: [0, -1, 0], north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0] };
        const normal = normals[hit.blockFace()]; if (!normal || !hit.blockPosition()) return;
        const u = normal[1] ? [1, 0, 0] : [normal[2], 0, -normal[0]], v = normal[1] ? [0, 0, 1] : [0, 1, 0];
        const centre = hit.position().plus(spiderwebPoint(normal).scale(.04));
        const path = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(function (pair) {
            const p = centre.plus(spiderwebPoint(u).scale(pair[0] * half)).plus(spiderwebPoint(v).scale(pair[1] * half)); return [p.x(), p.y(), p.z()];
        });
        const effect = world.effect(spiderwebSurface, world.source(), JSON.stringify({ centre: [centre.x(), centre.y(), centre.z()], normal, u, v, half, path, options, next: {} }), ticks);
        WorldFeedback.onEffect(world, effect, "spiderweb:surface:" + effect, spiderwebScene, 1, centre, { moment: "web", path: path, threads: options.threads });
    }
    define({
        id: spiderwebId,
        cooldownParameter: "recharge",
        name: "蛛网",
        description: "吐出的蛛丝命中活体就叠一层茧；撞墙或地面会沿接触面织短时薄网。碰网的敌人每两秒最多加一层，火焰能烧开网与茧。",
        uses: ["把想逃跑的目标一层层裹住等队友收", "缠住一个高机动目标不让它脱离", "接在队友的火招之前，逼对手先解网"],
        kind: "aim",
        range: 7,
        maxRange: 10,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "silk",
        defaults: { thick: false, ai: { maxChase: 10, catchRunners: true, leaveStation: false } },
        fields: [
            flag("thick", "厚茧")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[spiderwebId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(spiderwebId, "tempo", context)),
                recover: Math.round(p(spiderwebId, "aftercast", context)),
                cooldown: Math.round(p(spiderwebId, "recharge", context)),
                active: 1,
                range: p(spiderwebId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_spiderweb:windup", spiderwebScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: config && config.thick === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(spiderwebId, "reach"), geometry: "line", style: "silk", color: 0xE6E2D6,
                label: config && config.thick === true ? "蛛网·厚茧" : "蛛网" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.5, p(spiderwebId, "globSpeed", action));
            const radius = Math.max(0.15, p(spiderwebId, "globRadius", action));
            const reach = Math.max(2, p(spiderwebId, "reach", action));
            const wrapTicks = Math.max(40, Math.round(p(spiderwebId, "wrapTicks", action)));
            const layerBonus = Math.max(0, Math.round(p(spiderwebId, "layerBonus", action)));
            const layerCap = Math.max(1, Math.round(p(spiderwebId, "layerCap", action)));
            const threads = Math.max(6, Math.round(p(spiderwebId, "threads", action)));
            const slow = Math.max(0.05, Math.min(0.9, p(spiderwebId, "slow", action)));
            const splat = Math.max(0.4, p(spiderwebId, "splat", action));
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:block.tripwire.attach");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, lifetime: Math.max(40, Math.round(reach / Math.max(0.2, speed) + 30)),
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.8, tint: 0xEDE8F0 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck) && !scope.friendly(struck)) { spiderwebWrap(scope, struck, { layerCap, wrapTicks, layerBonus, threads, slow }); return; }
                    spiderwebLay(scope, hit, Math.max(.8, splat), wrapTicks, { layerCap, wrapTicks, layerBonus, threads, slow });
                    WorldFeedback.emit(scope, spiderwebScene, 1, hit.position(),
                        { moment: "splat", scale: splat / 0.8, laid: 0 }, 20);
                    scope.sound("minecraft:block.cobweb.break", hit.position(), 12, "{}");
                }
            }, function (current: CombatAction) {
                WorldFeedback.emit(current.world(), spiderwebScene, 1, current.targetPosition(), { moment: "splat", scale: splat / 0.8 }, 18);
                finish(current);
            });
            WorldFeedback.emit(world, spiderwebScene, 1, action.origin(),
                { moment: "shot", projectile: flight, target: targetRef, threads: threads }, 40);
        }
    });
}

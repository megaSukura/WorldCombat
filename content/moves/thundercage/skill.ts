/**
 * 雷电囚笼 / thundercage 的出手方式。
 *
 * 核心念头：一道自由瞄准的电击命中后，在目标四周立起一圈有顶沿的竖直电流栅栏，围出一个有限高的小笼子；
 * 目标在笼内能自由走位，只有真正越过侧壁的那一次会挨一记电弧并被推回；向上一跃翻过笼顶、或凭原生抗推
 * 硬冲出侧壁，都能脱出——那是突破，不是被无限远程拽回。笼内每隔一会儿也劈一道电、有概率把它电麻。
 * 这是本组只有 1 个学习者的签名招，也是最重的一记。
 *
 * 三幕：
 *   起（windup，提交前）：电丝在身前收束、噼啪作响的预告。
 *   击（cast → enclose）：提交后电矢自由飞出（可瞄实体，也可点方向／世界点）；命中第一个非友方活体即结算
 *       一次较重的电击（cage），在命中点立起电笼，把共享身份 `world_combat:status/partiallytrapped`
 *       （本单元 `world_combat:thundercage_grid`）挂到该目标身上；碰墙则散电。
 *   收（arc → release / shatter）：绑定效果每 2 刻记录一次水平位置；笼内走位不触边，跨过侧壁的那一次
 *       只电一次并按 `push` 向内有上限推回；推不回则这次突破后解笼（shatter）。笼内每 `interval` 劈一次电
 *       并尝试麻痹，且与同刻的越界电弧合并为一次预算。越出笼顶、瞬移远离、倒下或状态被外力清掉都结束。
 *
 * 与同族分开：唯一的电属性、唯一的边界式围栏；只拦越界、越界即电。地面属性对电免疫，打上去没有笼子。
 * 旧笼先关、再种新载体并记下实际 key；麻痹只在电击真的造成伤害后才判定。
 */
namespace PokemonSkills {
    const thundercageScene = "world_combat:move_thundercage";
    const thundercageGrid = "world_combat:thundercage_grid";
    const thundercageBond = "world_combat:thundercage_bond";
    const thundercageCageKey = "thundercage:cage:";
    const thundercageEncloseText = "world_combat.move.thundercage.text.enclose";
    const thundercageReleaseText = "world_combat.move.thundercage.text.release";

    function thundercagePoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    function thundercageBondData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid thunder cage anchor");
        ["cage", "arc", "interval", "radius", "height", "push", "bars", "paralyzeChance", "escape", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid thunder cage bond");
        });
        if (value.interval < 1 || value.radius <= 0 || value.height <= 0 || value.push <= 0 || value.escape <= 0) throw new Error("Invalid thunder cage bond");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid thunder cage carrier");
        return JSON.stringify(value);
    }

    function thundercageArc(world: CombatWorld, victim: CombatActor, data: any, moment: string, contact: number[] | null): void {
        // 只有这一下真的造成伤害，才在之后判定麻痹；被免伤挡下就不假装电中。
        const landed = hurt(world, victim, "thundercage", data.arc, { damage: damageSpec("thundercage", "arc") });
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        if (landed && !CombatStatus.has(world, victim, "paralysis") && world.random() < data.paralyzeChance)
            CombatStatus.inflict(world, victim, "paralysis");
        const payload: any = { moment: moment, target: String(victim.ref()), bars: Math.round(data.bars),
            count: Math.round(10 + data.arc), intensity: Math.max(0.6, Math.min(2.4, data.arc / 18)), pulses: data.pulses || 0 };
        if (contact !== null) {
            payload.path = [String(victim.ref()), contact];
            payload.contact = contact;
        }
        WorldFeedback.emit(world, thundercageScene, 1, body.position(), payload, 20);
        world.sound("cobblemon:impact.electric", body.position(), 16, "{}");
    }

    WorldCombat.effect(thundercageBond, 1, 500, "actor", thundercageBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(thundercageBond, "start", function (effect) { effect.schedule("arc", "arc", 1, "{}"); });
    WorldCombat.effectHandler(thundercageBond, "arc", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = thundercagePoint(data.point);
        const pos = body.position();
        const dx = pos.x() - anchor.x(), dz = pos.z() - anchor.z();
        const horiz = Math.sqrt(dx * dx + dz * dz);
        if (pos.y() - anchor.y() > data.height) { data.escaped = "over"; effect.state(JSON.stringify(data)); effect.end(); return; }
        if (horiz > data.escape) { data.escaped = "gone"; effect.state(JSON.stringify(data)); effect.end(); return; }
        let crossing = false;
        const inside = horiz <= data.radius;
        // 侧壁跨过只用「上一次在内的位置线段」触发一次，之后走出多远都不会每 2 刻补电。
        if (data.lastInside !== false && !inside && horiz > 0.001) {
            crossing = true;
            const inv = 1 / horiz;
            const contact = [anchor.x() + dx * inv * data.radius, pos.y(), anchor.z() + dz * inv * data.radius];
            data.pulses = (data.pulses || 0) + 1;
            data.crossings = (data.crossings || 0) + 1;
            data.angle = Math.atan2(dz, dx) * 180 / Math.PI;
            effect.state(JSON.stringify(data));
            thundercageArc(world, victim, data, "arc", contact);
            if (!world.valid(victim)) { effect.end(); return; }
            // 有上限地向内弹回；原生抗推或碰撞带不回，这一次突破就解笼。
            const need = Math.max(0, horiz - data.radius * 0.6);
            const step = Math.min(data.push, need + 0.05);
            if (step > 0.02) world.hitDisplace(victim, WorldCombat.point(-dx * inv * step, 0, -dz * inv * step));
            const after = world.observe(victim);
            const afterHoriz = after === null ? horiz
                : Math.sqrt(Math.pow(after.position().x() - anchor.x(), 2) + Math.pow(after.position().z() - anchor.z(), 2));
            // 原生抗推或碰撞没把目标带回笼内，就是一次真实突破：解笼，不再无限补电。
            if (afterHoriz > data.radius + 0.02) {
                data.breakout = true;
                data.face = contact;
                effect.state(JSON.stringify(data));
                effect.end();
                return;
            }
        }
        // 笼内周期电击与越界同刻合并成一次预算：跨壁那一下替掉这一趟的 zap。
        if (!crossing && world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            thundercageArc(world, victim, data, "zap", null);
            if (!world.valid(victim)) { effect.end(); return; }
        }
        const at = world.observe(victim);
        if (at !== null) {
            const hx = at.position().x() - anchor.x(), hz = at.position().z() - anchor.z();
            data.lastInside = Math.sqrt(hx * hx + hz * hz) <= data.radius;
            effect.state(JSON.stringify(data));
        }
        // 持续电栅绑在本绑定效果上：到期或被驱散时栅栏与顶沿同时收走。
        WorldFeedback.onEffect(world, effect.id(), thundercageCageKey + String(victim.ref()), thundercageScene, 1, anchor,
            { moment: "cage", target: String(victim.ref()), radius: data.radius, height: data.height, bars: Math.round(data.bars),
                scale: data.radius / 1.6, flow: Math.round(16 + data.bars), push: data.push });
        effect.schedule("arc", "arc", 2, "{}");
    });
    WorldCombat.effectHandler(thundercageBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        // 只撤本绑定自己那一次种下的电场载体；旧载体被替换后不再误删新载体。
        if (data.carrier && MobEffects.matches(world, victim, data.carrier)) {
            const grid = MobEffects.read(world, victim, thundercageGrid);
            if (grid !== null) world.removeMobEffect(victim, thundercageGrid, grid.key());
        }
        const body = world.observe(victim);
        if (body === null) return;
        const payload: any = { target: String(victim.ref()) };
        let at = body.position();
        if (data.breakout) {
            payload.moment = "shatter";
            payload.contact = data.face || null;
            payload.angle = typeof data.angle === "number" ? data.angle : 0;
            at = thundercagePoint(data.point);
        } else {
            payload.moment = "release";
            payload.escaped = data.escaped || "";
        }
        WorldFeedback.emit(world, thundercageScene, 1, at, payload, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), thundercageReleaseText, [], 24);
    });
    WorldCombat.effectHandler(thundercageBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    WorldCombat.on("world_combat:move_thundercage/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== thundercageGrid) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const bonds = world.effects(victim, thundercageBond);
        for (let i = 0; i < bonds.length; i++) {
            let state: any;
            try { state = JSON.parse(String(bonds[i].data())); } catch (error) { state = null; }
            if (state === null || !state.carrier || !MobEffects.matches(world, victim, state.carrier))
                world.operation(bonds[i].id(), "world_combat:dispel", "{}");
        }
    });

    define({
        id: "thundercage",
        name: "Thunder Cage",
        description: "一道自由瞄准的电击命中后，在目标四周立起一圈有顶沿的竖直电栅，把它围在有限高的笼内：笼内能自由走位，只有跨过侧壁的那一次会被电弧弹回并电一下，笼内每隔一会儿也劈一道电、有概率把它电麻。向上一跃翻过笼顶、或凭原生抗推硬冲出侧壁，都能脱出——那是突破，不再被远程拽回。广笼式更宽更久；紧笼式更小、电得更重。",
        uses: ["把高机动的目标关在一小块地里", "用持续电击和麻痹压制对手", "把冲进来的目标弹回交战区", "在狭窄处锁住一个关键目标"],
        kind: "aim",
        range: 10,
        maxRange: 17,
        prepare: 9,
        active: 40,
        recover: 9,
        cooldown: 48,
        style: "thundercage",
        defaults: { wide: false, ai: { maxChase: 12, preferMovers: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("thundercage", "reach", pokemon), geometry: "line", style: "thundercage", color: 0xE8E24A,
                label: config && config.wide === true ? "广域电笼" : "紧束电笼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["thundercage"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const wide = !!(config && config.wide);
            return {
                prepare: Math.round(p("thundercage", "charge", context)),
                recover: 9,
                cooldown: Math.round(p("thundercage", "duration", context) * 0.22) + 16 + (wide ? 8 : 0),
                active: skills["thundercage"].active,
                range: p("thundercage", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("thundercage:weave", thundercageScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const speed = Math.max(0.5, p("thundercage", "speed", action));
            const cage = p("thundercage", "cage", action);
            const arc = p("thundercage", "arc", action);
            const duration = Math.max(80, Math.round(p("thundercage", "duration", action)));
            const interval = Math.max(6, Math.round(p("thundercage", "interval", action)));
            const bars = Math.max(6, Math.round(p("thundercage", "bars", action)));
            const paralyzeChance = Math.max(0, Math.min(1, p("thundercage", "paralyzeChance", action)));
            const scenes = WorldFeedback.actionScenes(thundercageScene);
            sound(action, "cobblemon:impact.electric");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.32,
                appearance: { sprite: "cobblemon:particle/generic/electricity/electricity_yellow", glow: true, scale: 1.0,
                    homing: target ? { target: String(target.ref()), turn: 11, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    scenes.stop(current, "cast");
                    const scope = current.world(), at = hit.position();
                    // 碰墙散电：只按原生方块格与表面呈现，不在墙上立笼。
                    if (!hit.hitEntity() && hit.blocked()) {
                        const cell = hit.blockPosition();
                        const point = cell === null ? at : cell;
                        WorldFeedback.emit(scope, thundercageScene, 1, point, { moment: "scatter", face: hit.blockFace() }, 16);
                        scope.sound("cobblemon:impact.electric", point, 12, "{}");
                        return;
                    }
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, thundercageScene, 1, at, { moment: "fizzle" }, 16);
                        return;
                    }
                    // 真实伤害许可：被拒则完全不当命中，不立笼也不电。
                    if (!impact(current, hit, "thundercage", cage, { damage: damageSpec("thundercage", "cage") })) return;
                    // 体型相关参数对实际被命中的目标求值。
                    const aimed = withTarget(factContext(current), victim);
                    const radius = Math.max(1.0, p("thundercage", "radius", aimed));
                    const height = Math.max(1.4, p("thundercage", "height", aimed));
                    const push = Math.max(0.2, p("thundercage", "push", aimed));
                    const scale = radius / 1.6;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    // 旧笼先关：它的结束只撤自己那一次载体，随后再种新的并记下新 key。
                    const existing = scope.effects(victim, thundercageBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", thundercageGrid, duration, 0, { unique: true })) return;
                    const carrier = MobEffects.read(scope, victim, thundercageGrid);
                    if (carrier === null) return;
                    const anchor = body.position();
                    const state = { point: [anchor.x(), anchor.y(), anchor.z()], cage: cage, arc: arc, interval: interval,
                        radius: radius, height: height, push: push, bars: bars, paralyzeChance: paralyzeChance,
                        escape: radius + 2.5, next: scope.tick() + interval, pulses: 0, lastInside: true, breakout: false,
                        carrier: MobEffects.anchor(carrier) };
                    const bond = scope.effect(thundercageBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.onEffect(scope, bond, thundercageCageKey + String(victim.ref()), thundercageScene, 1, anchor,
                        { moment: "cage", target: String(victim.ref()), radius: radius, height: height, bars: bars,
                            scale: scale, flow: Math.round(16 + bars), push: push });
                    WorldFeedback.emit(scope, thundercageScene, 1, anchor,
                        { moment: "enclose", target: String(victim.ref()), radius: radius, height: height, bars: bars, push: push, scale: scale }, 26);
                    WorldFeedback.text(scope, anchor.plus(WorldCombat.point(0, 1.2, 0)), thundercageEncloseText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("minecraft:entity.lightning_bolt.impact", anchor, 20, "{}");
                }
            }, function complete(current: CombatAction) { scenes.finish(current, done); });
            scenes.show(action, "cast", action.origin(),
                { moment: "cast", projectile: flight, bars: bars });
        }
    });
}

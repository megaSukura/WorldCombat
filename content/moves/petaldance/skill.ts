/**
 * 花瓣舞 / petaldance 的出手方式。
 *
 * 核心念头：裹着一圈外沿花裙连续舞步移动，用花风外沿扫人；裙内是真空隙，贴近中心反而安全。
 *   它不像大闹一番那样原地全圆乱挥：花裙跟着真实身体走，玩家用自由 aim 规划每一圈往哪边旋，把外沿扫到谁。
 *
 * 出手（`kind: "aim"`）：自由 aim 决定每一圈的舞步方向，无选敌也能舞；提交后按住技能键可在圈间改向。
 *
 * 三幕（execute 自管节奏）：
 *   起（windup，提交前）：屈膝、脚下先聚起花瓣，只播预告。
 *   舞（execute，提交后）：`strikes` 圈。每一圈在数刻内沿当刻 aim 走一小段弧（原 `drift` 预算分刻用 `sweepStep` 真走），
 *       身体每动一步，外半径 `radius`、内半径 `inner×radius` 的中空花裙就在真实位置重判一次：裙内目标永远安全，
 *       裙环上的非友方各吃一次 `bloom` 范围特攻并被花瓣轻推 `push` 格（每圈每人最多一次，墙真截断）。
 *       走完一圈在真实可支撑地面落下 `petals` 块 `minecraft:pink_petals`（`canSurvive` 判定，`terrain` 短租、到期原方块回来）。
 *       两圈之间隔 `gap` 刻。
 *   晕（结束）：舞完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect，时长按首次写入的
 *       `dazeTicks`，反噬不再续时）。
 *
 * 与同族分开：火之舞是两片翼尖、乱打是原地左右扇扫；花瓣舞是移动中的中空花裙，贴内圈能避、走位能让裙边扫下一圈。
 */
namespace PokemonSkills {
    function petaldanceInput(action: CombatAction): CombatPoint | null {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const delta = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(action.origin());
                if (delta.length() >= 0.05) return delta.unit();
            }
        } catch (error) { }
        try {
            const fallback = action.targetPosition().minus(action.origin());
            if (fallback.length() >= 0.05) return fallback.unit();
        } catch (error) { }
        const direction = action.direction();
        return direction.length() < 1e-6 ? null : direction.unit();
    }

    /** 在自己脚下按半径撒一圈花瓣：只放 `canSurvive` 为真、且本身是空气／矮草的地面格，按实际成功 receipt 计数。 */
    function petaldancePetals(world: CombatWorld, point: CombatPoint, radius: number, cells: number, ticks: number): number {
        const placed: any[] = [];
        const bx = Math.floor(point.x()), bz = Math.floor(point.z()), baseY = Math.floor(point.y());
        const rings: number[] = [0.5, 0.95, 1.35];
        for (let ring = 0; ring < rings.length && placed.length < cells; ring++) {
            const at = Math.max(0.6, radius * rings[ring]);
            const step = ring === 0 ? 1 : ring === 1 ? 5 : 7;
            for (let i = 0; i < step && placed.length < cells; i++) {
                const a = (i / step) * Math.PI * 2 + ring * 0.5;
                const x = bx + Math.round(Math.cos(a) * at), z = bz + Math.round(Math.sin(a) * at);
                for (let dy = 1; dy >= -3; dy--) {
                    const below = world.block(WorldCombat.point(x, baseY + dy, z));
                    if (below === null) break;
                    const id = String(below.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    const cell = WorldCombat.point(x, baseY + dy + 1, z);
                    const above = world.block(cell);
                    if (above === null) break;
                    const aboveId = String(above.id());
                    if (aboveId !== "minecraft:air" && aboveId !== "minecraft:short_grass" && aboveId !== "minecraft:tall_grass") break;
                    if (!world.canSurvive(cell, "minecraft:pink_petals")) break;
                    placed.push({ x: x, y: baseY + dy + 1, z: z, block: "minecraft:pink_petals", expectedState: String(above.state()) });
                    break;
                }
            }
        }
        if (!placed.length) return 0;
        try {
            const result = JSON.parse(world.terrainResult(JSON.stringify({ cells: placed, replace: false, bestEffort: true, linger: true }), Math.max(40, Math.round(ticks))));
            return result && Array.isArray(result.placed) ? result.placed.length : 0;
        } catch (error) { return 0; }
    }

    interface PetalState { left: number; strikes: number; index: number; }

    function petaldanceSpent(current: CombatAction, state: PetalState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(petaldanceId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(petaldanceId, "fumble", current))) * 100);
        if (body !== null && CombatStatus.apply(world, actor, "confusion", petaldanceDaze, ticks, fumble, { unique: true })) {
            WorldFeedback.emit(world, petaldanceScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), petaldanceDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
    }

    export function petaldanceRing(centre: CombatPoint, inner: number, outer: number): WorldGeometry.BodyRegion {
        return { boundsMin: () => centre.minus(WorldCombat.point(outer, 1.8, outer)),
            boundsMax: () => centre.plus(WorldCombat.point(outer, 2.6, outer)), intersects: (min, max) => {
                if (max.y() < centre.y() - 1.8 || min.y() > centre.y() + 2.6) return false;
                const x = Math.max(min.x(), Math.min(max.x(), centre.x())) - centre.x();
                const z = Math.max(min.z(), Math.min(max.z(), centre.z())) - centre.z();
                const farX = Math.max(Math.abs(min.x()-centre.x()), Math.abs(max.x()-centre.x()));
                const farZ = Math.max(Math.abs(min.z()-centre.z()), Math.abs(max.z()-centre.z()));
                return x*x + z*z <= outer*outer && farX*farX + farZ*farZ >= inner*inner;
            } };
    }

    /** 中空花裙在当刻身体位置的一次判定：内半径以内安全，环上每个非友方每圈最多结算一次。 */
    function petaldanceSkirt(current: CombatAction, centre: CombatPoint, inner: number, outer: number, struck: { [ref: string]: boolean }): number {
        const world = current.world(), actor = current.actor(), actorRef = String(actor.ref());
        let hits = 0;
        const power = p(petaldanceId, "bloom", current);
        const push = Math.max(0, p(petaldanceId, "push", current));
        const motes = Math.max(8, Math.round(p(petaldanceId, "motes", current)));
        const intensity = Math.max(0.6, Math.min(2.6, power / 30));
        const scale = Math.max(0.7, Math.min(2.0, outer / 5.0));
        WorldGeometry.selectBodies(world, petaldanceRing(centre, inner, outer),
            function (target, facts) {
                const ref = String(target.ref());
                if (ref === actorRef || world.friendly(target) || struck[ref]) return;
                const sight = world.clipBlocks(centre, facts.position());
                if (sight === null || sight.blocked()) return;
                struck[ref] = true;
                if (!hurt(current, target, petaldanceId, power, { damage: damageSpec(petaldanceId, "bloom") })) return;
                hits++;
                const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                if (world.valid(target) && away.length() > 0.05 && push > 0) world.hitDisplace(target, away.unit().scale(push));
                WorldFeedback.emit(world, petaldanceScene, 1, facts.position(),
                    { moment: "lash", target: ref, motes: Math.round(motes * 0.6), scale: scale, intensity: intensity }, 20);
            });
        return hits;
    }

    function petaldanceBeat(current: CombatAction, state: PetalState, scenes: WorldFeedback.ActionScenes, done: (action: CombatAction) => void): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { scenes.finish(current, done); return; }
        const radius = Math.max(2.6, p(petaldanceId, "radius", current));
        const innerRatio = Math.max(0.35, Math.min(0.55, p(petaldanceId, "inner", current)));
        const inner = Math.max(0.6, radius * innerRatio);
        const drift = Math.max(0, p(petaldanceId, "drift", current));
        const cells = Math.max(0, Math.round(p(petaldanceId, "petals", current)));
        const linger = Math.max(40, Math.round(p(petaldanceId, "linger", current)));
        const motes = Math.max(8, Math.round(p(petaldanceId, "motes", current)));
        const power = p(petaldanceId, "bloom", current);
        const intensity = Math.max(0.6, Math.min(2.6, power / 30 + state.index * 0.1));
        const scale = Math.max(0.7, Math.min(2.0, radius / 5.0));
        const heading = petaldanceInput(current) || WorldGeometry.flatUnit(current.direction());
        const steps = Math.max(2, Math.min(6, Math.round(radius)));
        const struck: { [ref: string]: boolean } = Object.create(null);
        let hits = 0;

        sound(current, state.index === 0 ? "cobblemon:move.magicalleaf.actor_1" : "cobblemon:move.razorleaf.actor_1");
        scenes.stop(current, "skirt");

        /** 分刻沿弧走一小步，每一步按真实身体位置重判中空花裙；走完一圈落地花瓣。 */
        function step(current: CombatAction, at: number): void {
            const body = current.world().observe(actor);
            if (body === null) { finish(current); return; }
            const centre = body.position();
            current.face(centre.plus(heading), 12, 12);
            scenes.show(current, "skirt", centre,
                { moment: "dance", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                    inner: Math.round(inner * 100) / 100, outer: Math.round(radius * 100) / 100, motes: motes,
                    direction: [heading.x(), 0, heading.z()], scale: scale, intensity: intensity });
            hits += petaldanceSkirt(current, centre, inner, radius, struck);
            if (at >= steps) { finish(current); return; }
            if (drift > 0.02) {
                const curve = (at / steps) * 0.7;
                const rotated = WorldCombat.point(
                    heading.x() * Math.cos(curve) - heading.z() * Math.sin(curve), 0,
                    heading.x() * Math.sin(curve) + heading.z() * Math.cos(curve));
                sweepStep(current, rotated.scale(drift / steps), Math.max(0.3, radius * 0.2));
            }
            current.after(1, function (next: CombatAction) { step(next, at + 1); });
        }

        function finish(current: CombatAction): void {
            scenes.stop(current, "skirt");
            const settled = current.world().observe(actor);
            const where = settled !== null ? settled.position() : current.origin();
            if (hits > 0) {
                WorldFeedback.emit(current.world(), petaldanceScene, 1, where,
                    { moment: "bloom", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                        motes: motes, outer: Math.round(radius * 100) / 100, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(current.world(), where.plus(WorldCombat.point(0, 1.35, 0)), petaldanceBloomText, [Math.round(power)], 24);
                sound(current, "cobblemon:impact.grass");
            }
            const laid = cells > 0 ? petaldancePetals(current.world(), where, radius, cells, linger) : 0;
            if (laid > 0) {
                WorldFeedback.emit(current.world(), petaldanceScene, 1, where,
                    { moment: "residue", target: String(actor.ref()), cells: laid, scale: scale, intensity: 0.8 }, 30);
                WorldFeedback.text(current.world(), where.plus(WorldCombat.point(0, 1.2, 0)), petaldanceStepText, [laid], 22);
                sound(current, "minecraft:block.grass.break");
            }
            state.left = state.left - 1;
            state.index = state.index + 1;
            if (state.left > 0) {
                const pause = Math.max(7, Math.round(p(petaldanceId, "gap", current)));
                current.after(pause, function (next: CombatAction) { petaldanceBeat(next, state, scenes, done); });
            } else {
                petaldanceSpent(current, state);
                scenes.finish(current, done);
            }
        }

        step(current, 0);
    }

    define({
        freeMovement: true,
        id: petaldanceId,
        cooldownParameter: "recharge",
        name: "Petal Dance",
        description: "裹着一圈外沿花裙连续舞步移动：花裙外沿扫过的人吃范围特攻伤害并被轻推开，贴近中心的中空里反而安全；每圈在真实可支撑地面落下花瓣。舞完自己陷入恍惚，出手可能被打散。",
        uses: ["隔着一段距离用中空花裙外沿削一圈贴过来的敌人", "用特攻处理一堆低特防目标", "走位把花裙边扫到敌人、同时把安全的中空留给队友"],
        kind: "aim",
        range: 5.0,
        maxRange: 7.4,
        prepare: 9,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 260,
        style: "petalstorm",
        interruptible: false,
        defaults: { drift: false, ai: { maxChase: 12, minFoes: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(petaldanceId, "radius", pokemon), geometry: "area", style: "petalstorm", color: 0xE58FB0,
                label: config && config.drift === true ? "花瓣舞·旋舞" : "花瓣舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[petaldanceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(petaldanceId, "tempo", context)),
                recover: Math.round(p(petaldanceId, "recover", context)),
                cooldown: Math.round(p(petaldanceId, "recharge", context)),
                active: 0,
                range: p(petaldanceId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(petaldanceId + ":windup", petaldanceScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", drift: config && config.drift === true ? 1 : 0 }));
            return Math.max(3, Math.round(p(petaldanceId, "tempo", action)));
        },
        execute: function (action, move, config, done) {
            // Releasing aim keeps the committed finite dance and its final direction; Escape still cancels.
            action.on("world_combat:input-release", function () { });
            action.releaseTarget();
            const scenes = WorldFeedback.actionScenes(petaldanceScene);
            const world = action.world(), actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const strikes = Math.max(2, Math.min(3, Math.round(p(petaldanceId, "strikes", action))));
            const state: PetalState = { left: strikes, strikes: strikes, index: 0 };
            sound(action, "cobblemon:move.razorleaf.actor_2");
            petaldanceBeat(action, state, scenes, done);
        }
    });

    // 失手反应：共享门禁把出手判给混乱时，按本单元自己的载体身份反割一次；不续时、不重复。
    CombatStatus.rejected.define({ id: petaldanceId + "/fumble", apply: function (context) {
        if (context.status !== "confusion") return;
        const carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        if (carrier && carrier !== petaldanceDaze) return;
        const world = context.world, actor = context.actor;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== petaldanceDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let specialAttack = 0;
            try { specialAttack = PokemonDamage.combatants.read(world, actor).stats.spa || 0; } catch (error) { specialAttack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + specialAttack * 0.00011));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                WorldFeedback.emit(world, petaldanceScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), petaldanceChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    } });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，随效果自然结束而停；不写回时长。
    WorldCombat.on(petaldanceId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== petaldanceDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, petaldanceId + ":dizzy:" + String(actor.ref()), petaldanceScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });

    WorldCombat.preview("world_combat:" + petaldanceId, JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}

/**
 * 浊雾 / smog —— 出手方式。
 *
 * 核心念头：一记**脱口的滚动浊雾团**。施法者吸一口气，朝选定的方向把雾团一口吐出去；雾团离开口边后
 *   沿固定的 3D 方向缓慢滚远，横截面一路膨大，滚到射程尽头就变薄散去。它不靠打疼人，靠把人熏毒——
 *   射程短、伤害低、PP 多、中毒概率最高；真实墙会把雾路截在墙前，退到墙后就不再被熏。
 *
 * 幕：
 *   起（windup，提交前）：鼓起胸腔、口边聚起雾团的预告（`action.present`，可被打断、不花 PP）。
 *   吐（puff）：提交当刻喷口爆开一团雾，吐出后施法者即可行动。
 *   滚（roll → fade）：雾团由有限托管 effect 自己推进（每刻前沿 + 真实碰撞），每个被罩到的人整团只结算
 *       一次 `fumes` 与中毒掷；碰墙就停在墙前堆薄，随后散去，不另留持续场。
 *
 * 与同族分开：污泥攻击是低弧小泥团、污泥炸弹是落地插引信的延时爆弹、垃圾射击是负重直线炮；
 *   只有浊雾是**一团自己滚出去的雾**，反制方式是横移离开雾路，或退到墙后。
 */
namespace PokemonSkills {
    const smogScene = "world_combat:move_smog";
    const smogCloud = "world_combat:move/smog/cloud";
    /** 表现里写死的参考半径：服务端把 data.scale 传成 实际半径 / 该值，粒子范围与体积一起缩放。 */
    const smogRadiusRef = 1.4;
    const smogHitText = "world_combat.move.smog.text.hit";
    const smogPoisonText = "world_combat.move.smog.text.poison";
    const smogMissText = "world_combat.move.smog.text.miss";

    function smogPoint(values: number[]): CombatPoint { return WorldCombat.point(values[0], values[1], values[2]); }

    /** 托管雾团的状态校验；缺省字段补全，保证旧存档也能继续滚。 */
    function smogCloudData(json: string): string {
        const value = JSON.parse(json);
        if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid smog cloud");
        ["origin", "direction"].forEach(function (key) {
            const array = value[key];
            if (!Array.isArray(array) || array.length !== 3 || !array.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
                throw new Error("Invalid smog cloud " + key);
        });
        ["reach", "mouth", "flare", "roll", "linger", "power", "chance", "venomTicks", "cap", "puffs", "intensity"]
            .forEach(function (key) { if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid smog cloud " + key); });
        if (value.roll < 1 || value.cap < 1 || value.reach <= 0) throw new Error("Invalid smog cloud timing");
        if (value.hit === null || typeof value.hit !== "object" || Array.isArray(value.hit)) value.hit = {};
        ["elapsed", "hits", "poisoned", "front"].forEach(function (key) { if (typeof value[key] !== "number") value[key] = 0; });
        return JSON.stringify(value);
    }

    /** 把一条雾路裁到第一块真墙；未知接触返回 null。 */
    function smogClip(world: CombatWorld, from: CombatPoint, to: CombatPoint): CombatImpact | null {
        const hit = world.clipBlocks(from, to);
        return hit !== null && hit.blocked() ? hit : null;
    }

    /**
     * 用当前前沿（中心 + 半径，与画面同一份数据）罩一次：非友方、真实身体盒与雾球相交、且从喷口到它没有
     * 墙遮挡的人，整团第一次且只结算一次 `fumes` 与中毒掷；达到 `cap` 后不再新增目标。
     */
    function smogSweep(world: CombatWorld, state: any, center: CombatPoint, radius: number): void {
        if (!(radius > 0) || state.hits >= state.cap) return;
        const origin = smogPoint(state.origin);
        const sphere = WorldGeometry.bodySphere(center, radius);
        const actors = world.queryBox(sphere.boundsMin(), sphere.boundsMax(), false);
        for (let i = 0; i < actors.length && state.hits < state.cap; i++) {
            const enemy = actors[i];
            if (world.friendly(enemy)) continue;
            const ref = String(enemy.ref());
            if (state.hit[ref]) continue;
            const body = world.observe(enemy);
            if (body === null) continue;
            if (!sphere.intersects(body.boundsMin(), body.boundsMax())) continue;
            if (!world.clear(origin, body.position())) continue;
            state.hit[ref] = true;
            if (!hurt(world, enemy, "smog", state.power, { damage: damageSpec("smog", "fumes") })) continue;
            state.hits++;
            const poisonedNow = world.valid(enemy) && world.random() < state.chance
                && CombatStatus.inflict(world, enemy, "poison", state.venomTicks, 0, { secondary: true });
            if (poisonedNow) state.poisoned++;
            WorldFeedback.emit(world, smogScene, 1, body.position(),
                { moment: poisonedNow ? "poison" : "hit", target: ref, puffs: state.puffs,
                    scale: radius / smogRadiusRef, intensity: state.intensity }, 22);
        }
    }

    /** 雾团的一刻：推进前沿、按真墙截路、罩一次、续画，直到滚完 + 余留后散去。 */
    function smogRoll(effect: CombatEffect): void {
        const world = effect.world();
        const state = JSON.parse(effect.state());
        const origin = smogPoint(state.origin);
        const direction = smogPoint(state.direction);
        const elapsed = Number(state.elapsed) || 0;
        const roll = Math.max(1, Number(state.roll) || 1);
        const linger = Math.max(0, Number(state.linger) || 0);
        const stopTick = state.wall ? Number(state.wallTick) || 0 : roll;

        let travel = state.reach * Math.min(1, elapsed / roll);
        if (state.wall) travel = Math.min(travel, Number(state.stopDistance) || 0);
        let center = origin.plus(direction.scale(travel));

        // 前沿推进按真实方块射线截断：墙把雾路停在墙前，之后只在原地堆薄。
        if (!state.wall && elapsed > 0) {
            const clip = smogClip(world, origin, center);
            if (clip !== null) {
                const stop = clip.position();
                const distance = Math.max(0, stop.minus(origin).length());
                if (distance < travel - 0.01) {
                    travel = distance;
                    center = origin.plus(direction.scale(travel));
                    state.wall = 1; state.wallTick = elapsed; state.stopDistance = travel;
                    WorldFeedback.emit(world, smogScene, 1, center,
                        { moment: "wall", puffs: state.puffs, scale: state.mouth / smogRadiusRef }, 24);
                    world.sound("minecraft:entity.slime.squish_small", center, 12, "{}");
                }
            }
        }

        const grow = state.reach > 0 ? Math.min(1, travel / state.reach) : 0;
        const radius = state.mouth + (state.flare - state.mouth) * grow;
        smogSweep(world, state, center, radius);

        state.front = travel;
        state.center = [center.x(), center.y(), center.z()];
        state.radius = radius;
        WorldFeedback.onEffect(world, effect.id(), "smog:roll", smogScene, 1, center,
            { moment: "roll", scale: radius / smogRadiusRef, puffs: state.puffs,
                intensity: state.intensity, direction: [direction.x(), direction.y(), direction.z()],
                backX: -direction.x() * Math.max(0.4, radius), backY: -direction.y() * Math.max(0.4, radius),
                backZ: -direction.z() * Math.max(0.4, radius) });

        state.elapsed = elapsed + 1;
        effect.state(JSON.stringify(state));
        if (state.elapsed >= stopTick + linger) { effect.end(); return; }
        effect.schedule("roll", "roll", 1, "{}");
    }

    /** 雾散：在本体自己的托管效果结束时收束画面，并按实际结果给一行回执。 */
    function smogFinish(effect: CombatEffect): void {
        const world = effect.world(), state = JSON.parse(effect.state());
        const center = state.center ? smogPoint(state.center) : smogPoint(state.origin);
        const radius = typeof state.radius === "number" ? state.radius : state.mouth;
        WorldFeedback.emit(world, smogScene, 1, center,
            { moment: "fade", scale: radius / smogRadiusRef, puffs: state.puffs, intensity: state.intensity }, 26);
        const at = center.plus(WorldCombat.point(0, 1.1, 0));
        if (state.hits > 0) WorldFeedback.text(world, at, smogHitText, [state.hits], 26);
        else WorldFeedback.text(world, at, smogMissText, [], 22);
        if (state.poisoned > 0) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.5, 0)), smogPoisonText, [], 24);
    }

    WorldCombat.effect(smogCloud, 1, 600, "actor", smogCloudData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(smogCloud, "start", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), "smog:roll", smogScene, 1, smogPoint(state.origin),
            { moment: "roll", scale: state.mouth / smogRadiusRef, puffs: state.puffs,
                intensity: state.intensity, direction: state.direction,
                backX: -state.direction[0] * state.mouth, backY: -state.direction[1] * state.mouth,
                backZ: -state.direction[2] * state.mouth });
        effect.schedule("roll", "roll", 1, "{}");
    });
    WorldCombat.effectHandler(smogCloud, "roll", smogRoll);
    WorldCombat.effectHandler(smogCloud, "end", smogFinish);
    WorldCombat.effectHandler(smogCloud, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "smog",
        cooldownParameter: "recharge",
        name: "Smog",
        description: "吸一口气，朝选定的方向吐出一团缓慢滚远、渐渐膨大的浊雾；雾团从口边滚到射程尽头，横截面一路扩成锥宽，途中被罩到的人各吃一次伤害并很容易中毒。射程短、伤害低，但中毒概率最高；真实墙会把雾截住。滚涌形态更宽更远更毒，代价是滚得更慢、单次更轻。",
        uses: ["正前方一口滚雾把窄路上的人熏毒", "预压一条通道的入口，逼人让路", "PP 多、反复刷毒"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 16,
        style: "gas",
        defaults: { billow: false, ai: { maxChase: 8, seekUnpoisoned: true, cluster: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["smog"], detail: { values: config } };
            return { radius: p("smog", "reach", context), geometry: "cone", style: "gas", color: 0x8FBF4A,
                label: config && config.billow === true ? "浊雾·滚涌" : "浊雾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["smog"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("smog", "inhale", context)),
                recover: Math.round(p("smog", "settle", context)),
                cooldown: Math.round(p("smog", "recharge", context)),
                active: 0,
                range: p("smog", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const puffs = Math.max(6, Math.round(p("smog", "puffs", action)));
            action.present("smog:inhale:" + action.id(), smogScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", windup: prepare, puffs: puffs, billow: config && config.billow === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = p("smog", "reach", action);
            const cone = p("smog", "cone", action);
            const mouth = p("smog", "mouth", action);
            const power = p("smog", "fumes", action);
            const chance = p("smog", "toxinChance", action);
            const venomTicks = Math.max(40, Math.round(p("smog", "venomTicks", action)));
            const roll = Math.max(16, Math.round(p("smog", "waveTicks", action)));
            const puffs = Math.max(8, Math.round(p("smog", "puffs", action)));
            const cap = Math.max(1, Math.round(p("smog", "maxTargets", action)));
            const intensity = Math.max(0.6, Math.min(2, power / 30));
            const half = cone * Math.PI / 360;
            // 雾团到尽头时的横截面半径按锥宽换算，夹在可打的体积内；画面与判定共用它。
            const flare = Math.max(mouth + 0.35, Math.min(3.6, reach * Math.tan(half)));
            const linger = Math.max(6, Math.round(roll * 0.35));
            const state = {
                origin: [origin.x(), origin.y(), origin.z()],
                direction: [direction.x(), direction.y(), direction.z()],
                reach: reach, mouth: mouth, flare: flare, roll: roll, linger: linger,
                power: power, chance: Math.max(0, Math.min(1, chance)), venomTicks: venomTicks,
                cap: cap, puffs: puffs, intensity: intensity,
                hit: {}, hits: 0, poisoned: 0, elapsed: 0, front: 0
            };
            sound(action, "cobblemon:move.poisongas.actor");
            sound(action, "minecraft:entity.slime.squish_small");
            WorldFeedback.emit(world, smogScene, 1, origin,
                { moment: "puff", direction: [direction.x(), direction.y(), direction.z()], half: cone / 2,
                    puffs: puffs, intensity: intensity, scale: mouth / smogRadiusRef }, 20);
            world.effect(smogCloud, action.actor(), JSON.stringify(state), roll + linger + 40);
            // 雾脱口后由托管效果继续；施法者只做收招，之后即可行动。
            done(action);
        }
    });
}

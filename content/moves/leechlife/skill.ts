/**
 * 吸血 / leechlife 的出手方式。
 *
 * 核心念头：咬住不放，用口器把血一口口吸上来——本族唯一的持续抽吸，连线一直连着两张嘴；施法者咬住后原地不动，
 *   目标拉开到 `leash` 以外钩子就脱开，抽吸提前结束。
 *
 * 三幕：
 *   起（windup，提交前）：口器张开、暗红血光在口边聚起，只播预告。
 *   咬（bite，提交后）：扑上去撕咬，命中结算 `bite` 接触伤害，伤害的一部分经共享 `drain` 抽回自身。
 *   吸（draw ×N）：咬住不放，按 `draws` 分拍各结算一次 `siphon`，每拍沿「目标→自身」抽出一道血线；目标越过 `leash`
 *       则钩子脱开、就地收势。
 *
 * 与同族分开：木角是身体撞进去、吸取拳是站定出拳，都是一下结算；只有吸血把命中拉成一段持续抽吸，
 *   画面里数得出还剩几拍、钩子连着多远。施法者在整段里站着不动，是它最大的代价。
 *
 * 命中、防御、相性与暴击走共享 `impact`／`hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const leechLifeScene = "world_combat:move_leechlife";
    const leechLifeBiteText = "world_combat.move.leechlife.text.bite";
    const leechLifeDrawText = "world_combat.move.leechlife.text.draw";
    const leechLifeSnapText = "world_combat.move.leechlife.text.snap";
    const leechLifeMissText = "world_combat.move.leechlife.text.miss";

    define({
        id: "leechlife",
        cooldownParameter: "recharge",
        name: "Leech Life",
        description: "咬住目标后持续汲取生命。期间停留原地，目标拉开距离便会挣脱。",
        uses: ["咬住一个目标持续抽血续航", "对高血量、跑不动的对手一段吃掉更多", "把一下接触伤害拉成一段持续输出"],
        kind: "enemy",
        range: 2.2,
        maxRange: 3.1,
        prepare: 7,
        active: 1,
        recover: 7,
        cooldown: 28,
        stationary: true,
        style: "leech",
        defaults: { deep: false, ai: { maxChase: 6, healBelow: 0.88 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("leechlife", "reach", pokemon) + 0.3, geometry: "line", style: "leech", color: 0xB0303A,
                label: config && config.deep === true ? "吸血·深咬" : "吸血" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["leechlife"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("leechlife", "tempo", context)),
                recover: Math.round(p("leechlife", "aftercast", context)),
                cooldown: Math.round(p("leechlife", "recharge", context)),
                active: skills["leechlife"].active,
                range: p("leechlife", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:leechlife:" + action.id(), leechLifeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const deep = config && config.deep === true;
            const bitePower = p("leechlife", "bite", action);
            const siphonPower = p("leechlife", "siphon", action);
            const share = p("leechlife", "sap", action);
            const draws = Math.max(1, Math.round(p("leechlife", "draws", action)));
            const leash = p("leechlife", "leash", action);
            const radius = p("leechlife", "fang", action);
            const gap = Math.max(1, Math.round(p("leechlife", "gap", action)));
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const motes = Math.max(8, Math.round(bitePower * 0.25 + siphonPower * 0.6 + share * 30));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.4));
            const intensity = Math.max(0.6, Math.min(2.2, siphonPower / 14));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null {
                const value = targetRef === "" ? null : scope.actor(targetRef);
                return value !== null && scope.valid(value) ? value : null;
            }
            function miss(current: CombatAction, at: CombatPoint): void {
                WorldFeedback.emit(current.world(), leechLifeScene, 1, at, { moment: "miss", motes: motes, scale: scale }, 16);
                WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 0.9, 0)), leechLifeMissText, [], 18);
                sound(current, "minecraft:entity.player.attack.weak");
                finish(current);
            }
            function snap(current: CombatAction, at: CombatPoint, index: number): void {
                const scope = current.world();
                WorldFeedback.emit(scope, leechLifeScene, 1, at,
                    { moment: "snap", motes: motes, scale: scale, draw: index + 1, draws: draws }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), leechLifeSnapText, [], 20);
                finish(current);
            }
            function draw(current: CombatAction, index: number): void {
                if (index >= draws) { finish(current); return; }
                const scope = current.world(), foe = victim(scope), me = scope.observe(current.actor());
                const body = foe !== null ? scope.observe(foe) : null;
                if (me === null || body === null) { finish(current); return; }
                const distance = body.position().minus(me.position()).length();
                if (distance > leash) { snap(current, body.position(), index); return; }
                const landed = hurt(current, foe!, "leechlife", siphonPower,
                    { damage: damageSpec("leechlife", "siphon"), contact: true, bite: true, drain: share });
                const flow = me.position().minus(body.position()), span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                WorldFeedback.emit(scope, leechLifeScene, 1, body.position(),
                    { moment: "draw", path: ["target", "source"], target: String(foe!.ref()),
                        direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, scale: scale,
                        intensity: intensity, draw: index + 1, draws: draws, deep: deep ? 1 : 0 }, 22);
                if (landed) {
                    sound(current, "cobblemon:move.leechlife.target");
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.05, 0)), leechLifeDrawText,
                        [index + 1, draws], 20);
                }
                current.after(gap, function (next: CombatAction) { draw(next, index + 1); });
            }

            const me = world.observe(action.actor()), foe = victim(world);
            const body = foe !== null ? world.observe(foe) : null;
            if (me === null || body === null) { miss(action, action.origin().plus(WorldCombat.point(0, 1, 0))); return; }
            const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
            const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
            const forward = WorldCombat.point(dx / distance, 0, dz / distance);
            const hit = action.trace(me.position(), me.position().plus(forward.scale(Math.min(3.1, distance + 0.6))), radius);
            sound(action, "cobblemon:move.leechlife.actor");
            if (!hit.hitEntity()) { miss(action, me.position().plus(forward.scale(Math.min(3.1, distance + 0.6)))); return; }
            const at = hit.position();
            WorldFeedback.emit(world, leechLifeScene, 1, at,
                { moment: "bite", target: targetRef, motes: motes, scale: scale, intensity: intensity, deep: deep ? 1 : 0 }, 20);
            impact(action, hit, "leechlife", bitePower,
                { damage: damageSpec("leechlife", "bite"), contact: true, bite: true, drain: share });
            sound(action, "cobblemon:move.leechlife.target");
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.05, 0)), leechLifeBiteText, [], 20);
            action.after(3, function (next: CombatAction) { draw(next, 0); });
        }
    });
}

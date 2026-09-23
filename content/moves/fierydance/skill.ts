/**
 * 火之舞 / fierydance 的出手方式。
 *
 * 核心念头：火焰先裹住全身，随后贴着身体跳开一支两拍的火舞——第一拍把身边一圈点着，第二拍振翅把外圈再卷开一截；
 *   被卷到的人各吃一记火焰，舞到兴头时火焰更旺、特攻随之提升。它是四式里唯一以自身为中心、分两拍向外展开的一记，
 *   越靠近越先被点着，往外退一步还能再吃一拍的外圈。
 *
 * 三幕：
 *   起（windup，提交前）：火焰从全身腾起、双翼张开，只播预告，可被打断。
 *   内（unfurl，提交后）：以身体为中心点着内圈 `inner`，圈内每个非友方各吃一记 `blaze` 并被向外推开；
 *       火焰在画面里向外铺开。
 *   外（sweep / surge / miss）：`beat` 刻后振翅，把内圈到外圈 `outer` 之间的人再卷一次；两拍里只要扫中任意
 *       目标，就按 `blazeChance` 掷一次，成功则特攻提升 `blazeStages` 级；两圈都没人只留一支空舞。
 *
 * 与同族分开：充电光束是远远一点直线过去、命中回灌；火之舞是贴着自己跳、覆盖全身、把身边分两圈扫开。
 *
 * 配置 `spiral`（旋舞）由 resolve 改时序、由公式改外圈／每拍威力／级数，提交后才触碰世界。
 */
namespace PokemonSkills {
    const fierydanceScene = "world_combat:move_fierydance";
    const fierydanceHitText = "world_combat.move.fierydance.text.hit";
    const fierydanceSurgeText = "world_combat.move.fierydance.text.surge";
    const fierydanceMissText = "world_combat.move.fierydance.text.miss";

    define({
        id: "fierydance",
        cooldownParameter: "recharge",
        name: "Fiery Dance",
        description: "Cloaked in flames, the user attacks the target by dancing and flapping its wings. This may also boost the user's Sp. Atk stat.",
        uses: ["贴着身体跳一支两拍的火舞", "把身周一圈人分两圈一起点着", "命中后让火焰更旺、特攻提升"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.2,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "dance",
        defaults: { spiral: false, ai: { maxChase: 5, preferCrowd: true, blazeFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("fierydance", "outer", pokemon), geometry: "area", style: "dance", color: 0xF08030,
                label: config && config.spiral === true ? "旋舞" : "火之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["fierydance"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("fierydance", "tempo", context)),
                recover: Math.round(p("fierydance", "aftercast", context)),
                cooldown: Math.round(p("fierydance", "recharge", context)),
                active: 0,
                range: p("fierydance", "outer", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fierydance:windup", fierydanceScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", spiral: config && config.spiral === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const inner = p("fierydance", "inner", action);
            const outer = p("fierydance", "outer", action);
            const power = p("fierydance", "blaze", action);
            const chance = Math.max(0.05, Math.min(0.95, p("fierydance", "blazeChance", action)));
            const stages = Math.max(1, Math.round(p("fierydance", "blazeStages", action)));
            const spin = Math.max(10, Math.round(p("fierydance", "spin", action)));
            const push = p("fierydance", "push", action);
            const gap = Math.max(2, Math.round(p("fierydance", "beat", action)));
            const scale = Math.max(0.6, Math.min(2.4, outer / 2.8));
            const intensity = Math.max(0.5, Math.min(2.4, power / 80));
            let hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function centre(current: CombatAction): CombatPoint {
                const self = current.world().observe(actor);
                return self === null ? current.origin() : self.position();
            }

            function strike(current: CombatAction, origin: CombatPoint, region: WorldGeometry.Region): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, region, function (victim: CombatActor, facts: CombatObservation) {
                    const landed = hurt(current, victim, "fierydance", power,
                        { damage: damageSpec("fierydance", "blaze") });
                    if (!landed) return;
                    hits++;
                    const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                    if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                    WorldFeedback.emit(scope, fierydanceScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), spin: spin, scale: scale, intensity: intensity }, 20);
                    sound(current, "cobblemon:impact.fire");
                });
            }

            function beatTwo(current: CombatAction): void {
                const scope = current.world();
                const origin = centre(current);
                WorldFeedback.emit(scope, fierydanceScene, 1, origin,
                    { moment: "sweep", outer: outer, inner: inner, spin: spin, intensity: intensity }, 22);
                sound(current, "minecraft:entity.blaze.shoot");
                strike(current, origin, WorldGeometry.ring(origin, inner, outer, { below: 1.5, above: 2.6 }));
                if (hits > 0) {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.3, 0)), fierydanceHitText, [hits], 24);
                    if (scope.random() < chance) {
                        NativeEffects.boost(scope, actor, "spa", stages);
                        const self = scope.observe(actor);
                        const at = self === null ? origin : self.position();
                        WorldFeedback.emit(scope, fierydanceScene, 1, at,
                            { moment: "surge", target: String(actor.ref()), stages: stages, spin: spin, scale: scale }, 28);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.6 : self.height() + 0.1, 0)),
                            fierydanceSurgeText, [stages], 28);
                        sound(current, "minecraft:block.beacon.activate");
                    }
                } else {
                    WorldFeedback.emit(scope, fierydanceScene, 1, origin,
                        { moment: "miss", spin: Math.round(spin * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), fierydanceMissText, [], 20);
                }
                finish(current);
            }

            const origin = centre(action);
            WorldFeedback.emit(world, fierydanceScene, 1, origin,
                { moment: "unfurl", inner: inner, outer: outer, spin: spin, intensity: intensity }, 20);
            sound(action, "minecraft:entity.blaze.shoot");
            strike(action, origin, WorldGeometry.ring(origin, 0, inner, { below: 1.5, above: 2.6 }));
            action.after(gap, function (next: CombatAction) { beatTwo(next); });
        }
    });
}

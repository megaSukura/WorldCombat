/**
 * 陷阱甲壳 / shelltrap 的出手方式。
 *
 * 核心念头：把壳张成一触即发的陷阱，然后站定等一记命中。只要接下来这段时间里被**敌对来源的物理命中**
 *   打中，壳就当场炸开：身周所有非友方各挨一次自己的火焰伤害、被向外震开，并可能被碎片点着；
 *   一直没被物理打中，壳就慢慢冷却、这一招落空。它不挡伤害、不返还伤害——它只是等着被点着。
 *
 * 三幕：
 *   起（windup，提交前）：壳面被引线般的热光爬上、尘与火星往里收的预告；起手可被打断。
 *   撑（hold → detonate / fizzle）：提交后挂上共享身份 world_combat:status/shelltrap 的待爆载体，
 *       站定 window 刻；这段时间里被物理命中就把壳点着，立刻对身周整圈炸出 `blast` 并震开、点燃它们。
 *   收（fizzle）：窗口走完或被外力打断仍未触发，则壳冷冷收拢，什么都不发生。
 *
 * 与同族分开：双倍奉还／镜面反射／忍耐把挨到的伤害按账本返还；拦堵挡下来袭并让撞上的人变软；
 *   陷阱甲壳不挡不还，只等一记物理把自己点着，然后对身周整圈炸出自己的火焰。配置 `hairtrigger`
 *   由 resolve 改时序、由公式改威力与窗口：开启＝任何敌对命中都触发、范围更小、冷却更久。
 */
namespace PokemonSkills {
    function shelltrapAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.5, 0)); }

    define({
        id: "shelltrap",
        cooldownParameter: "recharge",
        name: "Shell Trap",
        description: "把壳张成一触即发的陷阱，然后站定等一记命中：这段时间里被敌对物理招式打中，壳就当场炸开，身周所有敌人各挨一次自己的火焰伤害、被震开并可能被点着；一直没被物理打中，壳就冷冷收拢、这一招落空。感应壳改成任何敌对命中都触发。",
        uses: ["等一记近身物理，把贴上来的人一起炸开", "用一圈火焰逼退围攻者", "预判对手的物理连击，用爆炸罚它一次", "在物理攻击者面前站定、换一次范围爆发"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 56,
        style: "trap",
        stationary: true,
        maximumTicks: 400,
        defaults: { hairtrigger: false, ai: { range: 5, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["shelltrap"], detail: { values: config } };
            return { radius: p("shelltrap", "blastRadius", context), geometry: "area", style: "trap", color: 0xE07030,
                label: config && config.hairtrigger === true ? "陷阱甲壳·感应" : "陷阱甲壳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shelltrap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shelltrap", "tempo", context)),
                recover: Math.round(p("shelltrap", "settle", context)),
                cooldown: Math.round(p("shelltrap", "recharge", context)),
                active: 0,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("shelltrap:charge", shelltrapScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", scale: Math.max(0.6, Math.min(2.0, p("shelltrap", "blastRadius", action) / 3.6)),
                    hairtrigger: config && config.hairtrigger === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const hairtrigger = !!(config && config.hairtrigger);
            const window = Math.max(20, Math.round(p("shelltrap", "window", action)));
            const power = p("shelltrap", "blast", action);
            const radius = Math.max(1.5, p("shelltrap", "blastRadius", action));
            const shock = p("shelltrap", "shock", action);
            const burnChance = Math.max(0, Math.min(1, p("shelltrap", "burnChance", action)));
            const burnTicks = Math.max(40, Math.round(p("shelltrap", "burnTicks", action)));
            const cap = Math.max(1, Math.round(p("shelltrap", "maxTargets", action)));
            const sparks = Math.max(20, Math.round(26 + power * 0.2 + radius * 6));
            const scale = Math.max(0.6, Math.min(2.0, radius / 3.6));
            const intensity = Math.max(0.7, Math.min(2.4, power / 130));
            const armedAt = world.tick();
            let resolved = false, nextKeep = 0;

            // amplifier 1 表示感应壳（任何敌对命中都点着）；0 表示只认物理。
            MobEffects.apply(world, self, shelltrapEffect, window, hairtrigger ? 1 : 0);
            sound(action, "minecraft:block.deepslate.place");
            WorldFeedback.emit(world, shelltrapScene, 1, body.position(),
                { moment: "arm", scale: scale, sparks: sparks, window: window, hairtrigger: hairtrigger, intensity: intensity }, 24);
            WorldFeedback.text(world, shelltrapAbove(body.position()), shelltrapChargeText, [Math.round(window / 20)], 26);

            /** 收壳：拿下待爆载体，并清掉可能还在的「已点着」记号。 */
            function release(current: CombatAction): void {
                try {
                    const scope = current.world();
                    MobEffects.consume(scope, self, shelltrapEffect);
                    const lit = scope.effects(self, shelltrapLit);
                    for (let i = 0; i < lit.length; i++) scope.operation(lit[i].id(), "world_combat:dispel", "{}");
                } catch (error) { /* action already released its world handle */ }
            }

            function detonate(current: CombatAction): void {
                if (resolved) return;
                resolved = true;
                release(current);
                const scope = current.world();
                const at = scope.observe(self);
                const centre = at === null ? action.targetPosition() : at.position();
                let hits = 0, lit = 0;
                const features: any = { damage: damageSpec("shelltrap", "blast"), knockback: false };
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 3 }), function (other) {
                    if (hits >= cap) return;
                    if (!hurt(current, other, "shelltrap", power, features)) return;
                    hits++;
                    if (!scope.valid(other)) return;
                    const otherBody = scope.observe(other)!;
                    const away = otherBody.position().minus(centre);
                    if (away.length() > 0.2 && shock > 0) scope.displace(other, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shock));
                    WorldFeedback.emit(scope, shelltrapScene, 1, otherBody.position(),
                        { moment: "detonate_hit", target: String(other.ref()), scale: scale, sparks: sparks, intensity: intensity }, 26);
                    // 碎片点燃：命中后按概率挂共享的灼伤身份，停留 burnTicks。
                    if (burnChance > 0 && scope.random() < burnChance && CombatStatus.inflict(scope, other, "burn", burnTicks)) {
                        lit++;
                        WorldFeedback.emit(scope, shelltrapScene, 1, otherBody.position(), { moment: "burn", target: String(other.ref()), sparks: sparks }, 26);
                    }
                });
                WorldFeedback.emit(scope, shelltrapScene, 1, centre,
                    { moment: "detonate", radius: radius, scale: scale, sparks: sparks, hits: hits, lit: lit, intensity: intensity, burnChance: burnChance }, 34);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.fire");
                WorldFeedback.text(scope, shelltrapAbove(centre), hits > 0 ? shelltrapBlastText : shelltrapEmptyText, hits > 0 ? [hits] : [], 28);
                done(current);
            }

            function fizzle(current: CombatAction): void {
                if (resolved) return;
                resolved = true;
                release(current);
                const scope = current.world();
                const at = scope.observe(self);
                if (at !== null) {
                    WorldFeedback.emit(scope, shelltrapScene, 1, at.position(), { moment: "fizzle", scale: scale, sparks: sparks }, 24);
                    WorldFeedback.text(scope, shelltrapAbove(at.position()), shelltrapFizzleText, [], 24);
                    scope.sound("minecraft:block.fire.extinguish", at.position(), 14, "{}");
                }
                done(current);
            }

            function watch(current: CombatAction): void {
                if (resolved) return;
                const scope = current.world();
                if (!scope.valid(self)) { resolved = true; return; }
                current.stopMovement();
                const now = scope.tick();
                if (scope.effects(self, shelltrapLit).length > 0) { detonate(current); return; }
                if (now - armedAt >= window) { fizzle(current); return; }
                if (now >= nextKeep) {
                    nextKeep = now + 6;
                    const at = scope.observe(self);
                    if (at !== null) WorldFeedback.keep(scope, "shelltrap:hold:" + String(self.key()), shelltrapScene, 1, at.position(),
                        { moment: "hold", scale: scale, sparks: sparks, remaining: Math.max(0, window - (now - armedAt)),
                            window: window, intensity: intensity }, 20);
                }
                current.after(1, watch);
            }

            action.on("world_combat:interrupt", function (current: CombatAction) {
                if (resolved) return;
                resolved = true;
                release(current);
            });

            watch(action);
        }
    });
}

/**
 * 钢翼 / steelwing 的出手方式。
 *
 * 核心念头：侧身一记钢翼横扫，把身前一整扇里的人一起掀开；翼面越硬、扫中的东西越沉，防御就越稳地抬起来。
 *   它是四式里唯一横向成扇、能同时照顾多人的一记，也是磨防御的那一个——站得越靠前越容易被一扫带走。
 *
 * 三幕：
 *   起（windup，提交前）：翅膀张开到最大、边缘亮起钢光，只播预告，可被打断。
 *   掠（glide，仅滑翔式）：提交后朝瞄准方向滑出 `glideDist` 格，为横扫找角度。
 *   扫（sweep → hit / miss）：以身体为中心取一个 `span` 度、`reach` 远的扇形，扇内每个非友方各吃一记 `wing`
 *       接触伤害并被沿背离方向推开 `knock` 格；只要扫中任意目标，就按 `hardenChance` 掷一次，成功则防御
 *       提升 `hardenStages` 级——翼面越硬，这一点越稳。扇里没人只留一道扫过的风。
 *
 * 与同族分开：金属爪是贴脸两点、磨的是攻击；钢翼是横向一大扇、把面前的人一起扫开、磨的是防御。
 *
 * 配置 `glide`（滑翔扫）由 resolve 改时序、由公式改扇面／击退／几率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const steelwingScene = "world_combat:move_steelwing";
    const steelwingHardenText = "world_combat.move.steelwing.text.harden";
    const steelwingHitText = "world_combat.move.steelwing.text.hit";
    const steelwingMissText = "world_combat.move.steelwing.text.miss";

    /** 扇形外缘的顶点（含圆心），交给表现用同一组顶点画同一个扇面。 */
    function steelwingFan(origin: CombatPoint, direction: CombatPoint, reach: number, span: number): number[][] {
        const base = Math.atan2(direction.x(), direction.z()), half = span * Math.PI / 360, steps = 8;
        const vertices: number[][] = [[origin.x(), origin.y() + 0.6, origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + (2 * half) * i / steps;
            vertices.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.6, origin.z() + Math.cos(angle) * reach]);
        }
        return vertices;
    }

    define({
        id: "steelwing",
        cooldownParameter: "recharge",
        name: "Steel Wing",
        description: "The target is hit with wings of steel. This may also boost the user's Defense stat.",
        uses: ["侧身一记横扫，把面前一片人一起掀开", "贴着敌阵边缘扫出一整扇", "用命中把防御一点点磨硬"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.8,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "sweep",
        defaults: { glide: false, ai: { maxChase: 7, preferCrowd: true, braceUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("steelwing", "reach", pokemon), geometry: "cone", style: "sweep", color: 0xB8C4D6,
                label: config && config.glide === true ? "滑翔钢翼" : "钢翼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["steelwing"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("steelwing", "tempo", context)),
                recover: Math.round(p("steelwing", "aftercast", context)),
                cooldown: Math.round(p("steelwing", "recharge", context)),
                active: 0,
                range: p("steelwing", "reach", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_steelwing:windup", steelwingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", glide: config && config.glide === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const reach = p("steelwing", "reach", action);
            const span = p("steelwing", "span", action);
            const power = p("steelwing", "wing", action);
            const knock = p("steelwing", "knock", action);
            const chance = Math.max(0.02, Math.min(0.9, p("steelwing", "hardenChance", action)));
            const stages = Math.max(1, Math.round(p("steelwing", "hardenStages", action)));
            const glideDist = p("steelwing", "glideDist", action);
            const feathers = Math.max(8, Math.round(p("steelwing", "feathers", action)));
            const glide = !!(config && config.glide === true);
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(2.2, reach / 3.2));
            const intensity = Math.max(0.5, Math.min(2.4, power / 70));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function harden(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                NativeEffects.boost(scope, actor, "def", stages);
                const self = scope.observe(actor);
                const at = self === null ? point : self.position();
                WorldFeedback.emit(scope, steelwingScene, 1, at,
                    { moment: "harden", target: String(actor.ref()), stages: stages, feathers: feathers, scale: scale }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    steelwingHardenText, [stages], 28);
                sound(current, "minecraft:block.beacon.power_select");
            }

            function sweep(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const fan = steelwingFan(origin, direction, reach, span);
                WorldFeedback.emit(scope, steelwingScene, 1, origin,
                    { moment: "sweep", path: fan, span: span, reach: reach, feathers: feathers, scale: scale, intensity: intensity }, 22);
                sound(current, "cobblemon:animation.steel.wing_flap.large");
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, span, { below: 1.4, above: 2.6 }),
                    function (victim: CombatActor, facts: CombatObservation) {
                        const landed = hurt(current, victim, "steelwing", power,
                            { damage: damageSpec("steelwing", "wing"), contact: true });
                        if (!landed) return;
                        hits++;
                        const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                        if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(knock));
                        WorldFeedback.emit(scope, steelwingScene, 1, facts.position(),
                            { moment: "hit", target: String(victim.ref()), feathers: feathers, scale: scale, intensity: intensity }, 20);
                        sound(current, "cobblemon:impact.steel");
                    });
                if (hits > 0) {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.2, 0)), steelwingHitText, [hits], 24);
                    if (scope.random() < chance) harden(current, origin);
                } else {
                    WorldFeedback.emit(scope, steelwingScene, 1, origin.plus(direction.scale(reach * 0.7)),
                        { moment: "miss", feathers: Math.round(feathers * 0.6), scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), steelwingMissText, [], 20);
                }
                finish(current);
            }

            function glideStep(current: CombatAction, remaining: number): void {
                const scope = current.world();
                if (remaining <= 0.01) { sweep(current); return; }
                const moved = scope.displace(actor, direction.scale(Math.min(0.9, remaining)));
                const self = scope.observe(actor);
                if (self !== null)
                    WorldFeedback.emit(scope, steelwingScene, 1, self.position(),
                        { moment: "glide", feathers: feathers, scale: scale }, 12);
                if (moved < 0.05) { sweep(current); return; }
                current.after(1, function (next: CombatAction) { glideStep(next, remaining - moved); });
            }

            if (glide) glideStep(action, Math.max(0, Math.min(glideDist, reach - 0.5)));
            else sweep(action);
        }
    });
}

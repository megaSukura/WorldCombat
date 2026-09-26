/**
 * 钢翼 / steelwing 的出手方式。
 *
 * 核心念头：**展开两侧硬翼，用真实翼缘切过去**——双翼从身前收拢的位置向两侧扫开，翼缘扫过身侧和侧前方；
 *   左翼和右翼各自碰到谁就算谁，正前方两条翼缘之间的空隙反而安全。它是四式里唯一靠两侧翼缘分别接触、
 *   把两边的人各自掀开、并磨硬防御的一记。
 *
 * 三幕：
 *   起（windup，提交前）：双翼收到身前、翼缘亮起钢光，只播预告，可被打断。
 *   展／掠（unfold / glide，提交后）：非滑翔式在 `unfold` 刻里把双翼从正前方展开到 `span`；滑翔式在
 *       `glideDist` 的真实推进期间保持全幅翼缘。每一刻都按当刻真实身体位置采**左、右两条肩到翼尖的短
 *       `trace`**（含友方与墙），翼缘碰到谁就结算一次 `wing` 接触伤害并把目标沿背离方向推开 `knock` 格；
 *       每个目标整招只吃一次，直线上的第一个身体或墙就是那一侧翼缘的真实端点，墙把该侧翼截断。
 *   磨（harden / miss）：整招第一次有效命中才掷一次 `hardenChance`，按 `NativeEffects` 实际涨到的防御级数
 *       播磨硬回执；整招没碰到任何人只留散羽。滑翔撞墙立即收翼结束，不超出 `glideDist` 的位移预算。
 *
 * 与同族分开：金属爪是贴脸两点、磨的是攻击；钢翼是两侧真实翼缘、把两边的人分别扫开、磨的是防御。
 *   正前方两条翼缘之间不接触的空隙是安全的，不是整扇同时填伤。
 *
 * 自由瞄准：`kind: "aim"` 允许任何阵营实体或世界点，空挥合法；攻击权限仍由命中层控制。转向按释放方向固定，
 *   滑翔不会自旋转圈去全覆盖。配置 `glide`（滑翔扫）由 resolve 改时序、由公式改翼展／击退／几率。
 */
namespace PokemonSkills {
    const steelwingScene = "world_combat:move_steelwing";
    const steelwingHardenText = "world_combat.move.steelwing.text.harden";
    const steelwingHitText = "world_combat.move.steelwing.text.hit";
    const steelwingMissText = "world_combat.move.steelwing.text.miss";
    const steelwingWallText = "world_combat.move.steelwing.text.wall";

    function steelwingFlat(point: CombatPoint): CombatPoint { return WorldCombat.point(point.x(), 0, point.z()); }

    /** 把瞄准方向压平成一个水平单位向量；零长时退回 +z。 */
    function steelwingHeading(direction: CombatPoint): CombatPoint {
        const flat = steelwingFlat(direction);
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    function steelwingVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        freeMovement: true,
        id: "steelwing",
        cooldownParameter: "recharge",
        name: "Steel Wing",
        description: "向两侧展开硬翼，用两条真实翼缘切过身侧：左、右翼各自碰到的人各吃一记接触伤害并被推开；正前方两翼之间的空隙安全。整招第一次命中后有机会磨硬翼面、提高自身防御。",
        uses: ["侧身展开双翼、把两侧的人分别扫开", "贴着敌阵边缘用一侧翼缘切过去", "用命中把防御一点点磨硬"],
        kind: "aim",
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
            return { radius: p("steelwing", "reach", pokemon), geometry: "area", style: "sweep", color: 0xB8C4D6,
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
            const body = action.sense().observe(action.actor());
            const scale = body === null ? 1 : Math.max(0.6, Math.min(2.2, body.width() + body.height()));
            action.present("world_combat:move_steelwing:windup", steelwingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", glide: config && config.glide === true, windup: prepare,
                    span: p("steelwing", "span", action), scale: scale }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(steelwingScene);
            const world = action.world();
            const actor = action.actor();
            if (world.observe(actor) === null) { done(action); return; }
            const reach = Math.max(1.6, p("steelwing", "reach", action));
            const span = Math.max(40, Math.min(170, p("steelwing", "span", action)));
            const radius = Math.max(0.15, p("steelwing", "edgeRadius", action));
            const power = p("steelwing", "wing", action);
            const knock = Math.max(0, p("steelwing", "knock", action));
            const chance = Math.max(0.02, Math.min(0.9, p("steelwing", "hardenChance", action)));
            const stages = Math.max(1, Math.round(p("steelwing", "hardenStages", action)));
            const glideDist = Math.max(0, p("steelwing", "glideDist", action));
            const feathers = Math.max(8, Math.round(p("steelwing", "feathers", action)));
            const unfold = Math.max(2, Math.round(p("steelwing", "unfold", action)));
            const glide = !!(config && config.glide === true);
            const heading = steelwingHeading(aim(action));
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const scale = Math.max(0.6, Math.min(2.2, reach / 3.2));
            const intensity = Math.max(0.5, Math.min(2.4, power / 70));
            const pace = Math.max(0.4, Math.min(0.9, glideDist / 4 + 0.15));
            const struck: { [ref: string]: boolean } = Object.create(null);
            let hits = 0, hardened = false, walls = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (hits === 0) {
                    const scope = current.world(), self = scope.observe(actor);
                    if (self !== null) {
                        WorldFeedback.emit(scope, steelwingScene, 1, self.position(),
                            { moment: "miss", feathers: Math.round(feathers * 0.6), scale: scale }, 18);
                        WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, self.height() + 0.1, 0)),
                            steelwingMissText, [], 20);
                    }
                }
                scenes.finish(current, done);
            }

            /** 整招第一次有效命中才掷一次；按实际涨到的防御级数播，满级或被拒不留成功回执。 */
            function harden(current: CombatAction, point: CombatPoint): void {
                if (hardened) return;
                const scope = current.world();
                if (scope.random() >= chance) return;
                const delta = NativeEffects.boost(scope, actor, "def", stages);
                if (delta <= 0) return;
                hardened = true;
                const self = scope.observe(actor);
                const at = self === null ? point : self.position();
                WorldFeedback.emit(scope, steelwingScene, 1, at,
                    { moment: "harden", target: String(actor.ref()), stages: delta, feathers: feathers, scale: scale }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, self === null ? 1.5 : self.height() + 0.1, 0)),
                    steelwingHardenText, [delta], 28);
                sound(current, "minecraft:block.beacon.power_select");
            }

            /** 第 `sideSign` 侧翼缘在展翼进度 `t`（0..1）上的真实肩点与翼尖。 */
            function wingGeometry(current: CombatAction, sideSign: number, t: number): { root: CombatPoint; tip: CombatPoint } | null {
                const self = current.world().observe(actor);
                if (self === null) return null;
                const origin = self.position(), list = Math.max(0.4, self.width()) * 0.5 + 0.05;
                const root = origin.plus(WorldCombat.point(side.x() * sideSign * list, 0, side.z() * sideSign * list));
                const angle = (20 + (span - 20) * t) * Math.PI / 180;
                const length = reach * (0.55 + 0.45 * t);
                const direction = WorldCombat.point(
                    heading.x() * Math.cos(angle) + side.x() * sideSign * Math.sin(angle), 0,
                    heading.z() * Math.cos(angle) + side.z() * sideSign * Math.sin(angle));
                return { root: root, tip: root.plus(direction.scale(length)) };
            }

            /** 一侧翼缘的真实 `trace`：第一个身体或墙就是端点；每个目标整招只结算一次伤害与推距。 */
            function swipe(current: CombatAction, sideSign: number, t: number): void {
                const scope = current.world();
                const geometry = wingGeometry(current, sideSign, t);
                if (geometry === null) return;
                const contact = current.trace(geometry.root, geometry.tip, radius, true);
                const endpoint = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && scope.valid(lander) && !scope.friendly(lander) ? lander : null;
                scenes.show(current, sideSign < 0 ? "wingL" : "wingR", geometry.root,
                    { moment: "wing", side: sideSign, path: [steelwingVertex(geometry.root), steelwingVertex(endpoint)],
                        point: steelwingVertex(endpoint),
                        blocked: contact.blocked() && !contact.hitEntity() ? 1 : 0,
                        feathers: feathers, scale: scale, intensity: intensity });
                if (victim !== null && !struck[String(victim.ref())]) {
                    struck[String(victim.ref())] = true;
                    const landed = impact(current, contact, "steelwing", power,
                        { damage: damageSpec("steelwing", "wing"), contact: true });
                    if (landed) {
                        hits++;
                        WorldFeedback.emit(scope, steelwingScene, 1, endpoint,
                            { moment: "hit", target: String(victim.ref()), feathers: feathers, scale: scale,
                                intensity: intensity }, 20);
                        WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 1.1, 0)), steelwingHitText, [hits], 22);
                        sound(current, "cobblemon:impact.steel");
                        if (scope.valid(victim)) {
                            const target = scope.observe(victim), self = scope.observe(actor);
                            if (target !== null && self !== null) {
                                const away = steelwingFlat(target.position().minus(self.position()));
                                if (away.length() > 0.05) scope.displace(victim, away.unit().scale(knock));
                            }
                        }
                        harden(current, endpoint);
                    }
                } else if (contact.blocked() && !contact.hitEntity()) {
                    walls++;
                    WorldFeedback.emit(scope, steelwingScene, 1, endpoint,
                        { moment: "wall", face: contact.blockFace(), feathers: Math.round(feathers * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, endpoint.plus(WorldCombat.point(0, 0.8, 0)), steelwingWallText, [], 20);
                    sound(current, "minecraft:block.stone.break");
                }
            }

            function showBody(current: CombatAction, moment: string): void {
                const self = current.world().observe(actor);
                if (self !== null) scenes.show(current, "body", self.position(),
                    { moment: moment, feathers: feathers, scale: scale, intensity: intensity });
            }

            /** 非滑翔：原地把双翼从正前方展开到 `span`，每刻各采一次两条翼缘。 */
            function unfoldStep(current: CombatAction, step: number): void {
                const t = Math.min(1, (step + 1) / unfold);
                showBody(current, "unfold");
                swipe(current, -1, t);
                swipe(current, 1, t);
                if (step + 1 >= unfold || current.world().observe(actor) === null) { finish(current); return; }
                current.after(1, function (next: CombatAction) { unfoldStep(next, step + 1); });
            }

            /** 滑翔：用 `sweepStep` 真实推进，撞墙即收翼结束；保持全幅翼缘每刻采两条。 */
            function glideStep(current: CombatAction, travelled: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const start = self.position();
                const step = Math.min(pace, glideDist - travelled);
                if (step <= 0.01) { finish(current); return; }
                const swept = sweepStep(current, heading.scale(step), Math.max(0.3, self.width() * 0.5));
                if (swept.hit.blocked() && !swept.hit.hitEntity()) {
                    walls++;
                    WorldFeedback.emit(scope, steelwingScene, 1, swept.hit.position(),
                        { moment: "wall", face: swept.hit.blockFace(), feathers: Math.round(feathers * 0.5), scale: scale }, 18);
                    WorldFeedback.text(scope, swept.hit.position().plus(WorldCombat.point(0, 0.8, 0)), steelwingWallText, [], 20);
                    sound(current, "minecraft:block.stone.break");
                    finish(current);
                    return;
                }
                // 撞到敌人只截住身体，不算翼伤；把没走完的一段补上，让身体真实掠过它。
                let moved = swept.moved;
                if (swept.hit.hitEntity() && swept.remaining.length() > 0.01)
                    moved += scope.displace(actor, swept.remaining);
                const now = scope.observe(actor);
                if (now !== null) {
                    scenes.show(current, "body", now.position(),
                        { moment: "glide", feathers: feathers, scale: scale, intensity: intensity,
                            from: [start.x(), start.y(), start.z()],
                            to: [now.position().x(), now.position().y(), now.position().z()] });
                }
                swipe(current, -1, 1);
                swipe(current, 1, 1);
                travelled += moved;
                if (moved < 0.02 || travelled >= glideDist) { finish(current); return; }
                current.after(1, function (next: CombatAction) { glideStep(next, travelled); });
            }

            sound(action, "cobblemon:animation.steel.wing_flap.large");
            if (glide) glideStep(action, 0);
            else unfoldStep(action, 0);
        }
    });
}

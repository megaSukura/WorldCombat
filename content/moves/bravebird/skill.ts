/**
 * 勇鸟猛攻 / bravebird 的出手方式。
 *
 * 核心念头：收翅弹起到低空，再沿一条斜线把自己钉出去，从目标身上穿过去、落在它身后——像一支离弦的箭。
 * 它靠速度换来的动量，代价是落地时那一震同样砸回自己身上。
 *
 * 三幕：
 *   起（windup，提交前）：收拢翅膀、屈腿压低，只播预告。
 *   腾（execute 前半）：提交后垂直弹起到 altitude 高度；头顶被压住时自然只弹得起来多少算多少。
 *   冲（execute 后半 → impact / land）：从最高点沿一条穿过目标的斜线俯冲，逐刻推进并 trace；
 *       线上遇到的敌人依次结算 dive 接触伤害、各按 recoil 反伤自己、沿俯冲方向被带开 push 格；
 *       最多穿 pierceCount 个人（共享结算按每次命中分别反震）。落地或走完 swoop 即收势。
 *
 * 与同族分开：舍身冲撞是正面猛撞、撞完双方被弹开；波动冲裹水撞人；木槌用坚硬躯体砸地。
 * 勇鸟猛攻是唯一从空中沿一条线穿过目标、并且能串起一串敌人的。
 * 配置 high（高掠式）由 resolve 改时序、由公式改高度/威力/反伤/路程，提交后才触碰世界。
 */
namespace PokemonSkills {
    const bravebirdScene = "world_combat:move_bravebird";
    const bravebirdHitText = "world_combat.move.bravebird.text.hit";
    const bravebirdLandText = "world_combat.move.bravebird.text.land";
    const bravebirdWhiffText = "world_combat.move.bravebird.text.whiff";

    define({
        id: "bravebird",
        cooldownParameter: "recharge",
        name: "Brave Bird",
        description: "The user tucks in its wings and charges at a low altitude. This also damages the user quite a lot.",
        uses: ["从空中俯冲穿过一个目标", "沿一条线串起挤在一起的敌人", "越过前排直接打到后排"],
        kind: "enemy",
        range: 5.4,
        maxRange: 9.6,
        prepare: 10,
        active: 40,
        recover: 10,
        cooldown: 52,
        style: "aerial",
        maximumTicks: 220,
        defaults: { high: false, ai: { maxChase: 13, preferLine: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bravebird", "collisionRadius", pokemon) * 1.8, geometry: "line", style: "aerial",
                color: 0xBFD9EF, label: config && config.high === true ? "高掠式勇鸟猛攻" : "勇鸟猛攻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bravebird"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bravebird", "tempo", context)),
                recover: Math.round(p("bravebird", "aftercast", context)),
                cooldown: Math.round(p("bravebird", "recharge", context)),
                active: skills["bravebird"].active,
                range: p("bravebird", "swoop", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bravebird:fold", bravebirdScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", high: !!(config && config.high) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const altitude = p("bravebird", "altitude", action);
            const pace = p("bravebird", "pace", action);
            const swoop = p("bravebird", "swoop", action);
            const radius = p("bravebird", "collisionRadius", action);
            const traceAhead = p("bravebird", "traceAhead", action);
            const minimumMove = p("bravebird", "minimumMove", action);
            const power = p("bravebird", "dive", action);
            const recoil = p("bravebird", "recoil", action);
            const pierceCount = Math.max(1, Math.round(p("bravebird", "pierceCount", action)));
            const push = p("bravebird", "push", action);
            const feathers = Math.round(p("bravebird", "feathers", action));
            const high = !!(config && config.high);
            const scale = radius / 0.6;
            const intensity = Math.max(0.6, Math.min(2.4, power / 115));
            const stuck: { [ref: string]: boolean } = {};
            const target: CombatActor | null = action.target();
            let struck = 0, settled = false, travelled = 0;
            let direction = action.direction();

            WorldFeedback.emit(world, bravebirdScene, 1, action.origin(),
                { moment: "climb", feathers: feathers, scale: scale, intensity: intensity, high: high ? 1 : 0 }, 30);
            sound(action, "cobblemon:move.aerialace.actor_1");
            sound(action, "cobblemon:animation.plumage.wing_flap.medium");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, bravebirdScene, 1, body.position(),
                        { moment: "land", feathers: feathers, scale: scale, intensity: intensity, hits: struck }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        struck > 0 ? bravebirdLandText : bravebirdWhiffText, struck > 0 ? [struck] : [], 26);
                }
                sound(current, "minecraft:entity.generic.big_fall");
                done(current);
            }

            function dive(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const step = Math.min(pace, Math.max(0, swoop - travelled));
                if (step <= 0.001 || struck >= pierceCount) { finish(current); return; }
                const origin = self.position(), delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target(), point = hit.position();
                    if (victim !== null && !scope.friendly(victim) && !stuck[String(victim.ref())]) {
                        stuck[String(victim.ref())] = true;
                        const landed = impact(current, hit, "bravebird", power,
                            { damage: damageSpec("bravebird", "dive"), contact: true, recoil: recoil });
                        WorldFeedback.emit(scope, bravebirdScene, 1, point,
                            { moment: "impact", target: String(victim.ref()), feathers: feathers, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.4, power / 110)) }, 28);
                        sound(current, "cobblemon:move.aerialace.target");
                        if (landed && scope.valid(victim)) {
                            scope.displace(victim, direction.scale(push));
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), bravebirdHitText, [], 26);
                        }
                        struck++;
                    }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= swoop) { finish(current); return; }
                WorldFeedback.keep(scope, "bravebird:trail:" + String(actor.ref()), bravebirdScene, 1, origin,
                    { moment: "dive", feathers: feathers, scale: scale, intensity: intensity,
                        ratio: Math.min(1, travelled / Math.max(0.001, swoop)) }, 8);
                current.after(1, function (next) { dive(next); });
            }

            function beginDive(current: CombatAction): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position();
                const observed = target !== null ? scope.observe(target) : null;
                const aimPoint = observed !== null ? observed.position() : action.targetPosition();
                const heading = aimPoint.minus(from);
                direction = heading.length() < 0.3 ? current.direction() : heading.unit();
                dive(current);
            }

            function climb(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (climbed >= altitude - 0.05) { beginDive(current); return; }
                const rise = Math.min(pace, altitude - climbed);
                const moved = scope.displace(actor, WorldCombat.point(0, rise, 0));
                if (moved < rise * 0.5) { beginDive(current); return; }   // 头顶被压住：弹不起来就从这里俯冲
                current.after(1, function (next) { climb(next, climbed + moved); });
            }

            climb(action, 0);
        }
    });
}

/**
 * 高温重压 / heatcrash 的出手方式。
 *
 * 核心念头：与重磅冲撞同形不同料——把自己整副**燃着火的**身躯**低低扑出去**，触地后贴地滑一小段，
 * 把滑过路径上的敌人各压一次。它不做高跃、不做落点圆爆、不替换任何方块：区分这两种重压的是身体运动，
 * 不是火色——重磅冲撞是高跃落圈，高温重压是低扑贴地的短滑碾痕。
 *
 * 输入：`kind: "aim"`——方向、点或实体都行；提交时不要求存在敌人，落点/方向会吸附到近地。
 *
 * 过程（提交后）：
 *   扑（pounce）：沿瞄准方向低低腾起几刻——一道低弧。
 *   滑（slide）：触地后贴地向前滑 `slideLength`；每刻对贴身处一圈内的敌人各结算一次 `crush`（每目标只一次），
 *       命中后按体重比掷明火与灼伤：明火只有 `ignite` 回执为真才呈现，灼伤只有真被施加才成立；能被推开的才推。
 *   停（stop）：撞墙或滑出台沿（失去支撑）即止步；滑过处只留一道很快熄灭的火擦痕，不造成尾场伤害。
 *
 * 伤害按每个目标各自的体重比分别求值。提交后才触碰世界。
 */
namespace PokemonSkills {
    const heatcrashScene = "world_combat:move_heatcrash";
    const heatcrashHitText = "world_combat.move.heatcrash.text.hit";
    const heatcrashMissText = "world_combat.move.heatcrash.text.miss";
    /** 低扑的小弧高度（格）。 */
    const heatcrashPounceHop = 0.6;

    /** 用某个具体目标的事实求这一次冲撞的威力；双方体重只有在这里才互相读得到。 */
    function heatcrashPower(action: CombatAction, world: CombatWorld, target: CombatActor, values: any): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["heatcrash"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("heatcrash", "crush", context);
    }

    define({
        freeMovement: true,
        id: "heatcrash",
        name: "Heat Crash",
        description: "把燃着火的整副身躯低低扑出去，触地后贴地滑一小段：自己比对手越重，压得越狠，也越容易把对手点着。滑过路径上的敌人各被压一次并被顶开；火痕随实际滑动出现，停止后很快熄灭。重压式更短更重，焦土式滑得更远、更易点燃。",
        uses: ["用分量压垮比自己轻的目标并把火压上去", "沿一条直线压过一小群敌人", "对可燃的目标点起持续的灼烧"],
        kind: "aim",
        range: 4,
        maxRange: 5.6,
        prepare: 8,
        active: 40,
        recover: 10,
        cooldown: 40,
        style: "charge",
        defaults: { scorch: false, ai: { maxChase: 8, opening: true, minRatio: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heatcrash", "slideLength", pokemon), geometry: "line", style: "fire", color: 0xE0662A, label: "高温重压" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heatcrash"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const scorch = !!(config && config.scorch);
            return {
                prepare: Math.max(1, Math.round(p("heatcrash", "prepare", context))),
                recover: Math.round(p("heatcrash", "recover", context)) + (scorch ? 3 : 0),
                cooldown: Math.round(p("heatcrash", "cooldown", context)) + (scorch ? 8 : 0),
                range: p("heatcrash", "slideLength", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_heatcrash:windup", heatcrashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scorch: !!(config && config.scorch) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const world = action.world();
            const raw = action.targetPosition();
            const plan = WorldGeometry.ground(world, raw, 6);
            const origin = action.origin();
            const radius = p("heatcrash", "landRadius", action);
            const sweepRadius = p("heatcrash", "collisionRadius", action);
            const shove = p("heatcrash", "shove", action);
            const chance = Math.max(0.05, Math.min(0.9, p("heatcrash", "burnChance", action)));
            const burnTicks = Math.max(40, Math.round(p("heatcrash", "burnTicks", action)));
            const igniteTicks = Math.max(8, Math.round(p("heatcrash", "igniteTicks", action)));
            const traceWidth = p("heatcrash", "scorchRadius", action);
            const traceTicks = Math.max(20, Math.round(p("heatcrash", "scorchTicks", action)));
            const pounce = Math.max(2, Math.round(p("heatcrash", "pounceTicks", action)));
            const slideLength = p("heatcrash", "slideLength", action);
            const slideSpeed = p("heatcrash", "slideSpeed", action);
            const scale = radius / 1.8;
            const flatDelta = WorldCombat.point(plan.x() - origin.x(), 0, plan.z() - origin.z());
            const distance = flatDelta.length();
            const heading = distance < 1e-6 ? aim(action) : flatDelta.unit();
            const directionData = [heading.x(), heading.y(), heading.z()];
            const rise = Math.max(1, Math.floor(pounce / 2));
            const upPerTick = heatcrashPounceHop / rise;
            const downPerTick = heatcrashPounceHop / Math.max(1, pounce - rise);
            const scenes = WorldFeedback.actionScenes(heatcrashScene);
            const hitRefs: { [ref: string]: boolean } = {};
            let elapsed = 0, traveled = 0, pressed = 0, landed = false;

            sound(action, "minecraft:item.firecharge.use");
            scenes.show(action, "pounce", origin, { moment: "pounce", scale: scale, direction: directionData, hop: heatcrashPounceHop });

            function finish(current: CombatAction): void {
                if (landed) return;
                landed = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                const at = body === null ? current.origin() : body.position();
                // 停止后火痕很快熄灭：这里只补一撮余烬，之后由火痕自己的短寿命收场。
                WorldFeedback.emit(scope, heatcrashScene, 1, at,
                    { moment: "stop", scale: scale, pressed: pressed, direction: directionData }, 18);
                sound(current, "cobblemon:impact.fire");
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)),
                    pressed > 0 ? heatcrashHitText : heatcrashMissText, pressed > 0 ? [pressed] : [], 24);
                scenes.finish(current, done);
            }

            /** 压中一个目标：每目标一次主伤，明火/灼伤/位移都以真实回执为准。 */
            function pressTarget(current: CombatAction, target: CombatActor, at: CombatPoint): boolean {
                const ref = String(target.ref());
                if (hitRefs[ref]) return false;
                hitRefs[ref] = true;
                const scope = current.world();
                const facts = scope.observe(target);
                if (facts === null) return false;
                const power = heatcrashPower(current, scope, target, config);
                const didHit = hurt(current, target, "heatcrash", power,
                    { damage: damageSpec("heatcrash", "crush"), contact: true });
                if (!didHit) return false;
                pressed++;
                WorldFeedback.emit(scope, heatcrashScene, 1, facts.position(),
                    { moment: "impact", target: ref, intensity: Math.max(0.6, Math.min(2.4, power / 90)), direction: directionData }, 30);
                if (!scope.valid(target)) return true;
                // 只有真的点得着（ignite 回执为真）才呈现明火；免疫火的生物只被压。
                const lit = scope.ignite(target, igniteTicks);
                const burned = scope.random() < chance ? CombatStatus.inflict(scope, target, "burn", burnTicks) : false;
                if (lit || burned)
                    WorldFeedback.emit(scope, heatcrashScene, 1, facts.position(),
                        { moment: "burn", target: ref, embers: Math.round(20 + power * 0.12), burnTicks: igniteTicks }, igniteTicks + 20);
                const away = facts.position().minus(at);
                if (away.length() >= 0.05 && scope.displace(target, away.unit().scale(shove)) > 0.05)
                    WorldFeedback.emit(scope, heatcrashScene, 1, facts.position(), { moment: "shove", target: ref }, 18);
                return true;
            }

            function slideStep(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const here = body.position();
                const remaining = slideLength - traveled;
                if (remaining <= 0.02) { finish(current); return; }
                const step = Math.min(slideSpeed, remaining);
                const delta = heading.scale(step);
                // 撞墙检测用权威射线；贴地掠过的人用同一圈的几何查询，避免重复结算。
                const probe = current.trace(here, here.plus(delta), sweepRadius, true);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(here, 0, radius, { below: 1.4, above: 1.8 }),
                    function (target) { pressTarget(current, target, here); });
                if (probe.blocked()) { finish(current); return; }
                const moved = scope.displace(current.actor(), delta);
                traveled += moved;
                const after = scope.observe(current.actor());
                // 火擦痕只画在实际贴地滑过的地面；空中不画焦土。
                if (after !== null && after.grounded()) {
                    const ground = WorldGeometry.ground(scope, after.position(), 3);
                    WorldFeedback.emit(scope, heatcrashScene, 1, ground,
                        { moment: "scorch", scale: traceWidth / 0.45, width: traceWidth, direction: directionData }, traceTicks);
                }
                if (moved < 0.03 || traveled >= slideLength) { finish(current); return; }
                // 滑出台沿、失去脚下支撑就止步。
                if (after !== null && !after.grounded()) { finish(current); return; }
                current.after(1, slideStep);
            }

            function pounceStep(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const here = body.position();
                const vertical = elapsed < rise ? WorldCombat.point(0, upPerTick, 0) : WorldCombat.point(0, -downPerTick, 0);
                const forward = Math.min(slideSpeed, slideLength) * 0.6;
                const swept = sweepStep(current, heading.scale(forward).plus(vertical), sweepRadius);
                if (swept.hit.hitEntity()) {
                    const target = swept.hit.target();
                    if (target !== null && !scope.friendly(target)) pressTarget(current, target, here);
                }
                elapsed++;
                if (elapsed >= pounce) {
                    const after = scope.observe(current.actor());
                    scenes.stop(current, "pounce");
                    if (after === null || !after.grounded()) { finish(current); return; }
                    scenes.show(current, "slide", after.position(), { moment: "slide", scale: scale, direction: directionData, width: traceWidth });
                    current.after(1, slideStep);
                    return;
                }
                if (swept.hit.blocked() && swept.moved < 0.03) { finish(current); return; }
                current.after(1, pounceStep);
            }
            pounceStep(action);
        }
    });
}
